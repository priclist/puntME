// Businesses their owners added to PuntMe themselves (as opposed to Google
// listings). They're shaped like every other listing so the same cards and
// business page show them, with `puntme: true` and a few extras.

import { api, apiUrl } from './api.js'
import { haversineKm, hoursNote } from './format.js'

export const PM_PREFIX = 'pm:'
export const isPuntMeId = (id) => typeof id === 'string' && id.startsWith(PM_PREFIX)
export const bizIdOf = (id) => id.slice(PM_PREFIX.length)

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MONDAY_FIRST = [1, 2, 3, 4, 5, 6, 0]

const toPoint = (day, time) => {
  const [hour, minute] = time.split(':').map(Number)
  return { day, hour, minute }
}

/** [{ day, open: '08:00', close: '17:00' }] → Google-style periods. */
export function hoursToPeriods(hours) {
  return hours.map(({ day, open, close }) => ({
    open: toPoint(day, open),
    // Closing at or before opening time means after midnight.
    close: toPoint(close <= open ? (day + 1) % 7 : day, close),
  }))
}

/** "Monday: 08:00 – 17:00" lines, Monday first, like Google's. */
export function hoursLines(hours) {
  return MONDAY_FIRST.map((day) => {
    const slots = hours.filter((h) => h.day === day)
    return `${DAY_NAMES[day]}: ${slots.length ? slots.map((h) => `${h.open} – ${h.close}`).join(', ') : 'Closed'}`
  })
}

/** "+27821234567" → "082 123 4567". Other countries stay international. */
export function displayPhone(e164) {
  const m = /^\+27(\d{2})(\d{3})(\d{4})$/.exec(e164 ?? '')
  return m ? `0${m[1]} ${m[2]} ${m[3]}` : e164
}

/** A PuntMe business from the API → a listing for cards and the business page. */
export function toListing(b, coords) {
  const periods = hoursToPeriods(b.hours)
  const note = hoursNote(periods)
  const location = { lat: b.lat, lng: b.lng }
  const media = (b.media ?? []).map((m) => ({ id: m.id, kind: m.kind, url: apiUrl(m.path) }))
  const mapsQuery = b.googlePlaceId
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(b.name)}&query_place_id=${b.googlePlaceId}`
    : `https://www.google.com/maps/search/?api=1&query=${b.lat},${b.lng}`
  return {
    id: `${PM_PREFIX}${b.id}`,
    bizId: b.id,
    name: b.name,
    category: b.job,
    categoryId: b.categoryId,
    description: b.description,
    rating: null,
    reviewCount: 0,
    address: b.area,
    phone: displayPhone(b.phone),
    intlPhone: b.phone,
    whatsapp: b.whatsapp,
    email: b.email,
    website: b.website,
    mapsUrl: mapsQuery,
    // Cards show `photos[0]`; the business page shows `media`, videos included.
    photos: media.filter((m) => m.kind === 'photo').map((m) => m.url),
    media,
    logo: b.logo,
    hours: b.hours.length ? hoursLines(b.hours) : [],
    periods,
    openNow: note ? note.startsWith('closes') || note === 'Open 24 hours' : undefined,
    location,
    radiusKm: b.radiusKm,
    distanceKm: b.distanceKm ?? (coords ? haversineKm(coords, location) : null),
    googlePlaceId: b.googlePlaceId,
    reviews: [],
    demo: false,
    puntme: true,
  }
}

const pointParams = (coords) => (coords ? { lat: String(coords.lat), lng: String(coords.lng) } : {})

/** PuntMe businesses that do this job where the customer is. Never throws. */
export async function searchPuntMe(query, coords) {
  try {
    const params = new URLSearchParams({ q: query, ...pointParams(coords) })
    const { businesses } = await api(`/businesses/search?${params}`)
    return businesses.map((b) => toListing(b, coords))
  } catch {
    return [] // PuntMe server unreachable: Google/demo results still show
  }
}

/** The newest PuntMe businesses that work in the customer's area. */
export async function newOnPuntMe(coords) {
  try {
    const { businesses } = await api(`/businesses/search?${new URLSearchParams(pointParams(coords))}`)
    return businesses.map((b) => toListing(b, coords))
  } catch {
    return []
  }
}

/** One PuntMe business. `view` counts a visit for the owner's stats. */
export async function getPuntMe(bizId, coords, { view = false } = {}) {
  const params = new URLSearchParams({ ...pointParams(coords), ...(view ? { view: '1' } : {}) })
  const { business } = await api(`/businesses/${encodeURIComponent(bizId)}?${params}`)
  return toListing(business, coords)
}

/** What a business page's gallery shows: the owner's photos and videos, or Google's photos. */
export const galleryOf = (p) => (p.media?.length ? p.media : (p.photos ?? []).map((url) => ({ id: url, kind: 'photo', url })))

/** Link that opens this business in PuntMe. */
export const shareUrl = (bizId) => `${window.location.origin}/?b=${encodeURIComponent(bizId)}`
