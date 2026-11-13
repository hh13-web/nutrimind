import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowUpRight,
  CalendarDays,
  Flame,
  Leaf,
  Sparkles,
  Target,
  TrendingUp,
  TriangleAlert,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { Bar, LineChart, MacroSplit } from '../components/ui'
import {
  clamp,
  lastNDays,
  pct,
  shortDate,
  sumMeals,
  zeroNutrition,
} from '../lib/nutrition'
import type { Nutrition } from '../types'

function dailyScore(n: Nutrition, t: { calories: number; protein: number; fiber: number; sodium: number }): number {
  if (n.calories === 0) return 0
  let s = 100
  s -= Math.abs(clamp(n.calories / t.calories, 0.4, 1.6) - 1) * 55
  s -= Math.max(0, 0.85 - n.protein / t.protein) * 45
  s -= Math.max(0, 0.7 - n.fiber / t.fiber) * 22
  s -= Math.max(0, n.sodium / t.sodium - 1) * 18
  return Math.round(clamp(s, 20, 100))
}

export default function Report() {
  const { meals, targets, profile } = useApp()
  const [range, setRange] = useState<7 | 30>(7)

  const days = useMemo(() => lastNDays(range), [range])
  const dayRows = useMemo(
    () =>
      days.map((d) => {
        const ms = meals.filter((m) => m.date === d)
        const n = ms.length ? sumMeals(ms) : zeroNutrition()
        return { date: d, nutrition: n, meals: ms.length, score: dailyScore(n, targets) }
      }),
    [days, meals, targets],
  )

  const logged = dayRows.filter((r) => r.meals > 0)
  const avg = (f: (r: (typeof dayRows)[number]) => number) =>
    logged.length ? logged.reduce((a, r) => a + f(r), 0) / logged.length : 0

  const avgCalories = Math.round(avg((r) => r.nutrition.calories))
  const avgProtein = Math.round(avg((r) => r.nutrition.protein))
  const avgFiber = Math.round(avg((r) => r.nutrition.fiber))
  const avgSodium = Math.round(avg((r) => r.nutrition.sodium))
  const avgScore = Math.round(avg((r) => r.score))
  const proteinRate = Math.round(avg((r) => Math.min(1, r.nutrition.protein / targets.protein)) * 100)
  const avgMacro = {
    protein: avg((r) => r.nutrition.protein),
    fat: avg((r) => r.nutrition.fat),
    carbs: avg((r) => r.nutrition.carbs),
  }

  const calSeries = dayRows.map((r) => Math.round(r.nutrition.calories))
  const labels = dayRows.map((r, i) => (range === 7 ? shortDate(r.date) : i % 5 === 0 ? shortDate(r.date) : ''))

  const report = useMemo(() => {
    const wins: string[] = []
    const gaps: string[] = []
    const actions: string[] = []

    if (logged.length >= Math.ceil(range * 0.6)) {
      wins.push(`近 ${range} 天有 ${logged.length} 天完成记录，数据连续性良好，趋势判断可信。`)
    }
    if (proteinRate >= 80) {
      wins.push(`蛋白质平均达成 ${proteinRate}%（约 ${avgProtein}g/天），肌肉保护做得扎实。`)
    }
    if (avgFiber >= targets.fiber * 0.8) {
      wins.push(`膳食纤维平均 ${avgFiber}g，接近推荐值，肠道与饱腹感受益。`)
    }
    if (avgCalories >= targets.calories * 0.85 && avgCalories <= targets.calories * 1.12) {
      wins.push(`平均热量 ${avgCalories} kcal，与目标 ${targets.calories} kcal 高度贴合，节奏稳定。`)
    }

    if (avgCalories > targets.calories * 1.15) {
      gaps.push(`平均热量超出目标 ${avgCalories - targets.calories} kcal/天，按此节奏每周约增重 ${(((avgCalories - targets.calories) * 7) / 7700).toFixed(2)}kg。`)
    } else if (avgCalories > 0 && avgCalories < targets.calories * 0.75) {
      gaps.push(`平均热量仅 ${avgCalories} kcal，缺口过大可能降低基础代谢，建议回到 ${targets.calories} kcal 附近。`)
    }
    if (proteinRate < 70) {
      gaps.push(`蛋白质平均只完成 ${proteinRate}%，距离 ${targets.protein}g 目标有明显缺口。`)
    }
    if (avgFiber < targets.fiber * 0.6) {
      gaps.push(`膳食纤维平均 ${avgFiber}g，不足推荐量的 60%，蔬菜与全谷物摄入偏少。`)
    }
    if (avgSodium > targets.sodium * 1.2) {
      gaps.push(`平均钠摄入约 ${avgSodium}mg，超过建议上限，注意加工食品与酱料。`)
    }
    if (avgMacro.fat > targets.fat * 1.15) {
      gaps.push(`脂肪日均 ${Math.round(avgMacro.fat)}g，超出目标 ${Math.round((avgMacro.fat / targets.fat - 1) * 100)}%，可减少烹调油与油炸食品。`)
    }
    if (logged.length < Math.ceil(range * 0.5)) {
      gaps.push(`仅记录 ${logged.length} 天，样本偏少，建议保持每日记录以获得更准确的洞察。`)
    }

    if (proteinRate < 85) {
      actions.push(`每餐固定加入一份优质蛋白（鸡蛋 ${profile.dietPreferences.includes('素食') ? '或豆腐' : '、鸡胸肉或三文鱼'}），把蛋白拉到 ${targets.protein}g。`)
    }
    if (avgFiber < targets.fiber * 0.8) {
      actions.push('每天至少 300g 蔬菜 + 1 份低糖水果，优先深色蔬菜与莓类。')
    }
    if (avgCalories > targets.calories * 1.05) {
      actions.push('把晚餐主食减至半份，用蔬菜与蛋白质填补体积，避免夜间高油加餐。')
    }
    actions.push(
      profile.goal === 'lose'
        ? `保持 ${targets.calories} kcal 的温和缺口，每周安排 2 次力量训练以守住肌肉。`
        : profile.goal === 'gain'
          ? `在 ${targets.calories} kcal 基础上，训练后 1 小时内补充 25g 蛋白质 + 一份碳水。`
          : `维持当前结构，关注膳食多样性，每周尝试 2 种新的全谷物或蔬菜。`,
    )

    return { wins: wins.slice(0, 3), gaps: gaps.slice(0, 3), actions: actions.slice(0, 3) }
  }, [range, logged.length, proteinRate, avgProtein, avgFiber, avgCalories, avgSodium, avgMacro, targets, profile])

  const metrics = [
    { icon: Flame, label: '日均热量', value: avgCalories, unit: 'kcal', sub: `目标 ${targets.calories}` },
    { icon: Target, label: '蛋白达标率', value: proteinRate, unit: '%', sub: `日均 ${avgProtein}g` },
    { icon: CalendarDays, label: '记录天数', value: logged.length, unit: `/${range}天`, sub: '持续记录更准确' },
    { icon: TrendingUp, label: '平均健康分', value: avgScore, unit: '分', sub: avgScore >= 80 ? '表现优秀' : avgScore >= 65 ? '仍有提升空间' : '需要调整结构' },
  ]

  const nutritionRows = [
    { label: '蛋白质', value: avgProtein, max: targets.protein, color: '#0B1F19' },
    { label: '碳水', value: Math.round(avgMacro.carbs), max: targets.carbs, color: '#6FA8FF' },
    { label: '脂肪', value: Math.round(avgMacro.fat), max: targets.fat, color: '#FF7A45' },
    { label: '膳食纤维', value: avgFiber, max: targets.fiber, color: '#B4E84F' },
    { label: '钠', value: avgSodium, max: targets.sodium, color: '#F2C14E' },
  ]

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Nutrition report</p>
          <h1 className="mt-1.5 text-[clamp(1.6rem,3vw,2.1rem)] font-semibold tracking-[-0.02em] text-ink-900">
            营养报告
          </h1>
          <p className="mt-1.5 text-[13px] text-ink-600">用趋势看清习惯，让调整有据可依。</p>
        </div>
        <div className="flex items-center gap-1 rounded-full border border-clay bg-paper p-1">
          {([7, 30] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`rounded-full px-3.5 py-1.5 text-[11.5px] font-semibold transition-colors ${
                range === r ? 'bg-ink-900 text-white' : 'text-ink-600 hover:bg-cream'
              }`}
            >
              近 {r} 天
            </button>
          ))}
        </div>
      </div>

      {/* 指标 */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {metrics.map((m) => (
          <div key={m.label} className="rounded-[1.5rem] border border-clay bg-paper p-4 shadow-soft sm:p-5">
            <div className="flex items-center justify-between">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-cream text-ink-700">
                <m.icon size={15} />
              </span>
            </div>
            <p className="num mt-3 text-[24px] font-semibold leading-none text-ink-900">
              {m.value}
              <span className="ml-1 text-[10.5px] font-normal text-ink-500">{m.unit}</span>
            </p>
            <p className="mt-1.5 text-[11.5px] font-medium text-ink-700">{m.label}</p>
            <p className="text-[10px] text-ink-500">{m.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.25fr_.75fr]">
        {/* 趋势 */}
        <div className="rounded-[2rem] border border-clay bg-paper p-5 shadow-soft sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-[14.5px] font-semibold text-ink-900">热量趋势</h2>
              <p className="mt-0.5 text-[10.5px] text-ink-500">虚线为每日目标 {targets.calories} kcal</p>
            </div>
            <span className="num text-[10.5px] text-ink-500">均值 {avgCalories} kcal</span>
          </div>
          <div className="mt-3 -mx-1">
            <LineChart data={calSeries} labels={labels} target={targets.calories} height={200} />
          </div>
          <div className="mt-4 flex items-center gap-4 border-t border-clay/70 pt-4">
            <div className="flex-1">
              <p className="text-[10px] text-ink-500">宏量供能结构（日均）</p>
              <div className="mt-2">
                <MacroSplit protein={avgMacro.protein} fat={avgMacro.fat} carbs={avgMacro.carbs} />
              </div>
            </div>
            <div className="flex gap-3 text-[10px] text-ink-600">
              <span className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-ink-900" />蛋白 {Math.round(avgMacro.protein)}g
              </span>
              <span className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-lime-500" />脂肪 {Math.round(avgMacro.fat)}g
              </span>
              <span className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-coral" />碳水 {Math.round(avgMacro.carbs)}g
              </span>
            </div>
          </div>
        </div>

        {/* 营养素达成 */}
        <div className="rounded-[2rem] border border-clay bg-paper p-5 shadow-soft sm:p-6">
          <h2 className="text-[14.5px] font-semibold text-ink-900">营养素达成度</h2>
          <p className="mt-0.5 text-[10.5px] text-ink-500">日均摄入 / 每日目标</p>
          <div className="mt-5 space-y-4">
            {nutritionRows.map((row) => (
              <div key={row.label}>
                <div className="flex items-baseline justify-between">
                  <span className="text-[11.5px] text-ink-600">{row.label}</span>
                  <span className="num text-[11px] font-semibold text-ink-900">
                    {row.value}
                    <span className="font-normal text-ink-500">
                      /{row.max}
                      {row.label === '钠' ? 'mg' : 'g'}
                    </span>
                  </span>
                </div>
                <div className="mt-1.5">
                  <Bar value={row.value} max={row.max} color={row.color} height={6} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 rounded-xl bg-cream/70 p-3">
            <p className="flex items-center gap-1.5 text-[10.5px] leading-relaxed text-ink-600">
              <Leaf size={12} className="shrink-0" />
              {profile.weight
                ? `达成度基于你 ${profile.weight}kg 体重与「${profile.goal === 'lose' ? '减脂' : profile.goal === 'gain' ? '增肌' : '维持'}」目标动态计算。`
                : '填写健康档案后，将基于你的身体数据与目标动态计算达成度。'}
            </p>
          </div>
        </div>
      </div>

      {/* AI 周报 */}
      <div className="overflow-hidden rounded-[2rem] bg-ink-900 p-6 text-white shadow-soft sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-lime-400 text-ink-900">
              <Sparkles size={16} />
            </span>
            <div>
              <h2 className="text-[15px] font-semibold">AI 营养周报</h2>
              <p className="text-[10.5px] text-white/45">
                基于近 {range} 天 {logged.length} 条有效记录生成
              </p>
            </div>
          </div>
          <Link to="/app/coach" className="btn-lime btn-sm px-4 py-2">
            追问营养师
            <ArrowUpRight size={13} />
          </Link>
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-lime-400">做到了什么</p>
            <div className="mt-3 space-y-2.5">
              {report.wins.length ? (
                report.wins.map((w, i) => (
                  <div key={i} className="flex gap-2">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-lime-400" />
                    <p className="text-[11.5px] leading-relaxed text-white/75">{w}</p>
                  </div>
                ))
              ) : (
                <p className="text-[11.5px] text-white/50">记录还不够多，继续坚持几天就能看到亮点。</p>
              )}
            </div>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-coral">需要关注</p>
            <div className="mt-3 space-y-2.5">
              {report.gaps.length ? (
                report.gaps.map((g, i) => (
                  <div key={i} className="flex gap-2">
                    <TriangleAlert size={12} className="mt-0.5 shrink-0 text-coral" />
                    <p className="text-[11.5px] leading-relaxed text-white/75">{g}</p>
                  </div>
                ))
              ) : (
                <p className="text-[11.5px] text-white/50">没有发现明显风险项，结构保持得不错。</p>
              )}
            </div>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/50">
              下一步行动
            </p>
            <div className="mt-3 space-y-2.5">
              {report.actions.map((a, i) => (
                <div key={i} className="flex gap-2">
                  <span className="num mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-white/10 text-[9px] text-white/70">
                    {i + 1}
                  </span>
                  <p className="text-[11.5px] leading-relaxed text-white/75">{a}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-4">
          <p className="text-[10px] text-white/40">
            报告由 AI 结合《中国居民膳食指南（2023）》与你的记录生成，仅供健康教育参考。
          </p>
          <div className="flex gap-4 text-[10px] text-white/50">
            <span>热量达成 {pct(avgCalories, targets.calories)}%</span>
            <span>蛋白达成 {proteinRate}%</span>
            <span>记录完整度 {Math.round((logged.length / range) * 100)}%</span>
          </div>
        </div>
      </div>
    </div>
  )
}
