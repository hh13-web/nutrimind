export type Gender = 'male' | 'female'

export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'veryActive'

export type Goal = 'lose' | 'maintain' | 'gain'

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'

export interface Nutrition {
  calories: number
  protein: number
  fat: number
  carbs: number
  fiber: number
  sugar: number
  sodium: number
}

export interface FoodUnit {
  label: string
  grams: number
}

export interface Food {
  id: string
  name: string
  aliases: string[]
  category: string
  emoji: string
  per100g: Nutrition
  units?: FoodUnit[]
}

export interface LoggedItem {
  id: string
  foodId?: string
  name: string
  grams: number
  unitLabel: string
  nutrition: Nutrition
}

export interface MealAnalysis {
  sessionId: string
  input: string
  score: number
  grade: string
  summary: string
  suggestions: string[]
  source: 'meal-analysis'
}

export interface Meal {
  id: string
  date: string
  type: MealType
  items: LoggedItem[]
  nutrition: Nutrition
  createdAt: number
  engine: 'llm' | 'local'
  analysis?: MealAnalysis
}

export interface Profile {
  name: string
  gender: Gender
  age: number
  height: number
  weight: number
  targetWeight: number
  activity: ActivityLevel
  goal: Goal
  dietPreferences: string[]
  allergies: string[]
  mealsPerDay: number
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: number
  engine?: 'llm' | 'local'
}

export interface MacroTargets {
  calories: number
  protein: number
  fat: number
  carbs: number
  fiber: number
  sodium: number
  sugar: number
}

export interface AnalysisItem extends LoggedItem {
  confidence: number
  matched: boolean
}

export interface AnalysisResult {
  items: AnalysisItem[]
  totals: Nutrition
  score: number
  grade: string
  summary: string
  highlights: string[]
  suggestions: string[]
  engine: 'llm' | 'local'
  mealType: MealType
}

export interface AnalysisSession {
  id: string
  input: string
  mealType: MealType
  status: 'editing' | 'running' | 'done' | 'error'
  result: AnalysisResult | null
  error: string
  savedMealId: string | null
}

export interface DaySummary {
  date: string
  nutrition: Nutrition
  meals: number
}

export const MEAL_LABELS: Record<MealType, string> = {
  breakfast: '早餐',
  lunch: '午餐',
  dinner: '晚餐',
  snack: '加餐',
}

export const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary: '久坐少动',
  light: '轻度活动',
  moderate: '中度活动',
  active: '高强度活动',
  veryActive: '运动员级',
}

export const GOAL_LABELS: Record<Goal, string> = {
  lose: '减脂塑形',
  maintain: '维持健康',
  gain: '增肌增重',
}
