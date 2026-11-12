import { Link } from 'react-router-dom'
import {
  ArrowRight,
  ArrowUpRight,
  Flame,
  MessageCircleMore,
  Plus,
  Sparkles,
  Trash2,
  TrendingUp,
  UtensilsCrossed,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { LineChart, MealIcon, Ring } from '../components/ui'
import {
  bmiLabel,
  calcBMI,
  calcTDEE,
  lastNDays,
  prettyDate,
  pct,
  shortDate,
  sumMeals,
  todayKey,
} from '../lib/nutrition'
import { MEAL_LABELS, type MealType } from '../types'

function greeting(): string {
  const h = new Date().getHours()
  if (h < 6) return '夜深了'
  if (h < 11) return '早上好'
  if (h < 14) return '中午好'
  if (h < 18) return '下午好'
  return '晚上好'
}

export default function Dashboard() {
  const { profile, meals, todayMeals, todayNutrition, targets, removeMeal, notify } = useApp()
  const today = todayKey()
  const bmi = calcBMI(profile)
  const bmiInfo = bmiLabel(bmi)
  const tdee = calcTDEE(profile)
  const week = lastNDays(7)
  const weekData = week.map((d) => Math.round(sumMeals(meals.filter((m) => m.date === d)).calories))
  const avgCalories = Math.round(weekData.reduce((a, b) => a + b, 0) / weekData.length)

  const calPct = pct(todayNutrition.calories, targets.calories)
  const left = Math.max(0, Math.round(targets.calories - todayNutrition.calories))

  const insights: { text: string; tone: 'warn' | 'good' | 'info' }[] = []
  if (todayMeals.length === 0) {
    insights.push({ text: '今天还没有记录。用一句话描述你吃过的食物，我会立刻拆解营养结构。', tone: 'info' })
  } else {
    const proteinGap = Math.round(targets.protein - todayNutrition.protein)
    const proteinFix = profile.dietPreferences.includes('素食')
      ? '300ml 无糖豆浆或 150g 北豆腐'
      : profile.allergies.includes('鸡蛋')
        ? '100g 鸡胸肉或 150g 希腊酸奶'
        : '100g 三文鱼或 2 个鸡蛋'
    if (proteinGap > 15) {
      insights.push({
        text: `蛋白质还差 ${proteinGap}g。下一餐加 ${proteinFix}，可以稳稳补上。`,
        tone: 'warn',
      })
    } else if (proteinGap > 0) {
      insights.push({ text: `蛋白质只差 ${proteinGap}g，一杯希腊酸奶或一份豆制品就够了。`, tone: 'good' })
    } else {
      insights.push({ text: '蛋白质已达标，注意平均分配到三餐，吸收效率更高。', tone: 'good' })
    }
    if (todayNutrition.fiber < targets.fiber * 0.6) {
      insights.push({
        text: `膳食纤维仅完成 ${Math.round(todayNutrition.fiber)}g / ${targets.fiber}g，下一餐加 200g 绿叶菜。`,
        tone: 'warn',
      })
    }
    if (todayNutrition.sodium > targets.sodium * 0.8) {
      insights.push({ text: '今日钠摄入偏高，余下餐次少盐少酱，并多喝一杯水。', tone: 'warn' })
    }
    if (calPct > 100) {
      insights.push({ text: '热量已超出目标，晚间建议以蔬菜与蛋白质为主，避免精制碳水。', tone: 'warn' })
    } else if (calPct > 75 && calPct <= 100) {
      insights.push({ text: `还剩 ${left} kcal 的空间，晚餐控制在 500 kcal 内即可。`, tone: 'info' })
    }
    if (avgCalories > 0) {
      const diff = avgCalories - targets.calories
      if (Math.abs(diff) >= 80) {
        insights.push({
          text: `近 7 天平均摄入 ${avgCalories} kcal，${diff > 0 ? `比你的目标高 ${diff}` : `比你的目标低 ${-diff}`} kcal，${
            profile.goal === 'lose'
              ? diff > 0
                ? '建议减少外卖与含糖饮料。'
                : '缺口偏大，注意别掉肌肉。'
              : profile.goal === 'gain'
                ? diff > 0
                  ? '增肌期允许小幅盈余，继续观察体重变化。'
                  : '热量偏低，增肌需要更充足的碳水。'
                : '整体稳定，继续保持即可。'
          }`,
          tone: diff > 0 ? 'warn' : 'good',
        })
      }
    }
  }

  const mealGroups: { type: MealType; label: string }[] = [
    { type: 'breakfast', label: MEAL_LABELS.breakfast },
    { type: 'lunch', label: MEAL_LABELS.lunch },
    { type: 'dinner', label: MEAL_LABELS.dinner },
    { type: 'snack', label: MEAL_LABELS.snack },
  ]

  const macros = [
    { key: 'protein', label: '蛋白质', value: todayNutrition.protein, max: targets.protein, unit: 'g', color: '#C8F169' },
    { key: 'carbs', label: '碳水', value: todayNutrition.carbs, max: targets.carbs, unit: 'g', color: '#6FA8FF' },
    { key: 'fat', label: '脂肪', value: todayNutrition.fat, max: targets.fat, unit: 'g', color: '#FF7A45' },
    { key: 'fiber', label: '膳食纤维', value: todayNutrition.fiber, max: targets.fiber, unit: 'g', color: '#B4E84F' },
  ]

  return (
    <div className="space-y-5">
      {/* 页头 */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">{prettyDate(today)}</p>
          <h1 className="mt-1.5 text-[clamp(1.6rem,3vw,2.1rem)] font-semibold tracking-[-0.02em] text-ink-900">
            {greeting()}，{profile.name}。
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/app/analyze" className="btn-primary px-4 py-2.5 text-[13px]">
            <Sparkles size={15} />
            AI 分析一餐
          </Link>
          <Link to="/app/log" className="btn-ghost hidden px-4 py-2.5 text-[13px] sm:inline-flex">
            <Plus size={15} />
            添加记录
          </Link>
        </div>
      </div>

      {/* 主区 */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* 热量总览 */}
        <div className="relative overflow-hidden rounded-[2rem] bg-ink-900 p-6 text-white shadow-soft lg:col-span-2 sm:p-7">
          <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-lime-400/15 blur-3xl" />
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">
                Today's intake
              </p>
              <h2 className="mt-1.5 text-[17px] font-semibold">今日营养总览</h2>
            </div>
            <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-medium text-white/60">
              目标 {targets.calories} kcal
            </span>
          </div>

          <div className="mt-6 flex flex-col items-center gap-7 sm:flex-row sm:gap-8">
            <Ring value={todayNutrition.calories} max={targets.calories} size={158} thickness={12} color="#C8F169" track="rgba(255,255,255,.09)">
              <div>
                <p className="num text-[30px] font-semibold leading-none text-white">
                  {Math.round(todayNutrition.calories)}
                </p>
                <p className="mt-1 text-[10.5px] text-white/45">千卡 · 已完成 {calPct}%</p>
              </div>
            </Ring>

            <div className="w-full flex-1 space-y-3.5">
              {macros.map((m) => (
                <div key={m.key}>
                  <div className="flex items-baseline justify-between text-[11.5px]">
                    <span className="text-white/55">{m.label}</span>
                    <span className="num text-white/85">
                      {Math.round(m.value)}
                      <span className="text-white/35">
                        /{Math.round(m.max)}
                        {m.unit}
                      </span>
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${Math.min(100, pct(m.value, m.max))}%`, background: m.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 grid grid-cols-3 divide-x divide-white/10 rounded-2xl border border-white/10 bg-white/[.04] py-3.5 text-center">
            <div>
              <p className="num text-[15px] font-semibold text-white">{Math.round(todayNutrition.calories)}</p>
              <p className="mt-0.5 text-[10px] text-white/45">已摄入 kcal</p>
            </div>
            <div>
              <p className="num text-[15px] font-semibold text-lime-400">{left}</p>
              <p className="mt-0.5 text-[10px] text-white/45">还可摄入</p>
            </div>
            <div>
              <p className="num text-[15px] font-semibold text-white">{todayMeals.length}</p>
              <p className="mt-0.5 text-[10px] text-white/45">已记录餐次</p>
            </div>
          </div>
        </div>

        {/* AI 洞察 */}
        <div className="flex flex-col rounded-[2rem] border border-clay bg-paper p-6 shadow-soft">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-lime-400/40 text-ink-900">
                <Sparkles size={15} />
              </span>
              <h2 className="text-[14px] font-semibold text-ink-900">AI 今日洞察</h2>
            </div>
            <span className="text-[10px] font-medium text-ink-500">实时</span>
          </div>

          <div className="mt-5 space-y-3">
            {insights.slice(0, 3).map((ins, i) => (
              <div key={i} className="flex gap-2.5">
                <span
                  className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                    ins.tone === 'warn' ? 'bg-coral' : ins.tone === 'good' ? 'bg-lime-500' : 'bg-sky'
                  }`}
                />
                <p className="text-[12.5px] leading-relaxed text-ink-700">{ins.text}</p>
              </div>
            ))}
          </div>

          <Link
            to="/app/coach"
            className="mt-auto flex items-center justify-between rounded-2xl border border-clay bg-cream/60 px-3.5 py-3 text-[12.5px] font-semibold text-ink-900 transition-colors hover:border-ink-900/20"
          >
            <span className="flex items-center gap-2">
              <MessageCircleMore size={15} />
              问问 AI 营养师
            </span>
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>

      {/* 第二行 */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* 今日饮食 */}
        <div className="rounded-[2rem] border border-clay bg-paper p-6 shadow-soft lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-semibold text-ink-900">今日饮食</h2>
            <Link to="/app/log" className="flex items-center gap-1 text-[11.5px] font-medium text-ink-500 hover:text-ink-900">
              全部记录
              <ArrowUpRight size={13} />
            </Link>
          </div>

          <div className="mt-4 divide-y divide-clay/70">
            {mealGroups.map((g) => {
              const items = todayMeals.filter((m) => m.type === g.type)
              const kcal = items.reduce((a, m) => a + m.nutrition.calories, 0)
              return (
                <div key={g.type} className="flex items-start gap-3 py-3.5 first:pt-0 last:pb-0">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-cream text-[15px]">
                    <MealIcon type={g.type} size={16} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-[12.5px] font-semibold text-ink-900">{g.label}</p>
                      {kcal > 0 && (
                        <span className="num rounded-full bg-ink-900/5 px-1.5 py-0.5 text-[10px] text-ink-600">
                          {Math.round(kcal)} kcal
                        </span>
                      )}
                    </div>
                    {items.length === 0 ? (
                      <Link
                        to="/app/analyze"
                        className="mt-1 inline-flex items-center gap-1 text-[11.5px] text-ink-500 hover:text-ink-900"
                      >
                        <Plus size={12} />
                        添加{g.label}
                      </Link>
                    ) : (
                      <div className="mt-1 space-y-1.5">
                        {items.map((meal) => (
                          <div key={meal.id} className="group flex items-center gap-2">
                            <p className="min-w-0 flex-1 truncate text-[11.5px] text-ink-600">
                              {meal.items.map((i) => i.name).join('、')}
                            </p>
                            <button
                              onClick={() => {
                                removeMeal(meal.id)
                                notify('已删除这条记录', 'info')
                              }}
                              className="shrink-0 text-ink-500/0 transition-colors hover:text-coral group-hover:text-ink-500"
                              aria-label="删除记录"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* 右列 */}
        <div className="space-y-4">
          {/* 7 天趋势 */}
          <div className="rounded-[2rem] border border-clay bg-paper p-6 shadow-soft">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp size={15} className="text-ink-700" />
                <h2 className="text-[13.5px] font-semibold text-ink-900">近 7 日热量</h2>
              </div>
              <span className="num text-[10.5px] text-ink-500">均值 {avgCalories}</span>
            </div>
            <div className="mt-2 -mx-1">
              <LineChart data={weekData} labels={week.map(shortDate)} target={targets.calories} height={132} />
            </div>
          </div>

          {/* 身体档案 */}
          <div className="rounded-[2rem] border border-clay bg-paper p-6 shadow-soft">
            <div className="flex items-center justify-between">
              <h2 className="text-[13.5px] font-semibold text-ink-900">身体档案</h2>
              <Link to="/app/profile" className="text-[11px] text-ink-500 hover:text-ink-900">
                编辑
              </Link>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10.5px] text-ink-500">BMI</p>
                <p className="num mt-0.5 text-lg font-semibold text-ink-900">
                  {bmi}
                  <span className={`ml-1.5 text-[11px] font-medium ${bmiInfo.tone}`}>{bmiInfo.label}</span>
                </p>
              </div>
              <div>
                <p className="text-[10.5px] text-ink-500">每日消耗</p>
                <p className="num mt-0.5 text-lg font-semibold text-ink-900">
                  {tdee}
                  <span className="ml-1 text-[10px] font-normal text-ink-500">kcal</span>
                </p>
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-center justify-between rounded-xl bg-cream/70 px-3 py-2.5">
                <div>
                  <p className="text-[10px] text-ink-500">距目标体重</p>
                  <p className="num text-[14px] font-semibold text-ink-900">
                    {(profile.weight - profile.targetWeight) > 0
                      ? `${(profile.weight - profile.targetWeight).toFixed(1)} kg`
                      : '已达成'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-ink-500">预计周期</p>
                  <p className="num text-[14px] font-semibold text-ink-900">
                    约 {Math.max(1, Math.round(((profile.weight - profile.targetWeight) * 7700) / ((tdee - targets.calories) || 300) / 7))} 周
                  </p>
                </div>
              </div>
              <p className="mt-2 text-[10px] leading-relaxed text-ink-500">
                按每日约 {Math.max(0, tdee - targets.calories)} kcal 的温和缺口估算，保持记录即可稳定推进。
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 快捷入口 */}
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { to: '/app/analyze', icon: Sparkles, title: 'AI 营养分析', desc: '一句话拆解一餐' },
          { to: '/app/coach', icon: MessageCircleMore, title: 'AI 营养师', desc: '随时问，随时答' },
          { to: '/app/log', icon: UtensilsCrossed, title: '饮食记录', desc: '完整记录每一天' },
        ].map((q) => (
          <Link
            key={q.to}
            to={q.to}
            className="group flex items-center gap-3.5 rounded-2xl border border-clay bg-paper px-5 py-4 transition-all hover:-translate-y-0.5 hover:shadow-soft"
          >
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-cream text-ink-900">
              <q.icon size={17} />
            </span>
            <div className="flex-1">
              <p className="text-[13px] font-semibold text-ink-900">{q.title}</p>
              <p className="text-[11px] text-ink-500">{q.desc}</p>
            </div>
            <ArrowUpRight size={15} className="text-ink-500 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </Link>
        ))}
      </div>

      <div className="flex items-center justify-center gap-2 pt-2 text-[10.5px] text-ink-500">
        <Flame size={11} />
        营养建议仅供健康教育参考，不能替代专业医疗诊断
      </div>
    </div>
  )
}
