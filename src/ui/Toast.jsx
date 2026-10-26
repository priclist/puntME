import { useEffect, useState } from 'react'

const EVENT = 'puntme:toast'

/**
 * Show a short message at the bottom of the screen. An `action`
 * ({ label, onClick }) adds a button and keeps the message up longer.
 */
export function showToast(message, { action } = {}) {
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { message, action } }))
}

export default function Toast() {
  const [toast, setToast] = useState(null)

  useEffect(() => {
    let timer
    const onToast = (e) => {
      setToast({ ...e.detail, key: Date.now() })
      clearTimeout(timer)
      timer = setTimeout(() => setToast(null), e.detail.action ? 6000 : 2800)
    }
    window.addEventListener(EVENT, onToast)
    return () => {
      window.removeEventListener(EVENT, onToast)
      clearTimeout(timer)
    }
  }, [])

  return (
    <div className="pm-toast-region" role="status" aria-live="polite">
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
    </div>
  )
}
