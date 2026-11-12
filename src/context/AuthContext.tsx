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

const GUEST_KEY = 'nourish.guest.v1'

function readGuestFlag(): boolean {
  try {
    return localStorage.getItem(GUEST_KEY) === '1'
  } catch {
    return false
  }
}

function writeGuestFlag(on: boolean) {
  try {
    if (on) localStorage.setItem(GUEST_KEY, '1')
    else localStorage.removeItem(GUEST_KEY)
  } catch {
    /* ignore */
  }
}

interface AuthContextValue {
  user: AuthUser | null
  isGuest: boolean
  initializing: boolean
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  logout: () => void
  enterGuest: () => void
  /** 需要登录才能使用的功能：未登录/游客时会弹出登录引导 */
  requireAuth: (feature: string) => boolean
  loginPrompt: string | null
  dismissLoginPrompt: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => getSessionUser())
  const [isGuest, setIsGuest] = useState(() => !getToken() && readGuestFlag())
  const [initializing, setInitializing] = useState(() => Boolean(getToken()))
  const [loginPrompt, setLoginPrompt] = useState<string | null>(null)

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
    writeGuestFlag(false)
    setIsGuest(false)
    setLoginPrompt(null)
    setUser(me)
  }, [])

  const register = useCallback(async (name: string, email: string, password: string) => {
    const { token, user: me } = await apiRegister(name, email, password)
    saveSession(token, me)
    writeGuestFlag(false)
    setIsGuest(false)
    setLoginPrompt(null)
    setUser(me)
  }, [])

  const logout = useCallback(() => {
    clearSession()
    writeGuestFlag(false)
    setUser(null)
    setIsGuest(false)
    setLoginPrompt(null)
  }, [])

  const enterGuest = useCallback(() => {
    if (getToken()) return
    clearSession()
    writeGuestFlag(true)
    setIsGuest(true)
    setUser(null)
  }, [])

  const requireAuth = useCallback(
    (feature: string) => {
      if (user) return true
      setLoginPrompt(feature)
      return false
    },
    [user],
  )

  const dismissLoginPrompt = useCallback(() => setLoginPrompt(null), [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isGuest,
      initializing,
      login,
      register,
      logout,
      enterGuest,
      requireAuth,
      loginPrompt,
      dismissLoginPrompt,
    }),
    [
      user,
      isGuest,
      initializing,
      login,
      register,
      logout,
      enterGuest,
      requireAuth,
      loginPrompt,
      dismissLoginPrompt,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
