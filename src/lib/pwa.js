import { useEffect, useState } from 'react'

// Installing PuntMe to the home screen. Chrome/Edge/Android hand us an
// install prompt to show when the user asks; iPhone needs Share → Add to
// Home Screen, so there we show how instead.

export const isIOS =
  /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

export const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true

let deferredPrompt = null
let installed = isStandalone()
const listeners = new Set()
const emit = () => listeners.forEach((fn) => fn())

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault() // we offer it from Profile, Settings and Discover instead of the browser bar
  deferredPrompt = e
  emit()
})

window.addEventListener('appinstalled', () => {
  deferredPrompt = null
  installed = true
  emit()
})

/**
 * { installed, canPrompt, ios, install() }. `install` shows the browser's
 * prompt and resolves to true when the user accepts.
 */
export function useInstall() {
  const [, force] = useState(0)
  useEffect(() => {
    const fn = () => force((n) => n + 1)
    listeners.add(fn)
    return () => listeners.delete(fn)
  }, [])

  return {
    installed,
    canPrompt: Boolean(deferredPrompt),
    ios: isIOS && !installed,
    // Worth offering: the browser can install it, or it's an iPhone in Safari.
    available: !installed && (Boolean(deferredPrompt) || isIOS),
    async install() {
      if (!deferredPrompt) return false
      const prompt = deferredPrompt
      deferredPrompt = null
      prompt.prompt()
      const { outcome } = await prompt.userChoice
      emit()
      return outcome === 'accepted'
    },
  }
}
