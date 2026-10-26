import { useState } from 'react'
import { connectApiKey, disconnectApiKey, keyFromSettings, usingGoogle } from '../lib/places.js'
import { Icon } from './icons.jsx'

// App settings, shown in the Profile (they used to be the Settings tab).

function ConnectGoogle() {
  const [key, setKey] = useState('')
  const [state, setState] = useState({ busy: false, error: null })

  async function submit(e) {
    e.preventDefault()
    const k = key.trim()
    if (!k) return
    setState({ busy: true, error: null })
    try {
      await connectApiKey(k) // reloads the app on success
    } catch (err) {
      setState({ busy: false, error: err.message })
    }
  }

  return (
    <form className="pm-field" onSubmit={submit}>
      <label htmlFor="key-input" className="pm-meta">Google Maps API key</label>
      <div className="pm-field__row">
        <input
          id="key-input"
          type="text"
          placeholder="AIza…"
          value={key}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck="false"
          enterKeyHint="go"
          onChange={(e) => setKey(e.target.value)}
        />
        <button type="submit" className="pm-btn pm-btn--primary" disabled={state.busy || !key.trim()}>
          {state.busy ? 'Checking…' : 'Connect'}
        </button>
      </div>
      {state.error && (
        <p className="pm-meta pm-error pm-m0" role="alert">
          {state.error}
        </p>
      )}
    </form>
  )
}

export function LocationSettings({ place, onOpenSheet, locating, locateError, onLocate }) {
  const note = locateError
    ? locateError
    : place
      ? `PuntMe shows people closest to ${place.source === 'gps' ? 'your location' : place.label} first.`
      : 'Set your area or share your location to find people near you.'

  return (
    <section className="pm-stack-12" aria-labelledby="loc-heading">
      <h2 id="loc-heading" className="pm-h2">Location</h2>
      <div className="pm-card">
        <button type="button" className="pm-detail pm-detail--button" onClick={onOpenSheet}>
          <Icon name="pin" size={20} className="pm-muted" />
          <span className="pm-stack-2 pm-grow">
            <span className="pm-meta">Your area</span>
            <span className="pm-detail__main">{place?.label ?? 'Not set'}</span>
          </span>
          <Icon name="chevronRight" size={18} strokeWidth={2} className="pm-muted" />
        </button>
        <button type="button" className="pm-detail pm-detail--button" onClick={onLocate} disabled={locating}>
          <Icon name="route" size={20} className="pm-accent" />
          <span className="pm-detail__main pm-accent pm-grow">{locating ? 'Finding you…' : 'Use my current location'}</span>
          {place?.source === 'gps' && !locating && <Icon name="check" size={20} strokeWidth={2.4} className="pm-accent" />}
        </button>
      </div>
      <p className={`pm-meta pm-m0 pm-pad-x-4 ${locateError ? 'pm-error' : ''}`}>{note}</p>
    </section>
  )
}

export function ListingSettings() {
  return (
    <section className="pm-stack-12" aria-labelledby="listings-heading">
      <h2 id="listings-heading" className="pm-h2">Business listings</h2>
      <div className="pm-card">
        <div className="pm-detail">
          <span className={`pm-statusdot ${usingGoogle ? 'is-live' : ''}`} aria-hidden="true" />
          <span className="pm-detail__main pm-grow">Google listings</span>
          <strong>{usingGoogle ? 'Live' : 'Demo data'}</strong>
        </div>
        {!usingGoogle && <ConnectGoogle />}
        {keyFromSettings && (
          <button type="button" className="pm-detail pm-detail--button" onClick={disconnectApiKey}>
            <span className="pm-detail__main pm-danger">Disconnect Google key</span>
          </button>
        )}
        <a className="pm-detail pm-detail--button" href="https://business.google.com/create" target="_blank" rel="noreferrer">
          <Icon name="globe" size={20} className="pm-muted" />
          <span className="pm-stack-2 pm-grow">
            <span className="pm-detail__main">Create a Google Business Profile</span>
            <span className="pm-meta">Free. Shows a business in Google search and Maps too</span>
          </span>
          <Icon name="external" size={16} strokeWidth={2} className="pm-muted" />
        </a>
      </div>
      <p className="pm-meta pm-m0 pm-pad-x-4">
        {usingGoogle ? (
          'Businesses on PuntMe show first, then Google listings with ratings, hours, photos and reviews.'
        ) : (
          <>
            Businesses on PuntMe are always real. Paste a key to also show real Google listings. Get one free in the{' '}
            <a className="pm-inline-link" href="https://console.cloud.google.com/google/maps-apis/credentials" target="_blank" rel="noreferrer">
              Google Cloud console
            </a>{' '}
            with Places API (New), Maps JavaScript API and Maps Embed API turned on.
          </>
        )}
      </p>
    </section>
  )
}

export function DataSettings({ savedCount, onClearSaved, onClearRecent }) {
  return (
    <section className="pm-stack-12" aria-labelledby="data-heading">
      <h2 id="data-heading" className="pm-h2">On this phone</h2>
      <div className="pm-card">
        <button type="button" className="pm-detail pm-detail--button" onClick={onClearSaved} disabled={savedCount === 0}>
          <span className="pm-detail__main pm-danger">Clear saved ({savedCount})</span>
        </button>
        <button type="button" className="pm-detail pm-detail--button" onClick={onClearRecent ?? undefined} disabled={!onClearRecent}>
          <span className="pm-detail__main pm-danger">Clear recent searches</span>
        </button>
      </div>
      <p className="pm-meta pm-m0 pm-pad-x-4">
        Saved people, searches and your area stay on this phone only. Your account, businesses and messages are kept by PuntMe.
      </p>
    </section>
  )
}
