import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, MessageCircleMore, Sparkles, UtensilsCrossed, X } from 'lucide-react'
import { Logo } from './ui'
import { currentUserId } from '../lib/api'

const STEPS = [
  { icon: UtensilsCrossed, n: '01', title: '记录饮食' },
  { icon: Sparkles, n: '02', title: 'AI 分析' },
  { icon: MessageCircleMore, n: '03', title: '获取膳食建议' },
]

export default function Onboarding() {
  const navigate = useNavigate()
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

  function start() {
    dismiss()
    navigate('/app/analyze')
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
          <Logo size={34} dark />
          <h2 className="mt-4 text-[20px] font-semibold tracking-[-0.02em]">从记录一餐开始</h2>
          <p className="mt-1.5 text-[12.5px] text-white/55">
            记录饮食，经 AI 分析后获取膳食建议，让每一餐都更懂你。
          </p>
        </div>

        {/* 三节点流程图 */}
        <div className="px-6 py-6">
          <div className="flex items-start gap-2">
            {STEPS.map((s, i) => (
              <div key={s.n} className="contents">
                <div className="flex min-w-0 flex-1 flex-col items-center text-center">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-cream text-ink-900">
                    <s.icon size={18} />
                  </span>
                  <span className="num mt-2 text-[10px] font-bold text-lime-600">{s.n}</span>
                  <p className="mt-0.5 text-[11.5px] font-semibold leading-5 text-ink-900">{s.title}</p>
                </div>
                {i < STEPS.length - 1 && (
                  <ArrowRight size={14} className="mt-4 shrink-0 text-clay" />
                )}
              </div>
            ))}
          </div>
          <p className="mt-5 rounded-2xl bg-cream px-3.5 py-3 text-center text-[10.5px] leading-relaxed text-ink-500">
            未配置大模型时，核心分析由本地规则引擎完成，结果仅供日常饮食参考。
          </p>
        </div>

        {/* 底部 */}
        <div className="space-y-2.5 px-6 pb-6">
          <button onClick={start} className="btn-primary w-full py-3 text-[13.5px]">
            开始记录饮食
            <ArrowRight size={15} />
          </button>
          <button onClick={dismiss} className="w-full py-2 text-[11.5px] text-ink-500 hover:text-ink-900">
            跳过引导
          </button>
        </div>
      </div>
    </div>
  )
}
