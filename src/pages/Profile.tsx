import { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  Check,
  Ruler,
  Save,
  Sparkles,
  UserRound,
  Weight,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import {
  ACTIVITY_FACTORS,
  bmiLabel,
  calcBMI,
  calcBMR,
  calcTargets,
  calcTDEE,
  isProfileComplete,
} from '../lib/nutrition'
import type { ActivityLevel, Goal, Profile as ProfileType } from '../types'

const ACTIVITY_META: { key: ActivityLevel; label: string; desc: string }[] = [
  { key: 'sedentary', label: '久坐少动', desc: '几乎不运动 · 系数 1.2' },
  { key: 'light', label: '轻度活动', desc: '每周 1-3 次轻运动 · 1.375' },
  { key: 'moderate', label: '中度活动', desc: '每周 3-5 次运动 · 1.55' },
  { key: 'active', label: '高强度', desc: '每周 6-7 次训练 · 1.725' },
  { key: 'veryActive', label: '运动员级', desc: '每天高强度训练 · 1.9' },
]

const GOALS: { key: Goal; label: string; desc: string }[] = [
  { key: 'lose', label: '减脂塑形', desc: '温和热量缺口 · 保留肌肉' },
  { key: 'maintain', label: '维持健康', desc: '保持当前体重 · 优化结构' },
  { key: 'gain', label: '增肌增重', desc: '适度热量盈余 · 高蛋白' },
]

const DIET_PREFS = ['素食', '低碳水', '高蛋白', '无麸质', '乳糖不耐', '低钠']
const ALLERGENS = ['花生', '坚果', '海鲜', '乳制品', '鸡蛋', '大豆', '麸质']

function Section({
  icon: Icon,
  title,
  desc,
  children,
}: {
  icon: React.ElementType
  title: string
  desc?: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-[1.75rem] border border-clay bg-paper p-5 shadow-soft sm:p-6">
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-cream text-ink-800">
          <Icon size={16} />
        </span>
        <div>
          <h2 className="text-[14.5px] font-semibold text-ink-900">{title}</h2>
          {desc && <p className="mt-0.5 text-[11px] text-ink-500">{desc}</p>}
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  )
}

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[10px] text-ink-500">{hint}</span>}
    </label>
  )
}

export default function Profile() {
  const { profile, updateProfile, notify } = useApp()

  // 草稿：编辑不立即持久化，点「保存档案」才写入
  const [draft, setDraft] = useState<ProfileType>(profile)
  const [dirty, setDirty] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)

  // 切换账号时，草稿跟随新档案
  useEffect(() => {
    setDraft(profile)
    setDirty(false)
  }, [profile])

  const set = (patch: Partial<ProfileType>) => {
    setDraft((prev) => ({ ...prev, ...patch }))
    setDirty(true)
  }

  function toggle(key: 'dietPreferences' | 'allergies', value: string) {
    const list = draft[key]
    set({ [key]: list.includes(value) ? list.filter((x) => x !== value) : [...list, value] } as Partial<ProfileType>)
  }

  function handleSave() {
    updateProfile(draft)
    setDirty(false)
    setSavedAt(Date.now())
    notify('档案已保存，营养目标已更新', 'success')
  }

  const complete = isProfileComplete(draft)
  const bmi = calcBMI(draft)
  const bmiInfo = bmiLabel(bmi)
  const bmr = calcBMR(draft)
  const tdee = calcTDEE(draft)
  const targets = useMemo(() => calcTargets(draft), [draft])

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Health profile</p>
          <h1 className="mt-1.5 text-[clamp(1.6rem,3vw,2.1rem)] font-semibold tracking-[-0.02em] text-ink-900">
            健康档案
          </h1>
          <p className="mt-1.5 text-[13px] text-ink-600">
            按真实情况填写，AI 会结合这些数据生成你的营养目标与建议。
          </p>
        </div>

        {/* 保存状态与按钮 */}
        <div className="flex items-center gap-3">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold ${
              dirty
                ? 'border-wheat/40 bg-wheat/15 text-wheat'
                : savedAt
                  ? 'border-lime-500/30 bg-lime-400/20 text-ink-800'
                  : 'border-clay bg-paper text-ink-500'
            }`}
          >
            {dirty ? (
              <>
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-wheat" />
                有未保存的修改
              </>
            ) : savedAt ? (
              <>
                <Check size={12} />
                已保存
              </>
            ) : (
              '暂无修改'
            )}
          </span>
          <button
            onClick={handleSave}
            disabled={!dirty}
            className="btn-primary px-5 py-2.5 text-[13px] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Save size={15} />
            保存档案
          </button>
        </div>
      </div>

      <div className="flex items-start gap-2.5 rounded-2xl border border-lime-500/25 bg-lime-400/15 px-4 py-3">
        <Sparkles size={14} className="mt-0.5 shrink-0 text-ink-800" />
        <p className="text-[11.5px] leading-relaxed text-ink-800">
          填写年龄、身高、体重后，右侧会实时预览营养目标；确认无误后点击「保存档案」，全站目标与 AI 分析会同步更新。
        </p>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[1.1fr_.9fr]">
        <div className="space-y-4">
          <Section icon={UserRound} title="基础信息" desc="用于计算基础代谢与能量需求">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="称呼">
                <input
                  className="input"
                  value={draft.name}
                  onChange={(e) => set({ name: e.target.value || '你' })}
                  placeholder="怎么称呼你"
                />
              </Field>
              <Field label="性别">
                <div className="grid grid-cols-2 gap-2">
                  {([
                    ['female', '女性'],
                    ['male', '男性'],
                  ] as const).map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => set({ gender: key })}
                      className={`rounded-xl border px-3 py-2.5 text-[12.5px] font-medium transition-colors ${
                        draft.gender === key
                          ? 'border-ink-900 bg-ink-900 text-white'
                          : 'border-clay bg-white text-ink-600 hover:border-ink-900/20'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="年龄（必填）" hint="12–90 岁">
                <input
                  type="number"
                  className="input"
                  value={draft.age || ''}
                  min={12}
                  max={90}
                  placeholder="请输入年龄"
                  onChange={(e) => set({ age: Number(e.target.value) || 0 })}
                />
              </Field>
              <Field label="身高（必填）" hint="单位：cm">
                <div className="relative">
                  <input
                    type="number"
                    className="input pr-10"
                    value={draft.height || ''}
                    min={130}
                    max={220}
                    placeholder="例如 165"
                    onChange={(e) => set({ height: Number(e.target.value) || 0 })}
                  />
                  <Ruler size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-500" />
                </div>
              </Field>
              <Field label="当前体重（必填）" hint="单位：kg">
                <div className="relative">
                  <input
                    type="number"
                    className="input pr-10"
                    value={draft.weight || ''}
                    min={30}
                    max={200}
                    step={0.1}
                    placeholder="例如 58.5"
                    onChange={(e) => set({ weight: Number(e.target.value) || 0 })}
                  />
                  <Weight size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-500" />
                </div>
              </Field>
              <Field label="目标体重（选填）" hint="不填写则按当前体重计算">
                <div className="relative">
                  <input
                    type="number"
                    className="input pr-10"
                    value={draft.targetWeight || ''}
                    min={30}
                    max={200}
                    step={0.1}
                    placeholder="例如 54"
                    onChange={(e) => set({ targetWeight: Number(e.target.value) || 0 })}
                  />
                  <Weight size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-500" />
                </div>
              </Field>
            </div>
          </Section>

          <Section icon={Activity} title="活动与目标" desc="决定每日能量消耗与缺口方向">
            <div className="space-y-2">
              {ACTIVITY_META.map((a) => (
                <button
                  key={a.key}
                  onClick={() => set({ activity: a.key })}
                  className={`flex w-full items-center justify-between rounded-xl border px-3.5 py-2.5 text-left transition-colors ${
                    draft.activity === a.key
                      ? 'border-ink-900 bg-ink-900/[.03]'
                      : 'border-clay/80 hover:border-ink-900/20'
                  }`}
                >
                  <div>
                    <p className="text-[12.5px] font-semibold text-ink-900">{a.label}</p>
                    <p className="text-[10.5px] text-ink-500">{a.desc}</p>
                  </div>
                  <span className="num text-[10.5px] text-ink-500">
                    ×{ACTIVITY_FACTORS[a.key]}
                  </span>
                </button>
              ))}
            </div>

            <div className="mt-5">
              <span className="label">目标</span>
              <div className="grid gap-2 sm:grid-cols-3">
                {GOALS.map((g) => (
                  <button
                    key={g.key}
                    onClick={() => set({ goal: g.key })}
                    className={`rounded-xl border p-3 text-left transition-colors ${
                      draft.goal === g.key
                        ? 'border-ink-900 bg-ink-900 text-white'
                        : 'border-clay bg-white hover:border-ink-900/20'
                    }`}
                  >
                    <p className="text-[12.5px] font-semibold">{g.label}</p>
                    <p className={`mt-1 text-[10px] leading-snug ${draft.goal === g.key ? 'text-white/60' : 'text-ink-500'}`}>
                      {g.desc}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </Section>

          <Section icon={Sparkles} title="饮食偏好与过敏" desc="AI 生成建议时会主动避开过敏原">
            <div>
              <span className="label">饮食偏好</span>
              <div className="flex flex-wrap gap-1.5">
                {DIET_PREFS.map((p) => (
                  <button
                    key={p}
                    onClick={() => toggle('dietPreferences', p)}
                    className={`chip ${draft.dietPreferences.includes(p) ? 'chip-active' : ''}`}
                  >
                    {draft.dietPreferences.includes(p) && <Check size={11} />}
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-5">
              <span className="label">过敏原</span>
              <div className="flex flex-wrap gap-1.5">
                {ALLERGENS.map((p) => (
                  <button
                    key={p}
                    onClick={() => toggle('allergies', p)}
                    className={`chip ${draft.allergies.includes(p) ? 'chip-active' : ''}`}
                  >
                    {draft.allergies.includes(p) && <Check size={11} />}
                    {p}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[10px] text-ink-500">过敏原会用于餐食风险提示，不替代医生的过敏诊断。</p>
            </div>
            <div className="mt-5">
              <span className="label">每日餐次</span>
              <div className="flex gap-1.5">
                {[2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => set({ mealsPerDay: n })}
                    className={`chip ${draft.mealsPerDay === n ? 'chip-active' : ''}`}
                  >
                    {n} 餐
                  </button>
                ))}
              </div>
            </div>
          </Section>
        </div>

        {/* 右栏：实时预览 */}
        <div className="space-y-4">
          <div className="relative overflow-hidden rounded-[1.75rem] bg-ink-900 p-5 text-white shadow-soft sm:p-6">
            <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-lime-400/15 blur-3xl" />
            <div className="flex items-center justify-between">
              <h2 className="text-[14px] font-semibold">营养目标预览</h2>
              <span className="rounded-full border border-white/10 px-2 py-0.5 text-[9.5px] text-white/50">
                {complete ? '保存后生效' : '等待填写'}
              </span>
            </div>

            <div className="mt-4 rounded-2xl border border-lime-400/20 bg-lime-400/[.08] p-4">
              <p className="text-[10px] uppercase tracking-[0.14em] text-lime-400">每日热量目标</p>
              <p className="num mt-1 text-[34px] font-semibold leading-none">
                {complete ? targets.calories : '—'}
                {complete && <span className="ml-1.5 text-[12px] font-normal text-white/50">kcal</span>}
              </p>
              <p className="mt-1 text-[10.5px] text-white/45">
                {complete ? `基础代谢 ${bmr} · 每日消耗 ${tdee} kcal` : '填写必填身体数据后生成个人目标'}
              </p>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              {[
                ['蛋白质', targets.protein, 'g'],
                ['脂肪', targets.fat, 'g'],
                ['碳水', targets.carbs, 'g'],
              ].map(([label, value, unit]) => (
                <div key={String(label)} className="rounded-xl border border-white/10 bg-white/[.04] py-2.5">
                  <p className="num text-[15px] font-semibold">
                    {complete ? value : '—'}
                    {complete && <span className="text-[9px] font-normal text-white/40">{unit}</span>}
                  </p>
                  <p className="mt-0.5 text-[9.5px] text-white/45">{label}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3.5">
              <div>
                <p className="text-[10px] text-white/45">BMI</p>
                <p className="num text-[15px] font-semibold">
                  {complete ? bmi : '—'} <span className="text-[10px] font-normal text-lime-400">{complete ? bmiInfo.label : '待填写'}</span>
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-white/45">目标体重</p>
                <p className="num text-[15px] font-semibold">
                  {draft.targetWeight || draft.weight || '—'} {(draft.targetWeight || draft.weight) > 0 && <span className="text-[9px] font-normal text-white/40">kg</span>}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-white/45">餐次</p>
                <p className="num text-[15px] font-semibold">
                  {draft.mealsPerDay} <span className="text-[9px] font-normal text-white/40">餐/天</span>
                </p>
              </div>
            </div>
            <p className="mt-3 text-[9.5px] leading-relaxed text-white/35">
              计算依据：Mifflin-St Jeor 方程 × 活动系数 {ACTIVITY_FACTORS[draft.activity]}，目标系数{' '}
              {draft.goal === 'lose' ? '0.82' : draft.goal === 'gain' ? '1.12' : '1.0'}。
            </p>
          </div>

          <p className="px-1 text-[10px] leading-relaxed text-ink-500">
            知膳提供营养教育与生活方式参考，不构成医疗诊断。若你处于孕期、哺乳期或有慢性疾病，请在医生或注册营养师指导下调整饮食。
          </p>
        </div>
      </div>
    </div>
  )
}
