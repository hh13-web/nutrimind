import { Link } from 'react-router-dom'
import {
  ArrowRight,
  ArrowUpRight,
  Flame,
  MessageCircleMore,
  Plus,
  Sparkles,
  Trash2,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { MealIcon, Ring } from '../components/ui'
import { isProfileComplete, prettyDate, pct, todayKey } from '../lib/nutrition'
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
  const { profile, todayMeals, todayNutrition, targets, removeMeal, notify } = useApp()
  const today = todayKey()
  const complete = isProfileComplete(profile)

  const calPct = pct(todayNutrition.calories, targets.calories)
  const left = Math.max(0, Math.round(targets.calories - todayNutrition.calories))

  const insights: { text: string; tone: 'warn' | 'good' | 'info' }[] = []
  if (todayMeals.length === 0) {
    insights.push({ text: '今天还没有记录。记录所吃的食物后，这里会根据当前记录给出膳食提示。', tone: 'info' })
  } else if (!complete) {
    insights.push({ text: `今天已记录 ${todayMeals.length} 个餐次，共 ${Math.round(todayNutrition.calories)} kcal。继续记录其余餐次，可更完整地了解今日饮食。`, tone: 'info' })
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
        <Link to="/app/analyze" className="btn-primary px-5 py-2.5 text-[13px]">
          <Plus size={16} />
          记录饮食
        </Link>
      </div>

      {!complete && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-clay bg-paper px-4 py-3 text-[11.5px] shadow-soft">
          <p className="text-ink-600">补齐年龄、身高和体重，生成你的个人营养目标。</p>
          <Link to="/app/profile" className="inline-flex items-center gap-1 font-semibold text-ink-900">
            完善健康档案
            <ArrowRight size={13} />
          </Link>
        </div>
      )}

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
              {complete ? `目标 ${targets.calories} kcal` : '完善档案后生成目标'}
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

        {/* 今日膳食提示 */}
        <div className="flex flex-col rounded-[2rem] border border-clay bg-paper p-6 shadow-soft">
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-lime-400/40 text-ink-900">
              <Sparkles size={15} />
            </span>
            <div>
              <h2 className="text-[14px] font-semibold text-ink-900">今日膳食提示</h2>
              <p className="mt-0.5 text-[10px] text-ink-500">根据当前记录实时计算</p>
            </div>
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
              获取膳食建议
            </span>
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>

      {/* 今日饮食主内容 */}
      <div className="rounded-[2rem] border border-clay bg-paper p-5 shadow-soft sm:p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-semibold text-ink-900">今日饮食记录</h2>
            <Link to="/app/log" className="flex items-center gap-1 text-[11.5px] font-medium text-ink-500 hover:text-ink-900">
              查看历史记录
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
                        to={`/app/analyze?meal=${g.type}`}
                        className="mt-1 inline-flex items-center gap-1 text-[11.5px] text-ink-500 hover:text-ink-900"
                      >
                        <Plus size={12} />
                        记录{g.label}
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

      <div className="flex items-center justify-center gap-2 pt-2 text-[10.5px] text-ink-500">
        <Flame size={11} />
        营养建议仅供健康教育参考，不能替代专业医疗诊断
      </div>
    </div>
  )
}
