// Production server: the built app (dist/) and the API on one port.
//   npm run build && npm start

import { existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'
import { createApi } from './api.js'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dist = join(root, 'dist')
const dataDir = process.env.PUNTME_DATA_DIR || join(root, 'server', 'data')
const port = Number(process.env.PORT) || 8787

const app = express()
app.disable('x-powered-by')
// Behind Apache/nginx the client IP comes from X-Forwarded-For (rate limits).
app.set('trust proxy', process.env.TRUST_PROXY ?? 'loopback')

// Only needed when the app is hosted somewhere else than the API.
if (process.env.CORS_ORIGIN) {
  app.use('/api', (req, res, next) => {
    res.set({
      'Access-Control-Allow-Origin': process.env.CORS_ORIGIN,
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE',
      Vary: 'Origin',
    })
    if (req.method === 'OPTIONS') return res.sendStatus(204)
    next()
  })
}

app.use('/api', createApi({ dataDir }))

if (existsSync(dist)) {
  app.use(
    express.static(dist, {
      index: false,
      setHeaders(res, file) {
        // Vite names built files by content hash, so they never change.
        if (file.includes(`${join(dist, 'assets')}`)) res.set('Cache-Control', 'public, max-age=31536000, immutable')
        // The service worker and manifest must always be fresh to pick up updates.
        else if (/(sw\.js|manifest\.webmanifest)$/.test(file)) res.set('Cache-Control', 'no-cache')
      },
    }),
  )
  // Every other path is the app (it reads ?b=, ?quotes= and so on itself).
  app.get('/{*path}', (_req, res) => {
    res.set('Cache-Control', 'no-cache')
    res.sendFile(join(dist, 'index.html'))
  })
} else {
  console.warn('[puntme] No dist/ folder yet. Run `npm run build` to serve the app; the API still works.')
}

app.listen(port, () => console.log(`[puntme] http://localhost:${port}`))
