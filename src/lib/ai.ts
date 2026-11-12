import type {
  AnalysisItem,
  AnalysisResult,
  ChatMessage,
  Food,
  Meal,
  MealType,
  Nutrition,
  Profile,
} from '../types'
import { MEAL_LABELS } from '../types'
import { CATEGORY_ESTIMATES, FOODS, FOOD_MAP, GENERIC_UNITS } from '../data/foods'
import {
  addNutrition,
  calcTargets,
  calcTDEE,
  caloriesOf,
  gradeOf,
  gradeText,
  parseAmount,
  roundNutrition,
  scaleNutrition,
  scoreMeal,
  sumMeals,
  zeroNutrition,
  suggestMealPlan,
  todayKey,
} from './nutrition'
import { aiChat, aiChatStream, type ChatPayloadMessage, type ServerAIStatus } from './api'

// ─────────────────────────────────────────────────────────────
// 通用：服务端 AI 代理（密钥保存在后端环境变量，前端不接触）
// ─────────────────────────────────────────────────────────────

function normalizeItems(items: AnalysisItem[]): Nutrition {
  return roundNutrition(items.reduce((acc, it) => addNutrition(acc, it.nutrition), zeroNutrition()))
}

function extractJSON(text: string): any {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1 || end === -1) throw new Error('模型未返回 JSON')
  return JSON.parse(text.slice(start, end + 1))
}

function callChat(messages: ChatPayloadMessage[], signal?: AbortSignal): Promise<string> {
  void signal
  return aiChat(messages, { temperature: 0.5, max_tokens: 1200 })
}

// ─────────────────────────────────────────────────────────────
// 一、本地营养解析引擎
// ─────────────────────────────────────────────────────────────

const SPLIT_RE = /[，,、；;+＋\n]|以及|还有|外加|加上|再来一份|再配|搭配/g

const NOISE_RE =
  /(我|今天|早上|中午|晚上|早餐|午餐|晚餐|夜宵|加餐|吃了|喝了|吃的是|大概|大约|左右|差不多|可能|应该|一份|一点|一些|还有|外加|配了|搭配)/g

const MODIFIER_RE = /(烤|煎|炸|炒|蒸|煮|炖|红烧|清蒸|水煮|白灼|凉拌|卤|烟熏|生|熟|大份|小份|中份|超大份)/g

interface MatchHit {
  food: Food
  index: number
  length: number
}

function matchFoods(text: string): MatchHit[] {
  const hits: MatchHit[] = []
  for (const food of FOODS) {
    for (const term of [food.name, ...food.aliases]) {
      if (!term) continue
      let idx = text.indexOf(term)
      while (idx !== -1) {
        hits.push({ food, index: idx, length: term.length })
        idx = text.indexOf(term, idx + 1)
      }
    }
  }
  // 优先最长匹配，其次靠前
  hits.sort((a, b) => b.length - a.length || a.index - b.index)
  const chosen: MatchHit[] = []
  for (const hit of hits) {
    const overlap = chosen.some(
      (c) => hit.index < c.index + c.length && hit.index + hit.length > c.index,
    )
    if (!overlap) chosen.push(hit)
  }
  return chosen.sort((a, b) => a.index - b.index).slice(0, 4)
}

function inferCategory(text: string): keyof typeof CATEGORY_ESTIMATES {
  const t = text
  if (/(鸡|牛|猪|羊|肉|鱼|虾|蟹|蛋|肠|培根)/.test(t)) return '肉类'
  if (/(奶|酸奶|奶酪|芝士)/.test(t)) return '乳制品'
  if (/(坚果|花生|核桃|杏仁|腰果|瓜子)/.test(t)) return '坚果'
  if (/(茶|咖啡|汁|可乐|饮料|酒|水)/.test(t)) return '饮品'
  if (/(蛋糕|糖|巧克力|冰淇淋|雪糕|甜点|饼干|面包)/.test(t)) return '甜品'
  if (/(堡|披萨|薯条|炸鸡|快餐|汉堡)/.test(t)) return '快餐'
  if (/(饭|面|粉|饼|粥|馒头|包子|饺|年糕|吐司)/.test(t)) return '主食'
  if (/(菜|瓜|茄|椒|菇|笋|豆|萝卜|菠菜|生菜|西兰花|芹|藕|葱|蒜)/.test(t)) return '蔬菜'
  if (/(苹果|香蕉|橙|梨|莓|葡萄|西瓜|桃|芒果|菠萝|水果)/.test(t)) return '水果'
  if (/(鱼|虾|海鲜)/.test(t)) return '水产'
  return '默认'
}

function guessGrams(segment: string, food?: Food): number {
  const parsed = parseAmount(segment)
  if (parsed.grams) return Math.round(parsed.grams)
  const unitLabel = parsed.unit
  if (unitLabel) {
    const specific = food?.units?.find((x) => x.label === unitLabel)
    const base = specific?.grams ?? GENERIC_UNITS[unitLabel] ?? 100
    return Math.round(base * parsed.amount)
  }
  if (parsed.amount !== 1 && /^\d/.test(segment.trim())) {
    return Math.round(parsed.amount * 100)
  }
  return food?.units?.[0]?.grams ?? 150
}

function looksLikeAllergen(name: string, profile: Profile): boolean {
  return profile.allergies.some((a) => a && name.includes(a))
}

/** 纯本地（离线）餐食分析：中文分词 → 食物库匹配 → 营养计算 → 规则化点评 */
export function analyzeMealLocal(input: string, profile: Profile, mealType: MealType): AnalysisResult {
  const targets = calcTargets(profile)
  const segments = input
    .replace(NOISE_RE, ' ')
    .split(SPLIT_RE)
    .map((s) => s.trim())
    .filter(Boolean)

  const items: AnalysisItem[] = []
  const matchedNames: string[] = []

  for (const raw of segments) {
    const cleaned = raw.replace(MODIFIER_RE, (m) => m).trim()
    const hits = matchFoods(raw)
    const allergenHits = profile.allergies.filter((a) => a && (raw.includes(a) || cleaned.includes(a)))

    if (hits.length > 0) {
      const primary = hits[0]
      const grams = guessGrams(raw, primary.food)
      items.push({
        id: Math.random().toString(36).slice(2, 10),
        foodId: primary.food.id,
        name: primary.food.name,
        grams,
        unitLabel: parseAmount(raw).unit ?? '份',
        nutrition: roundNutrition(caloriesOf(primary.food, grams)),
        confidence: allergenHits.length ? 0.92 : 0.88,
        matched: true,
      })
      matchedNames.push(primary.food.name)

      // 一段里出现第二个独立食材（如「鸡胸肉配西兰花」）
      if (hits.length > 1) {
        for (const extra of hits.slice(1)) {
          const g = extra.food.units?.[0]?.grams ?? 100
          items.push({
            id: Math.random().toString(36).slice(2, 10),
            foodId: extra.food.id,
            name: extra.food.name,
            grams: g,
            unitLabel: '份',
            nutrition: roundNutrition(caloriesOf(extra.food, g)),
            confidence: 0.72,
            matched: true,
          })
          matchedNames.push(extra.food.name)
        }
      }
    } else {
      const category = inferCategory(raw)
      const base = CATEGORY_ESTIMATES[category] ?? CATEGORY_ESTIMATES['默认']
      const grams = guessGrams(raw)
      const name = cleaned.replace(/^\d+(\.\d+)?\s*[a-zA-Z\u4e00-\u9fa5]{0,2}\s*/, '').trim() || cleaned
      items.push({
        id: Math.random().toString(36).slice(2, 10),
        name: name.slice(0, 12) || '自定义食物',
        grams,
        unitLabel: parseAmount(raw).unit ?? '份',
        nutrition: roundNutrition(scaleNutrition(base, grams / 100)),
        confidence: 0.45,
        matched: false,
      })
    }
  }

  const totals = normalizeItems(items)
  const score = scoreMeal(totals, targets, mealType)
  const share = Math.round((totals.calories / Math.max(1, targets.calories)) * 100)
  const proteinShare = Math.round((totals.protein / Math.max(1, targets.protein)) * 100)
  const mealLabel = MEAL_LABELS[mealType]
  const unmatched = items.filter((i) => !i.matched)

  const summary = `这一餐共识别到 ${items.length} 项食物，合计约 ${totals.calories} kcal，其中蛋白质 ${totals.protein}g、碳水 ${totals.carbs}g、脂肪 ${totals.fat}g。热量约占今日目标的 ${share}%，蛋白质完成度 ${proteinShare}%。综合营养密度与结构，本餐评分为 ${score} 分（${gradeText(score)}）。${
    unmatched.length ? `其中「${unmatched.map((u) => u.name).join('、')}」为估算值，建议核对份量。` : ''
  }`

  const highlights: string[] = []
  if (totals.protein >= targets.protein * 0.3) highlights.push(`蛋白质 ${totals.protein}g，达到本餐参考量的 ${proteinShare}%，有利于维持肌肉与延长饱腹感。`)
  if (totals.fiber >= 5) highlights.push(`膳食纤维 ${totals.fiber}g，对肠道菌群与血糖平稳都有正向作用。`)
  if (items.some((i) => ['broccoli', 'spinach', 'lettuce', 'cabbage', 'salad', 'chicken-salad', 'tomato', 'cucumber'].includes(i.foodId ?? ''))) {
    highlights.push('包含足量蔬菜，提供了维生素 C、叶酸与钾等微量营养素。')
  }
  if (items.some((i) => ['oat', 'brown-rice', 'whole-bread', 'sweet-potato', 'corn'].includes(i.foodId ?? ''))) {
    highlights.push('碳水来源偏向全谷物/薯类，升糖更平缓，能量释放更持久。')
  }
  if (Math.abs(totals.calories - targets.calories * (mealType === 'lunch' ? 0.36 : 0.3)) < targets.calories * 0.12) {
    highlights.push('热量与份量控制得当，符合你当前减脂期的分配节奏。')
  }
  if (highlights.length === 0) highlights.push('食材组合清晰，具备继续优化的良好基础。')

  const suggestions: string[] = []
  const proteinGap = Math.max(0, Math.round(targets.protein * 0.3 - totals.protein))
  if (proteinGap > 10) suggestions.push(`蛋白质缺口约 ${proteinGap}g：可加 1 杯希腊酸奶（约 14g）、1 个鸡蛋（约 6g）或 80g 鸡胸肉。`)
  if (totals.fiber < 4) suggestions.push('蔬菜水果偏少，建议补充 200g 绿叶菜或 1 份低糖水果（如蓝莓、苹果）。')
  if (totals.sodium > 900) suggestions.push(`钠含量偏高（约 ${totals.sodium}mg），今天余下餐次尽量少盐少酱，并多喝水帮助代谢。`)
  if (totals.sugar > 25) suggestions.push(`添加糖偏高（约 ${totals.sugar}g），可用无糖茶饮或气泡水替代含糖饮料。`)
  if (totals.fat > targets.fat * 0.45) suggestions.push('脂肪占比偏高，下一餐优先选择清蒸、水煮或少油快炒的烹饪方式。')
  if (totals.calories > targets.calories * 0.5) suggestions.push('本餐热量占全天比例较高，建议下一餐以蔬菜 + 优质蛋白为主，主食减至半份。')
  if (allergenHits(items, profile).length) suggestions.push(`注意：本餐可能含有你的过敏原（${profile.allergies.join('、')}），请确认食材来源。`)
  if (suggestions.length === 0) suggestions.push('整体结构均衡，保持当前搭配；全天饮水建议 1500–2000ml，并留出 30 分钟活动时间。')

  return {
    items,
    totals,
    score,
    grade: gradeOf(score),
    summary,
    highlights,
    suggestions: suggestions.slice(0, 4),
    engine: 'local',
    mealType,
  }
}

function allergenHits(items: AnalysisItem[], profile: Profile): string[] {
  return items.filter((i) => looksLikeAllergen(i.name, profile)).map((i) => i.name)
}

// ─────────────────────────────────────────────────────────────
// 二、AI 营养分析（LLM 优先，失败自动降级到本地引擎）
// ─────────────────────────────────────────────────────────────

const ANALYZE_SYSTEM = `你是一位严谨的注册营养师（RD），擅长基于《中国居民膳食营养素参考摄入量（2023）》与食物成分表进行膳食分析。
请分析用户描述的餐食，输出严格的 JSON（不要包含 Markdown 代码块以外的解释），结构如下：
{
  "items": [
    { "name": "食物中文名", "grams": 数字(克), "calories": 数字, "protein": 数字, "fat": 数字, "carbs": 数字, "fiber": 数字, "sugar": 数字, "sodium": 数字(毫克), "confidence": 0到1 }
  ],
  "summary": "80-120字的中文点评，包含总热量与宏量营养素",
  "highlights": ["2-3条做得好之处，每条不超过40字"],
  "suggestions": ["2-3条可执行改进建议，每条不超过50字"]
}
要求：
1. 按常见中式份量估算克数；复合菜请拆分为主要食材。
2. 营养数据以每餐实际摄入量为准，不是每100g。
3. 语气专业、具体、可执行，不做疾病诊断。
4. 只输出 JSON。`

export async function analyzeMeal(
  input: string,
  profile: Profile,
  mealType: MealType,
  aiStatus: ServerAIStatus,
  image?: string,
): Promise<AnalysisResult> {
  const local = analyzeMealLocal(input || '一餐', profile, mealType)
  if (!aiStatus.configured) return local

  const prompt = `用餐时段：${MEAL_LABELS[mealType]}
用户画像：${profile.gender === 'female' ? '女性' : '男性'}，${profile.age}岁，${profile.height}cm，${profile.weight}kg，目标：${profile.goal === 'lose' ? '减脂' : profile.goal === 'gain' ? '增肌' : '维持'}，饮食偏好：${profile.dietPreferences.join('、') || '无'}，过敏：${profile.allergies.join('、') || '无'}
餐食描述：${input || '（见图片）'}`

  try {
    const raw = await callChat([
      { role: 'system', content: ANALYZE_SYSTEM },
      {
        role: 'user',
        content: image
          ? [
              { type: 'text', text: `${prompt}\n请结合图片识别餐食内容与份量。` },
              { type: 'image_url', image_url: { url: image } },
            ]
          : prompt,
      },
    ])
    const json = extractJSON(raw)
    const rawItems = Array.isArray(json.items) ? json.items : []
    if (rawItems.length === 0) throw new Error('模型未识别出食物')

    const items: AnalysisItem[] = rawItems.slice(0, 8).map((it: any) => {
      const name = String(it.name || '食物').slice(0, 16)
      const grams = Math.max(1, Math.round(Number(it.grams) || 100))
      const matchedFood = FOODS.find((f) => f.name === name || f.aliases.includes(name))
      return {
        id: Math.random().toString(36).slice(2, 10),
        foodId: matchedFood?.id,
        name,
        grams,
        unitLabel: '克',
        nutrition: roundNutrition({
          calories: Number(it.calories) || 0,
          protein: Number(it.protein) || 0,
          fat: Number(it.fat) || 0,
          carbs: Number(it.carbs) || 0,
          fiber: Number(it.fiber) || 0,
          sugar: Number(it.sugar) || 0,
          sodium: Number(it.sodium) || 0,
        }),
        confidence: Math.min(1, Math.max(0.3, Number(it.confidence) || 0.85)),
        matched: Boolean(matchedFood),
      }
    })

    const totals = normalizeItems(items)
    const targets = calcTargets(profile)
    const score = scoreMeal(totals, targets, mealType)

    return {
      items,
      totals,
      score,
      grade: gradeOf(score),
      summary: String(json.summary || local.summary),
      highlights: Array.isArray(json.highlights) && json.highlights.length ? json.highlights.slice(0, 4).map(String) : local.highlights,
      suggestions: Array.isArray(json.suggestions) && json.suggestions.length ? json.suggestions.slice(0, 4).map(String) : local.suggestions,
      engine: 'llm',
      mealType,
    }
  } catch (err) {
    console.warn('[知膳] LLM 分析失败，已降级到本地营养引擎：', err)
    return local
  }
}

// ─────────────────────────────────────────────────────────────
// 三、AI 营养师对话
// ─────────────────────────────────────────────────────────────

export function buildContext(profile: Profile, meals: Meal[]): string {
  const targets = calcTargets(profile)
  const today = meals.filter((m) => m.date === todayKey())
  const nutrition = sumMeals(today)
  const nameList = today.map((m) => `${MEAL_LABELS[m.type]}：${m.items.map((i) => `${i.name}${i.grams}g`).join('、')}`).join('；')
  return `【用户档案】${profile.gender === 'female' ? '女性' : '男性'}，${profile.age}岁，身高${profile.height}cm，体重${profile.weight}kg，目标体重${profile.targetWeight}kg，目标：${
    profile.goal === 'lose' ? '减脂' : profile.goal === 'gain' ? '增肌' : '维持健康'
  }，活动水平：${profile.activity}，饮食偏好：${profile.dietPreferences.join('、') || '无'}，过敏原：${profile.allergies.join('、') || '无'}。
【每日目标】热量 ${targets.calories} kcal，蛋白质 ${targets.protein}g，脂肪 ${targets.fat}g，碳水 ${targets.carbs}g，膳食纤维 ${targets.fiber}g，钠 ≤ ${targets.sodium}mg。
【今日已摄入】热量 ${Math.round(nutrition.calories)} kcal，蛋白质 ${Math.round(nutrition.protein)}g，脂肪 ${Math.round(nutrition.fat)}g，碳水 ${Math.round(nutrition.carbs)}g，纤维 ${Math.round(nutrition.fiber)}g。
【今日餐食】${nameList || '暂无记录'}。`
}

const COACH_SYSTEM = `你是「知膳」AI 营养师，一位温和、专业、务实的注册营养师。你会结合用户的健康档案、每日营养目标与当日摄入数据给出建议。
规则：
1. 用中文回答，结构清晰，多用短句和分点，总长度控制在 220 字以内。
2. 优先给出具体食物、克数与可执行动作，避免空泛口号。
3. 结合给出的今日摄入数据做计算，明确指出还差多少。
4. 不进行疾病诊断或推荐药物；涉及疾病、孕期、用药时提示咨询医生。
5. 可以适度使用 Markdown（加粗、无序列表），不要输出代码块。
6. 用户点名餐次时，必须只回答该餐次：提到早餐/早上/早晨/早饭时只给早餐方案，午餐/中午只给午餐，晚餐/晚上/夜宵只给晚餐或夜宵，绝不能替换成其他餐次。若用户未点名餐次，则按当前时间推断最合理的一餐。`

export interface CoachContext {
  profile: Profile
  meals: Meal[]
}

export async function coachReply(
  history: ChatMessage[],
  question: string,
  ctx: CoachContext,
  aiStatus: ServerAIStatus,
  onDelta?: (delta: string) => void,
): Promise<{ content: string; engine: 'llm' | 'local' }> {
  if (!aiStatus.configured) {
    const content = localCoachReply(question, ctx)
    if (onDelta) await typeOut(content, onDelta)
    return { content, engine: 'local' }
  }

  const messages: ChatPayloadMessage[] = [
    { role: 'system', content: `${COACH_SYSTEM}\n\n${buildContext(ctx.profile, ctx.meals)}` },
    ...history.slice(-8).map((m) => ({ role: m.role, content: m.content })),
    { role: 'user', content: question },
  ]

  try {
    if (onDelta) {
      const content = await aiChatStream(messages, { temperature: 0.6, max_tokens: 900 }, onDelta)
      return { content, engine: 'llm' }
    }
    const content = await aiChat(messages, { temperature: 0.6, max_tokens: 900 })
    return { content, engine: 'llm' }
  } catch (err) {
    console.warn('[知膳] LLM 对话失败，已降级到本地营养师：', err)
    const fallback = localCoachReply(question, ctx)
    if (onDelta) await typeOut(fallback, onDelta)
    return { content: fallback, engine: 'local' }
  }
}

async function typeOut(text: string, onDelta: (d: string) => void) {
  const chunks = text.match(/[\s\S]{1,2}/g) ?? []
  for (const c of chunks) {
    onDelta(c)
    await new Promise((r) => setTimeout(r, 14))
  }
}

type MealSlot = 'breakfast' | 'lunch' | 'dinner' | 'snack'

const SLOT_INDEX: Record<MealSlot, number> = { breakfast: 0, lunch: 1, dinner: 2, snack: 3 }

/** 识别用户点名的餐次；「早上/早晨/早饭」都要归到早餐，不能落到午餐 */
function detectMealSlot(text: string): MealSlot | null {
  if (/(早餐|早饭|早点|早上|早晨|清晨|brunch)/.test(text)) return 'breakfast'
  if (/(宵夜|夜宵|加餐|零食|下午茶)/.test(text)) return 'snack'
  if (/(午餐|午饭|中午|晌午)/.test(text)) return 'lunch'
  if (/(晚餐|晚饭|晚上|睡前)/.test(text)) return 'dinner'
  return null
}

function currentMealSlot(): MealSlot {
  const h = new Date().getHours()
  if (h < 10) return 'breakfast'
  if (h < 15) return 'lunch'
  if (h < 21) return 'dinner'
  return 'snack'
}

function mealPlanReply(
  slot: MealSlot,
  plans: ReturnType<typeof suggestMealPlan>,
  isVeg: boolean,
  wantsSatiety: boolean,
) {
  const plan = plans[SLOT_INDEX[slot]]
  const satiety = wantsSatiety
    ? `\n\n**为什么不容易饿：** 蛋白质优先（蛋、奶或豆制品）延缓胃排空，主食选燕麦、红薯、全麦等慢消化碳水让血糖更平稳，再配蔬果补足纤维，饱腹感可以稳定撑过 4 小时。`
    : ''
  return `**${plan.title}（约 ${plan.kcal} kcal）**

${plan.items.map((i) => `- ${i}`).join('\n')}

**为什么这样搭：** 蛋白质优先保证饱腹与肌肉，主食选择低升糖来源，蔬菜补足体积与纤维。${isVeg ? '\n你选择了素食，我已用豆制品与蛋奶替代肉类蛋白。' : ''}${satiety}`
}

/** 本地营养师：基于档案与当日摄入的规则引擎，保证无网络时依然可用 */
export function localCoachReply(question: string, ctx: CoachContext): string {
  const { profile, meals } = ctx
  const targets = calcTargets(profile)
  const tdee = calcTDEE(profile)
  const today = meals.filter((m) => m.date === todayKey())
  const nut = sumMeals(today)
  const q = question.toLowerCase()
  const calLeft = Math.round(targets.calories - nut.calories)
  const proteinLeft = Math.max(0, Math.round(targets.protein - nut.protein))
  const fiberLeft = Math.max(0, Math.round(targets.fiber - nut.fiber))
  const plans = suggestMealPlan(profile)
  const isVeg = profile.dietPreferences.includes('素食')

  if (/(医生|疾病|糖尿病|高血压|怀孕|孕|药|药物|诊断)/.test(q)) {
    return `这个问题涉及医疗范畴，我需要先说明：**我不能替代医生或注册营养师的临床诊断**。

不过从营养管理角度，可以给你三点通用建议：

- **记录先行**：连续记录 7 天饮食，标注主食、蛋白质与蔬菜的份量，复诊时给医生看。
- **稳定结构**：每餐保证「1 拳头主食 + 1 掌心蛋白 + 2 拳头蔬菜」。
- **不要自行停药或替代治疗**，饮食调整需与主治医生同步。

如果你愿意，也可以告诉我具体的饮食困扰，我帮你把餐单做得更友好。`
  }

  const wantsSatiety = /(不容易饿|抗饿|饱腹|饿)/.test(q)
  const asksForPlan = /(吃什么|吃啥|食谱|菜单|推荐|安排|计划|搭配|怎么吃|不容易饿|抗饿|饱腹)/.test(q)
  const slot = detectMealSlot(q)

  // 明确点名的餐次优先，避免「早上吃什么」被当成午餐或全天复盘
  if (slot && asksForPlan) {
    return mealPlanReply(slot, plans, isVeg, wantsSatiety)
  }

  if (/(今天|现在|评价|怎么样|如何|打分|复盘)/.test(q)) {
    if (today.length === 0) {
      return `今天还没有饮食记录。你可以先去 **AI 营养分析** 页，用一句话描述吃了什么，我会立刻拆解营养。

你的每日目标是 **${targets.calories} kcal / 蛋白质 ${targets.protein}g**，截至目前还有完整空间。`
    }
    const ratio = Math.round((nut.calories / targets.calories) * 100)
    const proteinRatio = Math.round((nut.protein / targets.protein) * 100)
    const status = ratio > 105 ? '已经略超今日热量目标' : ratio > 85 ? '接近今日热量目标' : '仍在合理区间'
    return `**今日复盘（${today.length} 餐）**

- 热量：**${Math.round(nut.calories)} / ${targets.calories} kcal**（${ratio}%），${status}
- 蛋白质：**${Math.round(nut.protein)} / ${targets.protein} g**（${proteinRatio}%），${proteinLeft > 15 ? `还差 ${proteinLeft}g，建议下一餐补 100g 鸡胸肉或 2 个鸡蛋` : '基本达标'}
- 纤维：${Math.round(nut.fiber)} / ${targets.fiber} g，${fiberLeft > 8 ? '蔬菜量偏少，晚餐可加 200g 绿叶菜' : '表现不错'}

**接下来这样做：**
${calLeft > 0 ? `- 剩余热量 ${calLeft} kcal，晚餐按「${plans[2].items.slice(0, 2).join(' + ')}」搭配` : `- 今日热量已达标，晚间如饿可选无糖酸奶 100g 或黄瓜`}
- 饮水补到 1500ml 以上，睡前 2 小时不再进食。`
  }

  if (/(早餐|午餐|晚餐|加餐|吃什么|食谱|菜单|推荐|安排|计划|搭配)/.test(q)) {
    const targetSlot = currentMealSlot()
    const plan = plans[SLOT_INDEX[targetSlot]]
    const others = plans.filter((_, i) => i !== SLOT_INDEX[targetSlot])
    const extra = `\n\n其余餐次可以这样安排：\n${others.map((p) => `- ${p.title}：${p.items.join('、')}`).join('\n')}`
    return `**${plan.title}（约 ${plan.kcal} kcal）**

${plan.items.map((i) => `- ${i}`).join('\n')}

**为什么这样搭：** 蛋白质优先保证饱腹与肌肉，主食选择低升糖来源，蔬菜补足体积与纤维。${isVeg ? '\n你选择了素食，我已用豆制品与蛋奶替代肉类蛋白。' : ''}${extra}`
  }

  if (/(蛋白|肌肉|增肌|练)/.test(q)) {
    return `你的蛋白质目标是 **${targets.protein}g/天**（按目标体重 ${profile.targetWeight}kg × ${profile.goal === 'gain' ? '2.0' : '1.8'}g 计算），今日已摄入 **${Math.round(nut.protein)}g**，还差 **${proteinLeft}g**。

**高效补齐方案（任选其一）：**
- 鸡胸肉 120g → 约 37g 蛋白质
- 希腊酸奶 200g + 混合坚果 15g → 约 21g
- 鸡蛋 2 个 + 无糖豆浆 250ml → 约 19g
${isVeg ? '- 北豆腐 200g + 藜麦 50g → 约 21g（素食友好）' : ''}

**小技巧：** 把蛋白质平均分配到三餐（每餐约 ${Math.round(targets.protein / 3)}g），吸收效率比集中在一餐更好。`
  }

  if (/(减脂|减肥|瘦|热量|卡路里|缺口|掉秤|体重)/.test(q)) {
    return `你的 TDEE 约 **${tdee} kcal**，减脂期目标设为 **${targets.calories} kcal**，即每天约 ${tdee - targets.calories} kcal 的温和缺口，预计每周下降 0.3–0.5kg，属于可持续速度。

**三个关键点：**
- **蛋白质不能降**：保持 ${targets.protein}g，避免掉肌肉导致基础代谢下降。
- **主食选低升糖**：糙米、燕麦、红薯替代白米白面，同热量更抗饿。
- **别用极端节食**：低于基础代谢（约 ${Math.round(tdee / 1.375)} kcal）会触发代偿，反而更易反弹。

今日剩余 **${Math.max(0, calLeft)} kcal**，需要我帮你排一份精确到克的晚餐吗？`
  }

  if (/(蔬菜|纤维|便秘|肠道|水果)/.test(q)) {
    return `你的膳食纤维目标 **${targets.fiber}g**，今日已摄入 **${Math.round(nut.fiber)}g**，缺口 **${fiberLeft}g**。

**补齐方式：**
- 西兰花 200g（约 5g 纤维）+ 橄榄油 5g 清炒
- 蓝莓 100g + 苹果 1 个（约 6g）
- 燕麦 40g 替换部分白米饭（约 4g）

**建议顺序：** 先吃蔬菜再吃主食，餐后血糖曲线会更平缓；蔬菜每天至少 300–500g，深色蔬菜占一半。`
  }

  if (/(水|喝|饮)/.test(q)) {
    return `按你的体重，每日饮水建议 **${Math.round(profile.weight * 30)}–${Math.round(profile.weight * 35)}ml**（约 ${Math.round((profile.weight * 32) / 250)} 杯）。

**分配节奏：**
- 起床后 250ml，唤醒代谢
- 三餐前 30 分钟各 250ml，帮助控制食量
- 下午用无糖茶替代含糖饮料
- 运动后按每 15 分钟 150ml 补充

注意：咖啡与浓茶有利尿作用，不能完全替代白水。`
  }

  if (/(外卖|聚餐|火锅|烧烤|应酬|酒)/.test(q)) {
    return `外食不等于失控，用「**选、拆、配**」三步就能守住结构：

- **选**：优先清蒸、白灼、烤制；避开糖醋、干锅、油炸。
- **拆**：把汤汁、酱料单独放，蘸着吃可减少 30% 以上钠与油。
- **配**：先点一份蔬菜和一份优质蛋白，再决定主食份量。

火锅建议：清汤锅底 + 瘦肉/鱼虾/豆腐 + 大量蔬菜，蘸料用醋 + 蒜 + 少量香油。酒精每克 7kcal，一杯啤酒约等于半碗米饭。`
  }

  if (/(运动|跑步|健身|锻炼|步)/.test(q)) {
    return `结合你的活动水平（${profile.activity}），建议每周 **150 分钟中等强度有氧 + 2 次力量训练**。

**营养配合：**
- 力量训练后 1 小时内补 20–30g 蛋白质（约 100g 鸡胸肉或 1 勺蛋白粉）
- 有氧超过 60 分钟，前中后注意补水与电解质
- 运动日热量可上浮 100–150 kcal，优先加在主食而非脂肪

需要我按你的训练日重新排一版餐单吗？`
  }

  if (/(你好|hi|hello|你是谁|介绍)/.test(q)) {
    return `你好，我是**知膳 AI 营养师**。我会结合你的档案（${profile.gender === 'female' ? '女' : '男'}，${profile.age}岁，${profile.weight}kg，目标${profile.goal === 'lose' ? '减脂' : profile.goal === 'gain' ? '增肌' : '维持'}）和每日摄入数据，给出具体的吃法与克数。

你可以直接问我：
- 「今天吃得怎么样？」
- 「蛋白质还差多少，怎么补？」
- 「晚餐吃什么不容易饿？」
- 「帮我安排明天的一日三餐」`
  }

  return `收到。结合你的档案（目标：${profile.goal === 'lose' ? '减脂' : profile.goal === 'gain' ? '增肌' : '维持'}，每日 ${targets.calories} kcal / 蛋白质 ${targets.protein}g），给你三条今天就能执行的建议：

- **结构优先**：每餐「1 拳主食 + 1 掌蛋白 + 2 拳蔬菜」，先保证框架，再谈细节。
- **补足缺口**：今日还剩 ${Math.max(0, calLeft)} kcal、蛋白质 ${proteinLeft}g，优先用天然食物补齐。
- **记录反馈**：连续记录 3 天，我就能看出你的饮食模式并给出针对性调整。

你也可以问我更具体的问题，例如「晚餐吃什么」「外卖怎么点」「蛋白质怎么补」。`
}
