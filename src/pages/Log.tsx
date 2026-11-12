import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  Sparkles,
  Trash2,
  UtensilsCrossed,
  X,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import {
  formatDateKey,
  itemFromFood,
  prettyDate,
  searchFoods,
  sumMeals,
  todayKey,
} from '../lib/nutrition'
import { Bar, FoodAvatar, MacroSplit, MealIcon } from '../components/ui'
import { MEAL_LABELS, type Food, type MealType } from '../types'

const MEAL_ORDER: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack']

function shiftDate(key: string, delta: number): string {
  const [y, m, d] = key.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  dt.setDate(dt.getDate() + delta)
  return formatDateKey(dt)
}

export default function Log() {
  const { meals, targets, addMeal, removeMeal, notify } = useApp()
  const [date, setDate] = useState(todayKey())
  const [panelType, setPanelType] = useState<MealType>('breakfast')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Food | null>(null)
  const [grams, setGrams] = useState(100)
  const [unitLabel, setUnitLabel] = useState('克')

  const dayMeals = useMemo(() => meals.filter((m) => m.date === date), [meals, date])
  const nutrition = useMemo(() => sumMeals(dayMeals), [dayMeals])
  const isToday = date === todayKey()
  const results = useMemo(() => searchFoods(query, 10), [query])

  function pickFood(food: Food) {
    setSelected(food)
    const first = food.units?.[0]
    setGrams(first?.grams ?? 100)
    setUnitLabel(first?.label ?? '克')
  }

  function pickUnit(label: string, g: number) {
    setUnitLabel(label)
    setGrams(g)
  }

  function add() {
    if (!selected) return
    const item = itemFromFood(selected, grams, unitLabel)
    addMeal({
      id: Math.random().toString(36).slice(2, 10),
      date,
      type: panelType,
      items: [item],
      nutrition: item.nutrition,
      createdAt: Date.now(),
      engine: 'local',
    })
    notify(`已添加 ${selected.name} 到${MEAL_LABELS[panelType]}`, 'success')
    setSelected(null)
    setQuery('')
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Food diary</p>
          <h1 className="mt-1.5 text-[clamp(1.6rem,3vw,2.1rem)] font-semibold tracking-[-0.02em] text-ink-900">
            饮食记录
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-full border border-clay bg-paper p-1">
            <button
              onClick={() => setDate(shiftDate(date, -1))}
              className="grid h-7 w-7 place-items-center rounded-full text-ink-600 hover:bg-cream"
              aria-label="前一天"
            >
              <ChevronLeft size={15} />
            </button>
            <span className="min-w-[116px] text-center text-[12px] font-semibold text-ink-900">
              {prettyDate(date)}
            </span>
            <button
              onClick={() => !isToday && setDate(shiftDate(date, 1))}
              disabled={isToday}
              className="grid h-7 w-7 place-items-center rounded-full text-ink-600 hover:bg-cream disabled:opacity-30"
              aria-label="后一天"
            >
              <ChevronRight size={15} />
            </button>
          </div>
          {!isToday && (
            <button onClick={() => setDate(todayKey())} className="btn-ghost btn-sm">
              回到今天
            </button>
          )}
        </div>
      </div>

      {/* 汇总 */}
      <div className="rounded-[2rem] border border-clay bg-paper p-5 shadow-soft sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-baseline gap-3">
            <p className="num text-[30px] font-semibold leading-none text-ink-900">
              {Math.round(nutrition.calories)}
            </p>
            <span className="text-[12px] text-ink-500">/ {targets.calories} kcal</span>
            <span className="rounded-full bg-ink-900/5 px-2 py-0.5 text-[10px] font-medium text-ink-600">
              {dayMeals.length} 条记录
            </span>
          </div>
          <Link to="/app/analyze" className="btn-ghost btn-sm">
            <Sparkles size={13} />
            AI 分析一餐
          </Link>
        </div>
        <div className="mt-4">
          <Bar value={nutrition.calories} max={targets.calories} color="#0B1F19" height={8} />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
          {[
            ['蛋白质', nutrition.protein, targets.protein],
            ['碳水', nutrition.carbs, targets.carbs],
            ['脂肪', nutrition.fat, targets.fat],
            ['膳食纤维', nutrition.fiber, targets.fiber],
          ].map(([label, v, max]) => (
            <div key={String(label)}>
              <div className="flex items-baseline justify-between">
                <span className="text-[10.5px] text-ink-500">{label}</span>
                <span className="num text-[11px] font-semibold text-ink-900">
                  {Math.round(Number(v))}
                  <span className="font-normal text-ink-500">/{max}g</span>
                </span>
              </div>
              <div className="mt-1">
                <Bar value={Number(v)} max={Number(max)} color="#B4E84F" height={4} />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4">
          <MacroSplit protein={nutrition.protein} fat={nutrition.fat} carbs={nutrition.carbs} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_.9fr]">
        {/* 记录列表 */}
        <div className="space-y-3">
          {MEAL_ORDER.map((type) => {
            const group = dayMeals.filter((m) => m.type === type)
            const kcal = group.reduce((a, m) => a + m.nutrition.calories, 0)
            return (
              <div key={type} className="rounded-[1.75rem] border border-clay bg-paper p-4 shadow-soft sm:p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="grid h-8 w-8 place-items-center rounded-lg bg-cream text-[14px]">
                      <MealIcon type={type} size={15} />
                    </span>
                    <p className="text-[13px] font-semibold text-ink-900">{MEAL_LABELS[type]}</p>
                    {kcal > 0 && (
                      <span className="num rounded-full bg-ink-900/5 px-2 py-0.5 text-[10px] text-ink-600">
                        {Math.round(kcal)} kcal
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setPanelType(type)
                      setSelected(null)
                      document.getElementById('add-food-panel')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                    }}
                    className="grid h-7 w-7 place-items-center rounded-full border border-clay text-ink-600 transition-colors hover:bg-ink-900 hover:text-white"
                    aria-label={`添加${MEAL_LABELS[type]}`}
                  >
                    <Plus size={14} />
                  </button>
                </div>

                {group.length === 0 ? (
                  <p className="mt-3 flex items-center gap-1.5 text-[11.5px] text-ink-500">
                    <UtensilsCrossed size={12} />
                    暂无记录
                  </p>
                ) : (
                  <div className="mt-3 space-y-2">
                    {group.map((meal) => (
                      <div
                        key={meal.id}
                        className="group flex items-start gap-3 rounded-xl bg-cream/50 px-3 py-2.5"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[12.5px] font-medium text-ink-900">
                            {meal.items.map((i) => i.name).join('、')}
                          </p>
                          <p className="num mt-0.5 text-[10.5px] text-ink-500">
                            {Math.round(meal.nutrition.calories)} kcal · 蛋白{' '}
                            {meal.nutrition.protein}g · 碳水 {meal.nutrition.carbs}g
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            removeMeal(meal.id)
                            notify('记录已删除', 'info')
                          }}
                          className="mt-0.5 shrink-0 text-ink-500/30 transition-colors hover:text-coral group-hover:text-ink-500"
                          aria-label="删除"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* 添加食物面板 */}
        <div id="add-food-panel" className="lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-[1.75rem] border border-clay bg-paper p-4 shadow-soft sm:p-5">
            <h2 className="text-[14px] font-semibold text-ink-900">添加食物</h2>
            <p className="mt-1 text-[10.5px] text-ink-500">从营养库中选择，或前往 AI 分析页描述一餐</p>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {MEAL_ORDER.map((t) => (
                <button
                  key={t}
                  onClick={() => setPanelType(t)}
                  className={`chip ${panelType === t ? 'chip-active' : ''}`}
                >
                  {MEAL_LABELS[t]}
                </button>
              ))}
            </div>

            <div className="relative mt-3">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-500" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="搜索食物，如：鸡胸肉、米饭"
                className="input py-2.5 pl-9 text-[12.5px]"
              />
              {query && (
                <button
                  onClick={() => setQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-500 hover:text-ink-900"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            <div className="mt-3 max-h-[300px] space-y-1.5 overflow-y-auto pr-1">
              {results.map((food) => (
                <button
                  key={food.id}
                  onClick={() => pickFood(food)}
                  className={`flex w-full items-center gap-2.5 rounded-xl border p-2 text-left transition-colors ${
                    selected?.id === food.id
                      ? 'border-ink-900/30 bg-lime-400/15'
                      : 'border-transparent bg-cream/40 hover:bg-cream'
                  }`}
                >
                  <FoodAvatar name={food.name} category={food.category} size={32} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-medium text-ink-900">{food.name}</p>
                    <p className="num text-[10px] text-ink-500">
                      {food.per100g.calories} kcal / 100g · 蛋白 {food.per100g.protein}g
                    </p>
                  </div>
                  {selected?.id === food.id && <Check size={14} className="shrink-0 text-ink-900" />}
                </button>
              ))}
              {results.length === 0 && (
                <p className="py-6 text-center text-[11.5px] text-ink-500">没有找到，试试 AI 分析描述一餐</p>
              )}
            </div>

            {selected && (
              <div className="mt-3 rounded-2xl border border-clay bg-cream/50 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-[12px] font-semibold text-ink-900">
                    {selected.name}
                  </p>
                  <button onClick={() => setSelected(null)} className="text-ink-500 hover:text-ink-900">
                    <X size={13} />
                  </button>
                </div>
                {selected.units && selected.units.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {selected.units.map((unit) => (
                      <button
                        key={unit.label}
                        onClick={() => pickUnit(unit.label, unit.grams)}
                        className={`chip !px-2 !py-1 !text-[10.5px] ${
                          unitLabel === unit.label ? 'chip-active' : ''
                        }`}
                      >
                        {unit.label} {unit.grams}g
                      </button>
                    ))}
                  </div>
                )}
                <div className="mt-2.5 flex items-center gap-2">
                  <div className="flex flex-1 items-center gap-1 rounded-xl border border-clay bg-paper px-2 py-1.5">
                    <input
                      type="number"
                      value={grams}
                      min={1}
                      onChange={(e) => {
                        setGrams(Math.max(1, Number(e.target.value) || 1))
                        setUnitLabel('克')
                      }}
                      className="num w-full bg-transparent text-right text-[12px] font-semibold text-ink-900 outline-none"
                    />
                    <span className="text-[10px] text-ink-500">g</span>
                  </div>
                  <button onClick={add} className="btn-primary px-4 py-2 text-[12px]">
                    <Plus size={13} />
                    添加
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
