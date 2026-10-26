import { useCallback, useState } from 'react'

// useState that survives reloads. Storage can be unavailable (private mode),
// so every access is guarded and the app keeps working in memory.
// `initial` may be a function, called only when nothing is stored yet.
export function useLocalStorage(key, initial) {
  const [value, setValue] = useState(() => {
    const fallback = () => (typeof initial === 'function' ? initial() : initial)
    try {
      const raw = localStorage.getItem(key)
      return raw == null ? fallback() : JSON.parse(raw)
    } catch {
      return fallback()
    }
  })

  const update = useCallback(
    (next) => {
      setValue((prev) => {
        const resolved = typeof next === 'function' ? next(prev) : next
        try {
          localStorage.setItem(key, JSON.stringify(resolved))
        } catch {
          // ignore — value still lives in memory
        }
        return resolved
      })
    },
    [key],
  )

  return [value, update]
}
