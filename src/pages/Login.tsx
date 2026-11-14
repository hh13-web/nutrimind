import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
  UserRound,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { Logo } from '../components/ui'

type Mode = 'login' | 'register'

const POINTS = [
  '一句话拆解一餐的营养结构',
  '结合档案与当日摄入给出建议',
  '大模型推理，密钥与调用全部在后端',
]

export default function Login() {
  const { user, initializing, login, register, enterGuest } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from
  const target = from && from.startsWith('/app') ? from : '/app'
  const [mode, setMode] = useState<Mode>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!initializing && user) navigate(target, { replace: true })
  }, [initializing, user, navigate, target])

  function switchMode(next: Mode) {
    setMode(next)
    setError('')
  }

  async function submit(e?: React.FormEvent) {
    e?.preventDefault()
    if (submitting) return
    setError('')

    if (mode === 'register' && !name.trim()) {
      setError('请填写你的称呼')
      return
    }
    if (!email.trim() || !password) {
      setError('请输入邮箱和密码')
      return
    }
    if (mode === 'register' && password.length < 6) {
      setError('密码至少 6 位')
      return
    }

    setSubmitting(true)
    try {
      if (mode === 'login') {
        await login(email.trim(), password)
      } else {
        await register(name.trim(), email.trim(), password)
      }
      navigate(target, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : '操作失败，请稍后重试')
    } finally {
      setSubmitting(false)
    }
  }

  async function loginDemo() {
    if (submitting) return
    setMode('login')
    setEmail('demo@nutrimind.app')
    setPassword('demo1234')
    setError('')
    setSubmitting(true)
    try {
      await login('demo@nutrimind.app', 'demo1234')
      navigate(target, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败，请稍后重试')
    } finally {
      setSubmitting(false)
    }
  }

  function enterAsGuest() {
    enterGuest()
    navigate(target, { replace: true })
  }

  return (
    <div className="min-h-screen bg-cream lg:grid lg:grid-cols-[1.05fr_.95fr]">
      {/* 品牌侧 */}
      <aside className="relative hidden overflow-hidden bg-ink-900 px-12 py-10 text-white lg:flex lg:flex-col">
        <div className="pointer-events-none absolute -left-24 top-1/3 h-80 w-80 rounded-full bg-lime-400/10 blur-3xl" />
        <div className="pointer-events-none absolute -right-20 -top-16 h-64 w-64 rounded-full bg-lime-400/10 blur-3xl" />

        <Link to="/" className="relative z-10 inline-flex w-fit">
          <Logo size={36} dark />
        </Link>

        <div className="relative z-10 mt-auto max-w-md pb-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-lime-400/80">
            AI Nutrition Analyst
          </p>
          <h1 className="mt-4 text-[clamp(2rem,3.4vw,2.9rem)] font-semibold leading-[1.15] tracking-[-0.03em]">
            把每一餐，
            <br />
            变成可执行的营养方案。
          </h1>
          <p className="mt-4 text-[13.5px] leading-relaxed text-white/55">
            知膳会结合你的健康档案与饮食记录，通过 AI 或本地规则完成文字餐食拆解、营养计算与个性化建议。
          </p>

          <div className="mt-8 space-y-3">
            {POINTS.map((p) => (
              <div key={p} className="flex items-center gap-2.5 text-[12.5px] text-white/70">
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-lime-400/15 text-lime-400">
                  <Check size={11} />
                </span>
                {p}
              </div>
            ))}
          </div>

          <div className="mt-9 flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[.04] px-3.5 py-3 text-[10.5px] leading-relaxed text-white/45">
            <ShieldCheck size={14} className="shrink-0 text-lime-400/80" />
            账号密码经 scrypt 加盐存储，AI 密钥只保留在服务端，不会下发到浏览器。
          </div>
        </div>

        <p className="relative z-10 mt-auto text-[10px] text-white/25">
          © {new Date().getFullYear()} 知膳 NutriMind · 营养教育工具，不替代医疗诊断
        </p>
      </aside>

      {/* 表单侧 */}
      <main className="flex min-h-screen flex-col px-5 py-8 sm:px-10 lg:justify-center lg:px-16">
        <div className="mx-auto w-full max-w-[420px]">
          <div className="flex items-center justify-between lg:hidden">
            <Link to="/">
              <Logo size={32} />
            </Link>
            <Link to="/" className="text-[11.5px] text-ink-500 hover:text-ink-900">
              返回首页
            </Link>
          </div>

          <div className="mt-8 lg:mt-0">
            <p className="eyebrow">Welcome</p>
            <h2 className="mt-2 text-[26px] font-semibold tracking-[-0.02em] text-ink-900">
              {mode === 'login' ? '登录知膳' : '创建你的账号'}
            </h2>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-600">
              {mode === 'login'
                ? '登录后继续查看你的饮食记录与个性化营养建议。'
                : '注册后可按账号保存健康档案、饮食记录与膳食建议对话。'}
            </p>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-1 rounded-full border border-clay bg-paper p-1">
            {(
              [
                ['login', '登录'],
                ['register', '注册'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => switchMode(key)}
                className={`rounded-full py-2 text-[12.5px] font-semibold transition-colors ${
                  mode === key ? 'bg-ink-900 text-white' : 'text-ink-600 hover:text-ink-900'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="mt-5 space-y-3.5">
            {mode === 'register' && (
              <label className="block">
                <span className="label">称呼</span>
                <div className="relative">
                  <UserRound size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-500" />
                  <input
                    className="input pl-10"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="怎么称呼你"
                    autoComplete="nickname"
                    maxLength={20}
                  />
                </div>
              </label>
            )}

            <label className="block">
              <span className="label">邮箱</span>
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-500" />
                <input
                  className="input pl-10"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </div>
            </label>

            <label className="block">
              <span className="label">密码</span>
              <div className="relative">
                <LockKeyhole size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-500" />
                <input
                  className="input px-10"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === 'register' ? '至少 6 位' : '输入密码'}
                  autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-500 hover:text-ink-900"
                  aria-label={showPassword ? '隐藏密码' : '显示密码'}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </label>

            {error && (
              <p className="rounded-xl border border-coral/25 bg-coral/[.08] px-3.5 py-2.5 text-[11.5px] leading-relaxed text-ink-800">
                {error}
              </p>
            )}

            <button type="submit" disabled={submitting} className="btn-primary w-full py-3 text-[13.5px]">
              {submitting ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
              {submitting ? '正在处理…' : mode === 'login' ? '登录' : '注册并进入'}
            </button>
          </form>

          <div className="mt-4 flex items-center gap-3">
            <span className="h-px flex-1 bg-clay" />
            <span className="text-[10px] text-ink-500">体验账号</span>
            <span className="h-px flex-1 bg-clay" />
          </div>

          <button
            type="button"
            onClick={loginDemo}
            disabled={submitting}
            className="mt-4 flex w-full items-center justify-between rounded-2xl border border-clay bg-paper px-4 py-3 text-left transition-colors hover:border-ink-900/20 disabled:opacity-60"
          >
            <div>
              <p className="text-[12px] font-semibold text-ink-900">一键登录示例账号</p>
              <p className="mt-0.5 text-[10.5px] text-ink-500">demo@nutrimind.app · demo1234</p>
            </div>
            <ArrowRight size={15} className="text-ink-500" />
          </button>

          <button
            type="button"
            onClick={enterAsGuest}
            className="mt-2 flex w-full items-center justify-center gap-1.5 py-2.5 text-[11.5px] font-medium text-ink-500 transition-colors hover:text-ink-900"
          >
            <UserRound size={13} />
            先以游客身份体验，稍后再登录
          </button>

          <p className="mt-6 text-center text-[10.5px] leading-relaxed text-ink-500">
            继续即表示你了解：知膳提供营养教育与生活方式参考，不构成医疗诊断。
          </p>
        </div>
      </main>
    </div>
  )
}
