import { useEffect, useRef, useState } from 'react'

/**
 * Bottom sheet on a native <dialog>: slides up, and slides down again on
 * Done, Esc or a tap on the dimmed backdrop before it really closes.
 */
export default function Sheet({ open, onClose, labelledBy, children, className = '' }) {
  const dialog = useRef(null)
  const [closing, setClosing] = useState(false)

  useEffect(() => {
    const d = dialog.current
    if (open && !d.open) {
      setClosing(false)
      d.showModal()
    }
    if (!open && d.open) setClosing(true) // plays the slide-down, then closes
  }, [open])

  function onAnimationEnd(e) {
    if (closing && e.target === dialog.current) {
      setClosing(false)
      dialog.current.close()
    }
  }

  return (
    <dialog
      ref={dialog}
      className={`pm-sheet ${closing ? 'is-closing' : ''} ${className}`}
      aria-labelledby={labelledBy}
      onCancel={(e) => {
        e.preventDefault() // Esc: animate out like the Done button
        onClose()
      }}
      onClick={(e) => e.target === dialog.current && onClose()} // tap on the dimmed backdrop
      onAnimationEnd={onAnimationEnd}
    >
      <div className="pm-sheet__body">
        <span className="pm-sheet__grabber" aria-hidden="true" />
        {children}
      </div>
    </dialog>
  )
}
