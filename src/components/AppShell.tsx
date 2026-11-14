import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  ArrowUpRight,
  ChartLine,
  ChevronDown,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  MessageCircleMore,
  Sparkles,
  UserRound,
  X,
} from 'lucide-react'
import { Logo, Toasts } from './ui'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import { prettyDate, todayKey } from '../lib/nutrition'

/** 核心主流程：记录 → 分析 → 建议 */
const PRIMARY_NAV = [
  { to: '/app', label: '今日概览', icon: LayoutDashboard, end: true },
  { to: '/app/analyze', label: '记录饮食', icon: Sparkles },
  { to: '/app/coach', label: '膳食建议', icon: MessageCircleMore },
]

/** 更多：历史记录、趋势报告、健康档案 */
const SECONDARY_NAV = [
  { to: '/app/log', label: '历史记录', icon: ClipboardList },
  { to: '/app/report', label: '趋势报告', icon: ChartLine },
  { to: '/app/profile', label: '健康档案', icon: UserRound },
]

export default function AppShell() {
  const { profile, analysisSession } = useApp()
  const { isGuest } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [auxOpen, setAuxOpen] = useState(false)
  const [moreSheetOpen, setMoreSheetOpen] = useState(false)
  const isSecondaryActive = SECONDARY_NAV.some(
    (item) => pathname === item.to || pathname.startsWith(`${item.to}/`),
  )

  useEffect(() => {
    if (isSecondaryActive) setAuxOpen(true)
  }, [isSecondaryActive])

  useEffect(() => {
    setMoreSheetOpen(false)
  }, [pathname])

  let analysisNotice: string | null = null
  if (analysisSession && !analysisSession.savedMealId) {
    if (analysisSession.status === 'running') {
      analysisNotice = '餐食分析中，可继续浏览其他页面'
    } else if (analysisSession.status === 'done') {
      analysisNotice = '分析已完成，尚未加入饮食记录'
    } else if (analysisSession.status === 'error') {
      analysisNotice = '分析未完成，返回查看原因'
    }
  }

  function handleLogout() {
    navigate('/logout')
  }

  function goalLabel() {
    return profile.goal === 'lose' ? '减脂塑形' : profile.goal === 'gain' ? '增肌增重' : '维持健康'
  }

  function navLinkClass() {
    return ({ isActive }: { isActive: boolean }) =>
      `group flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-[13.5px] font-medium transition-all ${
        isActive
          ? 'bg-ink-900 text-white shadow-soft'
          : 'text-ink-600 hover:bg-ink-900/[.05] hover:text-ink-900'
      }`
  }

  return (
    <div className="min-h-screen bg-cream">
      {/* 桌面侧边栏 */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[252px] flex-col border-r border-clay/70 bg-paper/75 px-5 py-6 backdrop-blur-xl lg:flex">
        <NavLink to="/" className="px-1">
          <Logo />
        </NavLink>

        <nav className="mt-9 space-y-5">
          {/* 核心流程 */}
          <div>
            <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-400">
              核心流程
            </p>
            <div className="space-y-1">
              {PRIMARY_NAV.map((item) => (
                <NavLink key={item.to} to={item.to} end={item.end} className={navLinkClass()}>
                  {({ isActive }) => (
                    <>
                      <item.icon size={17} strokeWidth={isActive ? 2.2 : 1.9} />
                      <span>{item.label}</span>
                      {isActive && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-lime-400" />}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>

          {/* 更多（辅助功能，可折叠） */}
          <div>
            <button
              onClick={() => setAuxOpen((v) => !v)}
              className="mb-2 flex w-full items-center justify-between px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-400 hover:text-ink-600"
              aria-expanded={auxOpen}
            >
              <span>更多</span>
              <ChevronDown
                size={13}
                className={`transition-transform ${auxOpen ? 'rotate-180' : ''}`}
              />
            </button>
            <div className={`space-y-1 overflow-hidden transition-all ${auxOpen ? 'max-h-72' : 'max-h-0'}`}>
              {SECONDARY_NAV.map((item) => (
                <NavLink key={item.to} to={item.to} className={navLinkClass()}>
                  {({ isActive }) => (
                    <>
                      <item.icon size={17} strokeWidth={isActive ? 2.2 : 1.9} />
                      <span>{item.label}</span>
                      {isActive && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-lime-400" />}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        </nav>

        <div className="mt-auto space-y-3">
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
                  {isGuest ? '游客模式 · 数据仅存本机' : goalLabel()}
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
        <div className="mx-auto w-full max-w-[1180px] px-4 py-6 sm:px-7 lg:px-9 lg:py-9">
          {analysisNotice && (
            <div role="status" className="mb-4">
              <NavLink
                to="/app/analyze"
                className="flex items-center gap-2.5 rounded-2xl border border-clay/80 bg-paper/85 px-4 py-3 text-[12px] font-medium text-ink-700 transition-colors hover:border-ink-900/25 hover:text-ink-900"
              >
                <span
                  className={`h-2 w-2 shrink-0 rounded-full ${
                    analysisSession?.status === 'error' ? 'bg-coral' : 'bg-lime-400'
                  }`}
                />
                <span>{analysisNotice}</span>
                <ArrowUpRight size={14} className="ml-auto shrink-0 text-ink-500" />
              </NavLink>
            </div>
          )}
          <div key={pathname} className="animate-fadeIn">
            <Outlet />
          </div>
        </div>
      </main>

      {/* 移动端底部导航：3 个核心 + 更多 */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-clay/80 bg-paper/92 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
        <div className="grid grid-cols-4">
          {PRIMARY_NAV.map((item) => (
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
                  {item.label}
                </>
              )}
            </NavLink>
          ))}
          <button
            onClick={() => setMoreSheetOpen(true)}
            className={`flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors ${
              isSecondaryActive ? 'text-ink-900' : 'text-ink-500'
            }`}
            aria-expanded={moreSheetOpen}
          >
            <span
              className={`grid h-8 w-8 place-items-center rounded-xl transition-colors ${
                isSecondaryActive ? 'bg-ink-900 text-lime-400' : 'text-ink-500'
              }`}
            >
              <ClipboardList size={17} strokeWidth={isSecondaryActive ? 2.2 : 1.8} />
            </span>
            更多
          </button>
        </div>
      </nav>

      {/* 移动端「更多」抽屉 */}
      {moreSheetOpen && (
        <div
          className="fixed inset-0 z-50 bg-ink-900/40 backdrop-blur-sm lg:hidden"
          onClick={() => setMoreSheetOpen(false)}
        >
          <div
            className="absolute inset-x-0 bottom-0 rounded-t-[1.75rem] bg-paper pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-3 shadow-lift"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-clay" />
            <div className="px-4">
              <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-400">
                更多
              </p>
              <div className="space-y-1">
                {SECONDARY_NAV.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setMoreSheetOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-2xl px-3 py-3 text-[13.5px] font-medium ${
                        isActive ? 'bg-ink-900 text-white' : 'text-ink-700 hover:bg-cream'
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
              </div>
              <button
                onClick={() => setMoreSheetOpen(false)}
                className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-2xl border border-clay py-2.5 text-[12px] font-medium text-ink-500"
              >
                <X size={14} />
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      <Toasts />
    </div>
  )
}
