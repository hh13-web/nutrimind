import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  ArrowUpRight,
  ChartLine,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  MessageCircleMore,
  Sparkles,
  UserRound,
  Wifi,
  WifiOff,
} from 'lucide-react'
import { Logo, Toasts } from './ui'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import { prettyDate, todayKey } from '../lib/nutrition'

const NAV = [
  { to: '/app', label: '今日概览', icon: LayoutDashboard, end: true },
  { to: '/app/analyze', label: 'AI 营养分析', icon: Sparkles },
  { to: '/app/coach', label: 'AI 营养师', icon: MessageCircleMore },
  { to: '/app/log', label: '饮食记录', icon: ClipboardList },
  { to: '/app/report', label: '营养报告', icon: ChartLine },
  { to: '/app/profile', label: '健康档案', icon: UserRound },
]

const MOBILE_NAV = NAV.slice(0, 5)

export default function AppShell() {
  const { profile, aiStatus } = useApp()
  const { isGuest } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const aiReady = aiStatus.configured

  function handleLogout() {
    navigate('/logout')
  }

  return (
    <div className="min-h-screen bg-cream">
      {/* 桌面侧边栏 */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[252px] flex-col border-r border-clay/70 bg-paper/75 px-5 py-6 backdrop-blur-xl lg:flex">
        <NavLink to="/" className="px-1">
          <Logo />
        </NavLink>

        <nav className="mt-9 space-y-1">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `group flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-[13.5px] font-medium transition-all ${
                  isActive
                    ? 'bg-ink-900 text-white shadow-soft'
                    : 'text-ink-600 hover:bg-ink-900/[.05] hover:text-ink-900'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon size={17} strokeWidth={isActive ? 2.2 : 1.9} />
                  <span>{item.label}</span>
                  {isActive && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-lime-400" />}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto space-y-3">
          <div className="rounded-2xl border border-clay bg-cream/70 p-3.5">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-500">
              {aiReady ? <Wifi size={13} /> : <WifiOff size={13} />}
              AI 引擎
            </div>
            <p className="mt-1.5 text-[13px] font-semibold text-ink-900">
              {aiReady ? '大模型已连接' : '本地营养引擎'}
            </p>
            <p className="mt-0.5 text-[11.5px] leading-relaxed text-ink-500">
              {aiReady ? `服务端 · ${aiStatus.model}` : '服务端未配置模型 · 离线规则引擎运行中'}
            </p>
          </div>

          <div className="flex items-center gap-1">
            <NavLink
              to="/app/profile"
              className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl border border-transparent p-2 transition-colors hover:border-clay hover:bg-cream/70"
            >
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ink-900 text-[13px] font-semibold text-lime-400">
                {profile.name.slice(0, 1)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold text-ink-900">{profile.name}</p>
                <p className="truncate text-[11px] text-ink-500">
                  {isGuest
                    ? '游客模式 · 数据仅存本机'
                    : profile.goal === 'lose'
                      ? '减脂塑形'
                      : profile.goal === 'gain'
                        ? '增肌增重'
                        : '维持健康'}
                </p>
              </div>
              <ArrowUpRight size={14} className="text-ink-500" />
            </NavLink>
            <button
              onClick={handleLogout}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-xl text-ink-500 transition-colors hover:bg-coral/10 hover:text-coral"
              aria-label={isGuest ? '退出游客模式' : '退出登录'}
              title={isGuest ? '退出游客模式' : '退出登录'}
            >
              <LogOut size={15} />
            </button>
          </div>

          {isGuest && (
            <NavLink
              to="/login"
              className="flex items-center justify-between rounded-2xl border border-dashed border-clay bg-cream/60 px-3.5 py-2.5 text-[11.5px] font-semibold text-ink-600 transition-colors hover:border-ink-900/25 hover:text-ink-900"
            >
              登录 / 注册保存数据
              <ArrowUpRight size={13} />
            </NavLink>
          )}
        </div>
      </aside>

      {/* 移动端顶栏 */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-clay/70 bg-cream/85 px-4 py-3 backdrop-blur-xl lg:hidden">
        <NavLink to="/">
          <Logo size={30} />
        </NavLink>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-clay bg-paper px-2.5 py-1 text-[10px] font-semibold text-ink-500">
            {prettyDate(todayKey()).replace(' ', ' · ')}
          </span>
          <NavLink
            to="/app/profile"
            className="grid h-8 w-8 place-items-center rounded-full bg-ink-900 text-[12px] font-semibold text-lime-400"
          >
            {profile.name.slice(0, 1)}
          </NavLink>
          <button
            onClick={handleLogout}
            className="grid h-8 w-8 place-items-center rounded-full text-ink-500 transition-colors hover:bg-coral/10 hover:text-coral"
            aria-label={isGuest ? '退出游客模式' : '退出登录'}
          >
            <LogOut size={15} />
          </button>
        </div>
      </header>

      <main className="min-h-screen pb-24 lg:pb-0 lg:pl-[252px]">
        <div key={pathname} className="mx-auto w-full max-w-[1180px] animate-fadeIn px-4 py-6 sm:px-7 lg:px-9 lg:py-9">
          <Outlet />
        </div>
      </main>

      {/* 移动端底部导航 */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-clay/80 bg-paper/92 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
        <div className="grid grid-cols-5">
          {MOBILE_NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors ${
                  isActive ? 'text-ink-900' : 'text-ink-500'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={`grid h-8 w-8 place-items-center rounded-xl transition-colors ${
                      isActive ? 'bg-ink-900 text-lime-400' : 'text-ink-500'
                    }`}
                  >
                    <item.icon size={17} strokeWidth={isActive ? 2.2 : 1.8} />
                  </span>
                  {item.label.replace('AI ', '')}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>

      <Toasts />
    </div>
  )
}
