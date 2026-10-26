import { useCallback, useEffect, useState } from 'react'
import { SIGNED_OUT_EVENT, api, getToken, setToken } from './api.js'

const SIGNED_OUT = { status: 'signedout', user: null, businesses: [], unread: 0, messagesUnread: 0 }

/**
 * The signed-in person, their businesses and unread quote requests.
 * status: 'loading' | 'signedout' | 'ready'
 */
export function useAccount() {
  const [account, setAccount] = useState(() => (getToken() ? { ...SIGNED_OUT, status: 'loading' } : SIGNED_OUT))

  const apply = useCallback((data) => {
    setAccount({
      status: 'ready',
      user: data.user,
      businesses: data.businesses,
      unread: data.unread,
      messagesUnread: data.messagesUnread ?? 0,
    })
  }, [])

  const refresh = useCallback(async () => {
    if (!getToken()) return setAccount(SIGNED_OUT)
    try {
      apply(await api('/me'))
    } catch (err) {
      // Offline or server down: keep what we have rather than signing out.
      if (err.status === 401) setAccount(SIGNED_OUT)
      else setAccount((a) => (a.status === 'loading' ? { ...SIGNED_OUT, status: 'error' } : a))
    }
  }, [apply])

  useEffect(() => {
    refresh()
    // Fresh counts whenever the app comes back to the front.
    const onVisible = () => document.visibilityState === 'visible' && refresh()
    const onSignedOut = () => setAccount(SIGNED_OUT)
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener(SIGNED_OUT_EVENT, onSignedOut)
    // New quote requests also show up while the app stays open.
    const poll = setInterval(() => document.visibilityState === 'visible' && getToken() && refresh(), 60_000)
    return () => {
      clearInterval(poll)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener(SIGNED_OUT_EVENT, onSignedOut)
    }
  }, [refresh])

  const signIn = useCallback(
    async (mode, fields) => {
      const data = await api(mode === 'register' ? '/auth/register' : '/auth/login', { method: 'POST', body: fields })
      setToken(data.token)
      apply(data)
      return data
    },
    [apply],
  )

  const signOut = useCallback(async () => {
    await api('/auth/logout', { method: 'POST' }).catch(() => {})
    setToken(null)
    setAccount(SIGNED_OUT)
  }, [])

  const rename = useCallback(async (name) => apply(await api('/me', { method: 'PATCH', body: { name } })), [apply])

  const deleteAccount = useCallback(async (password) => {
    await api('/me/delete', { method: 'POST', body: { password } })
    setToken(null)
    setAccount(SIGNED_OUT)
  }, [])

  return { ...account, refresh, signIn, signOut, rename, deleteAccount }
}
