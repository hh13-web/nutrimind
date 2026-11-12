import { useLocation, useNavigate } from 'react-router-dom'
import { LockKeyhole, Sparkles, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function LoginPrompt() {
  const { loginPrompt, dismissLoginPrompt } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  if (!loginPrompt) return null

  function goLogin() {
    dismissLoginPrompt()
    navigate('/login', { state: { from: location.pathname } })
  }

  return (
    <div
      className="fixed inset-0 z-[90] grid place-items-center bg-ink-900/45 px-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="login-prompt-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) dismissLoginPrompt()
      }}
    >
      <div className="w-full max-w-[400px] animate-fadeIn overflow-hidden rounded-[1.9rem] border border-clay bg-paper shadow-lift">
        <div className="flex items-center justify-between px-5 pt-4">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-clay bg-cream/80 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-500">
            <LockKeyhole size={11} />
            需要登录
          </span>
          <button
            onClick={dismissLoginPrompt}
            className="grid h-8 w-8 place-items-center rounded-full text-ink-500 transition-colors hover:bg-clay/60 hover:text-ink-900"
            aria-label="关闭"
          >
            <X size={15} />
          </button>
        </div>

        <div className="px-5 pb-6 pt-3">
          <h2 id="login-prompt-title" className="text-[20px] font-semibold tracking-[-0.02em] text-ink-900">
            登录后使用「{loginPrompt}」
          </h2>
          <p className="mt-2 text-[12px] leading-relaxed text-ink-600">
            你当前是游客模式。登录或注册后，健康档案与饮食记录会按账号独立保存，AI 分析结果也能持续累积。
          </p>

          <div className="mt-4 rounded-2xl bg-cream/80 px-3.5 py-3 text-[10.5px] leading-relaxed text-ink-500">
            登录后不会丢失当前浏览：你仍可随时在「健康档案」中调整身体数据与目标。
          </div>

          <div className="mt-5 flex flex-col gap-2.5">
            <button onClick={goLogin} className="btn-primary w-full py-3 text-[13px]">
              <Sparkles size={15} />
              去登录 / 注册
            </button>
            <button onClick={dismissLoginPrompt} className="btn-ghost w-full py-2.5 text-[12.5px]">
              先随便看看
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
