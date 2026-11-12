import type {
  ActivityLevel,
  ChatMessage,
  Gender,
  Goal,
  Meal,
  MealType,
  Profile,
} from '../types'
import { itemFromFood, roundNutrition, addNutrition, zeroNutrition } from './nutrition'
import { FOOD_MAP } from '../data/foods'
import { currentUserId, getSessionUser } from './api'

/** 未登录时的兜底档案（正常流程不会用到） */
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
  profile: 'profile.v2',
  meals: 'meals.v2',
  chat: 'chat.v2',
  seeded: 'seeded.v4',
}

/** 每个账号独立的数据命名空间 */
function storageKey(name: string): string {
  return `nourish.${currentUserId()}.${name}`
}

// ─────────────────────────────────────────────────────────────
// 按账号生成的示例档案：不同用户打开看到的是不同的身体数据与目标
// ─────────────────────────────────────────────────────────────

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

const ACTIVITY_POOL: ActivityLevel[] = ['sedentary', 'light', 'moderate', 'light', 'moderate', 'active']
const GOAL_POOL: Goal[] = ['lose', 'lose', 'maintain', 'gain']
const ALLERGY_POOL = ['花生', '坚果', '海鲜', '乳制品', '鸡蛋', '大豆', '麸质']
const PREF_POOL = ['素食', '低碳水', '高蛋白', '无麸质', '乳糖不耐', '低钠']

const round1 = (v: number) => Math.round(v * 10) / 10

export function buildDefaultProfile(): Profile {
  const user = getSessionUser()
  if (!user) return { ...DEFAULT_PROFILE }

  const rand = mulberry32(hash(`profile:${user.id}`))
  const gender: Gender = rand() > 0.45 ? 'female' : 'male'
  const age = 23 + Math.floor(rand() * 12)
  const height = gender === 'female' ? 156 + Math.floor(rand() * 16) : 168 + Math.floor(rand() * 15)
  const bmi = 19.5 + rand() * 5
  const weight = round1(bmi * Math.pow(height / 100, 2))
  const goal = GOAL_POOL[Math.floor(rand() * GOAL_POOL.length)]
  const targetWeight =
    goal === 'lose'
      ? round1(weight - (2.5 + rand() * 4.5))
      : goal === 'gain'
        ? round1(weight + (2 + rand() * 3))
        : weight
  const activity = ACTIVITY_POOL[Math.floor(rand() * ACTIVITY_POOL.length)]
  const allergies = rand() > 0.55 ? [ALLERGY_POOL[Math.floor(rand() * ALLERGY_POOL.length)]] : []
  const dietPreferences = rand() > 0.7 ? [PREF_POOL[Math.floor(rand() * PREF_POOL.length)]] : []

  return {
    name: user.name || '你',
    gender,
    age,
    height,
    weight,
    targetWeight,
    activity,
    goal,
    dietPreferences,
    allergies,
    mealsPerDay: rand() > 0.72 ? 4 : 3,
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

export function markSeeded() {
  localStorage.setItem(storageKey(KEY.seeded), '1')
}

export function isSeeded(): boolean {
  return localStorage.getItem(storageKey(KEY.seeded)) === '1'
}

// ─────────────────────────────────────────────────────────────
// 示例饮食记录：按账号 + 日期生成，不同用户 / 不同日期各不相同
// ─────────────────────────────────────────────────────────────

interface Recipe {
  type: MealType
  items: [string, number][]
  veg?: boolean
}

const BREAKFASTS: Recipe[] = [
  { type: 'breakfast', items: [['oat', 40], ['milk', 250], ['boiled-egg', 100], ['blueberry', 100]] },
  { type: 'breakfast', items: [['whole-bread', 70], ['egg', 100], ['avocado', 75], ['americano', 350]] },
  { type: 'breakfast', items: [['congee', 300], ['baozi', 90], ['boiled-egg', 50]] },
  { type: 'breakfast', items: [['greek-yogurt', 150], ['banana', 120], ['nuts', 20]] },
  { type: 'breakfast', items: [['sweet-potato', 150], ['boiled-egg', 100], ['soy-milk', 250]], veg: true },
  { type: 'breakfast', items: [['sandwich', 150], ['milk', 250], ['apple', 150]] },
  { type: 'breakfast', items: [['yogurt', 150], ['whole-bread', 70], ['boiled-egg', 50]], veg: true },
  { type: 'breakfast', items: [['milk', 250], ['corn', 180], ['boiled-egg', 50]] },
]

const LUNCHES: Recipe[] = [
  { type: 'lunch', items: [['chicken-salad', 300], ['brown-rice', 150], ['seaweed-soup', 300]] },
  { type: 'lunch', items: [['beef-noodle', 500], ['stir-broccoli', 150]] },
  { type: 'lunch', items: [['rice', 200], ['tomato-egg', 250], ['stir-broccoli', 200]], veg: true },
  { type: 'lunch', items: [['brown-rice', 200], ['salmon', 120], ['spinach', 150]] },
  { type: 'lunch', items: [['fried-rice', 300], ['seaweed-soup', 300]] },
  { type: 'lunch', items: [['rice', 200], ['tofu', 150], ['stir-broccoli', 200]], veg: true },
  { type: 'lunch', items: [['brown-rice', 150], ['shrimp', 100], ['spinach', 150]] },
  { type: 'lunch', items: [['rice-noodle', 300], ['chicken-breast', 100], ['lettuce', 100]] },
  { type: 'lunch', items: [['sushi', 240], ['seaweed-soup', 300]] },
]

const DINNERS: Recipe[] = [
  { type: 'dinner', items: [['salmon', 120], ['sweet-potato', 150], ['salad', 200]] },
  { type: 'dinner', items: [['chicken-breast', 120], ['broccoli', 200], ['sweet-potato', 150]] },
  { type: 'dinner', items: [['tofu', 150], ['cabbage', 200], ['congee', 250]], veg: true },
  { type: 'dinner', items: [['kungpao', 200], ['rice', 150], ['stir-broccoli', 100]] },
  { type: 'dinner', items: [['dumpling', 240], ['seaweed-soup', 300]] },
  { type: 'dinner', items: [['tofu', 200], ['spinach', 150], ['corn', 180]], veg: true },
  { type: 'dinner', items: [['chicken-breast', 120], ['salad', 200], ['corn', 150]] },
  { type: 'dinner', items: [['shrimp', 120], ['broccoli', 200], ['sweet-potato', 150]] },
  { type: 'dinner', items: [['rice', 150], ['tomato-egg', 250], ['cabbage', 150]], veg: true },
]

const SNACKS: Recipe[] = [
  { type: 'snack', items: [['apple', 200]] },
  { type: 'snack', items: [['greek-yogurt', 150]] },
  { type: 'snack', items: [['nuts', 25]] },
  { type: 'snack', items: [['latte', 350]] },
  { type: 'snack', items: [['yogurt', 150], ['blueberry', 100]] },
  { type: 'snack', items: [['banana', 120]] },
]

function buildMeal(date: string, recipe: Recipe, index: number, scale: number): Meal {
  const items = recipe.items
    .filter(([id]) => FOOD_MAP[id])
    .map(([id, grams]) => itemFromFood(FOOD_MAP[id], Math.max(20, Math.round(grams * scale))))
  const nutrition = roundNutrition(items.reduce((acc, it) => addNutrition(acc, it.nutrition), zeroNutrition()))
  const [h, m] = [8 + index * 4, index % 2 === 0 ? 10 : 40]
  return {
    id: `${date}-${recipe.type}-${index}-${Math.random().toString(36).slice(2, 6)}`,
    date,
    type: recipe.type,
    items,
    nutrition,
    createdAt: new Date(`${date}T${String(h).padStart(2, '0')}:${m}:00`).getTime(),
    engine: 'local',
  }
}

/**
 * 生成近 7 天示例饮食记录。
 * 食谱、份量、餐次组合都由「用户 + 日期」共同决定，因此每个账号看到的概览都不同。
 * 今日记录只补到当前时间点为止（例如上午只有早餐），更贴近真实使用场景。
 */
export function buildSeedMeals(): Meal[] {
  const user = getSessionUser()
  const profile = loadProfile()
  const seedBase = `${user?.id ?? 'guest'}|${profile.name}|${profile.goal}`
  const veg = profile.dietPreferences.includes('素食')
  const meals: Meal[] = []
  const now = new Date()
  const nowHour = now.getHours()

  const pick = (pool: Recipe[], rand: () => number): Recipe => {
    const list = veg ? pool.filter((r) => r.veg) : pool
    return list[Math.floor(rand() * list.length)] ?? pool[0]
  }

  for (let offset = 6; offset >= 0; offset--) {
    const d = new Date(now)
    d.setDate(now.getDate() - offset)
    const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const rand = mulberry32(hash(`${seedBase}|${date}`))
    const scale = 0.85 + rand() * 0.35
    const hasSnack = rand() > 0.4

    const breakfast = pick(BREAKFASTS, rand)
    const lunch = pick(LUNCHES, rand)
    const dinner = pick(DINNERS, rand)
    const snack = pick(SNACKS, rand)

    if (offset === 0) {
      // 今日只记录已经发生的餐次
      meals.push(buildMeal(date, breakfast, 0, scale))
      if (nowHour >= 11) meals.push(buildMeal(date, lunch, 1, scale))
      if (nowHour >= 17) meals.push(buildMeal(date, dinner, 2, scale))
      if (nowHour >= 15 && hasSnack) meals.push(buildMeal(date, snack, 3, scale))
    } else {
      meals.push(buildMeal(date, breakfast, 0, scale))
      meals.push(buildMeal(date, lunch, 1, scale))
      meals.push(buildMeal(date, dinner, 2, scale))
      if (hasSnack) meals.push(buildMeal(date, snack, 3, scale))
    }
  }
  return meals
}

export function buildWelcomeMessage(name?: string): string {
  const who = name || getSessionUser()?.name
  return `你好${who ? `，${who}` : ''}，我是你的 AI 营养师 **知膳** 👋

我已经读取了你的健康档案和近期饮食记录。你可以直接问我：

- 「今天吃得怎么样？」
- 「早餐吃什么不容易饿？」
- 「蛋白质还差多少，怎么补？」
- 「帮我安排明天的一日三餐」

我会结合你的目标、热量缺口和营养素结构给出可执行的建议。`
}

export const WELCOME_MESSAGE = buildWelcomeMessage()
