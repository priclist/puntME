import { CATEGORIES } from '../data/categories.js'
import { directionsHref, formatDistance, hoursNote, telHref, whatsappHref } from '../lib/format.js'
<<<<<<< Updated upstream
import { usePush, withAlert } from '../lib/push.js'
import { Icon } from '../ui/icons.jsx'
import { ActionLink, Avatar, Rating, SaveButton, SkeletonCard, SourceBadge } from '../ui/pieces.jsx'
import { showToast } from '../ui/Toast.jsx'
=======
import { GoogleBadge, Icon } from '../ui/icons.jsx'
import { ActionLink, Avatar, Rating, SaveButton, SkeletonCard } from '../ui/pieces.jsx'
>>>>>>> Stashed changes

const FILTERS = [
  { id: 'open', label: 'Open now' },
  { id: 'rated', label: '4.5+ stars' },
  { id: 'near', label: 'Within 5 km', needsDistance: true },
]

function ResultCard({ provider: p, saved, onOpen, onToggleSave }) {
  const note = hoursNote(p.periods)
  return (
    <article className="pm-resultcard">
      <div className="pm-resultcard__top">
        <button type="button" className="pm-linkreset" onClick={() => onOpen(p)} tabIndex={-1} aria-hidden="true">
          <Avatar provider={p} size="lg" />
        </button>
        <div className="pm-resultcard__title">
          <button type="button" className="pm-name-row pm-linkreset" onClick={() => onOpen(p)}>
            <span className="pm-name pm-name--lg">{p.name}</span>
<<<<<<< Updated upstream
            <SourceBadge provider={p} size={16} />
=======
            {!p.demo && <GoogleBadge size={16} />}
>>>>>>> Stashed changes
          </button>
          <span className="pm-meta">
            <Rating provider={p} long />
          </span>
        </div>
        <SaveButton saved={saved} onToggle={() => onToggleSave(p)} name={p.name} />
      </div>

      <div className="pm-infolines">
        {p.address && (
          <span>
            <Icon name="pin" size={16} className="pm-muted" />
            <span className="pm-ellipsis">
              {p.address}
              {p.distanceKm != null && ` · ${formatDistance(p.distanceKm)} away`}
            </span>
          </span>
        )}
        {(p.openNow != null || note) && (
          <span>
            <Icon name="clock" size={16} className={p.openNow ? 'pm-green' : 'pm-muted'} />
            <span>
              <strong className={p.openNow ? 'pm-green' : 'pm-ink'}>{p.openNow ? 'Open' : 'Closed'}</strong>
              {note && ` · ${note}`}
            </span>
          </span>
        )}
      </div>

      <div className="pm-actions3">
        <ActionLink className="pm-btn pm-btn--primary" href={telHref(p.phone)} demo={p.demo}>
          <Icon name="phone" size={16} strokeWidth={2} />
          Call
        </ActionLink>
        <ActionLink className="pm-btn pm-btn--soft" href={whatsappHref(p)} external demo={p.demo}>
          <Icon name="chat" size={16} strokeWidth={1.9} />
          WhatsApp
        </ActionLink>
        <ActionLink className="pm-btn pm-btn--soft" href={directionsHref(p)} external>
          <Icon name="route" size={16} strokeWidth={1.9} />
          Route
        </ActionLink>
      </div>
    </article>
  )
}

<<<<<<< Updated upstream
// "Notify me when a new plumber joins near Sandton" under the results.
function AlertCard({ query, jobTitle, place, onShowInstall }) {
  const push = usePush()
  if (push.status === 'unsupported' || push.status === 'checking') return null
  const area = place ? (place.source === 'gps' ? 'you' : place.label.split(',')[0]) : 'you'
  const following =
    push.status === 'on' &&
    push.settings.prefs.alerts &&
    push.settings.alerts.some((a) => a.query.toLowerCase() === query.toLowerCase() && a.label === (place?.label ?? null))

  async function follow() {
    if (push.status === 'needs-install') return onShowInstall()
    if (push.status === 'denied') return showToast('Notifications are blocked. Allow them for PuntMe in your settings.')
    try {
      if (push.status === 'off') await push.enable()
      await push.update((s) => withAlert(s, { query, place }))
      showToast(`We’ll let you know when new ${jobTitle.toLowerCase()} join near ${area}`)
    } catch (err) {
      showToast(err.message)
    }
  }

  return (
    <div className="pm-alertcard">
      <Icon name="bell" size={22} className="pm-accent" filled={following} />
      <span className="pm-stack-2 pm-grow">
        <span className="pm-title-15">{following ? 'You’re following this' : 'Know when someone new joins'}</span>
        <span className="pm-meta">
          {following
            ? `You’ll get a notification when new ${jobTitle.toLowerCase()} join near ${area}.`
            : `Get a notification when new ${jobTitle.toLowerCase()} join PuntMe near ${area}.`}
        </span>
      </span>
      {!following && (
        <button type="button" className="pm-btn pm-btn--tint" onClick={follow} disabled={push.busy}>
          Notify me
        </button>
      )}
    </div>
  )
}

=======
>>>>>>> Stashed changes
export default function Results({
  text,
  onTextChange,
  onSubmit,
  onBack,
  autoFocus,
  lastQuery,
  jobTitle,
  where,
  hasPlace,
  onSetArea,
  recent,
  onClearRecent,
  status,
  error,
  source,
  results,
  totalCount,
  filters,
  onToggleFilter,
  onClearFilters,
  sort,
  onSortChange,
  hasDistance,
  savedIds,
  onOpenProvider,
  onToggleSave,
  onRetry,
<<<<<<< Updated upstream
  place,
  onShowInstall,
=======
>>>>>>> Stashed changes
}) {
  function submit(e) {
    e.preventDefault()
    e.currentTarget.querySelector('input')?.blur() // dismiss the phone keyboard
    onSubmit(text)
  }

  const typed = text.trim().toLowerCase()
  const suggestions = typed
    ? CATEGORIES.filter(
        (c) => c.label.toLowerCase().includes(typed) || c.single.toLowerCase().includes(typed) || c.keywords.some((k) => typed.includes(k)),
      )
    : []

  return (
    <div className="pm-screen">
      <div className="pm-results-head">
        <div className="pm-results-head__row">
          <button type="button" className="pm-iconbtn" aria-label="Back" onClick={onBack}>
            <Icon name="back" size={22} strokeWidth={2} />
          </button>
          <form className="pm-searchfield" role="search" onSubmit={submit}>
            <Icon name="search" size={18} />
            <label className="pm-sr-only" htmlFor="job-search">Job you need done</label>
            <input
              id="job-search"
              type="search"
              enterKeyHint="search"
              autoComplete="off"
              placeholder="What do you need done?"
              autoFocus={autoFocus}
              value={text}
              onChange={(e) => onTextChange(e.target.value)}
            />
            {text && (
              <button type="button" className="pm-clear" aria-label="Clear search" onClick={() => onTextChange('')}>
                ×
              </button>
            )}
          </form>
        </div>
        {lastQuery && (
          <div className="pm-hscroll pm-hscroll--inset" role="toolbar" aria-label="Filters">
            {FILTERS.filter((f) => !f.needsDistance || hasDistance).map((f) => (
              <button
                key={f.id}
                type="button"
                className={`pm-chip ${filters[f.id] ? 'is-on' : ''}`}
                aria-pressed={!!filters[f.id]}
                onClick={() => onToggleFilter(f.id)}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <main className="pm-scroll pm-scroll--results">
        {!lastQuery && typed && (
          <section className="pm-stack-12" aria-label="Suggestions">
            <div className="pm-card">
              <button type="button" className="pm-joblink" onClick={() => onSubmit(text)}>
                <span className="pm-joblink__label">
                  <Icon name="search" size={18} className="pm-muted" />
                  <span className="pm-ellipsis">
                    Search for <strong>“{text.trim()}”</strong>
                  </span>
                </span>
                <Icon name="chevronRight" size={18} strokeWidth={2} className="pm-muted" />
              </button>
              {suggestions.map((c) => (
                <button key={c.id} type="button" className="pm-joblink" onClick={() => onSubmit(c.query)}>
                  <span>{c.label}</span>
                  <Icon name="chevronRight" size={18} strokeWidth={2} className="pm-muted" />
                </button>
              ))}
            </div>
          </section>
        )}

        {!lastQuery && !typed && recent.length > 0 && (
          <section className="pm-stack-12" aria-labelledby="recent-heading">
            <div className="pm-row-between pm-pad-x-4">
              <h2 id="recent-heading" className="pm-h2">Recent</h2>
              <button type="button" className="pm-textlink" onClick={onClearRecent}>
                Clear
              </button>
            </div>
            <div className="pm-card">
              {recent.map((q) => (
                <button key={q} type="button" className="pm-joblink" onClick={() => onSubmit(q)}>
                  <span className="pm-joblink__label">
                    <Icon name="clock" size={18} className="pm-muted" />
                    <span className="pm-ellipsis">{q}</span>
                  </span>
                  <Icon name="chevronRight" size={18} strokeWidth={2} className="pm-muted" />
                </button>
              ))}
            </div>
          </section>
        )}

        {!lastQuery && !typed && (
          <section className="pm-stack-12" aria-labelledby="alljobs-heading">
            <h2 id="alljobs-heading" className="pm-h2 pm-pad-x-4">All jobs</h2>
            <div className="pm-card">
              {CATEGORIES.map((c) => (
                <button key={c.id} type="button" className="pm-joblink" onClick={() => onSubmit(c.query)}>
                  <span>{c.label}</span>
                  <Icon name="chevronRight" size={18} strokeWidth={2} className="pm-muted" />
                </button>
              ))}
            </div>
            <p className="pm-footnote">Or type any job above, like “dog groomer” or “tiler”.</p>
          </section>
        )}

        {lastQuery && status === 'loading' && (
          <div className="pm-stack-10" aria-busy="true" aria-label="Loading results">
            {[0, 1, 2].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}

        {lastQuery && status === 'error' && (
          <div className="pm-empty">
            <p className="pm-title-15">Search didn’t work</p>
            <p className="pm-meta">{error}</p>
            <button type="button" className="pm-btn pm-btn--primary pm-empty__btn" onClick={onRetry}>
              Try again
            </button>
          </div>
        )}

        {lastQuery && status === 'done' && (
          <>
            {!hasPlace && (
              <button type="button" className="pm-areanudge" onClick={onSetArea}>
                <Icon name="pin" size={20} className="pm-accent" />
                <span className="pm-stack-2 pm-grow">
                  <span className="pm-title-15">Showing all of South Africa</span>
                  <span className="pm-meta">Set your area to see people close to you first</span>
                </span>
                <Icon name="chevronRight" size={18} strokeWidth={2} className="pm-muted" />
              </button>
            )}
            <div className="pm-row-between pm-pad-x-4">
              <p className="pm-meta pm-m0 pm-ellipsis">
                {jobTitle} {where[0]} <strong className="pm-ink">{where[1]}</strong>
              </p>
              <label className="pm-sort">
                <span className="pm-sr-only">Sort by</span>
                <select value={sort} onChange={(e) => onSortChange(e.target.value)}>
                  <option value="best">Best match</option>
                  <option value="rating">Top rated</option>
                  {hasDistance && <option value="distance">Nearest</option>}
                </select>
                <Icon name="chevronDown" size={14} strokeWidth={2.2} />
              </label>
            </div>

            {results.length === 0 && (
              <div className="pm-empty">
                {totalCount > 0 ? (
                  <>
                    <p className="pm-title-15">No matches with these filters</p>
                    <p className="pm-meta">
                      {filters.open
                        ? `Nobody is open right now, but ${totalCount} ${totalCount === 1 ? 'person does' : 'people do'} this job.`
                        : 'Turn off a filter to see more people nearby.'}
                    </p>
                    <button type="button" className="pm-btn pm-btn--primary pm-empty__btn" onClick={onClearFilters}>
                      Show everyone
                    </button>
                  </>
                ) : (
                  <>
                    <p className="pm-title-15">No one found</p>
                    <p className="pm-meta">Try another word for the job, or a different area.</p>
                    <button type="button" className="pm-btn pm-btn--soft pm-empty__btn" onClick={onSetArea}>
                      Change area
                    </button>
                  </>
                )}
              </div>
            )}

            {results.map((p) => (
              <ResultCard key={p.id} provider={p} saved={savedIds.has(p.id)} onOpen={onOpenProvider} onToggleSave={onToggleSave} />
            ))}

<<<<<<< Updated upstream
            <AlertCard query={lastQuery} jobTitle={jobTitle} place={place} onShowInstall={onShowInstall} />

=======
>>>>>>> Stashed changes
            <p className={`pm-footnote ${source === 'demo' ? 'pm-demo-note' : ''}`}>
              {source === 'google'
                ? 'Ratings and reviews from Google'
                : 'Demo data · add a Google API key to see real businesses'}
            </p>
          </>
        )}
      </main>
    </div>
  )
}
