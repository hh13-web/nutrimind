import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  AlertCircle,
  ArrowRight,
  Brain,
  Check,
  Loader2,
  ScanLine,
  Sparkles,
  Utensils,
  Zap,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import { FOOD_MAP } from '../data/foods'
import {
  addNutrition,
  caloriesOf,
  gradeOf,
  gradeText,
  isProfileComplete,
  pct,
  roundNutrition,
  scaleNutrition,
  scoreMeal,
  todayKey,
  zeroNutrition,
} from '../lib/nutrition'
import { MacroSplit, Ring, FoodAvatar } from '../components/ui'
import { MEAL_LABELS, type MealType } from '../types'

const EXAMPLES = [
  '一碗牛肉面、一个煎蛋、一杯无糖豆浆',
  '鸡胸肉沙拉 300g，半根玉米',
  '两碗米饭、一份番茄炒蛋、清炒西兰花',
  '一杯拿铁、一个牛角包',
  '三文鱼 120g、糙米饭一碗、西兰花 200g',
]

const STEPS = ['理解自然语言描述', '匹配食物营养知识库', '计算热量与七大营养素', '生成个性化膳食建议']

// 页面顶部的三步流程
const FLOW_STEPS = [
  { n: 1, title: '记录饮食', desc: '用一句话写下你吃了什么' },
  { n: 2, title: 'AI 分析', desc: '拆解热量与营养素并评分' },
  { n: 3, title: '确认入档', desc: '保存后查看记录并获取建议' },
]

export default function Analyze() {
  const {
    profile,
    aiStatus,
    targets,
    todayNutrition,
    analysisSession,
    updateAnalysisDraft,
    updateAnalysisResult,
    startAnalysis,
    saveAnalysis,
    resetAnalysis,
    notify,
  } = useApp()
  const { requireAuth } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [step, setStep] = useState(0)
  const { input, mealType, result, savedMealId, status, error } = analysisSession
  const loading = status === 'running'
  const added = Boolean(savedMealId)
  const aiReady = aiStatus.configured
  const requestedMeal = searchParams.get('meal') as MealType | null

  useEffect(() => {
    if (
      requestedMeal &&
      ['breakfast', 'lunch', 'dinner', 'snack'].includes(requestedMeal) &&
      status === 'editing' &&
      mealType !== requestedMeal
    ) {
      updateAnalysisDraft({ mealType: requestedMeal })
    }
  }, [mealType, requestedMeal, status, updateAnalysisDraft])

  useEffect(() => {
    if (!loading) {
      setStep(0)
      return
    }
    setStep(1)
    const timer = window.setInterval(() => setStep((s) => Math.min(3, s + 1)), 900)
    return () => window.clearInterval(timer)
  }, [loading])

  const remaining = Math.max(0, Math.round(targets.calories - todayNutrition.calories))

  const totals = useMemo(() => {
    if (!result) return zeroNutrition()
    return result.items.reduce((acc, it) => addNutrition(acc, it.nutrition), zeroNutrition())
  }, [result])

  const liveScore = result?.score ?? 0

  function run() {
    if (!input.trim()) {
      notify('请先描述你吃了什么', 'error')
      return
    }
    if (!requireAuth('餐食分析')) return
    if (!isProfileComplete(profile)) {
      notify('请先填写有效的年龄、身高和当前体重，再进行个性化分析', 'info')
      navigate('/app/profile?from=analyze')
      return
    }
    void startAnalysis()
  }

  function updateGrams(index: number, grams: number) {
    if (!result || added) return
    const nextGrams = Math.max(1, Math.min(2000, Math.round(Number(grams) || 1)))
    const items = result.items.map((it, i) => {
      if (i !== index) return it
      const food = it.foodId ? FOOD_MAP[it.foodId] : undefined
      const nutrition = food
        ? roundNutrition(caloriesOf(food, nextGrams))
        : roundNutrition(scaleNutrition(it.nutrition, nextGrams / Math.max(1, it.grams)))
      return { ...it, grams: nextGrams, nutrition }
    })
    const nextTotals = roundNutrition(items.reduce((acc, it) => addNutrition(acc, it.nutrition), zeroNutrition()))
    const nextScore = scoreMeal(nextTotals, targets, result.mealType)
    updateAnalysisResult({
      ...result,
      items,
      totals: nextTotals,
      score: nextScore,
      grade: gradeOf(nextScore),
    })
  }

  return (
    <div className="space-y-5">
      {/* 三步流程 */}
      <div className="flex items-center gap-2 rounded-2xl border border-clay bg-paper p-3 shadow-soft sm:gap-3 sm:p-4">
        {FLOW_STEPS.map((s, i) => (
          <div key={s.n} className="flex flex-1 items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-2">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-ink-900 text-[11px] font-semibold text-lime-400">
                {s.n}
              </span>
              <div className="hidden sm:block">
                <p className="text-[12px] font-semibold text-ink-900">{s.title}</p>
                <p className="text-[10px] text-ink-500">{s.desc}</p>
              </div>
              <p className="text-[12px] font-semibold text-ink-900 sm:hidden">{s.title}</p>
            </div>
            {i < FLOW_STEPS.length - 1 && (
              <ArrowRight size={14} className="shrink-0 text-ink-400" />
            )}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Meal analysis</p>
          <h1 className="mt-1.5 text-[clamp(1.6rem,3vw,2.1rem)] font-semibold tracking-[-0.02em] text-ink-900">
            记录饮食
          </h1>
          <p className="mt-1.5 text-[13px] text-ink-600">
            先用文字记录一餐，再完成 AI 分析，确认结果后加入饮食记录。
          </p>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold ${
            aiReady
              ? 'border-lime-500/30 bg-lime-400/20 text-ink-800'
              : 'border-clay bg-paper text-ink-600'
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${aiReady ? 'bg-lime-600' : 'bg-ink-500/40'}`} />
          {aiReady ? `服务端大模型 · ${aiStatus.model}` : '本地营养引擎'}
        </span>
      </div>

      {/* 输入区 */}
      <div className="relative overflow-hidden rounded-[2rem] border border-clay bg-paper p-5 shadow-soft sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(MEAL_LABELS) as MealType[]).map((t) => (
              <button
                key={t}
                onClick={() => updateAnalysisDraft({ mealType: t })}
                disabled={loading || added}
                className={`chip ${mealType === t ? 'chip-active' : ''} disabled:cursor-not-allowed disabled:opacity-60`}
              >
                {MEAL_LABELS[t]}
              </button>
            ))}
          </div>
          <span className="text-[11px] text-ink-500">
            {isProfileComplete(profile) ? (
              <>今日还可摄入 <span className="num font-semibold text-ink-900">{remaining}</span> kcal</>
            ) : (
              '完善健康档案后计算个人目标'
            )}
          </span>
        </div>

        <div className="relative mt-4">
          <textarea
            value={input}
            onChange={(e) => updateAnalysisDraft({ input: e.target.value })}
            readOnly={loading || added}
            rows={4}
            placeholder="例如：中午吃了一碗牛肉面、一个煎蛋，还喝了一杯无糖豆浆……"
            className="input min-h-[116px] resize-none text-[14px] leading-relaxed"
            onKeyDown={(e) => {
              if (!added && e.key === 'Enter' && (e.metaKey || e.ctrlKey)) run()
            }}
          />
          <span className="pointer-events-none absolute bottom-3 right-4 text-[10px] text-ink-500/60">
            ⌘ + Enter 快速分析
          </span>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <div className="flex flex-1 flex-wrap gap-1.5">
            {EXAMPLES.slice(0, 3).map((ex) => (
              <button
                key={ex}
                onClick={() => updateAnalysisDraft({ input: ex })}
                disabled={loading || added}
                className="chip max-w-full truncate disabled:cursor-not-allowed disabled:opacity-60"
                title={ex}
              >
                {ex}
              </button>
            ))}
          </div>
          <button onClick={run} disabled={loading || added} className="btn-primary ml-auto px-5 py-2.5 text-[13px] disabled:cursor-not-allowed disabled:opacity-60">
            {loading ? <Loader2 size={15} className="animate-spin" /> : added ? <Check size={15} /> : <Sparkles size={15} />}
            {loading ? 'AI 分析中…' : added ? '本餐已入档' : result || status === 'error' ? '重新分析' : '开始 AI 分析'}
          </button>
        </div>

        {status === 'error' && (
          <div className="mt-4 flex items-start gap-2 rounded-2xl border border-coral/25 bg-coral/10 px-4 py-3 text-[12px] leading-relaxed text-ink-800" role="alert">
            <AlertCircle size={15} className="mt-0.5 shrink-0 text-coral" />
            <p><span className="font-semibold">本次分析未完成：</span>{error}。你的文字记录已保留，可直接重试。</p>
          </div>
        )}

        {loading && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-5 bg-paper/92 backdrop-blur-sm">
            <div className="relative grid h-16 w-16 place-items-center">
              <span className="absolute inset-0 animate-pulseRing rounded-full bg-lime-400/60" />
              <span className="relative grid h-14 w-14 place-items-center rounded-full bg-ink-900 text-lime-400">
                <Brain size={22} />
              </span>
            </div>
            <div className="w-full max-w-sm space-y-2.5 px-6">
              {STEPS.map((s, i) => {
                const state = step > i ? 'done' : step === i ? 'active' : 'idle'
                return (
                  <div
                    key={s}
                    className={`flex items-center gap-2.5 text-[12px] transition-all ${
                      state === 'idle' ? 'opacity-30' : 'opacity-100'
                    }`}
                  >
                    <span
                      className={`grid h-5 w-5 shrink-0 place-items-center rounded-full ${
                        state === 'done'
                          ? 'bg-ink-900 text-lime-400'
                          : state === 'active'
                            ? 'border-2 border-ink-900'
                            : 'border border-clay'
                      }`}
                    >
                      {state === 'done' ? (
                        <Check size={11} />
                      ) : state === 'active' ? (
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ink-900" />
                      ) : null}
                    </span>
                    <span className={state === 'active' ? 'font-semibold text-ink-900' : 'text-ink-600'}>
                      {s}
                    </span>
                    {state === 'active' && <Loader2 size={12} className="animate-spin text-ink-500" />}
                  </div>
                )
              })}
            </div>
            <p className="text-[10.5px] text-ink-500">正在结合你的身体数据与今日摄入进行推理</p>
          </div>
        )}
      </div>

      {/* 结果 */}
      {result && (
        <div className="animate-fadeUp space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-[17px] font-semibold text-ink-900">本餐分析结果</h2>
            <span className="text-[11px] text-ink-500">
              {added ? '已确认并保存到饮食记录' : '请核对食物与份量，确认后才会入档'}
            </span>
          </div>
          <div className="grid gap-4 lg:grid-cols-[1.15fr_.85fr]">
            {/* 食物明细 */}
            <div className="rounded-[2rem] border border-clay bg-paper p-5 shadow-soft sm:p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-[15px] font-semibold text-ink-900">食物与份量</h2>
                <span className="tag">
                  <ScanLine size={11} />
                  {result.items.length} 项 · {result.engine === 'llm' ? '大模型' : '本地引擎'}
                </span>
              </div>

              <div className="mt-4 space-y-2">
                {result.items.map((item, i) => {
                  const food = item.foodId ? FOOD_MAP[item.foodId] : undefined
                  return (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 rounded-2xl border border-clay/70 bg-cream/40 p-3"
                    >
                      <FoodAvatar name={item.name} category={food?.category} size={40} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="truncate text-[13px] font-semibold text-ink-900">{item.name}</p>
                          {!item.matched && (
                            <span className="shrink-0 rounded-full bg-wheat/20 px-1.5 py-0.5 text-[9px] font-medium text-wheat">
                              估算
                            </span>
                          )}
                        </div>
                        <p className="num mt-0.5 text-[10.5px] text-ink-500">
                          {item.nutrition.calories} kcal · 蛋白 {item.nutrition.protein}g
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1 rounded-full border border-clay bg-paper px-1.5 py-1">
                        <input
                          type="number"
                          value={item.grams}
                          onChange={(e) => updateGrams(i, Number(e.target.value))}
                          disabled={added}
                          aria-label={`${item.name}克数`}
                          className="num w-12 bg-transparent text-right text-[12px] font-semibold text-ink-900 outline-none disabled:cursor-not-allowed disabled:opacity-60"
                        />
                        <span className="pr-1 text-[10px] text-ink-500">g</span>
                      </div>
                    </div>
                  )
                })}
              </div>
              <p className="mt-3 flex items-center gap-1.5 text-[10.5px] text-ink-500">
                <Zap size={11} />
                修改克数后，营养数据会实时重算
              </p>
            </div>

            {/* 评分与营养 */}
            <div className="rounded-[2rem] border border-clay bg-paper p-5 shadow-soft sm:p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-[15px] font-semibold text-ink-900">本餐营养评分</h2>
                <span className="rounded-full bg-ink-900 px-2.5 py-1 text-[10px] font-semibold text-lime-400">
                  {result.grade} · {gradeText(liveScore)}
                </span>
              </div>

              <div className="mt-4 flex items-center gap-5">
                <Ring
                  value={liveScore}
                  max={100}
                  size={104}
                  thickness={9}
                  color="#0B1F19"
                  track="#EFECE2"
                >
                  <div>
                    <p className="num text-[26px] font-bold leading-none text-ink-900">{liveScore}</p>
                    <p className="mt-0.5 text-[9px] text-ink-500">/ 100</p>
                  </div>
                </Ring>
                <div className="flex-1">
                  <p className="text-[10.5px] text-ink-500">本餐热量</p>
                  <p className="num text-[26px] font-semibold leading-tight text-ink-900">
                    {Math.round(totals.calories)}
                    <span className="ml-1 text-[11px] font-normal text-ink-500">kcal</span>
                  </p>
                  <div className="mt-2">
                    <MacroSplit protein={totals.protein} fat={totals.fat} carbs={totals.carbs} />
                  </div>
                  <div className="mt-1.5 flex gap-3 text-[9.5px] text-ink-500">
                    <span>蛋白 {Math.round(totals.protein)}g</span>
                    <span>脂肪 {Math.round(totals.fat)}g</span>
                    <span>碳水 {Math.round(totals.carbs)}g</span>
                  </div>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3">
                {[
                  ['膳食纤维', `${totals.fiber}g`, pct(totals.fiber, targets.fiber / 3)],
                  ['添加糖', `${totals.sugar}g`, pct(totals.sugar, targets.sugar / 3)],
                  ['钠', `${Math.round(totals.sodium)}mg`, pct(totals.sodium, targets.sodium / 3)],
                  ['热量占比', `${pct(totals.calories, targets.calories)}%`, pct(totals.calories, targets.calories)],
                ].map(([label, value, p]) => (
                  <div key={String(label)}>
                    <div className="flex items-baseline justify-between">
                      <span className="text-[10.5px] text-ink-500">{label}</span>
                      <span className="num text-[11.5px] font-semibold text-ink-900">{value}</span>
                    </div>
                    <div className="mt-1 h-1 overflow-hidden rounded-full bg-clay/60">
                      <div
                        className="h-full rounded-full bg-ink-900/60"
                        style={{ width: `${Math.min(100, Number(p))}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 点评 */}
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-[2rem] border border-lime-500/20 bg-lime-400/15 p-5 sm:p-6">
              <div className="flex items-center gap-2">
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-ink-900 text-lime-400">
                  <Sparkles size={13} />
                </span>
                <h2 className="text-[14px] font-semibold text-ink-900">餐食分析总结</h2>
              </div>
              <p className="mt-3 text-[13px] leading-relaxed text-ink-800">{result.summary}</p>
              <div className="mt-4 space-y-2">
                {result.highlights.map((h, i) => (
                  <div key={i} className="flex gap-2">
                    <Check size={13} className="mt-0.5 shrink-0 text-ink-700" />
                    <p className="text-[12px] leading-relaxed text-ink-700">{h}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[2rem] border border-clay bg-paper p-5 shadow-soft sm:p-6">
              <div className="flex items-center gap-2">
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-cream text-ink-900">
                  <Utensils size={13} />
                </span>
                <h2 className="text-[14px] font-semibold text-ink-900">下一步建议</h2>
              </div>
              <div className="mt-3 space-y-2.5">
                {result.suggestions.map((s, i) => (
                  <div key={i} className="flex gap-2.5">
                    <span className="num mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-ink-900/5 text-[9.5px] font-semibold text-ink-600">
                      {i + 1}
                    </span>
                    <p className="text-[12.5px] leading-relaxed text-ink-700">{s}</p>
                  </div>
                ))}
              </div>

              {/* 流程收尾：确认入档并衔接下一步 */}
              <div className="mt-5 rounded-2xl border border-lime-500/30 bg-lime-400/10 p-3">
                <p className="text-[11px] font-semibold text-ink-800">
                  {added ? '已保存到饮食记录' : '第 3 步：确认入档'}
                </p>
                <p className="mt-0.5 text-[10px] leading-relaxed text-ink-600">
                  {added
                    ? '今日概览已同步更新，可查看完整分析或继续获取膳食建议。'
                    : '保存后可在历史记录中随时查看本餐分析，避免重复入档。'}
                </p>
                {added ? (
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <Link
                      to={`/app/log?date=${todayKey()}&meal=${savedMealId}`}
                      className="btn-primary justify-center px-3 py-2.5 text-[12px]"
                    >
                      查看这条记录
                      <ArrowRight size={13} />
                    </Link>
                    <Link to="/app/coach" className="btn-ghost justify-center px-3 py-2.5 text-[12px]">
                      获取膳食建议
                    </Link>
                    <button
                      onClick={() => resetAnalysis(result.mealType)}
                      className="btn-ghost justify-center px-3 py-2.5 text-[12px] sm:col-span-2"
                    >
                      再记录一餐
                    </button>
                  </div>
                ) : (
                  <button onClick={() => saveAnalysis()} className="btn-primary mt-3 w-full justify-center px-4 py-2.5 text-[12.5px]">
                    <Check size={14} />
                    确认并加入今日{MEAL_LABELS[result.mealType]}
                  </button>
                )}
              </div>
            </div>
          </div>

          <p className="flex items-center justify-center gap-1.5 text-[10.5px] text-ink-500">
            <AlertCircle size={11} />
            营养数值为估算结果，仅供健康教育参考；包装食品请以营养标签为准
          </p>
        </div>
      )}

      {/* 空状态引导 */}
      {!result && !loading && (
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { icon: Brain, title: '语义理解', desc: '理解口语化描述、份量与烹饪方式' },
            { icon: ScanLine, title: '营养拆解', desc: '对齐食物成分表，输出七大营养素' },
            { icon: Sparkles, title: '个性建议', desc: '结合目标与当日摄入给出改进方案' },
          ].map((c) => (
            <div key={c.title} className="rounded-2xl border border-clay/80 bg-paper/70 p-5">
              <c.icon size={17} className="text-ink-700" />
              <p className="mt-3 text-[12.5px] font-semibold text-ink-900">{c.title}</p>
              <p className="mt-1 text-[11px] leading-relaxed text-ink-500">{c.desc}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
