import type { ChatMessage, Meal, Profile } from '../types'
import { currentUserId, getSessionUser } from './api'

/** 身体数据必须由用户填写，0 表示尚未填写。 */
export const DEFAULT_PROFILE: Profile = {
  name: '你',
  gender: 'female',
  age: 0,
  height: 0,
  weight: 0,
  targetWeight: 0,
  activity: 'light',
  goal: 'maintain',
  dietPreferences: [],
  allergies: [],
  mealsPerDay: 3,
}

const KEY = {
  profile: 'profile.v3',
  meals: 'meals.v3',
  chat: 'chat.v2',
}

/** 每个账号独立的数据命名空间 */
function storageKey(name: string): string {
  return `nourish.${currentUserId()}.${name}`
}

// ─────────────────────────────────────────────────────────────
// 新档案只初始化偏好，身体数据由用户本人填写
// ─────────────────────────────────────────────────────────────

export function buildDefaultProfile(): Profile {
  const user = getSessionUser()
  return {
    ...DEFAULT_PROFILE,
    name: user?.name || '游客',
  }
}

export function loadProfile(): Profile {
  try {
    const raw = localStorage.getItem(storageKey(KEY.profile))
    if (!raw) return buildDefaultProfile()
    return { ...buildDefaultProfile(), ...(JSON.parse(raw) as Partial<Profile>) }
  } catch {
    return buildDefaultProfile()
  }
}

export function saveProfile(p: Profile) {
  localStorage.setItem(storageKey(KEY.profile), JSON.stringify(p))
}

export function loadMeals(): Meal[] | null {
  try {
    const raw = localStorage.getItem(storageKey(KEY.meals))
    if (!raw) return null
    return JSON.parse(raw) as Meal[]
  } catch {
    return null
  }
}

export function saveMeals(meals: Meal[]) {
  localStorage.setItem(storageKey(KEY.meals), JSON.stringify(meals))
}

export function loadChat(): ChatMessage[] | null {
  try {
    const raw = localStorage.getItem(storageKey(KEY.chat))
    return raw ? (JSON.parse(raw) as ChatMessage[]) : null
  } catch {
    return null
  }
}

export function saveChat(messages: ChatMessage[]) {
  localStorage.setItem(storageKey(KEY.chat), JSON.stringify(messages.slice(-80)))
}

export function buildWelcomeMessage(name?: string): string {
  const who = name || getSessionUser()?.name
  return `你好${who ? `，${who}` : ''}，我是你的 AI 营养师 **知膳** 👋

我会结合你的健康档案和你记录的饮食来回答。你可以直接问我：

- 「今天吃得怎么样？」
- 「早餐吃什么不容易饿？」
- 「蛋白质还差多少，怎么补？」
- 「帮我安排明天的一日三餐」

我会结合你的目标、热量缺口和营养素结构给出可执行的建议。`
}

export const WELCOME_MESSAGE = buildWelcomeMessage()
