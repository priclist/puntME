// Talks to the PuntMe API (server/). Same origin by default; set
// VITE_API_URL when the app and the API live on different domains.

const BASE = `${(import.meta.env.VITE_API_URL || '').replace(/\/$/, '')}/api`
const TOKEN_KEY = 'puntme:token'

export const SIGNED_OUT_EVENT = 'puntme:signedout'

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function setToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    // private mode: stays signed in until the tab closes
  }
}

export class ApiError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

/** JSON request to /api. Throws ApiError with a message ready to show. */
export async function api(path, { method = 'GET', body, signal } = {}) {
  const token = getToken()
  let res
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      signal,
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch (err) {
    if (err.name === 'AbortError') throw err
    throw new ApiError(0, navigator.onLine === false ? 'You’re offline. Check your connection and try again.' : 'Couldn’t reach PuntMe. Try again.')
  }

  const data = await res.json().catch(() => null)
  if (!res.ok) {
    // The session ended (signed out elsewhere, or expired).
    if (res.status === 401 && token) {
      setToken(null)
      window.dispatchEvent(new Event(SIGNED_OUT_EVENT))
    }
    throw new ApiError(res.status, data?.error ?? `Something went wrong (error ${res.status}).`)
  }
  // A static host without the PuntMe server answers with the app's HTML.
  if (data == null) throw new ApiError(0, 'PuntMe accounts aren’t switched on for this website yet.')
  return data
}
