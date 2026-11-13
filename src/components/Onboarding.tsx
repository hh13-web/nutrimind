import { useEffect, useState } from 'react'
import { ArrowRight, Sparkles, UtensilsCrossed, ClipboardCheck, X } from 'lucide-react'
import { Logo } from './ui'
import { currentUserId } from '../lib/api'

const STEPS = [
  {
    icon: UtensilsCrossed,
    n: '01',
    title: '记录一餐饮食',
    desc: '在「餐食分析」用一句话描述你吃了什么，例如“一碗牛肉面、一个煎蛋”。',
  },
  {
    icon: Sparkles,
    n: '02',
    title: 'AI 营养分析',
    desc: 'AI 结合你的年龄、身高、体重和目标，拆解热量与七大营养素并评分。',
  },
  {
    icon: ClipboardCheck,
    n: '03',
    title: '加入今日饮食',
    desc: '确认数据后加入记录，今日概览会持续追踪，AI 营养师随时给你建议。',
  },
]

export default function Onboarding() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const key = `nourish.${currentUserId()}.onboarding.done`
    if (!localStorage.getItem(key)) {
      setOpen(true)
    }
  }, [])

  function dismiss() {
    const key = `nourish.${currentUserId()}.onboarding.done`
    localStorage.setItem(key, '1')
    setOpen(false)
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[95] grid place-items-center bg-ink-900/50 px-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-[460px] animate-fadeIn overflow-hidden rounded-[2rem] border border-clay bg-paper shadow-lift">
        {/* 头部 */}
        <div className="relative overflow-hidden bg-ink-900 px-6 pb-7 pt-6 text-white">
          <div className="pointer-events-none absolute -right-12 -top-16 h-44 w-44 rounded-full bg-lime-400/20 blur-3xl" />
          <button
            onClick={dismiss}
            className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full text-white/50 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="关闭引导"
          >
            <X size={16} />
          </button>
          <Logo size={34} />
          <h2 className="mt-4 text-[20px] font-semibold tracking-[-0.02em]">三步用好知膳</h2>
          <p className="mt-1.5 text-[12.5px] text-white/55">
            先记录饮食 → AI 分析 → 获取膳食建议，让每一餐都更懂你。
          </p>
        </div>

        {/* 流程 */}
        <div className="space-y-3 px-6 py-6">
          {STEPS.map((s, i) => (
            <div key={s.n} className="flex items-start gap-3.5">
              <div className="flex flex-col items-center">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-cream text-ink-900">
                  <s.icon size={18} />
                </span>
                {i < STEPS.length - 1 && (
                  <span className="mt-1 h-6 w-px bg-clay" />
                )}
              </div>
              <div className="pt-1.5">
                <div className="flex items-center gap-2">
                  <span className="num text-[11px] font-bold text-lime-600">{s.n}</span>
                  <p className="text-[13.5px] font-semibold text-ink-900">{s.title}</p>
                </div>
                <p className="mt-1 text-[12px] leading-relaxed text-ink-500">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* 底部 */}
        <div className="space-y-2.5 px-6 pb-6">
          <button onClick={dismiss} className="btn-primary w-full py-3 text-[13.5px]">
            开始使用
            <ArrowRight size={15} />
          </button>
          <button onClick={dismiss} className="w-full py-2 text-[11.5px] text-ink-500 hover:text-ink-900">
            跳过引导
          </button>
          <p className="pt-1 text-center text-[10px] text-ink-400">
            健康档案需填写真实身体数据，AI 才会生成个性化建议
          </p>
        </div>
      </div>
    </div>
  )
}
