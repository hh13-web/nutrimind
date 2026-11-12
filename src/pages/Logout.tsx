import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { ArrowLeft, Check, LogOut, ShieldCheck, Sparkles } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { Logo } from '../components/ui'

export default function Logout() {
  const { user, isGuest, logout } = useAuth()
  const navigate = useNavigate()
  const [done, setDone] = useState(false)
  const [wasGuest, setWasGuest] = useState(isGuest)

  if (!done && !user && !isGuest) return <Navigate to="/login" replace />

  const guest = !user
  const name = user?.name || '游客'

  function confirm() {
    setWasGuest(!user)
    logout()
    setDone(true)
  }

  return (
    <div className="grid min-h-screen place-items-center bg-cream px-4 py-10">
      <div className="w-full max-w-[440px]">
        <div className="mb-7 flex justify-center">
          <Link to="/">
            <Logo size={34} />
          </Link>
        </div>

        <div className="overflow-hidden rounded-[2rem] border border-clay bg-paper shadow-soft">
          <div className="h-1.5 w-full bg-gradient-to-r from-lime-400 via-sky to-coral" />

          {done ? (
            <div className="px-7 py-12 text-center">
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-lime-400/20 text-ink-900">
                <Check size={26} />
              </span>
              <h1 className="mt-5 text-[22px] font-semibold tracking-[-0.02em] text-ink-900">
                {wasGuest ? '已退出游客模式' : '已退出登录'}
              </h1>
              <p className="mx-auto mt-2 max-w-[300px] text-[12.5px] leading-relaxed text-ink-600">
                {wasGuest
                  ? '游客数据仍保留在本机浏览器中。登录账号后，健康档案与饮食记录会按账号独立保存。'
                  : '本机缓存的记录已保留，下次登录可以继续查看。期待你回来。'}
              </p>
              <div className="mt-7 flex flex-col gap-2.5">
                <Link to="/login" className="btn-primary w-full py-3 text-[13px]">
                  <Sparkles size={15} />
                  {wasGuest ? '登录 / 注册账号' : '重新登录'}
                </Link>
                <Link to="/" className="btn-ghost w-full py-3 text-[13px]">
                  返回首页
                </Link>
              </div>
            </div>
          ) : (
            <div className="px-7 py-9">
              <p className="eyebrow">Sign out</p>
              <h1 className="mt-2 text-[24px] font-semibold tracking-[-0.02em] text-ink-900">
                {guest ? '退出游客模式？' : '退出登录？'}
              </h1>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-600">
                {guest
                  ? '退出后将返回首页。你仍可随时以游客身份重新进入，或注册账号长期保存数据。'
                  : '退出当前账号后将回到登录页。本机已缓存的记录不会删除，重新登录即可继续。'}
              </p>

              <div className="mt-6 flex items-center gap-3 rounded-2xl border border-clay bg-cream/70 p-3.5">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-ink-900 text-[15px] font-semibold text-lime-400">
                  {name.slice(0, 1)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-semibold text-ink-900">{name}</p>
                  <p className="truncate text-[11px] text-ink-500">
                    {guest ? '游客模式 · 数据仅保存在本机' : user?.email}
                  </p>
                </div>
                <span className="rounded-full border border-clay bg-paper px-2.5 py-1 text-[10px] font-semibold text-ink-500">
                  {guest ? 'Guest' : 'Member'}
                </span>
              </div>

              <div className="mt-5 flex flex-col gap-2.5">
                <button
                  onClick={confirm}
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-coral px-5 py-3 text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
                >
                  <LogOut size={15} />
                  {guest ? '退出游客模式' : '确认退出登录'}
                </button>
                <button
                  onClick={() => navigate('/app')}
                  className="btn-ghost w-full py-3 text-[13px]"
                >
                  <ArrowLeft size={15} />
                  返回工作台
                </button>
              </div>

              <p className="mt-5 flex items-start gap-1.5 text-[10.5px] leading-relaxed text-ink-500">
                <ShieldCheck size={12} className="mt-0.5 shrink-0" />
                账号密码经 scrypt 加盐存储；AI 密钥只保留在服务端，不会下发到浏览器。
              </p>
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-[10px] text-ink-500">
          © {new Date().getFullYear()} 知膳 NutriMind · 营养教育工具，不替代医疗诊断
        </p>
      </div>
    </div>
  )
}
