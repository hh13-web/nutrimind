import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { AIConfig, ChatMessage, Meal, Profile } from '../types'
import {
  DEFAULT_PROFILE,
  WELCOME_MESSAGE,
  buildSeedMeals,
  isSeeded,
  loadAIConfig,
  loadChat,
  loadMeals,
  loadProfile,
  markSeeded,
  saveAIConfig,
  saveChat,
  saveMeals,
  saveProfile,
} from '../lib/storage'
import { calcTargets, sumMeals, todayKey } from '../lib/nutrition'

interface Toast {
  id: number
  message: string
  tone: 'success' | 'info' | 'error'
}

interface AppContextValue {
  profile: Profile
  updateProfile: (patch: Partial<Profile>) => void
  meals: Meal[]
  todayMeals: Meal[]
  todayNutrition: ReturnType<typeof sumMeals>
  targets: ReturnType<typeof calcTargets>
  addMeal: (meal: Meal) => void
  removeMeal: (id: string) => void
  chat: ChatMessage[]
  addChatMessage: (msg: ChatMessage) => void
  updateChatMessage: (id: string, content: string, engine?: 'llm' | 'local') => void
  clearChat: () => void
  config: AIConfig
  setConfig: (c: AIConfig) => void
  toasts: Toast[]
  notify: (message: string, tone?: Toast['tone']) => void
  dismissToast: (id: number) => void
  resetDemoData: () => void
}

const AppContext = createContext<AppContextValue | null>(null)

const welcomeMessage: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content: WELCOME_MESSAGE,
  createdAt: Date.now(),
  engine: 'local',
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfileState] = useState<Profile>(() => loadProfile())
  const [meals, setMeals] = useState<Meal[]>(() => {
    const stored = loadMeals()
    if (stored) return stored
    if (!isSeeded()) {
      const seeded = buildSeedMeals()
      markSeeded()
      saveMeals(seeded)
      return seeded
    }
    return []
  })
  const [chat, setChat] = useState<ChatMessage[]>(() => loadChat() ?? [welcomeMessage])
  const [config, setConfigState] = useState<AIConfig>(() => loadAIConfig())
  const [toasts, setToasts] = useState<Toast[]>([])
  const toastId = useRef(0)

  useEffect(() => {
    saveProfile(profile)
  }, [profile])

  useEffect(() => {
    saveMeals(meals)
  }, [meals])

  useEffect(() => {
    saveChat(chat)
  }, [chat])

  const updateProfile = useCallback((patch: Partial<Profile>) => {
    setProfileState((prev) => ({ ...prev, ...patch }))
  }, [])

  const addMeal = useCallback((meal: Meal) => {
    setMeals((prev) => [...prev, meal])
  }, [])

  const removeMeal = useCallback((id: string) => {
    setMeals((prev) => prev.filter((m) => m.id !== id))
  }, [])

  const addChatMessage = useCallback((msg: ChatMessage) => {
    setChat((prev) => [...prev, msg])
  }, [])

  const updateChatMessage = useCallback((id: string, content: string, engine?: 'llm' | 'local') => {
    setChat((prev) => prev.map((m) => (m.id === id ? { ...m, content, engine: engine ?? m.engine } : m)))
  }, [])

  const clearChat = useCallback(() => {
    setChat([{ ...welcomeMessage, createdAt: Date.now() }])
  }, [])

  const setConfig = useCallback((c: AIConfig) => {
    setConfigState(c)
    saveAIConfig(c)
  }, [])

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const notify = useCallback(
    (message: string, tone: Toast['tone'] = 'success') => {
      const id = ++toastId.current
      setToasts((prev) => [...prev, { id, message, tone }])
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
      }, 3200)
    },
    [],
  )

  const resetDemoData = useCallback(() => {
    const seeded = buildSeedMeals()
    setMeals(seeded)
    setProfileState(DEFAULT_PROFILE)
    setChat([{ ...welcomeMessage, createdAt: Date.now() }])
    notify('示例数据已重置', 'info')
  }, [notify])

  const todayMeals = useMemo(() => meals.filter((m) => m.date === todayKey()), [meals])
  const todayNutrition = useMemo(() => sumMeals(todayMeals), [todayMeals])
  const targets = useMemo(() => calcTargets(profile), [profile])

  const value: AppContextValue = {
    profile,
    updateProfile,
    meals,
    todayMeals,
    todayNutrition,
    targets,
    addMeal,
    removeMeal,
    chat,
    addChatMessage,
    updateChatMessage,
    clearChat,
    config,
    setConfig,
    toasts,
    notify,
    dismissToast,
    resetDemoData,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
