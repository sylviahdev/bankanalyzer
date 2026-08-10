import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { authService, UNAUTHORIZED_EVENT } from '@/services'
import { clearSession, millisecondsUntilExpiry, readToken } from '@/services/tokenStore'
import type { User } from '@/types/api'
import { AuthContext, type AuthContextValue } from './authContext'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [initializing, setInitializing] = useState(true)

  const dropSession = useCallback(() => {
    clearSession()
    setUser(null)
  }, [])

  // Rehydrate on mount: a stored token is only trusted once /me confirms it.
  useEffect(() => {
    let cancelled = false

    async function restore() {
      if (!readToken()) {
        if (!cancelled) setInitializing(false)
        return
      }
      try {
        const profile = await authService.me()
        if (!cancelled) setUser(profile)
      } catch {
        // The 401 interceptor has already cleared the token.
        if (!cancelled) setUser(null)
      } finally {
        if (!cancelled) setInitializing(false)
      }
    }

    void restore()
    return () => {
      cancelled = true
    }
  }, [])

  // Any 401 anywhere in the app tears the session down exactly once.
  useEffect(() => {
    window.addEventListener(UNAUTHORIZED_EVENT, dropSession)
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, dropSession)
  }, [dropSession])

  // Tokens live 30 minutes. Sign the user out the moment theirs lapses rather
  // than letting the next request fail.
  useEffect(() => {
    if (!user) return
    const remaining = millisecondsUntilExpiry()
    if (remaining === null) return
    if (remaining <= 0) {
      dropSession()
      return
    }
    const timer = window.setTimeout(dropSession, remaining)
    return () => window.clearTimeout(timer)
  }, [user, dropSession])

  // Signing out in one tab signs out the others.
  useEffect(() => {
    function onStorage(event: StorageEvent) {
      if (event.key === 'bankanalyzer.token' && event.newValue === null) {
        setUser(null)
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const login = useCallback(async (username: string, password: string) => {
    await authService.login({ username: username.trim().toLowerCase(), password })
    setUser(await authService.me())
  }, [])

  const register = useCallback(async (username: string, password: string) => {
    const result = await authService.register({
      username: username.trim().toLowerCase(),
      password,
    })
    return result.message
  }, [])

  const logout = useCallback(async () => {
    try {
      await authService.logout()
    } finally {
      setUser(null)
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      initializing,
      isAuthenticated: user !== null,
      login,
      register,
      logout,
    }),
    [user, initializing, login, register, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
