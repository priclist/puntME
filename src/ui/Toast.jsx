import { useEffect, useState } from 'react'

const EVENT = 'puntme:toast'

/** Show a short message at the bottom of the screen. */
export function showToast(message) {
  window.dispatchEvent(new CustomEvent(EVENT, { detail: message }))
}

export default function Toast() {
  const [message, setMessage] = useState(null)

  useEffect(() => {
    let timer
    const onToast = (e) => {
      setMessage(e.detail)
      clearTimeout(timer)
      timer = setTimeout(() => setMessage(null), 2800)
    }
    window.addEventListener(EVENT, onToast)
    return () => {
      window.removeEventListener(EVENT, onToast)
      clearTimeout(timer)
    }
  }, [])

  return (
    <div className="pm-toast-region" role="status" aria-live="polite">
      {message && <div className="pm-toast">{message}</div>}
    </div>
  )
}
