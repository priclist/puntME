import { useEffect, useState } from 'react'
import { api } from '../lib/api.js'
import { startChat } from '../lib/chat.js'
import { whatsappHref } from '../lib/format.js'
import { useLocalStorage } from '../lib/useLocalStorage.js'
import { Icon } from './icons.jsx'
import Sheet from './Sheet.jsx'

/**
 * "Ask for a quote" for businesses on PuntMe. Signed in, the request starts
 * a chat with the business; otherwise it lands in the owner's quote
 * requests with your name and number. Either way it reaches their phone.
 */
export default function QuoteSheet({ open, provider: p, onClose, signedIn = false, onOpenChat }) {
  // Remembered so the next request is one tap.
  const [me, setMe] = useLocalStorage('puntme:contact', { name: '', phone: '' })
  const [message, setMessage] = useState('')
  const [state, setState] = useState({ status: 'idle', error: null })

  useEffect(() => {
    if (open) {
      setState({ status: 'idle', error: null })
      setMessage(
        `Hi ${p.name}, I found you on PuntMe. Could I please get a quote${p.category ? ` for ${p.category.toLowerCase()} work` : ''}? `,
      )
    }
  }, [open, p])

  async function submit(e) {
    e.preventDefault()
    setState({ status: 'sending', error: null })
    try {
      if (signedIn) {
        const { conversation } = await startChat(p.bizId, message.trim())
        setState({ status: 'sent', error: null, chatId: conversation.id })
        navigator.vibrate?.(12)
        return
      }
      const { notified } = await api(`/businesses/${encodeURIComponent(p.bizId)}/quotes`, { method: 'POST', body: { ...me, message } })
      setState({ status: 'sent', error: null, notified })
      navigator.vibrate?.(12)
    } catch (err) {
      setState({ status: 'idle', error: err.message })
    }
  }

  const whatsapp = whatsappHref(p, message)
  const first = me.name.trim().split(' ')[0]

  return (
    <Sheet open={open} onClose={onClose} labelledBy="quote-title">
      <div className="pm-row-between">
        <h2 id="quote-title" className="pm-h2">
          Ask for a quote
        </h2>
        <button type="button" className="pm-textlink" onClick={onClose}>
          {state.status === 'sent' ? 'Done' : 'Cancel'}
        </button>
      </div>

      {state.status === 'sent' ? (
        <div className="pm-sent">
          <span className="pm-sent__icon" aria-hidden="true">
            <Icon name="check" size={30} strokeWidth={2.4} />
          </span>
          <p className="pm-title-15 pm-m0">Sent to {p.name}</p>
          {state.chatId ? (
            <>
              <p className="pm-meta pm-m0">They’ll reply in Messages, and you’ll get a notification when they do.</p>
              <button type="button" className="pm-btn pm-btn--primary pm-btn--block pm-sent__btn" onClick={() => onOpenChat(state.chatId)}>
                Open chat
              </button>
            </>
          ) : (
            <>
              <p className="pm-meta pm-m0">
                {first ? `Thanks, ${first}. ` : ''}
                {state.notified ? 'It just popped up on their phone.' : 'It’s waiting in their PuntMe inbox.'} They’ll contact you on{' '}
                {me.phone}.
              </p>
              <button type="button" className="pm-btn pm-btn--primary pm-btn--block pm-sent__btn" onClick={onClose}>
                Done
              </button>
            </>
          )}
        </div>
      ) : (
        <form className="pm-form" onSubmit={submit}>
          <p className="pm-meta pm-m0 pm-pad-x-4">
            {signedIn
              ? `${p.name} gets this straight away and replies in Messages.`
              : `${p.name} gets this straight away and replies to your phone. Sign in from your profile to chat with them in PuntMe instead.`}
          </p>
          <div className="pm-card">
            {!signedIn && (
              <>
                <label className="pm-input">
                  <span className="pm-input__label">Your name</span>
                  <input
                    required
                    minLength={2}
                    autoComplete="name"
                    enterKeyHint="next"
                    value={me.name}
                    onChange={(e) => setMe((m) => ({ ...m, name: e.target.value }))}
                  />
                </label>
                <label className="pm-input">
                  <span className="pm-input__label">Your phone number</span>
                  <input
                    required
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="082 123 4567"
                    enterKeyHint="next"
                    value={me.phone}
                    onChange={(e) => setMe((m) => ({ ...m, phone: e.target.value }))}
                  />
                </label>
              </>
            )}
            <label className="pm-input">
              <span className="pm-input__label">What do you need done?</span>
              <textarea required rows={4} maxLength={1000} value={message} onChange={(e) => setMessage(e.target.value)} />
            </label>
          </div>

          {state.error && (
            <p className="pm-meta pm-error pm-m0 pm-pad-x-4" role="alert">
              {state.error}
            </p>
          )}

          <button type="submit" className="pm-btn pm-btn--primary pm-btn--big pm-btn--block" disabled={state.status === 'sending'}>
            <Icon name="send" size={18} strokeWidth={2} />
            {state.status === 'sending' ? 'Sending…' : 'Send request'}
          </button>
          {whatsapp && (
            <a className="pm-btn pm-btn--soft pm-btn--block" href={whatsapp} target="_blank" rel="noreferrer">
              <Icon name="chat" size={18} />
              Send on WhatsApp instead
            </a>
          )}
        </form>
      )}
    </Sheet>
  )
}
