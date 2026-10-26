import { useEffect, useState } from 'react'

const EVENT = 'puntme:toast'

<<<<<<< Updated upstream
/**
 * Show a short message at the bottom of the screen. An `action`
 * ({ label, onClick }) adds a button and keeps the message up longer.
 */
export function showToast(message, { action } = {}) {
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { message, action } }))
}

export default function Toast() {
  const [toast, setToast] = useState(null)
=======
/** Show a short message at the bottom of the screen. */
export function showToast(message) {
  window.dispatchEvent(new CustomEvent(EVENT, { detail: message }))
}

export default function Toast() {
  const [message, setMessage] = useState(null)
>>>>>>> Stashed changes

  useEffect(() => {
    let timer
    const onToast = (e) => {
<<<<<<< Updated upstream
      setToast({ ...e.detail, key: Date.now() })
      clearTimeout(timer)
      timer = setTimeout(() => setToast(null), e.detail.action ? 6000 : 2800)
=======
      setMessage(e.detail)
      clearTimeout(timer)
      timer = setTimeout(() => setMessage(null), 2800)
>>>>>>> Stashed changes
    }
    window.addEventListener(EVENT, onToast)
    return () => {
      window.removeEventListener(EVENT, onToast)
      clearTimeout(timer)
    }
  }, [])

  return (
    <div className="pm-toast-region" role="status" aria-live="polite">
<<<<<<< Updated upstream
      {toast && (
        <div key={toast.key} className={`pm-toast ${toast.action ? 'pm-toast--action' : ''}`}>
          <span>{toast.message}</span>
          {toast.action && (
            <button
              type="button"
              className="pm-toast__btn"
              onClick={() => {
                setToast(null)
                toast.action.onClick()
              }}
            >
              {toast.action.label}
            </button>
          )}
        </div>
      )}
=======
      {message && <div className="pm-toast">{message}</div>}
>>>>>>> Stashed changes
    </div>
  )
}
