import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { AnalysisResult, AnalysisSession, ChatMessage, Meal, MealType, Profile } from '../types'
import {
  buildWelcomeMessage,
  loadChat,
  loadMeals,
  loadProfile,
  saveChat,
  saveMeals,
  saveProfile,
} from '../lib/storage'
import { calcTargets, sumMeals, todayKey } from '../lib/nutrition'
import { fetchAIStatus, type ServerAIStatus } from '../lib/api'
import { analyzeMeal } from '../lib/ai'

interface ToastAction {
  label: string
  to: string
}

interface Toast {
  id: number
  message: string
  tone: 'success' | 'info' | 'error'
  action?: ToastAction
}

function createAnalysisSession(mealType?: MealType): AnalysisSession {
  const hour = new Date().getHours()
  const guessedType: MealType = hour < 10 ? 'breakfast' : hour < 15 ? 'lunch' : hour < 21 ? 'dinner' : 'snack'
  return {
    id: Math.random().toString(36).slice(2, 10),
    input: '',
    mealType: mealType ?? guessedType,
    status: 'editing',
    result: null,
    error: '',
    savedMealId: null,
  }
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
  analysisSession: AnalysisSession
  updateAnalysisDraft: (patch: Partial<Pick<AnalysisSession, 'input' | 'mealType'>>) => void
  updateAnalysisResult: (result: AnalysisResult) => void
  startAnalysis: () => Promise<void>
  saveAnalysis: () => Meal | null
  resetAnalysis: (mealType?: MealType) => void
  chat: ChatMessage[]
  addChatMessage: (msg: ChatMessage) => void
  updateChatMessage: (id: string, content: string, engine?: 'llm' | 'local') => void
  clearChat: () => void
  aiStatus: ServerAIStatus
  refreshAIStatus: () => Promise<ServerAIStatus>
  toasts: Toast[]
  notify: (message: string, tone?: Toast['tone'], action?: ToastAction) => void
  dismissToast: (id: number) => void
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfileState] = useState<Profile>(() => loadProfile())
  const [meals, setMeals] = useState<Meal[]>(() => loadMeals() ?? [])
  const [chat, setChat] = useState<ChatMessage[]>(() => {
    const stored = loadChat()
    if (stored) return stored
    return [
      {
        id: 'welcome',
        role: 'assistant',
        content: buildWelcomeMessage(profile.name),
        createdAt: Date.now(),
        engine: 'local',
      },
    ]
  })
  const [aiStatus, setAIStatus] = useState<ServerAIStatus>({ configured: false, model: '' })
  const [toasts, setToasts] = useState<Toast[]>([])
  const [analysisSession, setAnalysisSessionState] = useState<AnalysisSession>(() => createAnalysisSession())
  const analysisRef = useRef(analysisSession)
  const toastId = useRef(0)

  const setAnalysisSession = useCallback((next: AnalysisSession) => {
    analysisRef.current = next
    setAnalysisSessionState(next)
  }, [])

  const refreshAIStatus = useCallback(async (): Promise<ServerAIStatus> => {
    let next: ServerAIStatus
    try {
      next = await fetchAIStatus()
    } catch {
      next = { configured: false, model: '' }
    }
    setAIStatus(next)
    return next
  }, [])

  useEffect(() => {
    refreshAIStatus()
  }, [refreshAIStatus])

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
    if (analysisRef.current.savedMealId === id) {
      setAnalysisSession({ ...analysisRef.current, savedMealId: null })
    }
  }, [setAnalysisSession])

  const addChatMessage = useCallback((msg: ChatMessage) => {
    setChat((prev) => [...prev, msg])
  }, [])

  const updateChatMessage = useCallback((id: string, content: string, engine?: 'llm' | 'local') => {
    setChat((prev) => prev.map((m) => (m.id === id ? { ...m, content, engine: engine ?? m.engine } : m)))
  }, [])

  const clearChat = useCallback(() => {
    setChat([
      {
        id: 'welcome',
        role: 'assistant',
        content: buildWelcomeMessage(loadProfile().name),
        createdAt: Date.now(),
        engine: 'local',
      },
    ])
  }, [])

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const notify = useCallback(
    (message: string, tone: Toast['tone'] = 'success', action?: ToastAction) => {
      const id = ++toastId.current
      setToasts((prev) => [...prev, { id, message, tone, action }])
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
      }, action ? 5200 : 3200)
    },
    [],
  )

  const updateAnalysisDraft = useCallback(
    (patch: Partial<Pick<AnalysisSession, 'input' | 'mealType'>>) => {
      const current = analysisRef.current
      if (current.status === 'running' || current.savedMealId) return
      setAnalysisSession({
        ...current,
        ...patch,
        status: 'editing',
        result: null,
        error: '',
        savedMealId: null,
      })
    },
    [setAnalysisSession],
  )

  const updateAnalysisResult = useCallback(
    (result: AnalysisResult) => {
      const current = analysisRef.current
      if (current.status !== 'done' || current.savedMealId) return
      setAnalysisSession({ ...current, result })
    },
    [setAnalysisSession],
  )

  const startAnalysis = useCallback(async () => {
    const current = analysisRef.current
    const input = current.input.trim()
    if (!input || current.status === 'running') return

    const id = Math.random().toString(36).slice(2, 10)
    setAnalysisSession({
      ...current,
      id,
      input,
      status: 'running',
      result: null,
      error: '',
      savedMealId: null,
    })

    try {
      const result = await analyzeMeal(input, profile, current.mealType, aiStatus)
      if (analysisRef.current.id !== id) return
      setAnalysisSession({ ...analysisRef.current, status: 'done', result, error: '' })
      notify(
        result.engine === 'llm' ? 'AI 分析已完成，请确认后加入饮食记录' : '本地规则分析已完成，请确认后加入饮食记录',
        'success',
      )
    } catch (error) {
      if (analysisRef.current.id !== id) return
      const message = error instanceof Error ? error.message : '分析失败，请稍后重试'
      setAnalysisSession({ ...analysisRef.current, status: 'error', result: null, error: message })
      notify(message, 'error')
    }
  }, [aiStatus, notify, profile, setAnalysisSession])

  const saveAnalysis = useCallback((): Meal | null => {
    const current = analysisRef.current
    if (!current.result || current.savedMealId || current.status !== 'done') return null

    const result = current.result
    const meal: Meal = {
      id: Math.random().toString(36).slice(2, 10),
      date: todayKey(),
      type: result.mealType,
      items: result.items,
      nutrition: result.totals,
      createdAt: Date.now(),
      engine: result.engine,
      analysis: {
        sessionId: current.id,
        input: current.input,
        score: result.score,
        grade: result.grade,
        summary: result.summary,
        suggestions: result.suggestions,
        source: 'meal-analysis',
      },
    }
    addMeal(meal)
    setAnalysisSession({ ...current, savedMealId: meal.id })
    notify(`已加入今日饮食记录`, 'success', {
      label: '查看记录',
      to: `/app/log?date=${meal.date}&meal=${meal.id}`,
    })
    return meal
  }, [addMeal, notify, setAnalysisSession])

  const resetAnalysis = useCallback(
    (mealType?: MealType) => {
      setAnalysisSession(createAnalysisSession(mealType))
    },
    [setAnalysisSession],
  )

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
    analysisSession,
    updateAnalysisDraft,
    updateAnalysisResult,
    startAnalysis,
    saveAnalysis,
    resetAnalysis,
    chat,
    addChatMessage,
    updateChatMessage,
    clearChat,
    aiStatus,
    refreshAIStatus,
    toasts,
    notify,
    dismissToast,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
