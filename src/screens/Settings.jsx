import { useState } from 'react'
import { connectApiKey, disconnectApiKey, keyFromSettings } from '../lib/places.js'
import { Icon } from '../ui/icons.jsx'
import { TabBar } from '../ui/pieces.jsx'

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

export default function Settings({
  place,
  onOpenSheet,
  locating,
  locateError,
  onLocate,
  usingGoogle,
  savedCount,
  onClearSaved,
  onClearRecent,
  onNavigate,
}) {
  const locationNote = locateError
    ? locateError
    : place
      ? `PuntMe shows people closest to ${place.source === 'gps' ? 'your location' : place.label} first.`
      : 'Set your area or share your location to find people near you.'

  return (
    <div className="pm-screen">
      <main className="pm-scroll pm-scroll--discover">
        <header>
          <h1 className="pm-hero pm-hero--page">Settings</h1>
        </header>

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
          <p className={`pm-meta pm-m0 pm-pad-x-4 ${locateError ? 'pm-error' : ''}`}>{locationNote}</p>
        </section>

        <section className="pm-stack-12" aria-labelledby="data-heading">
          <h2 id="data-heading" className="pm-h2">Business listings</h2>
          <div className="pm-card">
            <div className="pm-detail">
              <span className={`pm-statusdot ${usingGoogle ? 'is-live' : ''}`} aria-hidden="true" />
              <span className="pm-detail__main pm-grow">Source</span>
              <strong>{usingGoogle ? 'Google Business' : 'Demo data'}</strong>
            </div>
            {!usingGoogle && <ConnectGoogle />}
            {keyFromSettings && (
              <button type="button" className="pm-detail pm-detail--button" onClick={disconnectApiKey}>
                <span className="pm-detail__main pm-danger">Disconnect Google key</span>
              </button>
            )}
          </div>
          <p className="pm-meta pm-m0 pm-pad-x-4">
            {usingGoogle ? (
              'Real businesses, with ratings, hours, photos and reviews live from their Google Business Profiles.'
            ) : (
              <>
                Paste a key to switch to real businesses straight away. Get one free in the{' '}
                <a className="pm-inline-link" href="https://console.cloud.google.com/google/maps-apis/credentials" target="_blank" rel="noreferrer">
                  Google Cloud console
                </a>
                {' '}with Places API (New), Maps JavaScript API and Maps Embed API turned on.
              </>
            )}
          </p>
        </section>

        <section className="pm-stack-12" aria-labelledby="biz-heading">
          <h2 id="biz-heading" className="pm-h2">For businesses</h2>
          <div className="pm-card">
            <a className="pm-detail pm-detail--button" href="https://business.google.com/create" target="_blank" rel="noreferrer">
              <Icon name="globe" size={20} className="pm-muted" />
              <span className="pm-stack-2 pm-grow">
                <span className="pm-detail__main">Get your business on PuntMe</span>
                <span className="pm-meta">Free Google Business Profile, shows up here once it’s live</span>
              </span>
              <Icon name="external" size={16} strokeWidth={2} className="pm-muted" />
            </a>
          </div>
        </section>

        <section className="pm-stack-12" aria-labelledby="saved-heading">
          <h2 id="saved-heading" className="pm-h2">Your data</h2>
          <div className="pm-card">
            <button type="button" className="pm-detail pm-detail--button" onClick={onClearSaved} disabled={savedCount === 0}>
              <span className="pm-detail__main pm-danger">Clear saved ({savedCount})</span>
            </button>
            <button type="button" className="pm-detail pm-detail--button" onClick={onClearRecent ?? undefined} disabled={!onClearRecent}>
              <span className="pm-detail__main pm-danger">Clear recent searches</span>
            </button>
          </div>
          <p className="pm-meta pm-m0 pm-pad-x-4">Saved people, searches and your area stay on this phone only.</p>
        </section>

        <p className="pm-footnote">PuntMe 1.0 · Find someone for any job</p>
      </main>
      <TabBar active="settings" onNavigate={onNavigate} savedCount={savedCount} />
    </div>
  )
}
