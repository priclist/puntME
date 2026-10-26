<<<<<<< Updated upstream
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Runs the PuntMe API inside the dev server at /api, so `npm run dev` is
// the whole app on one port (also from your phone on the same Wi-Fi).
// Restart the dev server after changing files in server/.
function puntmeApi() {
  return {
    name: 'puntme-api',
    async configureServer(server) {
      // Imported by URL so Node loads it as-is instead of Vite bundling it.
      const { createApi } = await import(pathToFileURL(resolve('server/api.js')).href)
      const dataDir = process.env.PUNTME_DATA_DIR || resolve('server/data')
      server.middlewares.use('/api', createApi({ dataDir }))
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), puntmeApi()],
=======
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
>>>>>>> Stashed changes
  server: {
    // Expose the dev server on your network so you can open it on your phone.
    host: true,
    port: 5173,
  },
  preview: {
    host: true,
    port: 4173,
  },
  build: {
    target: 'es2022',
    sourcemap: true,
  },
})
