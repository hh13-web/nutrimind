import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { AuthUser } from '../lib/api'
import {
  apiLogin,
  apiMe,
  apiRegister,
  clearSession,
  getSessionUser,
  getToken,
  saveSession,
} from '../lib/api'

interface AuthContextValue {
  user: AuthUser | null
  initializing: boolean
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => getSessionUser())
  const [initializing, setInitializing] = useState(() => Boolean(getToken()))

  useEffect(() => {
    if (!getToken()) {
      setInitializing(false)
      return
    }
    let alive = true
    apiMe()
      .then((me) => {
        if (alive) {
          setUser(me)
          saveSession(getToken() || '', me)
        }
      })
      .catch(() => {
        if (alive) {
          clearSession()
          setUser(null)
        }
      })
      .finally(() => {
        if (alive) setInitializing(false)
      })
    return () => {
      alive = false
    }
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const { token, user: me } = await apiLogin(email, password)
    saveSession(token, me)
    setUser(me)
  }, [])

  const register = useCallback(async (name: string, email: string, password: string) => {
    const { token, user: me } = await apiRegister(name, email, password)
    saveSession(token, me)
    setUser(me)
  }, [])

  const logout = useCallback(() => {
    clearSession()
    setUser(null)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ user, initializing, login, register, logout }),
    [user, initializing, login, register, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
