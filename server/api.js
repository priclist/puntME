// PuntMe API: accounts, businesses added by their owners, quote requests
// and push notifications. Mounted at /api by server/index.js in production
// and by the Vite dev server (vite.config.js) while developing.

import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import { mkdirSync, unlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import express from 'express'
import { CATEGORIES } from '../src/data/categories.js'
import { chatRoutes } from './chat.js'
import { newId, now, openDb, parseJson } from './db.js'
import { alertMatches, distanceTo, matchesQuery, servesArea } from './match.js'
import { sendPush, setupPush } from './push.js'

const SESSION_DAYS = 60
const CATEGORY_IDS = new Set(CATEGORIES.map((c) => c.id))

class HttpError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}
const fail = (status, message) => {
  throw new HttpError(status, message)
}

/* ---------- Passwords and sessions ---------- */

function hashPassword(password) {
  const salt = randomBytes(16)
  const hash = scryptSync(password, salt, 64)
  return `scrypt$${salt.toString('base64')}$${hash.toString('base64')}`
}

function checkPassword(password, stored) {
  const [, salt, hash] = stored.split('$')
  const expected = Buffer.from(hash, 'base64')
  const actual = scryptSync(password, Buffer.from(salt, 'base64'), expected.length)
  return timingSafeEqual(actual, expected)
}

const sha256 = (text) => createHash('sha256').update(text).digest('hex')

/* ---------- Input checks ---------- */

function text(value, { field, min = 0, max }) {
  const v = typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : ''
  if (v.length < min) fail(400, min > 1 ? `${field} needs at least ${min} characters.` : `${field} is needed.`)
  if (v.length > max) fail(400, `${field} can be up to ${max} characters.`)
  return v
}

// Multi-line text keeps its line breaks.
function longText(value, { field, max }) {
  const v = typeof value === 'string' ? value.replace(/\r\n/g, '\n').trim() : ''
  if (v.length > max) fail(400, `${field} can be up to ${max} characters.`)
  return v
}

/** "082 123 4567", "+27 82…" or "27821234567" → "+27821234567". */
export function normalisePhone(value) {
  const raw = typeof value === 'string' ? value.trim() : ''
  let digits = raw.replace(/\D/g, '')
  if (raw.startsWith('+')) digits = `+${digits}`
  else if (digits.startsWith('27') && digits.length === 11) digits = `+${digits}`
  else if (digits.startsWith('0') && digits.length === 10) digits = `+27${digits.slice(1)}`
  if (!/^\+\d{9,15}$/.test(digits)) fail(400, 'That phone number doesn’t look right. Try the format 082 123 4567.')
  return digits
}

function email(value, { required }) {
  const v = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (!v && !required) return null
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) || v.length > 160) fail(400, 'Enter a valid email address.')
  return v
}

function website(value) {
  const v = typeof value === 'string' ? value.trim() : ''
  if (!v) return null
  try {
    const url = new URL(/^https?:\/\//i.test(v) ? v : `https://${v}`)
    if (!url.hostname.includes('.') || v.length > 300) throw new Error()
    return url.href
  } catch {
    return fail(400, 'That website address doesn’t look right.')
  }
}

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/

function hours(value) {
  if (!Array.isArray(value) || value.length > 14) fail(400, 'Opening hours are not in the right format.')
  return value.map((h) => {
    if (!Number.isInteger(h?.day) || h.day < 0 || h.day > 6 || !TIME.test(h.open) || !TIME.test(h.close)) {
      fail(400, 'Opening hours are not in the right format.')
    }
    return { day: h.day, open: h.open, close: h.close }
  })
}

function coord(value, min, max) {
  const n = Number(value)
  if (!Number.isFinite(n) || n < min || n > max) fail(400, 'Choose where you work from the list.')
  return n
}

function logo(value) {
  if (value == null || value === '') return null
  if (typeof value !== 'string' || !/^data:image\/(jpeg|png|webp);base64,[a-z0-9+/=]+$/i.test(value)) {
    fail(400, 'The logo must be a JPEG, PNG or WebP picture.')
  }
  if (value.length > 400_000) fail(400, 'The logo is too big. Choose a smaller picture.')
  return value
}

/** Business fields from a form. `current` is the stored row when editing. */
function businessInput(body, current) {
  const pick = (key, read) => (body[key] === undefined && current ? current[key] : read(body[key]))
  const categoryId = body.categoryId === undefined && current ? current.category_id : body.categoryId || null
  if (categoryId && !CATEGORY_IDS.has(categoryId)) fail(400, 'Choose a job from the list.')
  const status = body.status === undefined && current ? current.status : body.status ?? 'live'
  if (status !== 'live' && status !== 'paused') fail(400, 'Unknown listing status.')
  const radius = body.radiusKm === undefined && current ? current.radius_km : Number(body.radiusKm ?? 15)
  if (!Number.isInteger(radius) || radius < 1 || radius > 200) fail(400, 'Choose how far you travel.')

  return {
    name: pick('name', (v) => text(v, { field: 'Business name', min: 2, max: 80 })),
    job: pick('job', (v) => text(v, { field: 'The job you do', min: 2, max: 60 })),
    category_id: categoryId,
    description: pick('description', (v) => longText(v, { field: 'About your business', max: 600 })),
    phone: pick('phone', normalisePhone),
    whatsapp: body.whatsapp === undefined && current ? current.whatsapp : body.whatsapp === false ? 0 : 1,
    email: pick('email', (v) => email(v, { required: false })),
    website: pick('website', website),
    area_label: body.area === undefined && current ? current.area_label : text(body.area, { field: 'Your area', min: 2, max: 120 }),
    lat: body.lat === undefined && current ? current.lat : coord(body.lat, -90, 90),
    lng: body.lng === undefined && current ? current.lng : coord(body.lng, -180, 180),
    radius_km: radius,
    hours: body.hours === undefined && current ? current.hours : JSON.stringify(hours(body.hours ?? [])),
    logo: body.logo === undefined && current ? current.logo : logo(body.logo),
    google_place_id:
      body.googlePlaceId === undefined && current
        ? current.google_place_id
        : text(body.googlePlaceId, { field: 'Google place', max: 300 }) || null,
    status,
  }
}

/* ---------- Photos and videos ---------- */

// Content-Type → kind, file extension, and how the file must start, so a
// renamed file can't pass as a picture.
const MEDIA_TYPES = {
  'image/jpeg': { kind: 'photo', ext: 'jpg', starts: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  'image/png': { kind: 'photo', ext: 'png', starts: (b) => b.readUInt32BE(0) === 0x89504e47 },
  'image/webp': { kind: 'photo', ext: 'webp', starts: (b) => b.toString('latin1', 0, 4) === 'RIFF' && b.toString('latin1', 8, 12) === 'WEBP' },
  'video/mp4': { kind: 'video', ext: 'mp4', starts: (b) => b.toString('latin1', 4, 8) === 'ftyp' },
  'video/quicktime': { kind: 'video', ext: 'mov', starts: (b) => /^(ftyp|moov|mdat|wide|free)$/.test(b.toString('latin1', 4, 8)) },
  'video/webm': { kind: 'video', ext: 'webm', starts: (b) => b.readUInt32BE(0) === 0x1a45dfa3 },
}
const MAX_PHOTO_BYTES = 4 * 1024 * 1024 // the app shrinks photos to well under this
const MAX_VIDEO_MB = 60
const MAX_MEDIA = 20
const MAX_VIDEOS = 5
const MEDIA_FILE = /^[\w-]+\.(jpg|png|webp|mp4|mov|webm)$/

/* ---------- Rate limits (per IP, in memory) ---------- */

function limiter({ max, windowMs, message }) {
  const hits = new Map()
  return (req, _res, next) => {
    const key = req.ip
    const t = now()
    const entry = hits.get(key)
    if (!entry || entry.reset < t) hits.set(key, { count: 1, reset: t + windowMs })
    else if (++entry.count > max) return next(new HttpError(429, message))
    if (hits.size > 5000) for (const [k, v] of hits) if (v.reset < t) hits.delete(k)
    next()
  }
}

/* ---------- The API ---------- */

export function createApi({ dataDir }) {
  const db = openDb(dataDir)
  const vapidPublicKey = setupPush(dataDir)
  const mediaDir = join(dataDir, 'media')
  mkdirSync(mediaDir, { recursive: true })

  const q = {
    userByEmail: db.prepare('SELECT * FROM users WHERE email = ?'),
    userById: db.prepare('SELECT id, name, email FROM users WHERE id = ?'),
    passwordOf: db.prepare('SELECT password_hash FROM users WHERE id = ?'),
    addUser: db.prepare('INSERT INTO users (email, name, password_hash, created_at) VALUES (?, ?, ?, ?)'),
    renameUser: db.prepare('UPDATE users SET name = ? WHERE id = ?'),
    deleteUser: db.prepare('DELETE FROM users WHERE id = ?'),
    addSession: db.prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)'),
    session: db.prepare('SELECT user_id FROM sessions WHERE token_hash = ? AND expires_at > ?'),
    dropSession: db.prepare('DELETE FROM sessions WHERE token_hash = ?'),
    dropExpired: db.prepare('DELETE FROM sessions WHERE expires_at < ?'),

    business: db.prepare('SELECT * FROM businesses WHERE id = ?'),
    liveBusinesses: db.prepare("SELECT * FROM businesses WHERE status = 'live' ORDER BY published_at DESC"),
    ownBusinesses: db.prepare('SELECT * FROM businesses WHERE owner_id = ? ORDER BY created_at'),
    countOwn: db.prepare('SELECT COUNT(*) AS n FROM businesses WHERE owner_id = ?'),
    deleteBusiness: db.prepare('DELETE FROM businesses WHERE id = ?'),
    addView: db.prepare('UPDATE businesses SET views = views + 1 WHERE id = ?'),
    mediaOf: db.prepare('SELECT * FROM media WHERE business_id = ? ORDER BY created_at'),
    mediaOfOwner: db.prepare('SELECT media.file FROM media JOIN businesses ON businesses.id = media.business_id WHERE owner_id = ?'),
    mediaItem: db.prepare('SELECT * FROM media WHERE id = ? AND business_id = ?'),
    addMedia: db.prepare('INSERT INTO media (id, business_id, kind, file, bytes, created_at) VALUES (?, ?, ?, ?, ?, ?)'),
    deleteMedia: db.prepare('DELETE FROM media WHERE id = ?'),
    quoteCounts: db.prepare(
      'SELECT COUNT(*) AS total, SUM(read_at IS NULL) AS unread FROM quotes WHERE business_id = ?',
    ),

    addQuote: db.prepare('INSERT INTO quotes (id, business_id, name, phone, message, created_at) VALUES (?, ?, ?, ?, ?, ?)'),
    quote: db.prepare(
      'SELECT quotes.*, businesses.owner_id FROM quotes JOIN businesses ON businesses.id = quotes.business_id WHERE quotes.id = ?',
    ),
    ownerQuotes: db.prepare(`
      SELECT quotes.*, businesses.name AS business_name FROM quotes
      JOIN businesses ON businesses.id = quotes.business_id
      WHERE businesses.owner_id = ? ORDER BY quotes.created_at DESC LIMIT 200`),
    markRead: db.prepare('UPDATE quotes SET read_at = ? WHERE id = ? AND read_at IS NULL'),
    deleteQuote: db.prepare('DELETE FROM quotes WHERE id = ?'),

    sub: db.prepare('SELECT * FROM push_subs WHERE endpoint = ?'),
    upsertSub: db.prepare(`
      INSERT INTO push_subs (endpoint, p256dh, auth, user_id, prefs, alerts, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(endpoint) DO UPDATE SET p256dh = excluded.p256dh, auth = excluded.auth,
        user_id = excluded.user_id, prefs = excluded.prefs, alerts = excluded.alerts, updated_at = excluded.updated_at`),
    dropSub: db.prepare('DELETE FROM push_subs WHERE endpoint = ?'),
    userSubs: db.prepare('SELECT * FROM push_subs WHERE user_id = ?'),
    alertSubs: db.prepare("SELECT * FROM push_subs WHERE alerts != '[]'"),
  }

  // Send to many subscriptions, forgetting the ones the browser dropped.
  async function notify(subs, payload) {
    const results = await Promise.all(subs.map((s) => sendPush(s, payload)))
    results.forEach((r, i) => r === 'gone' && q.dropSub.run(subs[i].endpoint))
    return results.filter((r) => r === 'sent').length
  }

  // A business just went live: tell everyone whose job alert it matches.
  function announce(b) {
    const subs = q.alertSubs.all().filter((s) => s.user_id !== b.owner_id)
    for (const s of subs) {
      const alert = parseJson(s.alerts, []).find((a) => alertMatches(a, b))
      if (!alert) continue
      notify([s], {
        title: `New ${b.job.toLowerCase()} near ${alert.label?.split(',')[0] ?? 'you'}`,
        body: `${b.name} just joined PuntMe. Tap to see their details.`,
        url: `/?b=${b.id}`,
        tag: `alert-${b.id}`,
      })
    }
  }

  // The database forgets media rows by itself (ON DELETE CASCADE); the files
  // have to be removed by hand.
  function removeFiles(rows) {
    for (const { file } of rows) {
      try {
        unlinkSync(join(mediaDir, file))
      } catch {
        // already gone
      }
    }
  }

  const mediaJson = (m) => ({ id: m.id, kind: m.kind, path: `/media/${m.file}` })

  function publicBusiness(b, at) {
    return {
      id: b.id,
      name: b.name,
      job: b.job,
      categoryId: b.category_id,
      description: b.description,
      phone: b.phone,
      whatsapp: Boolean(b.whatsapp),
      email: b.email,
      website: b.website,
      area: b.area_label,
      lat: b.lat,
      lng: b.lng,
      radiusKm: b.radius_km,
      hours: parseJson(b.hours, []),
      logo: b.logo,
      googlePlaceId: b.google_place_id,
      media: q.mediaOf.all(b.id).map(mediaJson),
      createdAt: b.created_at,
      distanceKm: distanceTo(b, at),
    }
  }

  function ownedBusiness(b) {
    const counts = q.quoteCounts.get(b.id)
    return {
      ...publicBusiness(b, null),
      status: b.status,
      views: b.views,
      quoteCount: counts.total,
      chatCount: chat.chatCountFor.get(b.id).n,
      unread: counts.unread ?? 0,
      updatedAt: b.updated_at,
    }
  }

  // A full Express app (not a Router) so it also works when the Vite dev
  // server mounts it, where requests aren't Express requests yet.
  const api = express()
  api.disable('x-powered-by')
  api.use((_req, res, next) => {
    res.set('Cache-Control', 'no-store') // personal and live data
    next()
  })
  api.use(express.json({ limit: '4mb' })) // room for one chat photo

  // Who is asking (optional on public routes).
  api.use((req, _res, next) => {
    const token = req.get('authorization')?.match(/^Bearer (.+)$/)?.[1]
    if (token) {
      const row = q.session.get(sha256(token), now())
      if (row) req.user = q.userById.get(row.user_id)
      req.tokenHash = sha256(token)
    }
    next()
  })

  const signedIn = (req, _res, next) => (req.user ? next() : next(new HttpError(401, 'Sign in first.')))

  function ownBusiness(req) {
    const b = q.business.get(req.params.id)
    if (!b || b.owner_id !== req.user.id) fail(404, 'Business not found.')
    return b
  }

  function startSession(userId) {
    const token = randomBytes(32).toString('base64url')
    q.dropExpired.run(now())
    q.addSession.run(sha256(token), userId, now() + SESSION_DAYS * 864e5)
    return token
  }

  function me(user) {
    const businesses = q.ownBusinesses.all(user.id).map(ownedBusiness)
    return {
      user,
      businesses,
      unread: businesses.reduce((n, b) => n + b.unread, 0),
      messagesUnread: chat.unreadFor(user.id),
    }
  }

  api.get('/health', (_req, res) => res.json({ ok: true }))

  /* Accounts */

  const authLimit = limiter({ max: 20, windowMs: 15 * 60e3, message: 'Too many tries. Wait a few minutes and try again.' })

  api.post('/auth/register', authLimit, (req, res) => {
    const name = text(req.body.name, { field: 'Your name', min: 2, max: 60 })
    const mail = email(req.body.email, { required: true })
    const password = typeof req.body.password === 'string' ? req.body.password : ''
    if (password.length < 8) fail(400, 'Use a password of at least 8 characters.')
    if (password.length > 200) fail(400, 'That password is too long.')
    if (q.userByEmail.get(mail)) fail(409, 'There’s already an account with this email. Sign in instead.')
    const { lastInsertRowid } = q.addUser.run(mail, name, hashPassword(password), now())
    const user = q.userById.get(Number(lastInsertRowid))
    res.status(201).json({ token: startSession(user.id), ...me(user) })
  })

  api.post('/auth/login', authLimit, (req, res) => {
    const mail = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : ''
    const password = typeof req.body.password === 'string' ? req.body.password : ''
    const row = mail && q.userByEmail.get(mail)
    if (!row || !checkPassword(password, row.password_hash)) fail(401, 'That email and password don’t match.')
    const user = q.userById.get(row.id)
    res.json({ token: startSession(user.id), ...me(user) })
  })

  api.post('/auth/logout', (req, res) => {
    if (req.tokenHash) q.dropSession.run(req.tokenHash)
    res.json({ ok: true })
  })

  api.get('/me', signedIn, (req, res) => res.json(me(req.user)))

  api.patch('/me', signedIn, (req, res) => {
    q.renameUser.run(text(req.body.name, { field: 'Your name', min: 2, max: 60 }), req.user.id)
    res.json(me(q.userById.get(req.user.id)))
  })

  // Deleting an account removes its businesses and their quote requests too.
  api.post('/me/delete', signedIn, authLimit, (req, res) => {
    const { password_hash } = q.passwordOf.get(req.user.id)
    if (!checkPassword(String(req.body.password ?? ''), password_hash)) fail(401, 'That password isn’t right.')
    const files = q.mediaOfOwner.all(req.user.id)
    q.deleteUser.run(req.user.id)
    removeFiles(files)
    res.json({ ok: true })
  })

  /* Businesses */

  const at = (req) => {
    const lat = Number(req.query.lat)
    const lng = Number(req.query.lng)
    return req.query.lat != null && Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null
  }

  // ?q=plumber&lat=..&lng=.. → people who do that job and work there.
  // Without q: the newest businesses that work there ("New on PuntMe").
  api.get('/businesses/search', (req, res) => {
    const query = String(req.query.q ?? '').slice(0, 100)
    const point = at(req)
    const list = q
      .liveBusinesses.all()
      .filter((b) => servesArea(b, point) && (!query || matchesQuery(b, query)))
      .slice(0, query ? 30 : 8)
      .map((b) => publicBusiness(b, point))
    res.json({ businesses: list })
  })

  api.get('/businesses/mine', signedIn, (req, res) => res.json({ businesses: q.ownBusinesses.all(req.user.id).map(ownedBusiness) }))

  api.get('/businesses/:id', (req, res) => {
    const b = q.business.get(req.params.id)
    const owner = req.user && b?.owner_id === req.user.id
    if (!b || (b.status !== 'live' && !owner)) fail(404, 'This business isn’t on PuntMe any more.')
    if (req.query.view && !owner) q.addView.run(b.id)
    res.json({ business: publicBusiness(b, at(req)) })
  })

  api.post('/businesses', signedIn, (req, res) => {
    if (q.countOwn.get(req.user.id).n >= 5) fail(400, 'You can add up to 5 businesses.')
    const v = businessInput(req.body, null)
    const id = newId()
    const t = now()
    db.prepare(
      `INSERT INTO businesses (id, owner_id, name, job, category_id, description, phone, whatsapp, email, website,
        area_label, lat, lng, radius_km, hours, logo, google_place_id, status, created_at, updated_at, published_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      id, req.user.id, v.name, v.job, v.category_id, v.description, v.phone, v.whatsapp, v.email, v.website,
      v.area_label, v.lat, v.lng, v.radius_km, v.hours, v.logo, v.google_place_id, v.status, t, t,
      v.status === 'live' ? t : null,
    )
    const b = q.business.get(id)
    if (b.status === 'live') announce(b)
    res.status(201).json({ business: ownedBusiness(b) })
  })

  api.patch('/businesses/:id', signedIn, (req, res) => {
    const current = ownBusiness(req)
    const v = businessInput(req.body, current)
    const firstPublish = v.status === 'live' && current.published_at == null
    db.prepare(
      `UPDATE businesses SET name = ?, job = ?, category_id = ?, description = ?, phone = ?, whatsapp = ?, email = ?,
        website = ?, area_label = ?, lat = ?, lng = ?, radius_km = ?, hours = ?, logo = ?, google_place_id = ?,
        status = ?, updated_at = ?, published_at = COALESCE(published_at, ?) WHERE id = ?`,
    ).run(
      v.name, v.job, v.category_id, v.description, v.phone, v.whatsapp, v.email, v.website, v.area_label, v.lat,
      v.lng, v.radius_km, v.hours, v.logo, v.google_place_id, v.status, now(), firstPublish ? now() : null, current.id,
    )
    const b = q.business.get(current.id)
    if (firstPublish) announce(b)
    res.json({ business: ownedBusiness(b) })
  })

  api.delete('/businesses/:id', signedIn, (req, res) => {
    const b = ownBusiness(req)
    const files = q.mediaOf.all(b.id)
    q.deleteBusiness.run(b.id)
    removeFiles(files)
    res.json({ ok: true })
  })

  /* Photos and videos */

  const mediaLimit = limiter({ max: 60, windowMs: 60 * 60e3, message: 'That’s a lot of uploads. Try again in an hour.' })

  // The file is the request body, its type in Content-Type.
  api.post(
    '/businesses/:id/media',
    signedIn,
    mediaLimit,
    express.raw({ type: ['image/*', 'video/*'], limit: `${MAX_VIDEO_MB}mb` }),
    (req, res) => {
      const b = ownBusiness(req)
      const type = MEDIA_TYPES[req.get('content-type')?.split(';')[0].trim().toLowerCase()]
      const body = req.body
      if (!type) fail(415, 'Choose a photo (JPEG, PNG or WebP) or a video (MP4, MOV or WebM).')
      if (!Buffer.isBuffer(body) || body.length < 16 || !type.starts(body)) fail(400, 'That file couldn’t be read. Try another one.')
      if (type.kind === 'photo' && body.length > MAX_PHOTO_BYTES) fail(413, 'That photo is too big.')

      const existing = q.mediaOf.all(b.id)
      if (existing.length >= MAX_MEDIA) fail(400, `You can add up to ${MAX_MEDIA} photos and videos. Delete one to add another.`)
      if (type.kind === 'video' && existing.filter((m) => m.kind === 'video').length >= MAX_VIDEOS) {
        fail(400, `You can add up to ${MAX_VIDEOS} videos. Delete one to add another.`)
      }

      const id = newId()
      const file = `${b.id}-${id}.${type.ext}`
      writeFileSync(join(mediaDir, file), body)
      q.addMedia.run(id, b.id, type.kind, file, body.length, now())
      res.status(201).json({ media: mediaJson(q.mediaItem.get(id, b.id)) })
    },
  )

  api.delete('/businesses/:id/media/:mediaId', signedIn, (req, res) => {
    const b = ownBusiness(req)
    const m = q.mediaItem.get(req.params.mediaId, b.id)
    if (!m) fail(404, 'That photo or video is already gone.')
    q.deleteMedia.run(m.id)
    removeFiles([m])
    res.json({ ok: true })
  })

  // Public files. Names are random and never reused, so they can be cached for good.
  api.get('/media/:file', (req, res, next) => {
    if (!MEDIA_FILE.test(req.params.file)) return next()
    res.set({ 'Cache-Control': 'public, max-age=31536000, immutable', 'X-Content-Type-Options': 'nosniff' })
    // sendFile answers Range requests, which iPhones need to play videos.
    res.sendFile(join(mediaDir, req.params.file), (err) => err && !res.headersSent && next())
  })

  /* Quote requests */

  const quoteLimit = limiter({ max: 8, windowMs: 60 * 60e3, message: 'You’ve sent a lot of requests. Try again in an hour.' })

  api.post('/businesses/:id/quotes', quoteLimit, async (req, res) => {
    const b = q.business.get(req.params.id)
    if (!b || b.status !== 'live') fail(404, 'This business isn’t taking requests right now.')
    const name = text(req.body.name, { field: 'Your name', min: 2, max: 60 })
    const phone = normalisePhone(req.body.phone)
    const message = longText(req.body.message, { field: 'Your message', max: 1000 })
    if (message.length < 5) fail(400, 'Tell them a little about the job.')
    const id = newId()
    q.addQuote.run(id, b.id, name, phone, message, now())

    const subs = q.userSubs.all(b.owner_id).filter((s) => parseJson(s.prefs, {}).quotes !== false)
    const delivered = await notify(subs, {
      title: `New quote request · ${b.name}`,
      body: `${name}: ${message.length > 110 ? `${message.slice(0, 110)}…` : message}`,
      url: `/?quotes=${b.id}`,
      tag: `quote-${id}`,
      urgency: 'high',
    })
    res.status(201).json({ ok: true, notified: delivered > 0 })
  })

  api.get('/quotes', signedIn, (req, res) => {
    const quotes = q.ownerQuotes.all(req.user.id).map((r) => ({
      id: r.id,
      businessId: r.business_id,
      businessName: r.business_name,
      name: r.name,
      phone: r.phone,
      message: r.message,
      createdAt: r.created_at,
      read: r.read_at != null,
    }))
    res.json({ quotes })
  })

  function ownQuote(req) {
    const row = q.quote.get(req.params.id)
    if (!row || row.owner_id !== req.user.id) fail(404, 'Request not found.')
    return row
  }

  api.post('/quotes/:id/read', signedIn, (req, res) => {
    q.markRead.run(now(), ownQuote(req).id)
    res.json({ ok: true })
  })

  api.delete('/quotes/:id', signedIn, (req, res) => {
    q.deleteQuote.run(ownQuote(req).id)
    res.json({ ok: true })
  })

  /* Push notifications */

  function subscription(body) {
    const s = body.subscription
    const endpoint = s?.endpoint
    if (typeof endpoint !== 'string' || !/^https:\/\//.test(endpoint) || endpoint.length > 1000) {
      fail(400, 'This browser sent an unknown push subscription.')
    }
    if (typeof s.keys?.p256dh !== 'string' || typeof s.keys?.auth !== 'string') fail(400, 'Push keys are missing.')
    return { endpoint, p256dh: s.keys.p256dh.slice(0, 200), auth: s.keys.auth.slice(0, 100) }
  }

  function prefsInput(value) {
    const p = value && typeof value === 'object' ? value : {}
    return { quotes: p.quotes !== false, alerts: p.alerts !== false, messages: p.messages !== false }
  }

  function alertsInput(value) {
    if (!Array.isArray(value)) return []
    return value.slice(0, 10).map((a) => ({
      id: typeof a.id === 'string' ? a.id.slice(0, 40) : newId(),
      query: text(a.query, { field: 'Alert job', min: 2, max: 60 }),
      label: typeof a.label === 'string' ? a.label.slice(0, 120) : null,
      lat: Number.isFinite(a.lat) ? a.lat : null,
      lng: Number.isFinite(a.lng) ? a.lng : null,
    }))
  }

  api.get('/push/key', (_req, res) => res.json({ publicKey: vapidPublicKey }))

  // Called whenever the app has a subscription: links it to whoever is
  // signed in (or nobody after signing out) and stores what they want.
  api.post('/push/subscribe', (req, res) => {
    const s = subscription(req.body)
    const prefs = prefsInput(req.body.prefs)
    // Job alerts only fire while "New people near me" is on.
    const alerts = prefs.alerts ? alertsInput(req.body.alerts) : []
    const t = now()
    q.upsertSub.run(s.endpoint, s.p256dh, s.auth, req.user?.id ?? null, JSON.stringify(prefs), JSON.stringify(alerts), t, t)
    res.json({ ok: true })
  })

  api.post('/push/unsubscribe', (req, res) => {
    if (typeof req.body.endpoint === 'string') q.dropSub.run(req.body.endpoint)
    res.json({ ok: true })
  })

  api.post('/push/test', limiter({ max: 10, windowMs: 10 * 60e3, message: 'That’s enough tests for now.' }), async (req, res) => {
    const sub = typeof req.body.endpoint === 'string' && q.sub.get(req.body.endpoint)
    if (!sub) fail(404, 'Turn on notifications first.')
    const sent = await notify([sub], {
      title: 'PuntMe notifications are on',
      body: req.user ? `Nice one, ${req.user.name.split(' ')[0]}. This is how quote requests will reach you.` : 'This is how PuntMe will let you know.',
      url: '/?profile=1',
      tag: 'test',
    })
    if (!sent) fail(502, 'The notification couldn’t be delivered. Turn notifications off and on again.')
    res.json({ ok: true })
  })

  /* Messages (server/chat.js) */

  const chat = chatRoutes({ api, db, notify, signedIn, fail, longText, limiter, dataDir })

  /* Errors */

  api.use((_req, _res, next) => next(new HttpError(404, 'Not found.')))
  // eslint-disable-next-line no-unused-vars
  api.use((err, req, res, _next) => {
    if (err.type === 'entity.too.large') {
      const error = req.path.endsWith('/media') ? `That video is too big. Videos can be up to ${MAX_VIDEO_MB} MB.` : 'That’s too much to send at once. Try a smaller logo.'
      return res.status(413).json({ error })
    }
    if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'The request wasn’t valid.' })
    if (!(err instanceof HttpError)) console.error('[api]', err)
    res.status(err.status ?? 500).json({ error: err instanceof HttpError ? err.message : 'Something went wrong on our side.' })
  })

  return api
}
