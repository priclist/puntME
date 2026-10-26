import { useCallback, useEffect, useState } from 'react'
import { PUSH_EVENT, deleteChat, listChats, listTime } from '../lib/chat.js'
import { usePush } from '../lib/push.js'
import { Icon } from '../ui/icons.jsx'
import { Avatar, ProfileButton, TabBar } from '../ui/pieces.jsx'
import { showToast } from '../ui/Toast.jsx'

// "Know when they reply": shown while notifications are off on this phone.
function NotifyCard() {
  const push = usePush()
  if (push.status !== 'off') return null
  return (
    <div className="pm-notifycard">
      <span className="pm-notifycard__icon" aria-hidden="true">
        <Icon name="bell" size={20} />
      </span>
      <span className="pm-stack-2 pm-grow">
        <span className="pm-title-15">Know when they reply</span>
        <span className="pm-meta">Get a notification for every new message.</span>
      </span>
      <button
        type="button"
        className="pm-btn pm-btn--primary"
        disabled={push.busy}
        onClick={() => push.enable().then(() => showToast('Notifications are on'), (err) => showToast(err.message))}
      >
        Turn on
      </button>
    </div>
  )
}

/**
 * Messages tab: every chat you're in, as a customer or as a business
 * owner, newest first, with a blue dot on the unread ones.
 */
export default function Messages({ account, onOpenChat, onNavigate, savedCount, onOpenProfile }) {
  const [chats, setChats] = useState({ status: 'loading', items: [] })
  const [editing, setEditing] = useState(false)
  const signedIn = Boolean(account.user)
  const { refresh } = account

  const load = useCallback(() => {
    listChats()
      .then((items) => setChats({ status: 'done', items }))
      .catch((err) => setChats((c) => (c.status === 'done' ? c : { status: 'error', items: [], error: err.message })))
  }, [])

  useEffect(() => {
    if (!signedIn) return
    load()
    const onVisible = () => document.visibilityState === 'visible' && load()
    const poll = setInterval(onVisible, 15_000)
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener(PUSH_EVENT, load)
    return () => {
      clearInterval(poll)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener(PUSH_EVENT, load)
    }
  }, [signedIn, load])

  async function remove(c) {
    setChats((s) => ({ ...s, items: s.items.filter((x) => x.id !== c.id) }))
    try {
      await deleteChat(c.id)
      refresh()
    } catch (err) {
      showToast(err.message)
      load()
    }
  }

  const items = chats.items
  const unread = account.messagesUnread

  return (
    <div className="pm-screen">
      <main className="pm-scroll pm-scroll--discover pm-scroll--chats">
        <header className="pm-pagehead">
          <h1 className="pm-hero pm-hero--page">Messages</h1>
          <span className="pm-pagehead__actions">
            {signedIn && items.length > 0 && (
              <button type="button" className="pm-textlink pm-textlink--pad" aria-pressed={editing} onClick={() => setEditing((e) => !e)}>
                {editing ? 'Done' : 'Edit'}
              </button>
            )}
            <ProfileButton account={account} onOpen={onOpenProfile} />
          </span>
        </header>

        {!signedIn && account.status !== 'loading' ? (
          <div className="pm-chatempty">
            <span className="pm-chatempty__icon" aria-hidden="true">
              <Icon name="message" size={30} />
            </span>
            <p className="pm-chatempty__title">Message businesses</p>
            <p className="pm-meta">
              Sign in to chat with businesses on PuntMe about prices and times. Business owners answer their customers here too.
            </p>
            <button type="button" className="pm-btn pm-btn--primary pm-empty__btn" onClick={onOpenProfile}>
              Sign in or create account
            </button>
          </div>
        ) : (
          <>
            <NotifyCard />

            {chats.status === 'loading' && (
              <ul className="pm-chatlist" aria-busy="true" aria-label="Loading messages">
                {[0, 1, 2, 3].map((i) => (
                  <li key={i} className="pm-chatrow pm-chatrow--skel">
                    <span className="pm-chatrow__dot" />
                    <span className="pm-skel pm-skel--round" />
                    <span className="pm-stack-4 pm-grow">
                      <span className="pm-skel" style={{ width: `${40 + ((i * 13) % 30)}%` }} />
                      <span className="pm-skel" style={{ width: `${60 + ((i * 7) % 25)}%` }} />
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {chats.status === 'error' && (
              <div className="pm-empty">
                <p className="pm-title-15">Couldn’t load your messages</p>
                <p className="pm-meta">{chats.error}</p>
                <button type="button" className="pm-btn pm-btn--primary pm-empty__btn" onClick={load}>
                  Try again
                </button>
              </div>
            )}

            {chats.status === 'done' && items.length === 0 && (
              <div className="pm-chatempty">
                <span className="pm-chatempty__icon" aria-hidden="true">
                  <Icon name="message" size={30} />
                </span>
                <p className="pm-chatempty__title">No messages yet</p>
                <p className="pm-meta">
                  Tap Message on any business with the green tick to ask about prices or times. Messages from your own customers show up here too.
                </p>
                <button type="button" className="pm-btn pm-btn--primary pm-empty__btn" onClick={() => onNavigate('discover')}>
                  Find someone
                </button>
              </div>
            )}

            {items.length > 0 && (
              <ul className="pm-chatlist" aria-label={unread ? `Chats, ${unread} unread` : 'Chats'}>
                {items.map((c) => (
                  <li key={c.id} className="pm-chatrow-wrap">
                    <button
                      type="button"
                      className={`pm-chatrow ${c.unread ? 'is-unread' : ''}`}
                      onClick={() => !editing && onOpenChat(c)}
                      aria-label={`${c.title}${c.unread ? `, ${c.unread} unread` : ''}`}
                    >
                      <span className="pm-chatrow__dot">{c.unread > 0 && <span className="pm-unread-dot" />}</span>
                      <Avatar provider={{ name: c.title, logo: c.logo }} size="chat" />
                      <span className="pm-chatrow__main">
                        <span className="pm-chatrow__top">
                          <span className="pm-chatrow__name">{c.title}</span>
                          {c.muted && <Icon name="bellOff" size={14} className="pm-muted" />}
                          <span className="pm-chatrow__time">{listTime(c.lastMessageAt)}</span>
                          {!editing && <Icon name="chevronRight" size={16} strokeWidth={2} className="pm-chatrow__chevron" />}
                        </span>
                        {c.subtitle && <span className="pm-chatrow__to">To {c.subtitle}</span>}
                        <span className="pm-chatrow__preview">{c.preview || 'No messages yet'}</span>
                      </span>
                    </button>
                    {editing && (
                      <button type="button" className="pm-chatrow__delete" onClick={() => remove(c)}>
                        Delete
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </main>
      <TabBar active="messages" onNavigate={onNavigate} savedCount={savedCount} />
    </div>
  )
}
