import { BROWSE, matchCategory } from '../data/categories.js'
import { formatDistance, tintFor } from '../lib/format.js'
import { usingGoogle } from '../lib/places.js'
import { useInstall } from '../lib/pwa.js'
import { useLocalStorage } from '../lib/useLocalStorage.js'
import { Icon, Star } from '../ui/icons.jsx'
import { Avatar, BusinessRow, GoogleMapEmbed, MapIllustration, SaveButton, TabBar } from '../ui/pieces.jsx'
import { showToast } from '../ui/Toast.jsx'

function InstallBanner({ onShowInstall }) {
  const install = useInstall()
  const [dismissed, setDismissed] = useLocalStorage('puntme:installDismissed', false)
  if (!install.available || dismissed) return null

  async function go() {
    if (!install.canPrompt) return onShowInstall()
    if (await install.install()) showToast('PuntMe is on your home screen')
  }

  return (
    <div className="pm-installbar">
      <img src="/icon-192.png" alt="" className="pm-installbar__icon" />
      <span className="pm-stack-2 pm-grow">
        <span className="pm-title-15">Get the PuntMe app</span>
        <span className="pm-meta">Free, quick to open, works with no signal</span>
      </span>
      <button type="button" className="pm-btn pm-btn--primary" onClick={go}>
        Install
      </button>
      <button type="button" className="pm-iconbtn pm-iconbtn--sm" aria-label="Not now" onClick={() => setDismissed(true)}>
        <Icon name="close" size={16} strokeWidth={2} />
      </button>
    </div>
  )
}

/** The little label on a card's photo, PuntMe's take on "Guest favourite". */
function cardBadge(p) {
  if (p.puntme) return 'On PuntMe'
  if (p.rating >= 4.8 && p.reviewCount >= 20) return 'Local favourite'
  if (p.openNow) return 'Open now'
  return null
}

/* Photo card in the Discover carousels */
function ExploreCard({ provider: p, saved, onOpen, onToggleSave }) {
  const photo = p.photos?.[0]
  const badge = cardBadge(p)
  const where = p.distanceKm != null ? `${formatDistance(p.distanceKm)} away` : p.address?.split(',')[0]
  const meta = [p.puntme ? p.category : null, where].filter(Boolean).join(' · ')
  return (
    <div className="pm-explorecard">
      <button type="button" className="pm-explorecard__main" onClick={() => onOpen(p)}>
        <span className={`pm-explorecard__photo ${photo ? '' : `pm-tint--${tintFor(p.name)}`}`}>
          {photo ? <img src={photo} alt="" loading="lazy" /> : <Avatar provider={p} size="xl" />}
          {badge && <span className="pm-explorecard__badge">{badge}</span>}
        </span>
        <span className="pm-explorecard__name">{p.name}</span>
        <span className="pm-explorecard__meta">
          {meta}
          {p.rating != null && (
            <>
              {meta && <span aria-hidden="true"> · </span>}
              <Star size={11} />
              {p.rating.toFixed(1)}
            </>
          )}
        </span>
      </button>
      <SaveButton variant="overlay" saved={saved} onToggle={() => onToggleSave(p)} name={p.name} />
    </div>
  )
}

function SkeletonExploreCard() {
  return (
    <div className="pm-explorecard" aria-hidden="true">
      <span className="pm-explorecard__photo pm-skel" />
      <span className="pm-skel" style={{ width: '80%' }} />
      <span className="pm-skel" style={{ width: '50%' }} />
    </div>
  )
}

function Carousel({ id, title, onTitle, children, busy = false }) {
  const cut = title.lastIndexOf(' ') + 1
  return (
    <section className="pm-stack-12" aria-labelledby={id}>
      <h2 id={id} className="pm-h2">
        {onTitle ? (
          <button type="button" className="pm-h2link" onClick={onTitle}>
            {title.slice(0, cut)}
            <span className="pm-h2link__end">
              {title.slice(cut)}
              <Icon name="chevronRight" size={20} strokeWidth={2.4} />
            </span>
          </button>
        ) : (
          title
        )}
      </h2>
      <div className="pm-hscroll pm-carousel" aria-busy={busy}>
        {children}
      </div>
    </section>
  )
}

export default function Discover({
  areaLabel,
  place,
  onStartSearch,
  onSearch,
  onPickJob,
  lastJob,
  lastJobLabel,
  recs,
  savedIds,
  onOpenProvider,
  onToggleSave,
  onNavigate,
  savedCount,
  account,
  onAddBusiness,
  onOpenBusiness,
  newOnPm,
  onShowInstall,
}) {
  const ownsBusiness = account.businesses.length > 0
  // A typed area goes into the map search; a GPS position centres the map.
  const areaName = place && place.source !== 'gps' ? place.label : ''
  const center = place?.lat != null && !areaName ? { lat: place.lat, lng: place.lng } : null
  const mapsQuery = areaName ? `${lastJob} in ${areaName}` : lastJob
  const mapsSearchUrl = center
    ? `https://www.google.com/maps/search/${encodeURIComponent(lastJob)}/@${center.lat},${center.lng},13z`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapsQuery)}`
  const inArea = areaName ? `in ${areaName.split(',')[0]}` : 'near you'
  const activeJob = matchCategory(lastJob)?.id

  function pickTab(e, c) {
    e.currentTarget.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' })
    if (c.query) onPickJob(c.query)
    else onStartSearch()
  }

  return (
    <div className="pm-screen pm-screen--explore">
      <header className="pm-explorehead">
        <div className="pm-pillsearch">
          <button
            type="button"
            className="pm-pillsearch__main"
            onClick={onStartSearch}
            aria-label={`What do you need done? ${place ? `Near ${areaLabel}` : 'Any area'}`}
          >
            <Icon name="search" size={20} strokeWidth={2.4} />
            <span className="pm-pillsearch__title">What do you need done?</span>
          </button>
        </div>

        <nav className="pm-jobtabs" aria-label="Jobs">
          {BROWSE.map((c) => {
            const active = c.query != null && matchCategory(c.query)?.id === activeJob
            return (
              <button
                key={c.id}
                type="button"
                className={`pm-jobtab ${active ? 'is-active' : ''}`}
                aria-current={active ? 'true' : undefined}
                onClick={(e) => pickTab(e, c)}
              >
                <span className="pm-jobtab__pic" aria-hidden="true">
                  {c.emoji}
                </span>
                {c.label}
              </button>
            )
          })}
        </nav>
      </header>

      <main className="pm-scroll pm-scroll--explore">
        {ownsBusiness && (
          <section className="pm-stack-12" aria-labelledby="mybiz-heading">
            <h2 id="mybiz-heading" className="pm-h2">
              {account.businesses.length > 1 ? 'Your businesses' : 'Your business'}
            </h2>
            <div className="pm-card">
              {account.businesses.map((b) => (
                <BusinessRow key={b.id} business={b} onOpen={onOpenBusiness} />
              ))}
            </div>
          </section>
        )}

        {recs.status !== 'error' && (recs.status === 'loading' || recs.items.length > 0) && (
          <Carousel
            id="top-heading"
            title={`Top rated ${lastJobLabel.toLowerCase()} ${inArea}`}
            onTitle={() => onSearch(lastJob)}
            busy={recs.status === 'loading'}
          >
            {recs.status === 'loading'
              ? [0, 1, 2].map((i) => <SkeletonExploreCard key={i} />)
              : recs.items.map((p) => (
                  <ExploreCard
                    key={p.id}
                    provider={p}
                    saved={savedIds.has(p.id)}
                    onOpen={onOpenProvider}
                    onToggleSave={onToggleSave}
                  />
                ))}
          </Carousel>
        )}

        {newOnPm.length > 0 && (
          <Carousel id="new-heading" title={`New on PuntMe ${inArea}`}>
            {newOnPm.slice(0, 8).map((p) => (
              <ExploreCard
                key={p.id}
                provider={p}
                saved={savedIds.has(p.id)}
                onOpen={onOpenProvider}
                onToggleSave={onToggleSave}
              />
            ))}
          </Carousel>
        )}

        <section className="pm-stack-12" aria-labelledby="around-heading">
          <div className="pm-row-between">
            <h2 id="around-heading" className="pm-h2">Around you</h2>
            <a className="pm-textlink" href={mapsSearchUrl} target="_blank" rel="noreferrer">
              Open map
            </a>
          </div>
          <div className="pm-mapcard">
            {usingGoogle ? (
              <GoogleMapEmbed
                mode="search"
                q={mapsQuery}
                center={center}
                height={176}
                label={`Map of ${lastJobLabel.toLowerCase()}`}
              />
            ) : (
              <MapIllustration
                height={176}
                pins="many"
                ratings={recs.items.map((p) => p.rating)}
                label={`Map of ${lastJobLabel.toLowerCase()} around ${areaLabel}`}
              />
            )}
            <button type="button" className="pm-mapcard__footer" onClick={() => onSearch(lastJob)}>
              <span className="pm-stack-2">
                <span className="pm-title-15">{lastJobLabel} near you</span>
                <span className="pm-meta">Based on your last search</span>
              </span>
              <Icon name="chevronRight" size={18} strokeWidth={2} className="pm-muted" />
            </button>
          </div>
        </section>

        {!ownsBusiness && (
          <button type="button" className="pm-promo" onClick={onAddBusiness}>
            <span className="pm-stack-4 pm-grow">
              <span className="pm-promo__title">Do this kind of work?</span>
              <span className="pm-promo__text">Add your business free and get quote requests from people near you.</span>
              <span className="pm-promo__cta">
                Add your business
                <Icon name="arrowRight" size={16} strokeWidth={2.2} />
              </span>
            </span>
            <span className="pm-promo__icon" aria-hidden="true">
              <Icon name="store" size={30} />
            </span>
          </button>
        )}

        <InstallBanner onShowInstall={onShowInstall} />
      </main>
      <TabBar active="discover" onNavigate={onNavigate} savedCount={savedCount} newQuotes={account.unread} />
    </div>
  )
}
