import { useEffect, useState } from 'react'
import { api } from '../lib/api.js'
import { galleryOf } from '../lib/businesses.js'
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
import { GoogleBadge, Icon, PuntMeBadge, Star } from '../ui/icons.jsx'
import Gallery from '../ui/Gallery.jsx'
import { ActionLink, Avatar, GoogleMapEmbed, MapIllustration, SaveButton } from '../ui/pieces.jsx'
import QuoteSheet from '../ui/QuoteSheet.jsx'
import { showToast } from '../ui/Toast.jsx'

const todayIndex = () => (new Date().getDay() + 6) % 7 // Google lists Monday first

// The phone's share sheet where there is one, otherwise copy the link.
async function share(p) {
  const url = p.puntme ? `${window.location.origin}/?b=${p.bizId}` : mapsHref(p)
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

// What the map shows: the Google place, or the area a PuntMe business works from.
const mapQuery = (p) =>
  p.puntme ? (p.googlePlaceId ? `place_id:${p.googlePlaceId}` : `${p.location.lat},${p.location.lng}`) : `place_id:${p.id}`

export default function Provider({
  provider: p,
  onBack,
  saved,
  onToggleSave,
  isOwner = false,
  signedIn = false,
  onMessage,
  onOpenChat,
}) {
  const [quoteOpen, setQuoteOpen] = useState(false)
  const tel = telHref(p.phone)
  const quoteText = `Hi ${p.name}, I found you on PuntMe. Could I please get a quote${p.category ? ` for ${p.category.toLowerCase()} work` : ''}?`
  const whatsapp = whatsappHref(p)
  const quoteHref = whatsappHref(p, quoteText) ?? tel
  const note = hoursNote(p.periods)
  const distance = formatDistance(p.distanceKm)
  const rounded = p.rating == null ? 0 : Math.round(p.rating)
  const gallery = galleryOf(p)

  // Page views for the owner's stats (not counted when they look themselves).
  useEffect(() => {
    if (p.puntme && !isOwner) api(`/businesses/${encodeURIComponent(p.bizId)}?view=1`).catch(() => {})
  }, [p.puntme, p.bizId, isOwner])

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
              {p.puntme ? (
                <span className="pm-verified-label pm-onpuntme-label">
                  <PuntMeBadge size={15} />
                  On PuntMe
                </span>
              ) : p.demo ? (
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
            <span className="pm-meta">{p.puntme ? 'New on PuntMe, no reviews yet' : 'No reviews yet'}</span>
          )}
        </div>

        <div className="pm-actions4">
          <ActionLink className="pm-action pm-action--primary" href={tel} demo={p.demo}>
            <Icon name="phone" size={22} strokeWidth={1.9} />
            Call
          </ActionLink>
          {p.puntme ? (
            // Businesses on PuntMe chat in the app; the website is in the details below.
            <button
              type="button"
              className="pm-action"
              onClick={() => (isOwner ? showToast('This is your business. Customers’ messages arrive in Messages.') : onMessage(p))}
            >
              <Icon name="message" size={22} />
              Message
            </button>
          ) : null}
          <ActionLink className="pm-action" href={whatsapp} external demo={p.demo}>
            <Icon name="chat" size={22} />
            WhatsApp
          </ActionLink>
          <ActionLink className="pm-action" href={directionsHref(p)} external>
            <Icon name="route" size={22} />
            Route
          </ActionLink>
          {!p.puntme && (
            <ActionLink className="pm-action" href={p.website} external demo={p.demo}>
              <Icon name="globe" size={22} />
              Website
            </ActionLink>
          )}
        </div>

        {/* Photos and videos, the owner's own or Google's photos */}
        <section className="pm-stack-12" aria-labelledby="media-heading">
          <div className="pm-row-between pm-baseline pm-pad-x-4">
            <h2 id="media-heading" className="pm-h3">Photos & videos</h2>
            {gallery.length > 0 && <span className="pm-meta">{gallery.length}</span>}
          </div>
          {gallery.length > 0 ? (
            <Gallery items={gallery} name={p.name} />
          ) : (
            <div className="pm-nomedia">
              <Icon name="camera" size={24} className="pm-muted" />
              <span className="pm-meta">
                {isOwner
                  ? 'Add photos and videos of your work from My business.'
                  : p.demo
                    ? 'Demo listings have no photos. Add a Google API key to see real ones.'
                    : `${p.name} hasn’t added photos or videos yet.`}
              </span>
            </div>
          )}
        </section>

        {/* Map */}
        <div className="pm-card">
          <div className="pm-map-wrap">
            {usingGoogle && !p.demo ? (
              <GoogleMapEmbed q={mapQuery(p)} height={168} label={`Map showing ${p.name}`} />
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
              {p.puntme ? (
                <span className="pm-meta">Comes to you, up to {p.radiusKm} km away</span>
              ) : (
                distance && <span className="pm-meta">{distance} from you</span>
              )}
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
          </div>
        )}

        {/* Google Business profile */}
        {(!p.puntme || p.rating != null) && (
        <div className="pm-card pm-card--pad">
          <div className="pm-row-between pm-baseline">
            <h2 className="pm-h3">Google Business profile</h2>
            <span className="pm-meta pm-small">{p.demo ? 'Demo listing' : 'Live from Google'}</span>
          </div>

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
        )}
      </main>

      <div className="pm-bottombar">
        <SaveButton saved={saved} onToggle={() => onToggleSave(p)} name={p.name} variant="outline" />
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
      {p.puntme && (
        <QuoteSheet
          open={quoteOpen}
          provider={p}
          signedIn={signedIn && !isOwner}
          onOpenChat={(convId) => {
            setQuoteOpen(false)
            onOpenChat(convId)
          }}
          onClose={() => setQuoteOpen(false)}
        />
      )}
    </div>
  )
}
