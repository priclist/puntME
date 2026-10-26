import { useEffect, useState } from 'react'
import { api } from '../lib/api.js'
import { displayPhone, shareUrl, toListing } from '../lib/businesses.js'
import { telHref, timeAgo, whatsappHref } from '../lib/format.js'
import { usePush } from '../lib/push.js'
import { Icon } from '../ui/icons.jsx'
import { Avatar } from '../ui/pieces.jsx'
import { showToast } from '../ui/Toast.jsx'

async function sharePage(b) {
  const url = shareUrl(b.id)
  const text = `${b.name}: ${b.job.toLowerCase()} in ${b.area.split(',')[0]}. Ask me for a quote on PuntMe.`
  if (navigator.share) {
    await navigator.share({ title: b.name, text, url }).catch(() => {})
    return
  }
  try {
    await navigator.clipboard.writeText(`${text}\n${url}`)
    showToast('Link copied. Paste it in WhatsApp or on Facebook.')
  } catch {
    showToast('Couldn’t copy the link on this device.')
  }
}

function QuoteCard({ quote: q, business, isNew, onDelete }) {
  // WhatsApp needs a real contact, so treat the customer like a listing.
  const reply = `Hi ${q.name.split(' ')[0]}, this is ${business.name}. Thanks for your quote request on PuntMe. `
  const whatsapp = whatsappHref({ intlPhone: q.phone }, reply)
  return (
    <article className={`pm-quote ${isNew ? 'is-new' : ''}`}>
      <div className="pm-quote__head">
        {isNew && <span className="pm-dot" aria-label="New" />}
        <span className="pm-stack-2 pm-grow">
          <strong className="pm-title-15 pm-ellipsis">{q.name}</strong>
          <span className="pm-meta">
            {displayPhone(q.phone)} · {timeAgo(q.createdAt)}
          </span>
        </span>
      </div>
      <p className="pm-quote__msg">{q.message}</p>
      <div className="pm-quote__actions">
        <a className="pm-btn pm-btn--primary" href={telHref(q.phone)}>
          <Icon name="phone" size={16} strokeWidth={2} />
          Call
        </a>
        {whatsapp && (
          <a className="pm-btn pm-btn--soft" href={whatsapp} target="_blank" rel="noreferrer">
            <Icon name="chat" size={16} />
            WhatsApp
          </a>
        )}
        <button type="button" className="pm-iconbtn pm-iconbtn--sm" aria-label={`Delete request from ${q.name}`} onClick={() => onDelete(q)}>
          <Icon name="trash" size={18} />
        </button>
      </div>
    </article>
  )
}

export default function MyBusiness({ bizId, account, justPublished, onBack, onEdit, onView, onShowProfile }) {
  const b = account.businesses.find((x) => x.id === bizId)
  const push = usePush()
  const [quotes, setQuotes] = useState({ status: 'loading', items: [], fresh: new Set() })
  const [busy, setBusy] = useState(false)
  const { refresh } = account

  // Load requests, then mark the new ones read (they stay highlighted here).
  useEffect(() => {
    let cancelled = false
    api('/quotes')
      .then(async ({ quotes: all }) => {
        if (cancelled) return
        const mine = all.filter((q) => q.businessId === bizId)
        const unread = mine.filter((q) => !q.read)
        setQuotes({ status: 'done', items: mine, fresh: new Set(unread.map((q) => q.id)) })
        if (unread.length) {
          await Promise.all(unread.map((q) => api(`/quotes/${q.id}/read`, { method: 'POST' }).catch(() => {})))
          refresh()
        }
      })
      .catch((err) => !cancelled && setQuotes({ status: 'error', items: [], fresh: new Set(), error: err.message }))
    return () => {
      cancelled = true
    }
  }, [bizId, refresh])

  if (!b) {
    return (
      <div className="pm-screen">
        <div className="pm-topbar">
          <button type="button" className="pm-iconbtn" aria-label="Back" onClick={onBack}>
            <Icon name="back" size={22} strokeWidth={2} />
          </button>
        </div>
        <main className="pm-scroll pm-scroll--page">
          {account.status === 'loading' ? (
            <div className="pm-listcard pm-skeleton" aria-hidden="true">
              <span className="pm-skel pm-skel--avatar" />
              <span className="pm-skel pm-grow" />
            </div>
          ) : (
            <div className="pm-empty">
              <p className="pm-title-15">{account.user ? 'This business isn’t in your profile' : 'Sign in to see your business'}</p>
              <button type="button" className="pm-btn pm-btn--primary pm-empty__btn" onClick={onShowProfile}>
                Go to profile
              </button>
            </div>
          )}
        </main>
      </div>
    )
  }

  const live = b.status === 'live'

  async function setStatus(status) {
    setBusy(true)
    try {
      await api(`/businesses/${b.id}`, { method: 'PATCH', body: { status } })
      await refresh()
      showToast(status === 'live' ? 'You’re live on PuntMe again' : 'Paused. Customers won’t see you until you go live.')
    } catch (err) {
      showToast(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    if (!window.confirm(`Remove ${b.name} from PuntMe? Its quote requests are deleted too.`)) return
    setBusy(true)
    try {
      await api(`/businesses/${b.id}`, { method: 'DELETE' })
      await refresh()
      showToast(`${b.name} was removed`)
      onBack()
    } catch (err) {
      showToast(err.message)
      setBusy(false)
    }
  }

  async function deleteQuote(q) {
    try {
      await api(`/quotes/${q.id}`, { method: 'DELETE' })
      setQuotes((s) => ({ ...s, items: s.items.filter((x) => x.id !== q.id) }))
      refresh()
    } catch (err) {
      showToast(err.message)
    }
  }

  async function turnOnPush() {
    try {
      await push.enable()
      showToast('Done. Quote requests will pop up on this phone.')
    } catch (err) {
      showToast(err.message)
    }
  }

  return (
    <div className="pm-screen">
      <div className="pm-topbar">
        <button type="button" className="pm-iconbtn" aria-label="Back" onClick={onBack}>
          <Icon name="back" size={22} strokeWidth={2} />
        </button>
        <button type="button" className="pm-textlink pm-textlink--pad" onClick={() => onEdit(b)}>
          Edit
        </button>
      </div>

      <main className="pm-scroll pm-scroll--page">
        {justPublished && (
          <div className="pm-celebrate" role="status">
            <span className="pm-celebrate__icon" aria-hidden="true">
              <Icon name="check" size={26} strokeWidth={2.6} />
            </span>
            <div className="pm-stack-2">
              <strong className="pm-title-15">You’re live on PuntMe</strong>
              <span className="pm-meta">People searching for {b.job.toLowerCase()} near {b.area.split(',')[0]} can find you now.</span>
            </div>
          </div>
        )}

        <header className="pm-bizhead">
          <Avatar provider={b} size="xl" />
          <div className="pm-stack-4 pm-center">
            <h1 className="pm-provider-name">{b.name}</h1>
            <p className="pm-provider-sub">
              {b.job}
              <span aria-hidden="true">·</span>
              {b.area.split(',')[0]}
            </p>
          </div>
          <span className={`pm-pill ${live ? 'pm-pill--live' : ''}`}>{live ? 'Live on PuntMe' : 'Paused'}</span>
        </header>

        <div className="pm-stats">
          <div>
            <strong>{b.views}</strong>
            <span>Page views</span>
          </div>
          <div>
            <strong>{b.quoteCount}</strong>
            <span>Quote requests</span>
          </div>
          <div>
            <strong>{b.radiusKm} km</strong>
            <span>You travel</span>
          </div>
        </div>

        <div className="pm-actions4 pm-actions4--3">
          <button type="button" className="pm-action" onClick={() => onView(toListing(b, null))}>
            <Icon name="eye" size={22} />
            View page
          </button>
          <button type="button" className="pm-action" onClick={() => sharePage(b)}>
            <Icon name="share" size={21} />
            Share
          </button>
          <button type="button" className="pm-action" onClick={() => setStatus(live ? 'paused' : 'live')} disabled={busy}>
            <Icon name={live ? 'pause' : 'play'} size={21} />
            {live ? 'Pause' : 'Go live'}
          </button>
        </div>

        {(push.status === 'off' || push.status === 'needs-install') && (
          <button
            type="button"
            className="pm-areanudge"
            onClick={push.status === 'off' ? turnOnPush : onShowProfile}
            disabled={push.busy}
          >
            <Icon name="bell" size={20} className="pm-accent" />
            <span className="pm-stack-2 pm-grow">
              <span className="pm-title-15">Get every request on your phone</span>
              <span className="pm-meta">
                {push.status === 'off' ? 'Turn on notifications so you never miss a job' : 'Install PuntMe first, then turn on notifications'}
              </span>
            </span>
            <Icon name="chevronRight" size={18} strokeWidth={2} className="pm-muted" />
          </button>
        )}

        <section className="pm-stack-12" aria-labelledby="quotes-heading">
          <h2 id="quotes-heading" className="pm-h2">Quote requests</h2>
          {quotes.status === 'loading' && (
            <div className="pm-quote pm-skeleton" aria-hidden="true">
              <span className="pm-skel" style={{ width: '40%' }} />
              <span className="pm-skel" style={{ width: '90%' }} />
            </div>
          )}
          {quotes.status === 'error' && <p className="pm-meta pm-error pm-m0 pm-pad-x-4">{quotes.error}</p>}
          {quotes.status === 'done' && quotes.items.length === 0 && (
            <div className="pm-empty">
              <Icon name="inbox" size={28} className="pm-muted" />
              <p className="pm-title-15">No requests yet</p>
              <p className="pm-meta">When someone asks for a quote it shows up here. Share your page to get your first one.</p>
              <button type="button" className="pm-btn pm-btn--soft pm-empty__btn" onClick={() => sharePage(b)}>
                Share your page
              </button>
            </div>
          )}
          {quotes.items.map((q) => (
            <QuoteCard key={q.id} quote={q} business={b} isNew={quotes.fresh.has(q.id)} onDelete={deleteQuote} />
          ))}
        </section>

        <div className="pm-card">
          <button type="button" className="pm-detail pm-detail--button" onClick={remove} disabled={busy}>
            <Icon name="trash" size={20} className="pm-danger" />
            <span className="pm-detail__main pm-danger pm-grow">Remove from PuntMe</span>
          </button>
        </div>
      </main>
    </div>
  )
}
