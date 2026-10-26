import { withAlert } from '../lib/push.js'
import { Icon } from './icons.jsx'
import { SwitchRow } from './pieces.jsx'
import { showToast } from './Toast.jsx'

const shortArea = (label) => label?.split(',')[0] ?? null

/**
 * Push notification controls. `push` comes from usePush(); `suggestion`
 * ({ query, place }) offers a one-tap job alert for the last search.
 */
export default function NotificationSettings({ push, hasBusiness, suggestion, onShowInstall }) {
  const { status, settings, busy } = push

  // Every action reports its own problem instead of failing quietly.
  const attempt = (fn, success) => async () => {
    try {
      await fn()
      if (success) showToast(success)
    } catch (err) {
      showToast(err.message)
    }
  }

  const setPref = (key) => (value) =>
    attempt(() => push.update((s) => ({ ...s, prefs: { ...s.prefs, [key]: value } })))()

  const removeAlert = (id) => attempt(() => push.update((s) => ({ ...s, alerts: s.alerts.filter((a) => a.id !== id) })))()

  const canSuggest =
    suggestion?.query &&
    !settings.alerts.some((a) => a.query.toLowerCase() === suggestion.query.toLowerCase() && a.label === (suggestion.place?.label ?? null))

  const addSuggestion = attempt(
    () => push.update((s) => withAlert(s, suggestion)),
    `You’ll hear when new ${suggestion?.query.toLowerCase()} people join near you`,
  )

  let body
  if (status === 'checking') {
    body = (
      <div className="pm-detail">
        <span className="pm-meta">Checking notifications…</span>
      </div>
    )
  } else if (status === 'unsupported') {
    body = (
      <div className="pm-detail">
        <Icon name="bell" size={20} className="pm-muted" />
        <span className="pm-meta">This browser can’t show notifications. Open PuntMe in Chrome, Edge or Safari on your phone.</span>
      </div>
    )
  } else if (status === 'needs-install') {
    body = (
      <button type="button" className="pm-detail pm-detail--button" onClick={onShowInstall}>
        <Icon name="bell" size={20} className="pm-accent" />
        <span className="pm-stack-2 pm-grow">
          <span className="pm-detail__main">Add PuntMe to your Home Screen</span>
          <span className="pm-meta">On iPhone, notifications work once PuntMe is installed. It takes two taps.</span>
        </span>
        <Icon name="chevronRight" size={18} strokeWidth={2} className="pm-muted" />
      </button>
    )
  } else if (status === 'denied') {
    body = (
      <button type="button" className="pm-detail pm-detail--button" onClick={push.recheck}>
        <Icon name="bell" size={20} className="pm-danger" />
        <span className="pm-stack-2 pm-grow">
          <span className="pm-detail__main">Notifications are blocked</span>
          <span className="pm-meta">Allow notifications for PuntMe in your phone or browser settings, then tap here.</span>
        </span>
      </button>
    )
  } else {
    const on = status === 'on'
    body = (
      <>
        <SwitchRow
          icon="bell"
          title="Push notifications"
          note={on ? 'On for this phone' : hasBusiness ? 'Hear about quote requests the moment they arrive' : 'Hear when new people join near you'}
          checked={on}
          disabled={busy}
          onChange={(next) =>
            attempt(next ? push.enable : push.disable, next ? 'Notifications are on' : 'Notifications are off')()
          }
        />
        {on && hasBusiness && (
          <SwitchRow
            icon="inbox"
            title="Quote requests"
            note="When a customer asks your business for a quote"
            checked={settings.prefs.quotes}
            disabled={busy}
            onChange={setPref('quotes')}
          />
        )}
        {on && (
          <SwitchRow
            icon="store"
            title="New people near me"
            note="When someone doing a job you follow joins nearby"
            checked={settings.prefs.alerts}
            disabled={busy}
            onChange={setPref('alerts')}
          />
        )}
        {on &&
          settings.prefs.alerts &&
          settings.alerts.map((a) => (
            <div key={a.id} className="pm-detail pm-detail--button pm-detail--inset">
              <span className="pm-stack-2 pm-grow">
                <span className="pm-detail__main">{a.query}</span>
                <span className="pm-meta">{a.label ? `Near ${shortArea(a.label)}` : 'Anywhere in South Africa'}</span>
              </span>
              <button type="button" className="pm-iconbtn pm-iconbtn--sm" aria-label={`Stop alerts for ${a.query}`} onClick={() => removeAlert(a.id)}>
                <Icon name="close" size={16} strokeWidth={2} />
              </button>
            </div>
          ))}
        {on && settings.prefs.alerts && canSuggest && (
          <button type="button" className="pm-detail pm-detail--button pm-detail--inset" onClick={addSuggestion} disabled={busy}>
            <Icon name="plus" size={18} strokeWidth={2} className="pm-accent" />
            <span className="pm-detail__main pm-accent pm-grow pm-ellipsis">
              Follow {suggestion.query.toLowerCase()}
              {suggestion.place ? ` near ${shortArea(suggestion.place.label)}` : ''}
            </span>
          </button>
        )}
        {on && (
          <button
            type="button"
            className="pm-detail pm-detail--button"
            onClick={attempt(push.test, 'Test sent. It should pop up in a moment.')}
            disabled={busy}
          >
            <Icon name="send" size={20} className="pm-muted" />
            <span className="pm-detail__main pm-grow">Send a test notification</span>
          </button>
        )}
      </>
    )
  }

  return (
    <section className="pm-stack-12" aria-labelledby="notif-heading">
      <h2 id="notif-heading" className="pm-h2">Notifications</h2>
      <div className="pm-card">{body}</div>
      {status === 'on' && settings.prefs.alerts && settings.alerts.length === 0 && !canSuggest && (
        <p className="pm-meta pm-m0 pm-pad-x-4">Search for a job, then tap “Notify me” under the results to follow it.</p>
      )}
    </section>
  )
}
