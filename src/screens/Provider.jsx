<<<<<<< Updated upstream
import { useEffect, useState } from 'react'
import { api } from '../lib/api.js'
=======
>>>>>>> Stashed changes
import { usingGoogle } from '../lib/places.js'
import {
  directionsHref,
  formatDistance,
  hoursNote,
  mapsHref,
  ratingWord,
  telHref,
  whatsappHref,
} from '../lib/format.js'
<<<<<<< Updated upstream
import { GoogleBadge, Icon, PuntMeBadge, Star } from '../ui/icons.jsx'
import { ActionLink, Avatar, GoogleMapEmbed, MapIllustration, SaveButton } from '../ui/pieces.jsx'
import QuoteSheet from '../ui/QuoteSheet.jsx'
=======
import { GoogleBadge, Icon, Star } from '../ui/icons.jsx'
import { ActionLink, Avatar, GoogleMapEmbed, MapIllustration, SaveButton } from '../ui/pieces.jsx'
>>>>>>> Stashed changes
import { showToast } from '../ui/Toast.jsx'

const todayIndex = () => (new Date().getDay() + 6) % 7 // Google lists Monday first

// The phone's share sheet where there is one, otherwise copy the link.
async function share(p) {
<<<<<<< Updated upstream
  const url = p.puntme ? `${window.location.origin}/?b=${p.bizId}` : mapsHref(p)
=======
  const url = mapsHref(p)
>>>>>>> Stashed changes
  const text = `${p.name}${p.phone ? ` · ${p.phone}` : ''} (found on PuntMe)`
  if (navigator.share) {
    await navigator.share({ title: p.name, text, url }).catch(() => {})
    return
  }
  try {
    await navigator.clipboard.writeText(`${text}\n${url}`)
    showToast('Link copied')
  } catch {
    showToast('Couldn’t copy the link on this device.')
  }
}

<<<<<<< Updated upstream
// What the map shows: the Google place, or the area a PuntMe business works from.
const mapQuery = (p) =>
  p.puntme ? (p.googlePlaceId ? `place_id:${p.googlePlaceId}` : `${p.location.lat},${p.location.lng}`) : `place_id:${p.id}`

export default function Provider({ provider: p, onBack, saved, onToggleSave, isOwner = false }) {
  const [quoteOpen, setQuoteOpen] = useState(false)
=======
export default function Provider({ provider: p, onBack, saved, onToggleSave }) {
>>>>>>> Stashed changes
  const tel = telHref(p.phone)
  const quoteText = `Hi ${p.name}, I found you on PuntMe. Could I please get a quote${p.category ? ` for ${p.category.toLowerCase()} work` : ''}?`
  const whatsapp = whatsappHref(p)
  const quoteHref = whatsappHref(p, quoteText) ?? tel
  const note = hoursNote(p.periods)
  const distance = formatDistance(p.distanceKm)
  const rounded = p.rating == null ? 0 : Math.round(p.rating)

<<<<<<< Updated upstream
  // Page views for the owner's stats (not counted when they look themselves).
  useEffect(() => {
    if (p.puntme && !isOwner) api(`/businesses/${encodeURIComponent(p.bizId)}?view=1`).catch(() => {})
  }, [p.puntme, p.bizId, isOwner])

=======
>>>>>>> Stashed changes
  return (
    <div className="pm-screen">
      <div className="pm-topbar">
        <button type="button" className="pm-iconbtn" aria-label="Back" onClick={onBack}>
          <Icon name="back" size={22} strokeWidth={2} />
        </button>
        <button type="button" className="pm-iconbtn" aria-label={`Share ${p.name}`} onClick={() => share(p)}>
          <Icon name="share" size={21} />
        </button>
      </div>

      <main className="pm-scroll pm-scroll--provider">
        <div className="pm-provider-hero">
          <Avatar provider={p} size="xl" />
          <div className="pm-stack-4 pm-center">
            <h1 className="pm-provider-name">{p.name}</h1>
            <p className="pm-provider-sub">
              {p.category ?? 'Local business'}
              <span aria-hidden="true">·</span>
<<<<<<< Updated upstream
              {p.puntme ? (
                <span className="pm-verified-label pm-onpuntme-label">
                  <PuntMeBadge size={15} />
                  On PuntMe
                </span>
              ) : p.demo ? (
=======
              {p.demo ? (
>>>>>>> Stashed changes
                <span className="pm-demo-label">Demo listing</span>
              ) : (
                <span className="pm-verified-label">
                  <GoogleBadge size={15} />
                  Google business
                </span>
              )}
            </p>
          </div>
          {p.rating != null ? (
            <a className="pm-ratingpill" href={mapsHref(p)} target="_blank" rel="noreferrer">
              <strong>{p.rating.toFixed(1)}</strong>
              <span className="pm-stars" role="img" aria-label={`${p.rating} out of 5 stars`}>
                {[0, 1, 2, 3, 4].map((i) => (
                  <Star key={i} size={14} empty={i >= rounded} />
                ))}
              </span>
              <span className="pm-muted">
                {p.reviewCount} {p.demo ? 'reviews' : 'Google reviews'}
              </span>
              <Icon name="chevronRight" size={14} strokeWidth={2} className="pm-muted" />
            </a>
          ) : (
<<<<<<< Updated upstream
            <span className="pm-meta">{p.puntme ? 'New on PuntMe, no reviews yet' : 'No reviews yet'}</span>
=======
            <span className="pm-meta">No reviews yet</span>
>>>>>>> Stashed changes
          )}
        </div>

        <div className="pm-actions4">
          <ActionLink className="pm-action pm-action--primary" href={tel} demo={p.demo}>
            <Icon name="phone" size={22} strokeWidth={1.9} />
            Call
          </ActionLink>
          <ActionLink className="pm-action" href={whatsapp} external demo={p.demo}>
            <Icon name="chat" size={22} />
            WhatsApp
          </ActionLink>
          <ActionLink className="pm-action" href={directionsHref(p)} external>
            <Icon name="route" size={22} />
            Route
          </ActionLink>
          <ActionLink className="pm-action" href={p.website} external demo={p.demo}>
            <Icon name="globe" size={22} />
            Website
          </ActionLink>
        </div>

        {/* Map */}
        <div className="pm-card">
          <div className="pm-map-wrap">
            {usingGoogle && !p.demo ? (
<<<<<<< Updated upstream
              <GoogleMapEmbed q={mapQuery(p)} height={168} label={`Map showing ${p.name}`} />
=======
              <GoogleMapEmbed q={`place_id:${p.id}`} height={168} label={`Map showing ${p.name}`} />
>>>>>>> Stashed changes
            ) : (
              <MapIllustration height={168} pins="single" label={`Map showing ${p.name}${p.address ? ` at ${p.address}` : ''}`} />
            )}
            {distance && (
              <span className="pm-map-badge">
                <Icon name="route" size={14} strokeWidth={2} className="pm-accent" />
                {distance} away
              </span>
            )}
          </div>
          <div className="pm-card-row">
            <div className="pm-stack-2 pm-grow">
              <span className="pm-title-15">{p.address ?? 'Address not listed'}</span>
<<<<<<< Updated upstream
              {p.puntme ? (
                <span className="pm-meta">Comes to you, up to {p.radiusKm} km away</span>
              ) : (
                distance && <span className="pm-meta">{distance} from you</span>
              )}
=======
              {distance && <span className="pm-meta">{distance} from you</span>}
>>>>>>> Stashed changes
            </div>
            <a className="pm-btn pm-btn--tint" href={mapsHref(p)} target="_blank" rel="noreferrer">
              Open in Maps
            </a>
          </div>
        </div>

        {/* Details */}
        {(p.hours?.length > 0 || p.phone || p.website) && (
          <div className="pm-card">
            {p.hours?.length > 0 && (
              <details className="pm-detail pm-detail--hours">
                <summary>
                  <Icon name="clock" size={20} className={p.openNow ? 'pm-green' : 'pm-muted'} />
                  <span className="pm-stack-2 pm-grow">
                    <span className="pm-detail__main">
                      <strong className={p.openNow ? 'pm-green' : 'pm-ink'}>{p.openNow ? 'Open' : 'Closed'}</strong>
                      {note && ` · ${note}`}
                    </span>
                    <span className="pm-meta">See opening hours</span>
                  </span>
                  <Icon name="chevronDown" size={16} strokeWidth={2} className="pm-muted pm-detail__chevron" />
                </summary>
                <ul className="pm-hours">
                  {p.hours.map((line, i) => {
                    const [day, ...rest] = line.split(': ')
                    return (
                      <li key={day} className={i === todayIndex() ? 'is-today' : undefined}>
                        <span>{day}</span>
                        <span>{rest.join(': ')}</span>
                      </li>
                    )
                  })}
                </ul>
              </details>
            )}
            {p.phone && (
              <a className="pm-detail" href={tel}>
                <Icon name="phone" size={20} className="pm-muted" />
                <span className="pm-detail__main pm-accent">{p.phone}</span>
              </a>
            )}
            {p.website && (
              <a className="pm-detail" href={p.website} target="_blank" rel="noreferrer">
                <Icon name="globe" size={20} className="pm-muted" />
                <span className="pm-detail__main pm-accent pm-ellipsis">
                  {p.website.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}
                </span>
              </a>
            )}
<<<<<<< Updated upstream
            {p.email && (
              <a className="pm-detail" href={`mailto:${p.email}`}>
                <Icon name="mail" size={20} className="pm-muted" />
                <span className="pm-detail__main pm-accent pm-ellipsis">{p.email}</span>
              </a>
            )}
          </div>
        )}

        {/* About, written by the owner */}
        {p.puntme && p.description && (
          <div className="pm-card pm-card--pad">
            <h2 className="pm-h3">About {p.name}</h2>
            <p className="pm-about">{p.description}</p>
=======
>>>>>>> Stashed changes
          </div>
        )}

        {/* Google Business profile */}
<<<<<<< Updated upstream
        {(!p.puntme || p.rating != null) && (
=======
>>>>>>> Stashed changes
        <div className="pm-card pm-card--pad">
          <div className="pm-row-between pm-baseline">
            <h2 className="pm-h3">Google Business profile</h2>
            <span className="pm-meta pm-small">{p.demo ? 'Demo listing' : 'Live from Google'}</span>
          </div>

          {p.photos?.length > 0 && (
            <div className="pm-photos">
              {p.photos.slice(0, 3).map((src, i) => (
                <img key={src} src={src} alt={`${p.name} photo ${i + 1}`} className="pm-photo" loading="lazy" />
              ))}
            </div>
          )}

          {p.rating != null && (
            <div className="pm-bigrating">
              <span className="pm-bigrating__num">{p.rating.toFixed(1)}</span>
              <div className="pm-stack-2">
                <span className="pm-title-15">{ratingWord(p.rating)}</span>
                <span className="pm-meta">
                  Based on {p.reviewCount} {p.demo ? 'reviews' : 'Google reviews'}
                </span>
              </div>
            </div>
          )}

          {p.reviews?.length > 0 && (
            <ul className="pm-reviews">
              {p.reviews.map((r, i) => (
                <li key={i}>
                  <div className="pm-row-between">
                    <strong className="pm-title-15">{r.author}</strong>
                    <span className="pm-stars" role="img" aria-label={`${r.rating} out of 5 stars`}>
                      {[0, 1, 2, 3, 4].map((s) => (
                        <Star key={s} size={12} empty={s >= Math.round(r.rating)} />
                      ))}
                    </span>
                  </div>
                  <p>{r.text}</p>
                  {r.when && <span className="pm-meta">{r.when}</span>}
                </li>
              ))}
            </ul>
          )}

          <a className="pm-btn pm-btn--dark pm-btn--block" href={mapsHref(p)} target="_blank" rel="noreferrer">
            {p.demo ? 'Search on Google Maps' : 'View full Google profile'}
            <Icon name="external" size={16} strokeWidth={2} />
          </a>
        </div>
<<<<<<< Updated upstream
        )}
=======
>>>>>>> Stashed changes
      </main>

      <div className="pm-bottombar">
        <SaveButton saved={saved} onToggle={() => onToggleSave(p)} name={p.name} variant="outline" />
<<<<<<< Updated upstream
        {p.puntme ? (
          <button type="button" className="pm-btn pm-btn--primary pm-btn--big" onClick={() => setQuoteOpen(true)}>
            <Icon name="send" size={18} strokeWidth={2} />
            Ask for a quote
          </button>
        ) : (
          <ActionLink className="pm-btn pm-btn--primary pm-btn--big" href={quoteHref} external={Boolean(whatsapp)} demo={p.demo}>
            <Icon name={whatsapp || p.demo ? 'chat' : 'phone'} size={18} strokeWidth={2} />
            Ask for a quote
          </ActionLink>
        )}
      </div>
      {p.puntme && <QuoteSheet open={quoteOpen} provider={p} onClose={() => setQuoteOpen(false)} />}
=======
        <ActionLink className="pm-btn pm-btn--primary pm-btn--big" href={quoteHref} external={Boolean(whatsapp)} demo={p.demo}>
          <Icon name={whatsapp || p.demo ? 'chat' : 'phone'} size={18} strokeWidth={2} />
          Ask for a quote
        </ActionLink>
      </div>
>>>>>>> Stashed changes
    </div>
  )
}
