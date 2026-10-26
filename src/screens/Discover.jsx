import { BROWSE, QUICK_SEARCHES } from '../data/categories.js'
import { usingGoogle } from '../lib/places.js'
import { Icon } from '../ui/icons.jsx'
import { GoogleMapEmbed, MapIllustration, ProviderListCard, SkeletonCard, TabBar } from '../ui/pieces.jsx'

export default function Discover({
  areaLabel,
  place,
  onChangeArea,
  onStartSearch,
  onSearch,
  lastJob,
  lastJobLabel,
  recs,
  savedIds,
  onOpenProvider,
  onToggleSave,
  onNavigate,
  savedCount,
}) {
  // A typed area goes into the map search; a GPS position centres the map.
  const areaName = place && place.source !== 'gps' ? place.label : ''
  const center = place?.lat != null && !areaName ? { lat: place.lat, lng: place.lng } : null
  const mapsQuery = areaName ? `${lastJob} in ${areaName}` : lastJob
  const mapsSearchUrl = center
    ? `https://www.google.com/maps/search/${encodeURIComponent(lastJob)}/@${center.lat},${center.lng},13z`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapsQuery)}`

  return (
    <div className="pm-screen">
      <main className="pm-scroll pm-scroll--discover">
        <header className="pm-stack-18">
          <div className="pm-row-between">
            <button type="button" className="pm-area" onClick={onChangeArea} aria-label={`Your area: ${areaLabel}. Change`}>
              <Icon name="pin" size={18} className="pm-accent" />
              <span className="pm-area__label">{areaLabel}</span>
              <Icon name="chevronDown" size={16} strokeWidth={2} className="pm-muted" />
            </button>
            <span className="pm-wordmark">PuntMe</span>
          </div>

          <h1 className="pm-hero">
            Find someone
            <br />
            for any job.
          </h1>

          <button type="button" className="pm-searchbar" onClick={onStartSearch}>
            <Icon name="search" size={20} strokeWidth={1.9} />
            <span className="pm-searchbar__placeholder">What do you need done?</span>
            <span className="pm-searchbar__go" aria-hidden="true">
              <Icon name="arrowRight" size={18} strokeWidth={2} />
            </span>
          </button>

          <div className="pm-hscroll">
            {QUICK_SEARCHES.map((q) => (
              <button key={q} type="button" className="pm-quick" onClick={() => onSearch(q)}>
                {q}
              </button>
            ))}
          </div>
        </header>

        <section className="pm-stack-12" aria-labelledby="browse-heading">
          <h2 id="browse-heading" className="pm-h2">Browse by job</h2>
          <div className="pm-hscroll">
            {BROWSE.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`pm-category pm-tint--${c.tint}`}
                onClick={() => (c.query ? onSearch(c.query) : onStartSearch())}
              >
                <Icon name={c.icon} size={28} />
                {c.label}
              </button>
            ))}
          </div>
        </section>

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

        {recs.status !== 'error' && (
          <section className="pm-stack-12" aria-labelledby="top-heading">
            <div className="pm-row-between">
              <h2 id="top-heading" className="pm-h2">Top rated near you</h2>
              <button type="button" className="pm-textlink" onClick={() => onSearch(lastJob)}>
                See all
              </button>
            </div>
            <div className="pm-stack-10" aria-busy={recs.status === 'loading'}>
              {recs.status === 'loading'
                ? [0, 1, 2].map((i) => <SkeletonCard key={i} />)
                : recs.items.map((p) => (
                    <ProviderListCard
                      key={p.id}
                      provider={p}
                      saved={savedIds.has(p.id)}
                      onOpen={onOpenProvider}
                      onToggleSave={onToggleSave}
                    />
                  ))}
            </div>
          </section>
        )}
      </main>
      <TabBar active="discover" onNavigate={onNavigate} savedCount={savedCount} />
    </div>
  )
}
