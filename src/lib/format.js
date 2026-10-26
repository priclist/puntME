export function haversineKm(a, b) {
  const R = 6371
  const toRad = (d) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return Math.round(2 * R * Math.asin(Math.sqrt(h)) * 10) / 10
}

export function formatDistance(km) {
  if (km == null) return null
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`
}

export function formatCount(n) {
  return n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, '')}K` : String(n)
}

export function initials(name) {
  return name
    .split(/\s+/)
    .filter((w) => /^[a-z0-9]/i.test(w))
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')
}

// Stable hue per business name, used for avatar gradients.
export function hueFor(name) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360
  return h
}

export function telHref(phone) {
  return phone ? `tel:${phone.replace(/[^\d+]/g, '')}` : null
}

export function directionsHref(p) {
  if (p.demo) return p.mapsUrl
  const params = new URLSearchParams({ api: '1', destination: `${p.name}, ${p.address ?? ''}` })
  if (p.id) params.set('destination_place_id', p.id)
  return `https://www.google.com/maps/dir/?${params}`
}

const TINTS = ['blue', 'teal', 'amber', 'green', 'pink', 'purple']

export function tintFor(name) {
  return TINTS[hueFor(name) % TINTS.length]
}

export function mapsHref(p) {
  return p.mapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${p.name} ${p.address ?? ''}`)}`
}

// Google doesn't say which numbers use WhatsApp. South African mobile
// numbers (+27 6x/7x/8x, but not 086x/087x) usually do, so only those get a
// WhatsApp button.
export function whatsappHref(p, text) {
  const digits = (p.intlPhone ?? '').replace(/\D/g, '')
  if (!/^27[678]\d{8}$/.test(digits) || /^278[67]/.test(digits)) return null
  return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ''}`
}

export function ratingWord(rating) {
  if (rating >= 4.5) return 'Excellent'
  if (rating >= 4) return 'Very good'
  if (rating >= 3.5) return 'Good'
  return 'Mixed reviews'
}

const WEEK = 7 * 1440
const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const minuteOfWeek = (pt) => pt.day * 1440 + pt.hour * 60 + pt.minute
const hhmm = (pt) => `${String(pt.hour).padStart(2, '0')}:${String(pt.minute).padStart(2, '0')}`

/**
 * "closes 17:00", "opens 08:00", "opens Mon 08:00" or "Open 24 hours",
 * from Google-style opening periods (day 0 = Sunday). Null if unknown.
 */
export function hoursNote(periods, now = new Date()) {
  if (!periods?.length) return null
  if (periods.some((p) => !p.close)) return 'Open 24 hours'

  const t = now.getDay() * 1440 + now.getHours() * 60 + now.getMinutes()
  for (const p of periods) {
    const open = minuteOfWeek(p.open)
    let close = minuteOfWeek(p.close)
    if (close <= open) close += WEEK // closes after midnight / over the weekend wrap
    if ((t >= open && t < close) || (t + WEEK >= open && t + WEEK < close)) return `closes ${hhmm(p.close)}`
  }

  let next = null
  for (const p of periods) {
    let wait = minuteOfWeek(p.open) - t
    if (wait <= 0) wait += WEEK
    if (!next || wait < next.wait) next = { wait, open: p.open }
  }
  const today = next.open.day === now.getDay() && next.wait < 1440
  return `opens ${today ? '' : `${DAY_SHORT[next.open.day]} `}${hhmm(next.open)}`
}
