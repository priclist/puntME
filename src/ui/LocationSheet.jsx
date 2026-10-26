import { useEffect, useState } from 'react'
import { suggestPlaces } from '../lib/geo.js'
import { Icon } from './icons.jsx'
import Sheet from './Sheet.jsx'

/**
 * Bottom sheet for choosing an area: type a suburb or town (real places
 * from OpenStreetMap) or use the phone's location. Used for "Your area" and
 * for where a business works.
 */
export default function LocationSheet({
  open,
  place,
  locating,
  locateError,
  onLocate,
  onPick,
  onClose,
  title = 'Your area',
  hint = 'PuntMe shows people closest to this area first.',
  chosen = (label) => `Now searching around ${label}.`,
}) {
  const [text, setText] = useState('')
  const [found, setFound] = useState({ status: 'idle', places: [] })

  useEffect(() => {
    if (open) {
      setText('')
      setFound({ status: 'idle', places: [] })
    }
  }, [open])

  // Look places up as the user types (debounced, older lookups cancelled).
  useEffect(() => {
    const q = text.trim()
    if (q.length < 2) {
      setFound({ status: 'idle', places: [] })
      return
    }
    const ctrl = new AbortController()
    const timer = setTimeout(() => {
      setFound((f) => ({ ...f, status: 'loading' }))
      suggestPlaces(q, ctrl.signal)
        .then((places) => setFound({ status: 'done', places }))
        .catch((err) => err.name !== 'AbortError' && setFound({ status: 'error', places: [] }))
    }, 250)
    return () => {
      clearTimeout(timer)
      ctrl.abort()
    }
  }, [text])

  const titleId = `sheet-title-${title.replace(/\W+/g, '-').toLowerCase()}`

  return (
    <Sheet open={open} onClose={onClose} labelledBy={titleId}>
      <div className="pm-row-between">
        <h2 id={titleId} className="pm-h2">{title}</h2>
        <button type="button" className="pm-textlink" onClick={onClose}>
          Done
        </button>
      </div>

      <form className="pm-searchfield pm-searchfield--sheet" role="search" onSubmit={(e) => e.preventDefault()}>
        <Icon name="search" size={18} />
        <label className="pm-sr-only" htmlFor={`${titleId}-input`}>Suburb or town</label>
        <input
          id={`${titleId}-input`}
          type="search"
          enterKeyHint="search"
          autoComplete="off"
          placeholder="Suburb or town, e.g. Hatfield"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        {text && (
          <button type="button" className="pm-clear" aria-label="Clear" onClick={() => setText('')}>
            ×
          </button>
        )}
      </form>

      <div className="pm-card">
        <button type="button" className="pm-detail pm-detail--button" onClick={onLocate} disabled={locating}>
          <Icon name="route" size={20} className="pm-accent" />
          <span className="pm-detail__main pm-accent pm-grow">{locating ? 'Finding you…' : 'Use my current location'}</span>
          {place?.source === 'gps' && !locating && <Icon name="check" size={20} strokeWidth={2.4} className="pm-accent" />}
        </button>

        {found.places.map((p) => (
          <button key={p.id} type="button" className="pm-detail pm-detail--button" onClick={() => onPick(p)}>
            <Icon name="pin" size={20} className="pm-muted" />
            <span className="pm-stack-2 pm-grow">
              <span className="pm-detail__main">{p.name}</span>
              {p.detail && <span className="pm-meta">{p.detail}</span>}
            </span>
          </button>
        ))}
      </div>

      <p className={`pm-meta pm-m0 pm-pad-x-4 ${locateError || found.status === 'error' ? 'pm-error' : ''}`} aria-live="polite">
        {locateError ??
          (found.status === 'loading' && found.places.length === 0
            ? 'Looking up places…'
            : found.status === 'error'
              ? 'Couldn’t look up places. Check your connection.'
              : found.status === 'done' && found.places.length === 0
                ? `No places in South Africa called “${text.trim()}”.`
                : place
                  ? chosen(place.source === 'gps' ? 'your location' : place.label)
                  : hint)}
      </p>
      <p className="pm-footnote">
        Place names ©{' '}
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
          OpenStreetMap
        </a>{' '}
        contributors
      </p>
    </Sheet>
  )
}
