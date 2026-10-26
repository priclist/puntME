import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
<<<<<<< Updated upstream
import './lib/pwa.js' // listens for the install prompt before anything renders
=======
>>>>>>> Stashed changes
import './puntme.css'

// Lets iOS Safari apply :active press states on tap.
document.addEventListener('touchstart', () => {}, { passive: true })

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

<<<<<<< Updated upstream
// Installable app that opens offline and shows notifications. The dev
// server registers it with ?dev, which turns caching off so files are
// never stale while you work.
if ('serviceWorker' in navigator) {
  const url = import.meta.env.PROD ? '/sw.js' : '/sw.js?dev'
  window.addEventListener('load', () => navigator.serviceWorker.register(url, { updateViaCache: 'none' }).catch(() => {}))
=======
// Installable app that opens offline (production builds only, so the dev
// server never serves stale files).
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}))
>>>>>>> Stashed changes
}
