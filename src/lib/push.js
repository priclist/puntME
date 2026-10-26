import { useCallback, useEffect, useState } from 'react'
import { api } from './api.js'
import { isIOS, isStandalone } from './pwa.js'

// Push notifications: quote requests for business owners, and job alerts
// ("tell me when a new plumber joins near Sandton") for everyone.
// What this phone wants is kept here and copied to the server, which sends.

const SETTINGS_KEY = 'puntme:push'
const DEFAULTS = { prefs: { quotes: true, alerts: true }, alerts: [] }

export const pushSupported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window

export function loadPushSettings() {
  try {
    const stored = JSON.parse(localStorage.getItem(SETTINGS_KEY))
    return stored ? { prefs: { ...DEFAULTS.prefs, ...stored.prefs }, alerts: stored.alerts ?? [] } : DEFAULTS
  } catch {
    return DEFAULTS
  }
}

function savePushSettings(settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  } catch {
    // kept for this session only
  }
}

// The service worker is ready once it has been registered (main.jsx).
function workerReady() {
  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Notifications aren’t ready yet. Reload PuntMe and try again.')), 8000),
    ),
  ])
}

async function currentSubscription() {
  if (!pushSupported || Notification.permission !== 'granted') return null
  const reg = await workerReady()
  return reg.pushManager.getSubscription()
}

function keyBytes(base64url) {
  const pad = '='.repeat((4 - (base64url.length % 4)) % 4)
  const raw = atob((base64url + pad).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(raw, (c) => c.charCodeAt(0))
}

async function subscribe() {
  const { publicKey } = await api('/push/key')
  const reg = await workerReady()
  const options = { userVisibleOnly: true, applicationServerKey: keyBytes(publicKey) }
  try {
    return await reg.pushManager.subscribe(options)
  } catch (err) {
    // Subscribed before with other server keys: start over with these.
    const old = await reg.pushManager.getSubscription()
    if (!old) throw err
    await old.unsubscribe()
    return reg.pushManager.subscribe(options)
  }
}

const send = (sub, settings) =>
  api('/push/subscribe', { method: 'POST', body: { subscription: sub.toJSON(), prefs: settings.prefs, alerts: settings.alerts } })

/**
 * Tell the server about this phone's subscription again: after signing in
 * or out (so quote requests reach the right person) and on app start.
 */
export async function resyncPush() {
  try {
    const sub = await currentSubscription()
    if (sub) await send(sub, loadPushSettings())
  } catch {
    // offline; next start tries again
  }
}

/**
 * Notification state for the Profile screen.
 * status: 'unsupported' | 'needs-install' | 'denied' | 'off' | 'on' | 'checking'
 */
export function usePush() {
  const [status, setStatus] = useState('checking')
  const [settings, setSettings] = useState(loadPushSettings)
  const [busy, setBusy] = useState(false)

  const check = useCallback(async () => {
    if (!pushSupported) return setStatus(isIOS && !isStandalone() ? 'needs-install' : 'unsupported')
    if (Notification.permission === 'denied') return setStatus('denied')
    try {
      setStatus((await currentSubscription()) ? 'on' : 'off')
    } catch {
      setStatus('off')
    }
  }, [])

  useEffect(() => {
    check()
  }, [check])

  // Runs a change, keeping `busy` up while it does. Errors go to the caller.
  const run = useCallback(async (fn) => {
    setBusy(true)
    try {
      return await fn()
    } finally {
      setBusy(false)
    }
  }, [])

  const enable = useCallback(
    () =>
      run(async () => {
        const permission = await Notification.requestPermission()
        if (permission !== 'granted') {
          setStatus(permission === 'denied' ? 'denied' : 'off')
          throw new Error(permission === 'denied' ? 'Notifications are blocked for PuntMe.' : 'Notifications weren’t turned on.')
        }
        const sub = await subscribe()
        await send(sub, settings)
        setStatus('on')
      }),
    [run, settings],
  )

  const disable = useCallback(
    () =>
      run(async () => {
        const sub = await currentSubscription()
        if (sub) {
          await api('/push/unsubscribe', { method: 'POST', body: { endpoint: sub.endpoint } }).catch(() => {})
          await sub.unsubscribe()
        }
        setStatus('off')
      }),
    [run],
  )

  // Change preferences or alerts; saved on the phone and on the server.
  const update = useCallback(
    (change) =>
      run(async () => {
        const next = typeof change === 'function' ? change(settings) : change
        setSettings(next)
        savePushSettings(next)
        const sub = await currentSubscription()
        if (sub) await send(sub, next)
      }),
    [run, settings],
  )

  const test = useCallback(
    () =>
      run(async () => {
        const sub = await currentSubscription()
        if (!sub) throw new Error('Turn on notifications first.')
        await api('/push/test', { method: 'POST', body: { endpoint: sub.endpoint } })
      }),
    [run],
  )

  return { status, settings, busy, enable, disable, update, test, recheck: check }
}

/** Adds (or keeps) a job alert for a search in an area. */
export function withAlert(settings, { query, place }) {
  const key = (a) => `${a.query.toLowerCase()}|${a.label ?? ''}`
  const alert = {
    id: Math.random().toString(36).slice(2, 10),
    query,
    label: place?.label ?? null,
    lat: place?.lat ?? null,
    lng: place?.lng ?? null,
  }
  if (settings.alerts.some((a) => key(a) === key(alert))) return settings
  return { ...settings, prefs: { ...settings.prefs, alerts: true }, alerts: [alert, ...settings.alerts].slice(0, 10) }
}
