// Place names and coordinates for "Your area", from Photon (free OpenStreetMap
// geocoder, no key needed). https://photon.komoot.io
//
// A place is { label, lat, lng, source: 'gps' | 'search' }.

const PHOTON = 'https://photon.komoot.io'
const SA_BBOX = '16.45,-34.84,32.89,-22.13' // minLon,minLat,maxLon,maxLat

// "King Sabata Dalindyebo Local Municipality" → "King Sabata Dalindyebo"
const shortTown = (t) => t?.replace(/\s+(Local|Metropolitan|District)\s+Municipality$/i, '') || null

// Suburb + town for a reverse-geocoded point. The nearest feature can be a
// shop or a statue, so only place names are used, never the feature's name.
function placeLabel(p) {
  const district = /\bward\b/i.test(p.district ?? '') ? null : p.district
  const name = (p.osm_key === 'place' ? p.name : null) || p.locality || district
  const town = shortTown(p.city || p.county)
  return [name, town !== name ? town : null].filter(Boolean)
}

/** Areas in South Africa matching what the user typed, best first. */
export async function suggestPlaces(text, signal) {
  const params = new URLSearchParams({ q: text, limit: '8', lang: 'en', bbox: SA_BBOX, osm_tag: 'place' })
  const res = await fetch(`${PHOTON}/api/?${params}`, { signal })
  if (!res.ok) throw new Error('Place search is not available right now.')
  const { features } = await res.json()

  const seen = new Set()
  const places = []
  for (const f of features) {
    const p = f.properties
    if (p.countrycode !== 'ZA' || !p.name) continue
    const city = shortTown(p.city || p.county)
    const town = city && city !== p.name ? city : null
    const detail = [town, p.state].filter(Boolean).join(', ')
    const key = `${p.name}|${detail}`
    if (seen.has(key)) continue
    seen.add(key)
    const [lng, lat] = f.geometry.coordinates
    places.push({ id: `${p.osm_type}${p.osm_id}`, name: p.name, detail, label: town ? `${p.name}, ${town}` : p.name, lat, lng })
  }
  return places.slice(0, 6)
}

/** "Hatfield, Pretoria" for a GPS position, or null if unknown. */
export async function reverseGeocode({ lat, lng }) {
  try {
    const params = new URLSearchParams({ lat, lon: lng, lang: 'en' })
    const res = await fetch(`${PHOTON}/reverse?${params}`)
    if (!res.ok) return null
    const { features } = await res.json()
    const p = features[0]?.properties
    return p ? placeLabel(p).join(', ') || null : null
  } catch {
    return null
  }
}
