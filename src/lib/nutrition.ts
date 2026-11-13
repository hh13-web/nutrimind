import type {
  ActivityLevel,
  Food,
  Goal,
  LoggedItem,
  MacroTargets,
  Meal,
  MealType,
  Nutrition,
  Profile,
} from '../types'
import { FOODS, GENERIC_UNITS } from '../data/foods'

export const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  veryActive: 1.9,
}

export const MEAL_SHARE: Record<MealType, number> = {
  breakfast: 0.26,
  lunch: 0.36,
  dinner: 0.3,
  snack: 0.08,
}

export const zeroNutrition = (): Nutrition => ({
  calories: 0,
  protein: 0,
  fat: 0,
  carbs: 0,
  fiber: 0,
  sugar: 0,
  sodium: 0,
})

export function addNutrition(a: Nutrition, b: Nutrition): Nutrition {
  return {
    calories: a.calories + b.calories,
    protein: a.protein + b.protein,
    fat: a.fat + b.fat,
    carbs: a.carbs + b.carbs,
    fiber: a.fiber + b.fiber,
    sugar: a.sugar + b.sugar,
    sodium: a.sodium + b.sodium,
  }
}

export function scaleNutrition(a: Nutrition, factor: number): Nutrition {
  return {
    calories: a.calories * factor,
    protein: a.protein * factor,
    fat: a.fat * factor,
    carbs: a.carbs * factor,
    fiber: a.fiber * factor,
    sugar: a.sugar * factor,
    sodium: a.sodium * factor,
  }
}

export function roundNutrition(a: Nutrition): Nutrition {
  return {
    calories: Math.round(a.calories),
    protein: Math.round(a.protein * 10) / 10,
    fat: Math.round(a.fat * 10) / 10,
    carbs: Math.round(a.carbs * 10) / 10,
    fiber: Math.round(a.fiber * 10) / 10,
    sugar: Math.round(a.sugar * 10) / 10,
    sodium: Math.round(a.sodium),
  }
}

export function caloriesOf(food: Food, grams: number): Nutrition {
  return scaleNutrition(food.per100g, grams / 100)
}

export function sumMeals(meals: Meal[]): Nutrition {
  return meals.reduce((acc, m) => addNutrition(acc, m.nutrition), zeroNutrition())
}

export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

export function isProfileComplete(p: Pick<Profile, 'weight' | 'height' | 'age'>): boolean {
  return p.age >= 12 && p.age <= 90 && p.height >= 130 && p.height <= 220 && p.weight >= 30 && p.weight <= 200
}

/** Mifflin-St Jeor 基础代谢 */
export function calcBMR(p: Pick<Profile, 'gender' | 'weight' | 'height' | 'age'>): number {
  if (!isProfileComplete(p)) return 0
  const base = 10 * p.weight + 6.25 * p.height - 5 * p.age
  return Math.round(p.gender === 'male' ? base + 5 : base - 161)
}

export function calcTDEE(p: Profile): number {
  return Math.round(calcBMR(p) * ACTIVITY_FACTORS[p.activity])
}

export function calcTargets(p: Profile): MacroTargets {
  const tdee = calcTDEE(p)
  if (!isProfileComplete(p)) {
    return { calories: 0, protein: 0, fat: 0, carbs: 0, fiber: 25, sodium: 2000, sugar: 0 }
  }
  let calories = tdee
  if (p.goal === 'lose') calories = Math.max(Math.round(tdee * 0.82), calcBMR(p))
  if (p.goal === 'gain') calories = Math.round(tdee * 1.12)

  const proteinPerKg = p.goal === 'lose' ? 1.8 : p.goal === 'gain' ? 2 : 1.4
  const refWeight = p.goal === 'maintain' ? p.weight : p.targetWeight || p.weight
  const protein = Math.round(refWeight * proteinPerKg)
  const fatPct = p.goal === 'lose' ? 0.27 : 0.28
  const fat = Math.round((calories * fatPct) / 9)
  const carbs = Math.max(80, Math.round((calories - protein * 4 - fat * 9) / 4))

  return {
    calories,
    protein,
    fat,
    carbs,
    fiber: 25,
    sodium: 2000,
    sugar: Math.round((calories * 0.1) / 4),
  }
}

export function calcBMI(p: Pick<Profile, 'weight' | 'height'>): number {
  if (p.height < 130 || p.weight < 30) return 0
  return Math.round((p.weight / Math.pow(p.height / 100, 2)) * 10) / 10
}

export function bmiLabel(bmi: number): { label: string; tone: string } {
  if (bmi < 18.5) return { label: '偏瘦', tone: 'text-sky' }
  if (bmi < 24) return { label: '正常', tone: 'text-ink-700' }
  if (bmi < 28) return { label: '超重', tone: 'text-wheat' }
  return { label: '肥胖', tone: 'text-coral' }
}

/** 单餐营养评分（0-100）：能量占比、蛋白密度、纤维、钠与糖 */
export function scoreMeal(totals: Nutrition, targets: MacroTargets, type: MealType): number {
  const share = MEAL_SHARE[type]
  let score = 100

  const calRatio = totals.calories / Math.max(1, targets.calories * share)
  if (calRatio > 1.25) score -= Math.min(16, (calRatio - 1.25) * 26)
  if (calRatio < 0.5) score -= Math.min(12, (0.5 - calRatio) * 26)

  const proteinRatio = totals.protein / Math.max(1, targets.protein * share)
  if (proteinRatio < 0.7) score -= Math.min(16, (0.7 - proteinRatio) * 26)

  const fiberRatio = totals.fiber / Math.max(1, targets.fiber * share)
  if (fiberRatio < 0.5) score -= Math.min(10, (0.5 - fiberRatio) * 18)

  if (totals.sodium > 1100) score -= Math.min(10, (totals.sodium - 1100) / 130)
  if (totals.sugar > Math.max(12, targets.sugar * share * 1.1)) {
    score -= Math.min(12, (totals.sugar - targets.sugar * share) * 0.6)
  }

  return Math.round(clamp(score, 35, 99))
}

export function gradeOf(score: number): string {
  if (score >= 90) return 'A'
  if (score >= 80) return 'B'
  if (score >= 70) return 'C'
  return 'D'
}

export function gradeText(score: number): string {
  if (score >= 90) return '非常均衡'
  if (score >= 80) return '整体良好'
  if (score >= 70) return '尚可优化'
  return '需要调整'
}

/** 解析份量文本，例如「一碗」「2个」「300g」「半份」 */
const CN_NUM: Record<string, number> = {
  半: 0.5,
  一: 1,
  二: 2,
  两: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
  七: 7,
  八: 8,
  九: 9,
  十: 10,
  几: 1,
}

export function parseAmount(text: string): { amount: number; unit?: string; grams?: number } {
  const gramMatch = text.match(/(\d+(?:\.\d+)?|半|[一二两三四五六七八九十])\s*(g|克|ml|毫升)/i)
  if (gramMatch) {
    const amount = CN_NUM[gramMatch[1]] ?? parseFloat(gramMatch[1])
    return { amount, unit: '克', grams: amount * (gramMatch[2].toLowerCase() === 'ml' || gramMatch[2] === '毫升' ? 1 : 1) }
  }

  const amountMatch = text.match(/(\d+(?:\.\d+)?|半|[一二两三四五六七八九十])\s*([\u4e00-\u9fa5]{1,2})?/)
  if (amountMatch) {
    const amount = CN_NUM[amountMatch[1]] ?? parseFloat(amountMatch[1])
    const unit = amountMatch[2] && GENERIC_UNITS[amountMatch[2]] ? amountMatch[2] : undefined
    return { amount, unit }
  }

  return { amount: 1 }
}

export const UNIT_LABELS = Object.keys(GENERIC_UNITS)

export function formatDateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function todayKey(): string {
  return formatDateKey(new Date())
}

export function lastNDays(n: number): string[] {
  const out: string[] = []
  const now = new Date()
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(now.getDate() - i)
    out.push(formatDateKey(d))
  }
  return out
}

export function prettyDate(key: string): string {
  const [y, m, d] = key.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  const week = ['日', '一', '二', '三', '四', '五', '六'][date.getDay()]
  return `${m}月${d}日 周${week}`
}

export function shortDate(key: string): string {
  const [, m, d] = key.split('-').map(Number)
  return `${m}/${d}`
}

export function pct(value: number, target: number): number {
  if (!target) return 0
  return Math.round(clamp(value / target, 0, 1.5) * 100)
}

export function searchFoods(query: string, limit = 8): Food[] {
  const q = query.trim().toLowerCase()
  if (!q) return FOODS.slice(0, limit)
  const scored = FOODS.map((food) => {
    let score = 0
    const name = food.name.toLowerCase()
    if (name === q) score = 100
    else if (name.includes(q) || q.includes(name)) score = 80
    else if (food.aliases.some((a) => a.toLowerCase() === q)) score = 90
    else if (food.aliases.some((a) => a.toLowerCase().includes(q) || q.includes(a.toLowerCase()))) score = 60
    else if (food.category.includes(q)) score = 30
    return { food, score }
  })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
  return scored.slice(0, limit).map((x) => x.food)
}

export function itemFromFood(food: Food, grams: number, unitLabel = '克'): LoggedItem {
  return {
    id: Math.random().toString(36).slice(2, 10),
    foodId: food.id,
    name: food.name,
    grams,
    unitLabel,
    nutrition: roundNutrition(caloriesOf(food, grams)),
  }
}

/** 生成一份符合偏好与目标的参考餐单文案（本地模式） */
export function suggestMealPlan(profile: Profile): { title: string; items: string[]; kcal: number }[] {
  const targets = calcTargets(profile)
  const veg = profile.dietPreferences.includes('素食')
  const proteinFoods = veg ? ['豆腐', '鸡蛋', '希腊酸奶', '豆浆'] : ['鸡胸肉', '三文鱼', '鸡蛋', '瘦牛肉']
  const plans = [
    {
      title: '早餐 · 稳定供能',
      items: ['燕麦片 40g + 牛奶 250ml', veg ? '水煮蛋 1 个' : '水煮蛋 2 个', '蓝莓 100g'],
      kcal: Math.round(targets.calories * 0.26),
    },
    {
      title: '午餐 · 蛋白优先',
      items: [`${proteinFoods[0]} 120g`, '糙米饭 150g', '清炒西兰花 200g', '紫菜蛋花汤 1 碗'],
      kcal: Math.round(targets.calories * 0.36),
    },
    {
      title: '晚餐 · 轻负荷',
      items: [`${proteinFoods[1]} 120g`, '红薯 150g', '蔬菜沙拉 200g'],
      kcal: Math.round(targets.calories * 0.3),
    },
    {
      title: '加餐 · 补足缺口',
      items: ['希腊酸奶 150g', '混合坚果 15g', '蓝莓 50g'],
      kcal: Math.round(targets.calories * 0.08),
    },
  ]
  return plans
}
