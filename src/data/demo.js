import { matchCategory } from './categories.js'
import { haversineKm } from '../lib/format.js'

// Demo listings used when no Google API key is configured. Results are
// generated deterministically from the search text so the same search
// always shows the same people.

const NAMES = {
  window: ['Crystal Clear Windows', 'Streak Free Squad', 'Glass Act Cleaning', 'Bright View Window Co.', 'ClearPane Pros', 'Sparkle Panes', 'High Rise Glass Care', 'Shine & Co. Windows'],
  plumber: ['Pipe Dreams Plumbing', 'FlowRight Plumbers', 'Drain Busters', 'Leak Fix Express', 'Aqua Pro Plumbing', 'Copper & Co.', 'Rapid Rooter', 'TrueFlow Services'],
  electrician: ['Live Wire Electrical', 'BrightSpark Electricians', 'Volt Masters', 'Circuit Pros', 'PowerUp Electrical', 'Switched On Services', 'Current Solutions', 'Amp Electric Co.'],
  gardener: ['Green Thumb Gardens', 'Fresh Cut Lawns', 'Evergreen Landscaping', 'Bloom & Grow', 'Hedge Hogs Garden Care', 'Urban Roots', 'Leaf It To Us', 'The Garden Guys'],
  painter: ['Fresh Coat Painters', 'Brush Strokes Co.', 'Colour Craft Painting', 'Perfect Finish', 'Roll With It Painters', 'Prime Time Painting', 'Edge & Trim', 'True Colours Decor'],
  cleaner: ['Spotless Homes', 'Sparkle Clean Co.', 'Tidy Up Services', 'Fresh Start Cleaning', 'Neat Freaks', 'Clean Slate Maids', 'Dust Busters', 'Pure Shine Cleaning'],
  handyman: ['Fix It Felix Handyman', 'Mr. Handy', 'Odd Jobs Co.', 'Toolbox Heroes', 'All Sorted Repairs', 'Home Helpers', 'Handy Andy Services', 'Get It Done Crew'],
  locksmith: ['Key Masters', 'Lock & Load Locksmiths', 'SafeHouse Locks', 'Open Sesame Locksmith', 'Rapid Response Locks', 'Secure Key Co.', 'Pick Perfect', 'LockPro 24/7'],
  mechanic: ['Torque Auto Repairs', 'Gear Heads Garage', 'Precision Motors', 'Pit Stop Mechanics', 'Revive Auto', 'Smooth Ride Services', 'Engine Room', 'Wrench & Co.'],
  roofer: ['Top Notch Roofing', 'Over The Top Roofers', 'Shield Roofing', 'Peak Roofing Co.', 'Rain Guard Roofs', 'Summit Roof Repairs', 'Skyline Roofing', 'Dry Home Roofers'],
  movers: ['Easy Move Removals', 'Box & Go Movers', 'Smooth Moves', 'Heavy Lifters', 'Two Guys & A Truck', 'Swift Relocations', 'Pack It Up', 'Home To Home Movers'],
  pest: ['Bug Off Pest Control', 'Critter Ridders', 'Pest Patrol', 'No More Bugs', 'Termite Terminators', 'Safe Home Pest', 'Buzz Kill Pest Co.', 'Clear Out Pests'],
}

const GENERIC = ['{x} Pros', 'Elite {x}', '{x} Express', 'Hometown {x}', 'Prime {x} Co.', '{x} Masters', 'Five Star {x}', 'Local {x} Hub']

const STREETS = ['Main Road', 'Church Street', 'Long Street', 'Oak Avenue', 'Victoria Road', 'Park Lane', 'Station Road', 'High Street', 'Beach Road', 'Kloof Street']

const REVIEWERS = ['Thandi M.', 'James P.', 'Aisha K.', 'Pieter V.', 'Sam L.', 'Lerato N.', 'Chris D.', 'Nadia R.']

const REVIEWS = [
  'Showed up on time and did a brilliant job. Will definitely book again.',
  'Friendly, professional and fairly priced. Highly recommend.',
  'Quick to respond and really knew what they were doing.',
  'Great communication from start to finish.',
  'Very tidy work and they cleaned up after themselves.',
  'Good service — a little pricey, but worth it.',
]

const WHEN = ['a week ago', '2 weeks ago', 'a month ago', '3 months ago']

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

function seeded(text) {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619)
  return () => {
    h ^= h << 13
    h ^= h >>> 17
    h ^= h << 5
    return (h >>> 0) / 4294967296
  }
}

function titleCase(text) {
  return text.trim().replace(/\s+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function slug(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-')
}

const fmtTime = (mins) => {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  const suffix = h >= 12 ? 'PM' : 'AM'
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${suffix}`
}

// schedule[i] is [openMinutes, closeMinutes] or null, Monday-first.
function buildSchedule(rand) {
  const open = rand() > 0.5 ? 7 * 60 + 30 : 8 * 60
  const close = rand() > 0.5 ? 17 * 60 : 18 * 60
  const saturday = rand() > 0.3 ? [8 * 60, 13 * 60] : null
  const sunday = rand() > 0.85 ? [9 * 60, 12 * 60] : null
  return [...Array(5).fill([open, close]), saturday, sunday]
}

// Same shape as Google's regularOpeningHours.periods (day 0 = Sunday).
function toPeriods(schedule) {
  const point = (day, mins) => ({ day, hour: Math.floor(mins / 60), minute: mins % 60 })
  return schedule.flatMap((slot, d) => {
    if (!slot) return []
    const day = (d + 1) % 7
    return [{ open: point(day, slot[0]), close: point(day, slot[1]) }]
  })
}

function isOpen(schedule, now = new Date()) {
  const today = schedule[(now.getDay() + 6) % 7]
  if (!today) return false
  const mins = now.getHours() * 60 + now.getMinutes()
  return mins >= today[0] && mins < today[1]
}

export function demoSearch(query, area, coords) {
  const rand = seeded(`${query}|${area}`.toLowerCase())
  const category = matchCategory(query)
  const title = titleCase(query)
  const names = category ? NAMES[category.id] : GENERIC.map((t) => t.replace('{x}', title))
  const place = area?.trim()
  const mapsSearch = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${query} ${area ?? ''}`.trim())}`

  return names.map((name) => {
    const schedule = buildSchedule(rand)
    // Scatter demo businesses around the user's location when we have it.
    const location = coords
      ? { lat: coords.lat + (rand() - 0.5) * 0.18, lng: coords.lng + (rand() - 0.5) * 0.18 }
      : null
    const reviews = [0, 1].map(() => ({
      author: REVIEWERS[Math.floor(rand() * REVIEWERS.length)],
      rating: rand() > 0.25 ? 5 : 4,
      text: REVIEWS[Math.floor(rand() * REVIEWS.length)],
      when: WHEN[Math.floor(rand() * WHEN.length)],
    }))

    return {
      id: `demo-${slug(name)}`,
      name,
      category: category?.single ?? title,
      rating: Math.round((3.9 + rand() * 1.1) * 10) / 10,
      reviewCount: Math.floor(6 + rand() * 380),
      address: `${10 + Math.floor(rand() * 190)} ${STREETS[Math.floor(rand() * STREETS.length)]}${place ? `, ${place}` : ''}`,
      // No phone numbers: a made-up number could belong to a real person.
      phone: null,
      intlPhone: null,
      website: null,
      mapsUrl: mapsSearch,
      photos: [],
      hours: schedule.map((slot, d) => `${DAYS[d]}: ${slot ? `${fmtTime(slot[0])} – ${fmtTime(slot[1])}` : 'Closed'}`),
      periods: toPeriods(schedule),
      openNow: isOpen(schedule),
      location,
      distanceKm: location ? haversineKm(coords, location) : Math.round((0.4 + rand() * 14) * 10) / 10,
      reviews,
      demo: true,
    }
  })
}
