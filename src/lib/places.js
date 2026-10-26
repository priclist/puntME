import { demoSearch } from '../data/demo.js'
import { bizIdOf, getPuntMe, isPuntMeId, searchPuntMe } from './businesses.js'
import { haversineKm } from './format.js'

// Google Business listings come from the Places API (New), loaded through the
// Maps JavaScript API so it works straight from the browser.
// https://developers.google.com/maps/documentation/javascript/place-search

const ENV_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''
const KEY_STORAGE = 'puntme:googleKey'

function storedKey() {
  try {
    return localStorage.getItem(KEY_STORAGE) || ''
  } catch {
    return ''
  }
}

// The key comes from .env (how a deployed PuntMe gets it) or, while testing,
// from Settings → "Connect Google". A Maps key is public in the browser
// anyway; Google protects it with the website restriction set on the key.
export const API_KEY = ENV_KEY || storedKey()

export const usingGoogle = Boolean(API_KEY)

/** True when the key was typed into Settings (and so can be removed there). */
export const keyFromSettings = !ENV_KEY && usingGoogle

/**
 * Check a key with one free Places request (IDs only), then keep it and
 * reload so the Maps script starts with it. Throws Google's reason if not.
 */
export async function connectApiKey(key) {
  let res
  try {
    res = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': key, 'X-Goog-FieldMask': 'places.id' },
      body: JSON.stringify({ textQuery: 'plumber in Pretoria', pageSize: 1 }),
    })
  } catch {
    throw new Error(offlineMessage() ?? 'Couldn’t reach Google. Try again.')
  }
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.error?.message || `Google didn’t accept this key (error ${res.status}).`)
  }
  localStorage.setItem(KEY_STORAGE, key)
  window.location.reload()
}

export function disconnectApiKey() {
  try {
    localStorage.removeItem(KEY_STORAGE)
  } catch {
    // nothing stored
  }
  window.location.reload()
}

function offlineMessage() {
  return navigator.onLine === false ? 'You’re offline. Check your connection and try again.' : null
}

const FIELDS = [
  'id',
  'displayName',
  'primaryTypeDisplayName',
  'formattedAddress',
  'location',
  'rating',
  'userRatingCount',
  'nationalPhoneNumber',
  'internationalPhoneNumber',
  'websiteURI',
  'googleMapsURI',
  'photos',
  'regularOpeningHours',
  'utcOffsetMinutes',
  'businessStatus',
  'reviews',
]

let mapsLoader = null
let authFailed = false

function loadMaps() {
  if (window.google?.maps?.importLibrary) return Promise.resolve()
  if (mapsLoader) return mapsLoader

  mapsLoader = new Promise((resolve, reject) => {
    window.__puntmeMapsReady = resolve
    // Google calls this global when the key is invalid or not allowed.
    window.gm_authFailure = () => {
      authFailed = true
    }
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(API_KEY)}&v=weekly&loading=async&callback=__puntmeMapsReady`
    script.async = true
    script.onerror = () => {
      mapsLoader = null
      script.remove()
      reject(new Error(offlineMessage() ?? 'Could not load Google Maps. Check your connection.'))
    }
    document.head.appendChild(script)
  })
  return mapsLoader
}

async function toProvider(place, coords) {
  let openNow
  try {
    openNow = await place.isOpen()
  } catch {
    openNow = undefined
  }
  const location = place.location ? { lat: place.location.lat(), lng: place.location.lng() } : null

  return {
    id: place.id,
    name: place.displayName,
    category: place.primaryTypeDisplayName ?? null,
    rating: place.rating ?? null,
    reviewCount: place.userRatingCount ?? 0,
    address: place.formattedAddress ?? null,
    phone: place.nationalPhoneNumber ?? null,
    intlPhone: place.internationalPhoneNumber ?? null,
    website: place.websiteURI ?? null,
    mapsUrl: place.googleMapsURI ?? null,
    photos: (place.photos ?? []).slice(0, 6).map((ph) => ph.getURI({ maxWidth: 900, maxHeight: 700 })),
    hours: place.regularOpeningHours?.weekdayDescriptions ?? [],
    periods: (place.regularOpeningHours?.periods ?? []).map(({ open, close }) => ({
      open: { day: open.day, hour: open.hour, minute: open.minute },
      close: close ? { day: close.day, hour: close.hour, minute: close.minute } : null,
    })),
    openNow,
    location,
    distanceKm: coords && location ? haversineKm(coords, location) : null,
    reviews: (place.reviews ?? []).slice(0, 3).map((r) => ({
      author: r.authorAttribution?.displayName ?? 'Google user',
      rating: r.rating,
      text: r.text ?? '',
      when: r.relativePublishTimeDescription ?? '',
    })),
    demo: false,
  }
}

/**
 * Search for people/businesses who do a job: businesses on PuntMe first,
 * then Google listings (or demo ones without a key).
 * @param {{ query: string, place?: {label:string, lat?:number, lng?:number, source:'gps'|'search'} | null }} opts
 * @returns {Promise<{ source: 'google' | 'demo', results: object[] }>}
 */
export async function searchProviders({ query, place }) {
  const coords = place?.lat != null ? { lat: place.lat, lng: place.lng } : null
  const [listings, own] = await Promise.all([searchListings({ query, place, coords }), searchPuntMe(query, coords)])
  own.forEach((p) => sessionCache.set(p.id, p))
  return { source: listings.source, results: withOwnBusinesses(own, listings.results) }
}

// An owner who linked their Google listing shows once, as their PuntMe
// business, with the Google rating and reviews (for this session only).
function withOwnBusinesses(own, listings) {
  const byId = new Map(listings.map((p) => [p.id, p]))
  const linked = new Set(own.map((p) => p.googlePlaceId).filter(Boolean))
  const merged = own.map((p) => {
    const g = p.googlePlaceId && byId.get(p.googlePlaceId)
    return g ? { ...p, rating: g.rating, reviewCount: g.reviewCount, reviews: g.reviews, photos: g.photos, mapsUrl: g.mapsUrl ?? p.mapsUrl } : p
  })
  return [...merged, ...listings.filter((p) => !linked.has(p.id))]
}

async function searchListings({ query, place, coords }) {
  const areaName = place && place.source !== 'gps' ? place.label : ''

  if (!usingGoogle) {
    // Short pause so the demo feels like a real network search.
    await new Promise((r) => setTimeout(r, 450))
    return { source: 'demo', results: demoSearch(query, areaName, coords) }
  }

  try {
    await loadMaps()
    if (authFailed) throw new Error('Google rejected the API key. Check it in Settings or your .env file.')

    const { Place } = await window.google.maps.importLibrary('places')
    const request = {
      textQuery: areaName ? `${query} in ${areaName}` : query,
      fields: FIELDS,
      maxResultCount: 20,
      region: 'za', // prefer South African results
    }
    if (coords) request.locationBias = { center: coords, radius: areaName ? 25000 : 20000 }

    const { places } = await Place.searchByText(request)
    const open = places.filter((p) => p.businessStatus !== 'CLOSED_PERMANENTLY')
    const results = await Promise.all(open.map((p) => toProvider(p, coords)))
    results.forEach((p) => sessionCache.set(p.id, p))
    return { source: 'google', results }
  } catch (err) {
    throw new Error(offlineMessage() ?? err?.message ?? 'Search didn’t work.')
  }
}

// Google's terms allow storing place IDs, but not the business details
// themselves. Details live only in this in-memory cache for the current
// session (never in localStorage), so opening a business you already saw
// doesn't cost another request.
const sessionCache = new Map()

export function peekProvider(id) {
  return sessionCache.get(id) ?? null
}

/** Fetch one business's current details from Google by its place ID. */
export async function getProvider(id, coords) {
  const cached = sessionCache.get(id)
  if (cached) return cached
  if (isPuntMeId(id)) {
    const listing = await getPuntMe(bizIdOf(id), coords)
    sessionCache.set(id, listing)
    return listing
  }
  if (!usingGoogle) throw new Error('A Google API key is needed to load this business.')

  await loadMaps()
  if (authFailed) throw new Error('Google rejected the API key. Check it in Settings or your .env file.')

  const { Place } = await window.google.maps.importLibrary('places')
  const place = new Place({ id })
  await place.fetchFields({ fields: FIELDS })
  const provider = await toProvider(place, coords)
  sessionCache.set(id, provider)
  return provider
}

const pad = (n) => String(n).padStart(2, '0')
const clock = (pt) => `${pad(pt.hour)}:${pad(pt.minute)}`

/**
 * Google listings matching a business name, so an owner can fill in the
 * "Add your business" form from their Google Business Profile in one tap.
 */
export async function findGoogleBusiness(text, coords) {
  await loadMaps()
  if (authFailed) throw new Error('Google rejected the API key.')
  const { Place } = await window.google.maps.importLibrary('places')
  const request = {
    textQuery: text,
    fields: ['id', 'displayName', 'primaryTypeDisplayName', 'formattedAddress', 'location', 'internationalPhoneNumber', 'websiteURI', 'regularOpeningHours'],
    maxResultCount: 5,
    region: 'za',
  }
  if (coords) request.locationBias = { center: coords, radius: 30000 }
  const { places } = await Place.searchByText(request)
  return places.map((p) => ({
    googlePlaceId: p.id,
    name: p.displayName,
    job: p.primaryTypeDisplayName ?? '',
    address: p.formattedAddress ?? '',
    lat: p.location?.lat() ?? null,
    lng: p.location?.lng() ?? null,
    phone: p.internationalPhoneNumber ?? '',
    website: p.websiteURI ?? '',
    hours: (p.regularOpeningHours?.periods ?? []).map(({ open, close }) => ({
      day: open.day,
      open: clock(open),
      close: close ? clock(close) : '23:59',
    })),
  }))
}
