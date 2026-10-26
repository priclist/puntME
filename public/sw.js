// PuntMe service worker: opens instantly and works offline once it has
<<<<<<< Updated upstream
// been visited, and shows push notifications (quote requests, job alerts).
// Business data (Google and the PuntMe API) is never cached here; it
// always comes live from the network.

const CACHE = 'puntme-v2'
const SHELL = ['/', '/manifest.webmanifest', '/icon.svg', '/icon-192.png', '/badge-72.png']
// Registered as /sw.js?dev while developing: notifications work, but
// nothing is cached so the dev server's files are never stale.
const DEV = new URL(self.location.href).searchParams.has('dev')

self.addEventListener('install', (event) => {
  if (!DEV) event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)))
=======
// been visited. Business data (Google) is never cached here; it always
// comes live from the network.

const CACHE = 'puntme-v1'
const SHELL = ['/', '/manifest.webmanifest', '/icon.svg', '/icon-192.png']

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)))
>>>>>>> Stashed changes
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
<<<<<<< Updated upstream
      .then((keys) => Promise.all(keys.filter((k) => DEV || k !== CACHE).map((k) => caches.delete(k))))
=======
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
>>>>>>> Stashed changes
      .then(() => self.clients.claim()),
  )
})

const isFont = (url) => url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com'

self.addEventListener('fetch', (event) => {
<<<<<<< Updated upstream
  if (DEV) return
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin === self.location.origin && url.pathname.startsWith('/api/')) return
=======
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)
>>>>>>> Stashed changes

  // Pages: network first so updates show up, cached copy when offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone()
          caches.open(CACHE).then((cache) => cache.put('/', copy))
          return res
        })
        .catch(() => caches.match('/')),
    )
    return
  }

  // App files and fonts: from the cache, refreshed in the background.
  if (url.origin === self.location.origin || isFont(url)) {
    event.respondWith(
      caches.open(CACHE).then(async (cache) => {
        const cached = await cache.match(request)
        const fresh = fetch(request)
          .then((res) => {
            if (res.ok || res.type === 'opaque') cache.put(request, res.clone())
            return res
          })
          .catch(() => cached)
        return cached ?? fresh
      }),
    )
  }
})
<<<<<<< Updated upstream

/* ---------- Push notifications ---------- */

self.addEventListener('push', (event) => {
  let payload = {}
  try {
    payload = event.data?.json() ?? {}
  } catch {
    payload = { title: 'PuntMe', body: event.data?.text() }
  }
  const title = payload.title || 'PuntMe'

  event.waitUntil(
    (async () => {
      await self.registration.showNotification(title, {
        body: payload.body,
        tag: payload.tag,
        icon: '/icon-192.png',
        badge: '/badge-72.png', // Android status bar: white on transparent
        data: { url: payload.url || '/' },
        renotify: Boolean(payload.tag),
      })
      // An open app refreshes its counts and shows the news in place.
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      windows.forEach((w) => w.postMessage({ type: 'push', payload }))
    })(),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = new URL(event.notification.data?.url || '/', self.location.origin).href

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      const open = windows.find((w) => new URL(w.url).origin === self.location.origin)
      if (open) {
        // Already open: bring it forward and go to the right screen.
        await open.focus()
        open.postMessage({ type: 'navigate', url })
        return
      }
      await self.clients.openWindow(url)
    })(),
  )
})
=======
>>>>>>> Stashed changes
