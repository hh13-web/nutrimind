import type { AIConfig, ChatMessage, Meal, Profile } from '../types'
import { MEAL_LABELS, type MealType } from '../types'
import { itemFromFood, roundNutrition, addNutrition, zeroNutrition } from './nutrition'
import { FOOD_MAP } from '../data/foods'

export const DEFAULT_PROFILE: Profile = {
  name: '林小满',
  gender: 'female',
  age: 28,
  height: 165,
  weight: 58,
  targetWeight: 54,
  activity: 'light',
  goal: 'lose',
  dietPreferences: [],
  allergies: ['花生'],
  mealsPerDay: 3,
}

const KEY = {
  profile: 'nourish.profile.v1',
  meals: 'nourish.meals.v1',
  chat: 'nourish.chat.v1',
  config: 'nourish.ai.v1',
  seeded: 'nourish.seeded.v2',
}

export function loadProfile(): Profile {
  try {
    const raw = localStorage.getItem(KEY.profile)
    if (!raw) return DEFAULT_PROFILE
    return { ...DEFAULT_PROFILE, ...(JSON.parse(raw) as Partial<Profile>) }
  } catch {
    return DEFAULT_PROFILE
  }
}

export function saveProfile(p: Profile) {
  localStorage.setItem(KEY.profile, JSON.stringify(p))
}

export function loadMeals(): Meal[] | null {
  try {
    const raw = localStorage.getItem(KEY.meals)
    if (!raw) return null
    return JSON.parse(raw) as Meal[]
  } catch {
    return null
  }
}

export function saveMeals(meals: Meal[]) {
  localStorage.setItem(KEY.meals, JSON.stringify(meals))
}

export function loadChat(): ChatMessage[] | null {
  try {
    const raw = localStorage.getItem(KEY.chat)
    return raw ? (JSON.parse(raw) as ChatMessage[]) : null
  } catch {
    return null
  }
}

export function saveChat(messages: ChatMessage[]) {
  localStorage.setItem(KEY.chat, JSON.stringify(messages.slice(-80)))
}

export function defaultAIConfig(): AIConfig {
  const env = import.meta.env
  return {
    baseUrl: (env.VITE_AI_BASE_URL as string) || 'https://api.openai.com/v1',
    apiKey: (env.VITE_AI_API_KEY as string) || '',
    model: (env.VITE_AI_MODEL as string) || 'gpt-4o-mini',
  }
}

export function loadAIConfig(): AIConfig {
  try {
    const raw = localStorage.getItem(KEY.config)
    if (!raw) return defaultAIConfig()
    return { ...defaultAIConfig(), ...(JSON.parse(raw) as Partial<AIConfig>) }
  } catch {
    return defaultAIConfig()
  }
}

export function saveAIConfig(c: AIConfig) {
  localStorage.setItem(KEY.config, JSON.stringify(c))
}

export function markSeeded() {
  localStorage.setItem(KEY.seeded, '1')
}

export function isSeeded(): boolean {
  return localStorage.getItem(KEY.seeded) === '1'
}

/** 确定性伪随机，保证示例数据每次生成一致 */
function mulberry32(seed: number) {
  return function () {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function hash(str: string): number {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

interface Recipe {
  type: MealType
  items: [string, number][]
}

const BREAKFASTS: Recipe[] = [
  { type: 'breakfast', items: [['oat', 40], ['milk', 250], ['boiled-egg', 100], ['blueberry', 100]] },
  { type: 'breakfast', items: [['whole-bread', 70], ['egg', 100], ['avocado', 75], ['americano', 350]] },
  { type: 'breakfast', items: [['congee', 300], ['baozi', 90], ['boiled-egg', 50]] },
  { type: 'breakfast', items: [['greek-yogurt', 150], ['banana', 120], ['nuts', 20]] },
]

const LUNCHES: Recipe[] = [
  { type: 'lunch', items: [['chicken-salad', 300], ['brown-rice', 150], ['seaweed-soup', 300]] },
  { type: 'lunch', items: [['beef-noodle', 500], ['stir-broccoli', 150]] },
  { type: 'lunch', items: [['rice', 200], ['tomato-egg', 250], ['stir-broccoli', 200]] },
  { type: 'lunch', items: [['brown-rice', 200], ['salmon', 120], ['spinach', 150]] },
  { type: 'lunch', items: [['fried-rice', 300], ['seaweed-soup', 300]] },
]

const DINNERS: Recipe[] = [
  { type: 'dinner', items: [['salmon', 120], ['sweet-potato', 150], ['salad', 200]] },
  { type: 'dinner', items: [['chicken-breast', 120], ['broccoli', 200], ['sweet-potato', 150]] },
  { type: 'dinner', items: [['tofu', 150], ['cabbage', 200], ['congee', 250]] },
  { type: 'dinner', items: [['kungpao', 200], ['rice', 150], ['stir-broccoli', 100]] },
  { type: 'dinner', items: [['dumpling', 240], ['seaweed-soup', 300]] },
]

const SNACKS: Recipe[] = [
  { type: 'snack', items: [['apple', 200]] },
  { type: 'snack', items: [['greek-yogurt', 150]] },
  { type: 'snack', items: [['nuts', 25]] },
  { type: 'snack', items: [['latte', 350]] },
]

function buildMeal(date: string, recipe: Recipe, index: number): Meal {
  const items = recipe.items
    .filter(([id]) => FOOD_MAP[id])
    .map(([id, grams]) => itemFromFood(FOOD_MAP[id], grams))
  const nutrition = roundNutrition(items.reduce((acc, it) => addNutrition(acc, it.nutrition), zeroNutrition()))
  return {
    id: `${date}-${recipe.type}-${index}`,
    date,
    type: recipe.type,
    items,
    nutrition,
    createdAt: new Date(`${date}T08:00:00`).getTime() + index * 3600_000,
    engine: 'local',
  }
}

/** 生成近 7 天示例饮食记录（含今日），让首次体验即可看到完整洞察 */
export function buildSeedMeals(): Meal[] {
  const meals: Meal[] = []
  const today = new Date()

  for (let offset = 6; offset >= 0; offset--) {
    const d = new Date(today)
    d.setDate(today.getDate() - offset)
    const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const rand = mulberry32(hash(date))

    const breakfast = BREAKFASTS[Math.floor(rand() * BREAKFASTS.length)]
    const lunch = LUNCHES[Math.floor(rand() * LUNCHES.length)]
    const dinner = DINNERS[Math.floor(rand() * DINNERS.length)]
    const hasSnack = rand() > 0.45

    if (offset === 0) {
      meals.push(buildMeal(date, { type: 'breakfast', items: [['oat', 40], ['milk', 250], ['boiled-egg', 100], ['blueberry', 100]] }, 0))
      meals.push(buildMeal(date, { type: 'lunch', items: [['chicken-salad', 300], ['brown-rice', 150], ['seaweed-soup', 300]] }, 1))
    } else {
      meals.push(buildMeal(date, breakfast, 0))
      meals.push(buildMeal(date, lunch, 1))
      meals.push(buildMeal(date, dinner, 2))
      if (hasSnack) meals.push(buildMeal(date, SNACKS[Math.floor(rand() * SNACKS.length)], 3))
    }
  }
  return meals
}

export const WELCOME_MESSAGE = `你好，我是你的 AI 营养师 **知膳** 👋

我已经读取了你的健康档案和近期饮食记录。你可以直接问我：

- 「今天吃得怎么样？」
- 「晚餐吃什么不容易饿？」
- 「蛋白质还差多少，怎么补？」
- 「帮我安排明天的一日三餐」

我会结合你的目标、热量缺口和营养素结构给出可执行的建议。`
