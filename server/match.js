// Which PuntMe businesses answer a search, shared by search and job alerts.
// Categories come from the app itself so "plumber", "geyser" and "leak"
// find the same people on both sides.

import { matchCategory } from '../src/data/categories.js'
import { haversineKm } from '../src/lib/format.js'

const words = (text) =>
  text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 3)
    .map((w) => w.replace(/(ers|er|s)$/, '')) // "cleaners" / "cleaner" → "clean"

/** True when the business does the job typed into search. */
export function matchesQuery(b, query) {
  const q = query.trim()
  if (!q) return false
  const category = matchCategory(q)
  if (category && b.category_id === category.id) return true
  const hay = `${b.name} ${b.job} ${b.description}`.toLowerCase()
  const need = words(q)
  return need.length > 0 && need.every((w) => hay.includes(w))
}

/** Distance from a point to the business, or null without a point. */
export function distanceTo(b, at) {
  return at ? haversineKm(at, { lat: b.lat, lng: b.lng }) : null
}

/**
 * Businesses that work where the customer is: inside the business's own
 * service radius, with a little slack for people just over the line.
 */
export function servesArea(b, at) {
  const d = distanceTo(b, at)
  return d == null || d <= b.radius_km + 5
}

/** A saved job alert fires when a business doing that job opens near it. */
export function alertMatches(alert, b) {
  if (!matchesQuery(b, alert.query)) return false
  if (alert.lat == null) return true
  return distanceTo(b, alert) <= Math.max(b.radius_km, 25)
}
