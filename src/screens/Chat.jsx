import { Fragment, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import {
  EDIT_WINDOW_MS,
  PUSH_EVENT,
  chatWith,
  clearChatNotifications,
  clockTime,
  deleteChat,
  editMessage,
  getChat,
  markChatRead,
  muteChat,
  photoFromFile,
  sendMessage,
  startChat,
  threadStamp,
  unsendMessage,
} from '../lib/chat.js'
import { displayPhone } from '../lib/businesses.js'
import { telHref } from '../lib/format.js'
import { Icon } from '../ui/icons.jsx'
import { Avatar } from '../ui/pieces.jsx'
import Sheet from '../ui/Sheet.jsx'
import { showToast } from '../ui/Toast.jsx'

/** A new time divider when messages are further apart than this. */
const STAMP_GAP_MS = 15 * 60_000
/** Messages from one person this close together share a group (one tail). */
const GROUP_GAP_MS = 3 * 60_000
const LONG_PRESS_MS = 380
const POLL_MS = 4000

function ActionRow({ icon, label, onClick, danger = false, href }) {
  const content = (
    <>
      <Icon name={icon} size={20} className={danger ? 'pm-danger' : 'pm-accent'} />
      <span className={`pm-detail__main pm-grow ${danger ? 'pm-danger' : ''}`}>{label}</span>
    </>
  )
  return href ? (
    <a className="pm-detail pm-detail--button" href={href} onClick={onClick}>
      {content}
    </a>
  ) : (
    <button type="button" className="pm-detail pm-detail--button" onClick={onClick}>
      {content}
    </button>
  )
}

/**
 * One chat, like iOS Messages: floating back button, centred avatar and
 * name, bubbles with tails on the last of each run, time dividers, Sent /
 * Read under your latest message, press and hold for Copy / Edit / Unsend,
 * photos, and a composer that rides the keyboard.
 *
 * Opened with `convId`, or with `business` ({ bizId, name, logo }) from a
 * business page, where the chat starts with the first message sent.
 */
export default function Chat({ convId, business, myId, onBack, onOpenBusiness, onRead }) {
  const [conv, setConv] = useState(null)
  const [messages, setMessages] = useState([])
  const [status, setStatus] = useState('loading')
  const [pending, setPending] = useState([])
  const [draft, setDraft] = useState('')
  const [editing, setEditing] = useState(null)
  const [actionsFor, setActionsFor] = useState(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [viewing, setViewing] = useState(null)
  const [kb, setKb] = useState(0)
  const scrollRef = useRef(null)
  const inputRef = useRef(null)
  const photoInput = useRef(null)
  const stickToBottom = useRef(true)
  const convRef = useRef(null)
  convRef.current = conv

  /* ---------- Loading and live updates ---------- */

  const load = useCallback(async () => {
    try {
      let id = convRef.current?.id ?? convId
      if (!id && business) {
        const existing = await chatWith(business.bizId)
        if (!existing) {
          setStatus('ready') // a new chat: it starts with the first message
          return
        }
        id = existing.id
      }
      const data = await getChat(id)
      setConv(data.conversation)
      setMessages(data.messages)
      setStatus('ready')
    } catch (err) {
      // A failed poll keeps the chat on screen; only a first load shows the error.
      if (err.status === 404) setStatus('gone')
      else setStatus((s) => (s === 'ready' ? s : 'error'))
    }
  }, [convId, business])

  useEffect(() => {
    load()
    const tick = () => document.visibilityState === 'visible' && convRef.current && load()
    const poll = setInterval(tick, POLL_MS)
    document.addEventListener('visibilitychange', tick)
    window.addEventListener(PUSH_EVENT, tick)
    return () => {
      clearInterval(poll)
      document.removeEventListener('visibilitychange', tick)
      window.removeEventListener(PUSH_EVENT, tick)
    }
  }, [load])

  // Reading the chat: mark it read and take its notifications away.
  const lastTheirs = [...messages].reverse().find((m) => m.senderId !== myId)?.id
  useEffect(() => {
    const id = conv?.id
    if (!id) return
    clearChatNotifications(id)
    if (lastTheirs && document.visibilityState === 'visible') markChatRead(id).then(onRead, () => {})
  }, [conv?.id, lastTheirs, onRead])

  /* ---------- Scrolling and the keyboard ---------- */

  const count = messages.length + pending.length
  useLayoutEffect(() => {
    const el = scrollRef.current
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight
  }, [count, kb, status])

  function onScroll() {
    const el = scrollRef.current
    if (el) stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80
  }

  // iOS doesn't shrink the page for the keyboard, so lift the composer.
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const sync = () => setKb(Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop)))
    vv.addEventListener('resize', sync)
    vv.addEventListener('scroll', sync)
    return () => {
      vv.removeEventListener('resize', sync)
      vv.removeEventListener('scroll', sync)
    }
  }, [])

  // The text field grows with its text, up to about five lines.
  useLayoutEffect(() => {
    const el = inputRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`
  }, [draft])

  /* ---------- Sending: the bubble shows at once, the server catches up ---------- */

  async function deliver(item) {
    try {
      let saved
      if (convRef.current) {
        saved = await sendMessage(convRef.current.id, item.body, item.dataUrl)
      } else {
        const r = await startChat(business.bizId, item.body, item.dataUrl)
        setConv(r.conversation)
        saved = r.message
      }
      setMessages((ms) => [...ms.filter((m) => m.id !== saved.id), saved])
      setPending((p) => p.filter((x) => x.tempId !== item.tempId))
    } catch (err) {
      setPending((p) => p.map((x) => (x.tempId === item.tempId ? { ...x, status: 'failed', error: err.message } : x)))
    }
  }

  function queue(body, dataUrl, preview) {
    const item = { tempId: `temp-${Date.now()}-${Math.random()}`, body, dataUrl, preview, status: 'sending', createdAt: Date.now() }
    stickToBottom.current = true
    setPending((p) => [...p, item])
    navigator.vibrate?.(8)
    deliver(item)
  }

  function retry(item) {
    setPending((p) => p.map((x) => (x.tempId === item.tempId ? { ...x, status: 'sending' } : x)))
    deliver(item)
  }

  async function submit() {
    const body = draft.trim()
    if (!body) return
    setDraft('')
    inputRef.current?.focus()
    if (editing) {
      const target = editing
      setEditing(null)
      setMessages((ms) => ms.map((m) => (m.id === target.id ? { ...m, body, editedAt: Date.now() } : m)))
      try {
        const saved = await editMessage(target.id, body)
        setMessages((ms) => ms.map((m) => (m.id === saved.id ? saved : m)))
      } catch (err) {
        showToast(err.message)
        load()
      }
      return
    }
    queue(body, null, null)
  }

  async function onPhotoPicked(e) {
    const file = e.target.files?.[0]
    e.target.value = '' // picking the same photo again still fires
    if (!file) return
    try {
      const dataUrl = await photoFromFile(file)
      queue(draft.trim(), dataUrl, dataUrl)
      setDraft('')
    } catch (err) {
      showToast(err.message)
    }
  }

  /* ---------- Press and hold a bubble for actions ---------- */

  const press = useRef(null)
  const onBubbleDown = (m) => (e) => {
    if (m.deleted) return
    const timer = setTimeout(() => {
      navigator.vibrate?.(10)
      setActionsFor(m)
      press.current = null
    }, LONG_PRESS_MS)
    press.current = { x: e.clientX, y: e.clientY, timer }
  }
  const onBubbleMove = (e) => {
    const p = press.current
    if (p && Math.hypot(e.clientX - p.x, e.clientY - p.y) > 8) {
      clearTimeout(p.timer)
      press.current = null
    }
  }
  const onBubbleUp = () => {
    if (press.current) clearTimeout(press.current.timer)
    press.current = null
  }

  async function unsend(m) {
    setActionsFor(null)
    setMessages((ms) => ms.map((x) => (x.id === m.id ? { ...x, deleted: true, body: '', photo: null } : x)))
    try {
      await unsendMessage(m.id)
    } catch (err) {
      showToast(err.message)
      load()
    }
  }

  function startEdit(m) {
    setActionsFor(null)
    setEditing(m)
    setDraft(m.body)
    requestAnimationFrame(() => inputRef.current?.focus())
  }

  async function toggleMute() {
    setMenuOpen(false)
    const muted = !conv.muted
    setConv((c) => ({ ...c, muted }))
    try {
      await muteChat(conv.id, muted)
      showToast(muted ? 'Notifications muted for this chat' : 'Notifications on for this chat')
    } catch (err) {
      showToast(err.message)
    }
  }

  async function remove() {
    setMenuOpen(false)
    if (!window.confirm('Delete this chat from your messages? It comes back if they send a new message.')) return
    try {
      await deleteChat(conv.id)
      onRead?.()
      onBack()
    } catch (err) {
      showToast(err.message)
    }
  }

  /* ---------- Render ---------- */

  const title = conv?.title ?? business?.name ?? ''
  const logo = conv ? conv.logo : business?.logo
  const isCustomer = conv ? conv.side === 'customer' : Boolean(business)
  const bizId = conv?.businessId ?? business?.bizId
  const canSend = status === 'ready' && (!conv || conv.side === 'owner' || conv.businessLive)

  const myLatest = [...messages].reverse().find((m) => m.senderId === myId && !m.deleted)
  const myLatestRead = Boolean(myLatest && conv && conv.otherReadAt >= myLatest.createdAt)

  // Server messages first, then the ones still on their way.
  const rows = [
    ...messages.map((m) => ({ ...m, mine: m.senderId === myId })),
    ...pending.map((p) => ({ id: p.tempId, body: p.body, photo: p.preview, createdAt: p.createdAt, mine: true, pending: p })),
  ]

  return (
    <div className="pm-screen pm-chat">
      <header className="pm-chat__bar">
        <button type="button" className="pm-roundbtn" aria-label="Back" onClick={onBack}>
          <Icon name="back" size={22} strokeWidth={2.2} />
        </button>
        <button
          type="button"
          className="pm-chat__who"
          onClick={() => isCustomer && bizId && onOpenBusiness(bizId)}
          disabled={!isCustomer}
          aria-label={isCustomer ? `${title}, open business page` : title}
        >
          <Avatar provider={{ name: title || '?', logo }} size="chathead" />
          <span className="pm-chat__name">
            <span>{title || ' '}</span>
            {isCustomer && <Icon name="chevronRight" size={14} strokeWidth={2.4} />}
          </span>
          {conv?.subtitle && <span className="pm-chat__sub">Customer of {conv.subtitle}</span>}
        </button>
        <button type="button" className="pm-roundbtn" aria-label="Chat options" onClick={() => setMenuOpen(true)} disabled={!conv}>
          <Icon name="dots" size={20} />
        </button>
      </header>

      <div ref={scrollRef} className="pm-chat__thread" onScroll={onScroll}>
        {status === 'loading' && (
          <div className="pm-chat__skel" aria-busy="true" aria-label="Loading messages">
            {[
              ['l', 58],
              ['l', 40],
              ['r', 52],
              ['l', 66],
              ['r', 34],
            ].map(([side, w], i) => (
              <span key={i} className={`pm-skel pm-skel--bubble is-${side}`} style={{ width: `${w}%` }} />
            ))}
          </div>
        )}

        {(status === 'error' || status === 'gone') && (
          <div className="pm-chat__empty">
            <p className="pm-chat__empty-title">{status === 'gone' ? 'This chat isn’t available' : 'Couldn’t load this chat'}</p>
            <p className="pm-meta">{status === 'gone' ? 'It may have been removed.' : 'Check your connection and try again.'}</p>
            {status === 'error' && (
              <button type="button" className="pm-btn pm-btn--soft pm-empty__btn" onClick={load}>
                Try again
              </button>
            )}
          </div>
        )}

        {status === 'ready' && rows.length === 0 && (
          <div className="pm-chat__empty">
            <Avatar provider={{ name: title || '?', logo }} size="chatbig" />
            <p className="pm-chat__empty-title">{title}</p>
            <p className="pm-meta">
              {isCustomer
                ? `Ask about prices, times or anything else. ${title} gets your message on their phone and replies here.`
                : 'Say hello. Messages here are private between you and this customer.'}
            </p>
          </div>
        )}

        {rows.map((m, i) => {
          const prev = rows[i - 1]
          const next = rows[i + 1]
          const showStamp = !prev || m.createdAt - prev.createdAt > STAMP_GAP_MS
          const sameAsNext = Boolean(next && next.mine === m.mine && next.createdAt - m.createdAt < GROUP_GAP_MS && !next.deleted)
          const sameAsPrev = Boolean(prev && !showStamp && prev.mine === m.mine && m.createdAt - prev.createdAt < GROUP_GAP_MS && !prev.deleted)
          const stamp = showStamp ? threadStamp(m.createdAt) : null
          const failed = m.pending?.status === 'failed'

          if (m.deleted) {
            return (
              <Fragment key={m.id}>
                {stamp && (
                  <p className="pm-chat__stamp">
                    <b>{stamp.day}</b> {stamp.time}
                  </p>
                )}
                <p className="pm-chat__system">{m.mine ? 'You unsent a message' : `${title.split(' ')[0]} unsent a message`}</p>
              </Fragment>
            )
          }

          return (
            <Fragment key={m.id}>
              {stamp && (
                <p className="pm-chat__stamp">
                  <b>{stamp.day}</b> {stamp.time}
                </p>
              )}
              <div className={`pm-msg ${m.mine ? 'is-mine' : 'is-theirs'} ${sameAsPrev ? 'is-cont' : ''} ${m.pending ? 'is-new' : ''}`}>
                <div
                  className={`pm-bubble ${sameAsNext ? '' : 'has-tail'} ${m.pending && !failed ? 'is-pending' : ''} ${m.photo ? 'has-photo' : ''} ${m.photo && !m.body ? 'is-photo-only' : ''}`}
                  onPointerDown={m.pending ? undefined : onBubbleDown(m)}
                  onPointerMove={onBubbleMove}
                  onPointerUp={onBubbleUp}
                  onPointerCancel={onBubbleUp}
                  onContextMenu={(e) => {
                    e.preventDefault()
                    if (!m.pending) setActionsFor(m)
                  }}
                >
                  {m.photo && (
                    <button type="button" className="pm-bubble__pic" onClick={() => !m.pending && setViewing(m)} aria-label="View photo">
                      <img src={m.photo} alt="" loading="lazy" decoding="async" draggable={false} />
                      {m.pending && !failed && (
                        <span className="pm-bubble__busy" aria-hidden="true">
                          <span className="pm-spinner" />
                        </span>
                      )}
                      {!m.body && <span className="pm-bubble__pictime">{clockTime(m.createdAt)}</span>}
                    </button>
                  )}
                  {m.body && <span className="pm-bubble__text">{m.body}</span>}
                </div>
              </div>
              {m.editedAt && !m.deleted && <p className={`pm-chat__meta ${m.mine ? 'is-mine' : 'is-theirs'}`}>Edited</p>}
              {failed && (
                <button type="button" className="pm-chat__meta is-mine is-error" onClick={() => retry(m.pending)}>
                  Not delivered · Tap to try again
                </button>
              )}
              {m.pending && !failed && i === rows.length - 1 && <p className="pm-chat__meta is-mine">Sending…</p>}
              {!m.pending && m.id === myLatest?.id && !pending.length && (
                <p className="pm-chat__meta is-mine">{myLatestRead ? 'Read' : 'Sent'}</p>
              )}
            </Fragment>
          )
        })}
      </div>

      <div className="pm-chat__composer" style={kb ? { paddingBottom: kb + 8 } : undefined}>
        {conv && !canSend ? (
          <p className="pm-chat__note">This business isn’t taking messages right now.</p>
        ) : (
          <>
            {editing && (
              <div className="pm-chat__editing">
                <span>Editing message</span>
                <button
                  type="button"
                  aria-label="Cancel editing"
                  onClick={() => {
                    setEditing(null)
                    setDraft('')
                  }}
                >
                  <Icon name="close" size={14} strokeWidth={2.6} />
                </button>
              </div>
            )}
            <div className="pm-chat__row">
              <input ref={photoInput} type="file" accept="image/*" hidden onChange={onPhotoPicked} />
              <button
                type="button"
                className="pm-roundbtn pm-roundbtn--plus"
                aria-label="Send a photo"
                onClick={() => photoInput.current.click()}
                disabled={!canSend || Boolean(editing)}
              >
                <Icon name="plus" size={26} strokeWidth={2} />
              </button>
              <div className={`pm-chat__field ${draft.trim() ? 'has-text' : ''}`}>
                <textarea
                  ref={inputRef}
                  rows={1}
                  value={draft}
                  placeholder="Message"
                  aria-label="Message"
                  enterKeyHint="send"
                  maxLength={4000}
                  disabled={!canSend}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    // Enter sends on a computer; on a phone it makes a new line.
                    if (e.key === 'Enter' && !e.shiftKey && window.matchMedia('(pointer: fine)').matches) {
                      e.preventDefault()
                      submit()
                    }
                  }}
                />
                <button type="button" className="pm-chat__send" onClick={submit} disabled={!draft.trim()} aria-label={editing ? 'Save edit' : 'Send'}>
                  <Icon name="arrowUp" size={18} strokeWidth={3} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {viewing && (
        <div className="pm-photoviewer" role="dialog" aria-label="Photo" onClick={() => setViewing(null)}>
          <img src={viewing.photo} alt="" />
          <button type="button" className="pm-roundbtn pm-photoviewer__close" aria-label="Close photo" onClick={() => setViewing(null)}>
            <Icon name="close" size={20} strokeWidth={2.4} />
          </button>
          <p className="pm-photoviewer__meta">
            {viewing.mine ? 'You' : title} · {threadStamp(viewing.createdAt).day} {clockTime(viewing.createdAt)}
          </p>
        </div>
      )}

      <Sheet open={Boolean(actionsFor)} onClose={() => setActionsFor(null)} labelledBy="msg-actions" className="pm-sheet--short">
        <h2 id="msg-actions" className="pm-meta pm-m0 pm-center">
          {actionsFor &&
            new Date(actionsFor.createdAt).toLocaleString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
        </h2>
        <div className="pm-card">
          {actionsFor?.body && (
            <ActionRow
              icon="copy"
              label="Copy"
              onClick={() => {
                navigator.clipboard?.writeText(actionsFor.body).then(() => showToast('Copied'), () => {})
                setActionsFor(null)
              }}
            />
          )}
          {actionsFor?.mine && actionsFor.body && Date.now() - actionsFor.createdAt < EDIT_WINDOW_MS && (
            <ActionRow icon="pencil" label="Edit" onClick={() => startEdit(actionsFor)} />
          )}
          {actionsFor?.mine && <ActionRow icon="undo" label="Unsend" danger onClick={() => unsend(actionsFor)} />}
          {actionsFor && !actionsFor.mine && !actionsFor.body && (
            <ActionRow
              icon="eye"
              label="View photo"
              onClick={() => {
                setViewing(actionsFor)
                setActionsFor(null)
              }}
            />
          )}
        </div>
      </Sheet>

      <Sheet open={menuOpen} onClose={() => setMenuOpen(false)} labelledBy="chat-menu" className="pm-sheet--short">
        <h2 id="chat-menu" className="pm-h3 pm-center">
          {title}
        </h2>
        <div className="pm-card">
          {isCustomer && bizId && (
            <ActionRow
              icon="store"
              label="View business page"
              onClick={() => {
                setMenuOpen(false)
                onOpenBusiness(bizId)
              }}
            />
          )}
          {isCustomer && conv?.phone && <ActionRow icon="phone" label={`Call ${displayPhone(conv.phone)}`} href={telHref(conv.phone)} />}
          {conv && <ActionRow icon={conv.muted ? 'bell' : 'bellOff'} label={conv.muted ? 'Unmute notifications' : 'Mute notifications'} onClick={toggleMute} />}
          {conv && <ActionRow icon="trash" label="Delete chat" danger onClick={remove} />}
        </div>
      </Sheet>
    </div>
  )
}
