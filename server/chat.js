// Messages between a customer and a business on PuntMe. A conversation
// belongs to one business and one customer; the business owner answers.
// Photos are stored as files in the data folder under random names.

import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { randomBytes } from 'node:crypto'
import { newId, now, parseJson } from './db.js'

const PAGE = 300
const EDIT_WINDOW_MS = 2 * 60_000 // the app offers Edit for 1 minute; this allows for slow networks
const PHOTO_TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }

export function chatRoutes({ api, db, notify, signedIn, fail, longText, limiter, dataDir }) {
  const photoDir = join(dataDir, 'photos')
  mkdirSync(photoDir, { recursive: true })

  const q = {
    conversation: db.prepare(`
      SELECT c.*, b.name AS business_name, b.logo AS business_logo, b.owner_id, b.phone AS business_phone,
             b.whatsapp AS business_whatsapp, b.status AS business_status, u.name AS customer_name
      FROM conversations c JOIN businesses b ON b.id = c.business_id JOIN users u ON u.id = c.customer_id
      WHERE c.id = ?`),
    existing: db.prepare('SELECT id FROM conversations WHERE business_id = ? AND customer_id = ?'),
    business: db.prepare('SELECT id, name, owner_id, status FROM businesses WHERE id = ?'),
    create: db.prepare(
      'INSERT OR IGNORE INTO conversations (id, business_id, customer_id, created_at, last_message_at) VALUES (?, ?, ?, ?, ?)',
    ),
    // Every chat I'm in, as the customer or as the owner of the business,
    // unless I deleted it from my list and nothing new arrived since.
    list: db.prepare(`
      SELECT c.*, b.name AS business_name, b.logo AS business_logo, b.owner_id, b.phone AS business_phone,
             b.whatsapp AS business_whatsapp, b.status AS business_status, u.name AS customer_name,
             (SELECT COUNT(*) FROM messages m
               WHERE m.conversation_id = c.id AND m.sender_id != :me AND m.deleted_at IS NULL
                 AND m.created_at > CASE WHEN c.customer_id = :me THEN c.customer_read_at ELSE c.owner_read_at END) AS unread
      FROM conversations c JOIN businesses b ON b.id = c.business_id JOIN users u ON u.id = c.customer_id
      WHERE (c.customer_id = :me AND (c.customer_archived_at IS NULL OR c.customer_archived_at < c.last_message_at))
         OR (b.owner_id = :me AND (c.owner_archived_at IS NULL OR c.owner_archived_at < c.last_message_at))
      ORDER BY c.last_message_at DESC LIMIT 200`),
    unreadTotal: db.prepare(`
      SELECT COUNT(*) AS n FROM messages m
      JOIN conversations c ON c.id = m.conversation_id JOIN businesses b ON b.id = c.business_id
      WHERE m.sender_id != :me AND m.deleted_at IS NULL
        AND ((c.customer_id = :me AND m.created_at > c.customer_read_at)
          OR (b.owner_id = :me AND m.created_at > c.owner_read_at))`),
    messages: db.prepare(`SELECT * FROM (SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at DESC LIMIT ${PAGE})
      ORDER BY created_at`),
    message: db.prepare('SELECT * FROM messages WHERE id = ?'),
    addMessage: db.prepare(
      'INSERT INTO messages (id, conversation_id, sender_id, body, photo, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    ),
    touch: db.prepare('UPDATE conversations SET last_message_at = ?, last_preview = ? WHERE id = ?'),
    readCustomer: db.prepare('UPDATE conversations SET customer_read_at = MAX(customer_read_at, ?) WHERE id = ?'),
    readOwner: db.prepare('UPDATE conversations SET owner_read_at = MAX(owner_read_at, ?) WHERE id = ?'),
    muteCustomer: db.prepare('UPDATE conversations SET customer_muted = ? WHERE id = ?'),
    muteOwner: db.prepare('UPDATE conversations SET owner_muted = ? WHERE id = ?'),
    archiveCustomer: db.prepare('UPDATE conversations SET customer_archived_at = ? WHERE id = ?'),
    archiveOwner: db.prepare('UPDATE conversations SET owner_archived_at = ? WHERE id = ?'),
    edit: db.prepare('UPDATE messages SET body = ?, edited_at = ? WHERE id = ?'),
    unsend: db.prepare("UPDATE messages SET deleted_at = ?, body = '', photo = NULL WHERE id = ?"),
    lastLive: db.prepare(
      'SELECT body, photo, created_at FROM messages WHERE conversation_id = ? AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 1',
    ),
    userSubs: db.prepare('SELECT * FROM push_subs WHERE user_id = ?'),
    userName: db.prepare('SELECT name FROM users WHERE id = ?'),
  }

  /** 'customer', 'owner' or a 404: you only ever see your own chats. */
  function sideOf(c, userId) {
    if (c?.customer_id === userId) return 'customer'
    if (c?.owner_id === userId) return 'owner'
    return fail(404, 'Chat not found.')
  }

  function load(req) {
    const c = q.conversation.get(req.params.id)
    return { c, side: sideOf(c, req.user.id) }
  }

  const photoUrl = (file) => (file ? `/api/photos/${file}` : null)
  const preview = (body, photo) => (body ? body.replace(/\s+/g, ' ').slice(0, 140) : photo ? 'Photo' : '')

  function conversationOut(c, side) {
    const customer = side === 'customer'
    return {
      id: c.id,
      businessId: c.business_id,
      side,
      // The other side: the business for a customer, the customer for the owner.
      title: customer ? c.business_name : c.customer_name,
      subtitle: customer ? null : c.business_name,
      logo: customer ? c.business_logo : null,
      phone: customer ? c.business_phone : null,
      whatsapp: customer ? Boolean(c.business_whatsapp) : false,
      businessLive: c.business_status === 'live',
      lastMessageAt: c.last_message_at,
      preview: c.last_preview,
      unread: c.unread ?? 0,
      muted: Boolean(customer ? c.customer_muted : c.owner_muted),
      otherReadAt: customer ? c.owner_read_at : c.customer_read_at,
    }
  }

  const messageOut = (m) => ({
    id: m.id,
    senderId: m.sender_id,
    body: m.body,
    photo: photoUrl(m.photo),
    createdAt: m.created_at,
    editedAt: m.edited_at,
    deleted: m.deleted_at != null,
  })

  function savePhoto(dataUrl) {
    if (dataUrl == null || dataUrl === '') return null
    const m = typeof dataUrl === 'string' && /^data:(image\/(?:jpeg|png|webp));base64,([a-z0-9+/=]+)$/i.exec(dataUrl)
    if (!m) fail(400, 'Photos must be JPEG, PNG or WebP.')
    const bytes = Buffer.from(m[2], 'base64')
    if (bytes.length > 3_000_000) fail(400, 'That photo is too big. Try another one.')
    const file = `${randomBytes(16).toString('hex')}.${PHOTO_TYPES[m[1].toLowerCase()]}`
    writeFileSync(join(photoDir, file), bytes)
    return file
  }

  function markRead(c, side, at) {
    ;(side === 'customer' ? q.readCustomer : q.readOwner).run(at, c.id)
  }

  // Tell the other side, unless they muted this chat or turned messages off.
  function announce(c, side, sender, m) {
    const toId = side === 'customer' ? c.owner_id : c.customer_id
    const muted = side === 'customer' ? c.owner_muted : c.customer_muted
    if (muted) return
    const subs = q.userSubs.all(toId).filter((s) => parseJson(s.prefs, {}).messages !== false)
    if (!subs.length) return
    notify(subs, {
      title: side === 'customer' ? `${sender} · ${c.business_name}` : c.business_name,
      body: m.photo && !m.body ? '📷 Photo' : m.body.length > 140 ? `${m.body.slice(0, 140)}…` : m.body,
      url: `/?chat=${c.id}`,
      tag: `chat-${c.id}`, // one notification per chat, replaced by the newest
      urgency: 'high',
    })
  }

  function addMessage(c, side, req) {
    const body = longText(req.body.body, { field: 'Your message', max: 4000 })
    const photo = savePhoto(req.body.photo)
    if (!body && !photo) fail(400, 'Type a message first.')
    const t = now()
    const m = { id: newId(), body, photo, created_at: t }
    q.addMessage.run(m.id, c.id, req.user.id, body, photo, t)
    q.touch.run(t, preview(body, photo), c.id)
    markRead(c, side, t) // sending means you've seen everything before it
    announce(c, side, req.user.name, m)
    return q.message.get(m.id)
  }

  const sendLimit = limiter({ max: 60, windowMs: 60e3, message: 'You’re sending messages very fast. Wait a moment.' })

  api.get('/conversations', signedIn, (req, res) => {
    const rows = q.list.all({ me: req.user.id })
    res.json({ conversations: rows.map((c) => conversationOut(c, c.customer_id === req.user.id ? 'customer' : 'owner')) })
  })

  // My chat with a business, if there is one yet (opened from its page).
  api.get('/conversations/with/:businessId', signedIn, (req, res) => {
    const row = q.existing.get(req.params.businessId, req.user.id)
    if (!row) return res.json({ conversation: null })
    const c = q.conversation.get(row.id)
    res.json({ conversation: conversationOut(c, 'customer') })
  })

  // First message to a business: starts the chat (or adds to the one there is).
  api.post('/conversations', signedIn, sendLimit, (req, res) => {
    const b = q.business.get(String(req.body.businessId ?? ''))
    if (!b || b.status !== 'live') fail(404, 'This business isn’t on PuntMe right now.')
    if (b.owner_id === req.user.id) fail(400, 'This is your own business.')
    // Two quick first messages both land in the one chat.
    q.create.run(newId(), b.id, req.user.id, now(), now())
    const id = q.existing.get(b.id, req.user.id).id
    const c = q.conversation.get(id)
    const m = addMessage(c, 'customer', req)
    res.status(201).json({ conversation: conversationOut(q.conversation.get(id), 'customer'), message: messageOut(m) })
  })

  api.get('/conversations/:id', signedIn, (req, res) => {
    const { c, side } = load(req)
    res.json({ conversation: conversationOut(c, side), messages: q.messages.all(c.id).map(messageOut) })
  })

  api.post('/conversations/:id/messages', signedIn, sendLimit, (req, res) => {
    const { c, side } = load(req)
    if (side === 'customer' && c.business_status !== 'live') fail(400, 'This business isn’t taking messages right now.')
    res.status(201).json({ message: messageOut(addMessage(c, side, req)) })
  })

  api.post('/conversations/:id/read', signedIn, (req, res) => {
    const { c, side } = load(req)
    markRead(c, side, now())
    res.json({ ok: true })
  })

  api.post('/conversations/:id/mute', signedIn, (req, res) => {
    const { c, side } = load(req)
    ;(side === 'customer' ? q.muteCustomer : q.muteOwner).run(req.body.muted ? 1 : 0, c.id)
    res.json({ ok: true })
  })

  // Deletes the chat from my list only; a new message brings it back.
  api.delete('/conversations/:id', signedIn, (req, res) => {
    const { c, side } = load(req)
    ;(side === 'customer' ? q.archiveCustomer : q.archiveOwner).run(now(), c.id)
    res.json({ ok: true })
  })

  function ownMessage(req) {
    const m = q.message.get(req.params.id)
    const c = m && q.conversation.get(m.conversation_id)
    if (!m || m.sender_id !== req.user.id || !c) fail(404, 'Message not found.')
    if (m.deleted_at) fail(400, 'This message was unsent.')
    return { m, c }
  }

  // The chat list shows the newest message that's still there.
  function refreshPreview(c) {
    const last = q.lastLive.get(c.id)
    q.touch.run(c.last_message_at, last ? preview(last.body, last.photo) : '', c.id)
  }

  api.patch('/messages/:id', signedIn, (req, res) => {
    const { m, c } = ownMessage(req)
    if (now() - m.created_at > EDIT_WINDOW_MS) fail(400, 'Messages can only be edited for a minute after sending.')
    const body = longText(req.body.body, { field: 'Your message', max: 4000 })
    if (!body && !m.photo) fail(400, 'Type a message first.')
    q.edit.run(body, now(), m.id)
    refreshPreview(c)
    res.json({ message: messageOut(q.message.get(m.id)) })
  })

  api.delete('/messages/:id', signedIn, (req, res) => {
    const { m, c } = ownMessage(req)
    q.unsend.run(now(), m.id)
    refreshPreview(c)
    res.json({ message: messageOut(q.message.get(m.id)) })
  })

  // Photo names are long and random, so the link itself is the key.
  api.get('/photos/:file', (req, res) => {
    if (!/^[a-f0-9]{32}\.(jpg|png|webp)$/.test(req.params.file)) fail(404, 'Photo not found.')
    res.set('Cache-Control', 'private, max-age=31536000, immutable')
    res.sendFile(req.params.file, { root: photoDir }, (err) => err && !res.headersSent && res.status(404).json({ error: 'Photo not found.' }))
  })

  return {
    unreadFor: (userId) => q.unreadTotal.get({ me: userId }).n,
    chatCountFor: db.prepare('SELECT COUNT(*) AS n FROM conversations WHERE business_id = ?'),
  }
}
