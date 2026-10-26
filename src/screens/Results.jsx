import { CATEGORIES } from '../data/categories.js'
import { directionsHref, formatDistance, hoursNote, telHref, whatsappHref } from '../lib/format.js'
import { usePush, withAlert } from '../lib/push.js'
import { Icon } from '../ui/icons.jsx'
import { ActionLink, Avatar, Rating, SaveButton, SkeletonCard, SourceBadge } from '../ui/pieces.jsx'
import { showToast } from '../ui/Toast.jsx'

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
            <SourceBadge provider={p} size={16} />
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

function JobRow({ tile, tileStyle, title, sub, onClick }) {
  return (
    <button type="button" className="pm-jobrow" onClick={onClick}>
      <span className="pm-jobrow__tile" style={tileStyle} aria-hidden="true">
        {tile}
      </span>
      <span className="pm-stack-2 pm-grow">
        <span className="pm-jobrow__title pm-ellipsis">{title}</span>
        {sub && <span className="pm-meta pm-ellipsis">{sub}</span>}
      </span>
    </button>
  )
}

/* Before a search: "What job?" card, then where and when, like a booking app */
function SearchStart({ text, onTextChange, onSubmit, onBack, autoFocus, recent, areaText, onSetArea, openNow, onToggleOpen }) {
  const typed = text.trim().toLowerCase()
  const suggestions = typed
    ? CATEGORIES.filter(
        (c) => c.label.toLowerCase().includes(typed) || c.single.toLowerCase().includes(typed) || c.keywords.some((k) => typed.includes(k)),
      )
    : CATEGORIES

  function submit(e) {
    e.preventDefault()
    e.currentTarget.querySelector('input')?.blur() // dismiss the phone keyboard
    onSubmit(text)
  }

  return (
    <div className="pm-screen pm-screen--searchstart">
      <div className="pm-searchstart__top">
        <button type="button" className="pm-roundbtn" aria-label="Close" onClick={onBack}>
          <Icon name="close" size={20} strokeWidth={2.2} />
        </button>
      </div>

      <section className="pm-whatcard" aria-labelledby="what-heading">
        <h1 id="what-heading" className="pm-whatcard__title">What job?</h1>
        <form className="pm-bigsearch" role="search" onSubmit={submit}>
          <Icon name="search" size={20} strokeWidth={2} />
          <label className="pm-sr-only" htmlFor="job-search">Job you need done</label>
          <input
            id="job-search"
            type="search"
            enterKeyHint="search"
            autoComplete="off"
            placeholder="Search jobs, like “tiler”"
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

        <div className="pm-whatcard__list">
          {typed && (
            <JobRow
              tile={<Icon name="search" size={22} strokeWidth={2} />}
              tileStyle={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
              title={`Search for “${text.trim()}”`}
              sub="Anyone who does this job"
              onClick={() => onSubmit(text)}
            />
          )}
          {!typed && recent.length > 0 && (
            <>
              <p className="pm-whatcard__label">Recent searches</p>
              {recent.slice(0, 3).map((q) => (
                <JobRow key={q} tile={<Icon name="clock" size={22} />} title={q} onClick={() => onSubmit(q)} />
              ))}
            </>
          )}
          {suggestions.length > 0 && <p className="pm-whatcard__label">{typed ? 'Jobs' : 'Popular jobs'}</p>}
          {suggestions.map((c) => (
            <JobRow
              key={c.id}
              tile={c.emoji}
              tileStyle={{ background: `${c.color}1f` }}
              title={c.label}
              sub={c.hint}
              onClick={() => onSubmit(c.query)}
            />
          ))}
        </div>
      </section>

      <button type="button" className="pm-pickcard" onClick={onSetArea}>
        <span>Where</span>
        <strong className="pm-ellipsis">{areaText}</strong>
      </button>
      <button type="button" className="pm-pickcard" onClick={onToggleOpen} aria-pressed={openNow}>
        <span>When</span>
        <strong>{openNow ? 'Open now' : 'Any time'}</strong>
      </button>

      <footer className="pm-searchstart__foot">
        <button type="button" className="pm-underline" onClick={() => onTextChange('')} disabled={!text}>
          Clear all
        </button>
        <button type="button" className="pm-btn pm-btn--primary pm-btn--search" onClick={() => onSubmit(text)} disabled={!typed}>
          <Icon name="search" size={18} strokeWidth={2.4} />
          Search
        </button>
      </footer>
    </div>
  )
}

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
  place,
  onShowInstall,
}) {
  if (!lastQuery) {
    return (
      <SearchStart
        text={text}
        onTextChange={onTextChange}
        onSubmit={onSubmit}
        onBack={onBack}
        autoFocus={autoFocus}
        recent={recent}
        areaText={hasPlace ? (where[1] === 'you' ? 'Near you' : where[1]) : 'Add your area'}
        onSetArea={onSetArea}
        openNow={Boolean(filters.open)}
        onToggleOpen={() => onToggleFilter('open')}
      />
    )
  }

  function submit(e) {
    e.preventDefault()
    e.currentTarget.querySelector('input')?.blur() // dismiss the phone keyboard
    onSubmit(text)
  }

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
      </div>

      <main className="pm-scroll pm-scroll--results">
        {status === 'loading' && (
          <div className="pm-stack-10" aria-busy="true" aria-label="Loading results">
            {[0, 1, 2].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}

        {status === 'error' && (
          <div className="pm-empty">
            <p className="pm-title-15">Search didn’t work</p>
            <p className="pm-meta">{error}</p>
            <button type="button" className="pm-btn pm-btn--primary pm-empty__btn" onClick={onRetry}>
              Try again
            </button>
          </div>
        )}

        {status === 'done' && (
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

            <AlertCard query={lastQuery} jobTitle={jobTitle} place={place} onShowInstall={onShowInstall} />

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
