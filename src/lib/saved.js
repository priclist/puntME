import { useEffect, useRef, useState } from 'react'
import { getProvider, peekProvider } from './places.js'

export const SAVED_KEY = 'puntme:saved:v2'
const LEGACY_KEY = 'puntme:saved'
const FAILED = Symbol('failed')

// Google businesses are saved as just { id } (their place ID), which Google's
// terms allow us to keep. Their details are fetched fresh when shown, so a
// saved business always has today's hours, rating and phone number.
// Demo listings aren't Google data, so they keep a full copy.
export function toSavedRef(p) {
  return p.demo ? { id: p.id, demo: p } : { id: p.id }
}

// Earlier versions stored full business objects. Convert them to refs.
export function loadLegacySaved() {
  try {
    const raw = localStorage.getItem(LEGACY_KEY)
    return raw ? JSON.parse(raw).map(toSavedRef) : []
  } catch {
    return []
  }
}

// Once migrated, write the new list and delete the old copy of Google data.
export function useDropLegacySaved(setRefs) {
  useEffect(() => {
    try {
      if (localStorage.getItem(LEGACY_KEY) == null) return
      setRefs((refs) => refs) // persists the migrated list under SAVED_KEY
      localStorage.removeItem(LEGACY_KEY)
    } catch {
      // storage unavailable — nothing to clean up
    }
  }, [setRefs])
}

/**
 * Turn saved refs into businesses, loading Google ones by place ID.
 * Returns [{ id, provider, failed }] in saved order; provider is null while loading.
 */
export function useSavedProviders(refs, coords) {
  const [details, setDetails] = useState({})
  const requested = useRef(new Set())

  useEffect(() => {
    refs.forEach(({ id, demo }) => {
      if (demo || requested.current.has(id)) return
      requested.current.add(id)
      getProvider(id, coords)
        .then((p) => setDetails((d) => ({ ...d, [id]: p })))
        .catch(() => setDetails((d) => ({ ...d, [id]: FAILED })))
    })
  }, [refs, coords])

  return refs.map(({ id, demo }) => {
    if (demo) return { id, provider: demo, failed: false }
    const d = details[id]
    if (d === FAILED) return { id, provider: null, failed: true }
    return { id, provider: d ?? peekProvider(id), failed: false }
  })
}
