import { GoogleBadge, Icon, PuntMeBadge, Star } from './icons.jsx'
import { showToast } from './Toast.jsx'
import { API_KEY } from '../lib/places.js'
import { formatDistance, hoursNote, initials, tintFor } from '../lib/format.js'

export function Avatar({ provider, size = 'md' }) {
  if (provider.logo) {
    return <img className={`pm-avatar pm-avatar--${size} pm-avatar--logo`} src={provider.logo} alt="" />
  }
  return (
    <span className={`pm-avatar pm-avatar--${size} pm-tint--${tintFor(provider.name)}`} aria-hidden="true">
      {initials(provider.name)}
    </span>
  )
}

/** Google badge for Google listings, PuntMe tick for businesses on PuntMe. */
export function SourceBadge({ provider: p, size = 15 }) {
  if (p.puntme) return <PuntMeBadge size={size} />
  return p.demo ? null : <GoogleBadge size={size} />
}

/* Profile button, top right of the main tabs */
export function ProfileButton({ account, onOpen }) {
  const user = account.user
  const unread = account.unread
  const label = user
    ? `Your profile${unread ? `, ${unread} new quote request${unread === 1 ? '' : 's'}` : ''}`
    : 'Profile: sign in or add your business'
  return (
    <button type="button" className={`pm-profilebtn ${user ? 'is-signed-in' : ''}`} aria-label={label} onClick={onOpen}>
      {user ? <span className="pm-profilebtn__initials">{initials(user.name) || '?'}</span> : <Icon name="user" size={22} />}
      {unread > 0 && <span className="pm-profilebtn__badge">{unread > 9 ? '9+' : unread}</span>}
    </button>
  )
}

/** iOS-style on/off switch. */
export function Switch({ checked, onChange, label, disabled = false, id }) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      className="pm-switch"
      onClick={() => onChange(!checked)}
    >
      <span className="pm-switch__thumb" />
    </button>
  )
}

/** A settings row with a label, an optional note and a switch. */
export function SwitchRow({ icon, title, note, checked, onChange, disabled }) {
  return (
    <div className="pm-detail pm-detail--button pm-switchrow">
      {icon && <Icon name={icon} size={20} className="pm-muted" />}
      <span className="pm-stack-2 pm-grow">
        <span className="pm-detail__main">{title}</span>
        {note && <span className="pm-meta">{note}</span>}
      </span>
      <Switch checked={checked} onChange={onChange} label={title} disabled={disabled} />
    </div>
  )
}

const DEMO_MESSAGE = 'This is a demo listing. Add your Google API key to contact real businesses.'

// Link that renders disabled when there's nowhere to go (no phone, etc).
// Demo listings have no real contact details, so their buttons look normal
// but explain that instead.
export function ActionLink({ href, className, children, external = false, demo = false }) {
  if (demo) {
    return (
      <button type="button" className={className} onClick={() => showToast(DEMO_MESSAGE)}>
        {children}
      </button>
    )
  }
  return (
    <a
      className={className}
      href={href ?? undefined}
      aria-disabled={!href || undefined}
      {...(external && href ? { target: '_blank', rel: 'noreferrer' } : {})}
    >
      {children}
    </a>
  )
}

export function SaveButton({ saved, onToggle, name, variant = 'ghost' }) {
  return (
    <button
      type="button"
      className={`pm-save pm-save--${variant} ${saved ? 'is-saved' : ''}`}
      aria-label={saved ? `Remove ${name} from saved` : `Save ${name}`}
      aria-pressed={saved}
      onClick={onToggle}
    >
      <Icon name="bookmark" size={22} filled={saved} />
    </button>
  )
}

const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1)

export function OpenStatus({ provider: p }) {
  if (p.openNow) {
    return (
      <span className="pm-status pm-status--open">
        <span className="pm-dot" />
        Open now
      </span>
    )
  }
  const note = hoursNote(p.periods)
  if (note) return <span className="pm-status">{capitalize(note)}</span>
  if (p.openNow === false) return <span className="pm-status">Closed</span>
  return null
}

export function Rating({ provider: p, long = false }) {
  if (p.rating == null) return <span className="pm-meta">{p.puntme ? 'New on PuntMe' : 'No reviews yet'}</span>
  return (
    <span className="pm-rating">
      <Star size={13} />
      <strong className="pm-ink">{p.rating.toFixed(1)}</strong>
      <span className="pm-muted">
        {long ? ` · ${p.reviewCount} ${p.demo ? 'reviews' : 'Google reviews'}` : `(${p.reviewCount})`}
      </span>
    </span>
  )
}

/* Compact card used on Discover and Saved */
export function ProviderListCard({ provider: p, saved, onOpen, onToggleSave }) {
  const where = p.distanceKm != null ? `${formatDistance(p.distanceKm)} away` : p.puntme ? p.address?.split(',')[0] : null
  const meta = [p.category, where].filter(Boolean).join(', ')
  return (
    <div className="pm-listcard">
      <button type="button" className="pm-listcard__main" onClick={() => onOpen(p)}>
        <Avatar provider={p} />
        <span className="pm-listcard__text">
          <span className="pm-name-row">
            <span className="pm-name">{p.name}</span>
            <SourceBadge provider={p} />
          </span>
          {meta && <span className="pm-meta">{meta}</span>}
          <span className="pm-rating-row">
            <Rating provider={p} />
            <OpenStatus provider={p} />
          </span>
        </span>
      </button>
      <SaveButton saved={saved} onToggle={() => onToggleSave(p)} name={p.name} />
    </div>
  )
}

export function SkeletonCard() {
  return (
    <div className="pm-listcard pm-skeleton" aria-hidden="true">
      <span className="pm-skel pm-skel--avatar" />
      <span className="pm-stack-4 pm-grow">
        <span className="pm-skel" style={{ width: '60%' }} />
        <span className="pm-skel" style={{ width: '40%' }} />
        <span className="pm-skel" style={{ width: '70%' }} />
      </span>
    </div>
  )
}

export function TabBar({ active, onNavigate, savedCount = 0 }) {
  const tabs = [
    { id: 'discover', label: 'Discover', icon: 'compass' },
    { id: 'saved', label: 'Saved', icon: 'bookmark' },
    { id: 'settings', label: 'Settings', icon: 'sliders' },
  ]
  return (
    <nav className="pm-tabbar" aria-label="Main">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          className={`pm-tab ${active === t.id ? 'is-active' : ''}`}
          aria-current={active === t.id ? 'page' : undefined}
          onClick={() => onNavigate(t.id)}
        >
          <span className="pm-tab__icon">
            <Icon name={t.icon} size={24} strokeWidth={active === t.id ? 2 : 1.8} filled={t.id === 'saved' && active === t.id} />
            {t.id === 'saved' && savedCount > 0 && <span className="pm-badge">{savedCount}</span>}
          </span>
          {t.label}
        </button>
      ))}
    </nav>
  )
}

/* Real Google map (Maps Embed API, free to use) when a key is set. */
export function GoogleMapEmbed({ mode = 'place', q, center, height, label }) {
  const params = new URLSearchParams({ key: API_KEY, q })
  if (center) {
    params.set('center', `${center.lat},${center.lng}`)
    params.set('zoom', '13')
  }
  return (
    <iframe
      className="pm-map pm-map--embed"
      title={label}
      style={{ height }}
      src={`https://www.google.com/maps/embed/v1/${mode}?${params}`}
      loading="lazy"
      referrerPolicy="no-referrer-when-downgrade"
    />
  )
}

/* Drawn map used in demo mode (no API key). */
export function MapIllustration({ height = 168, pins = 'single', ratings = [], label }) {
  const spots = [
    { x: 148, y: 66, dark: true },
    { x: 246, y: 104 },
    { x: 36, y: 22 },
  ]
  return (
    <svg
      width="100%"
      height={height}
      viewBox="0 0 350 176"
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label={label}
      className="pm-map"
    >
      <rect width="350" height="176" fill="#EEF1EC" />
      <path d="M226 0h124v80c-34 12-72 6-98-12-16-12-25-36-26-68z" fill="#D5E9D0" />
      <rect x="14" y="58" width="60" height="40" rx="4" fill="#E4E7E1" />
      <rect x="150" y="126" width="68" height="40" rx="4" fill="#E4E7E1" />
      <path d="M-10 40 L360 30" stroke="#fff" strokeWidth="7" />
      <path d="M-10 166 L190 132" stroke="#fff" strokeWidth="7" />
      <path d="M92 -10 L132 186" stroke="#fff" strokeWidth="10" />
      <path d="M250 -10 L230 186" stroke="#fff" strokeWidth="8" />
      <path d="M-10 124 L360 72" stroke="#fff" strokeWidth="16" />
      <path d="M-10 124 L360 72" stroke="#F3D98E" strokeWidth="3" />
      {pins === 'single' ? (
        <>
          <path d="M70 142 L122 131 L170 100" fill="none" stroke="#1F6FC5" strokeWidth="3.5" strokeDasharray="1 7" strokeLinecap="round" />
          <circle cx="70" cy="142" r="11" fill="#1F6FC5" fillOpacity="0.18" />
          <circle cx="70" cy="142" r="5" fill="#1F6FC5" stroke="#fff" strokeWidth="2" />
          <path d="M179 98c0 0-15-13.5-15-25a15 15 0 0 1 30 0c0 11.5-15 25-15 25z" fill="#191919" />
          <circle cx="179" cy="73" r="5.5" fill="#fff" />
        </>
      ) : (
        <>
          <circle cx="120" cy="112" r="14" fill="#1F6FC5" fillOpacity="0.16" />
          <circle cx="120" cy="112" r="6" fill="#1F6FC5" stroke="#fff" strokeWidth="2.5" />
          {ratings.slice(0, 3).map((r, i) => {
            const s = spots[i]
            return (
              <g key={i}>
                <rect x={s.x} y={s.y} width="48" height="26" rx="13" fill={s.dark ? '#191919' : '#fff'} stroke={s.dark ? 'none' : '#D6D6D3'} />
                <text
                  x={s.x + 24}
                  y={s.y + 17.5}
                  textAnchor="middle"
                  fontFamily="DM Sans, sans-serif"
                  fontSize="12.5"
                  fontWeight="700"
                  fill={s.dark ? '#fff' : '#191919'}
                >
                  ★ {r.toFixed(1)}
                </text>
              </g>
            )
          })}
        </>
      )}
    </svg>
  )
}
