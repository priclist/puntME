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

/** Full URL of something the API serves, like a business photo. */
export const apiUrl = (path) => `${BASE}${path}`

/**
 * Sends a file as the request body. Uses XHR rather than fetch because only
 * XHR reports upload progress (`onProgress` gets 0–1).
 */
export function upload(path, blob, { onProgress } = {}) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${BASE}${path}`)
    xhr.setRequestHeader('Content-Type', blob.type)
    const token = getToken()
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`)
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(e.loaded / e.total)
    xhr.onerror = () =>
      reject(new ApiError(0, navigator.onLine === false ? 'You’re offline. Check your connection and try again.' : 'The upload didn’t go through. Try again.'))
    xhr.onload = () => {
      let data = null
      try {
        data = JSON.parse(xhr.responseText)
      } catch {
        // not JSON (a proxy's error page)
      }
      if (xhr.status >= 200 && xhr.status < 300 && data) resolve(data)
      else reject(new ApiError(xhr.status, data?.error ?? `The upload didn’t work (error ${xhr.status}).`))
    }
    xhr.send(blob)
  })
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
