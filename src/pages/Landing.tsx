import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  ArrowUpRight,
  Brain,
  Camera,
  Check,
  ChevronRight,
  ClipboardCheck,
  HeartPulse,
  Leaf,
  MessageCircleMore,
  ScanLine,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UtensilsCrossed,
} from 'lucide-react'
import { Logo, MacroSplit, Ring } from '../components/ui'
import { useAuth } from '../context/AuthContext'

function useReveal<T extends HTMLElement>() {
  const ref = useRef<T | null>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          io.disconnect()
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return { ref, visible }
}

function Reveal({
  children,
  className = '',
  delay = 0,
}: {
  children: React.ReactNode
  className?: string
  delay?: number
}) {
  const { ref, visible } = useReveal<HTMLDivElement>()
  return (
    <div
      ref={ref}
      className={`${className} ${visible ? 'animate-fadeUp' : 'opacity-0'}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {children}
    </div>
  )
}

function TopNav() {
  const [scrolled, setScrolled] = useState(false)
  const navigate = useNavigate()
  const { user, enterGuest } = useAuth()

  function startFree() {
    if (user) {
      navigate('/app')
      return
    }
    enterGuest()
    navigate('/app')
  }

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled ? 'border-b border-clay/70 bg-cream/80 backdrop-blur-xl' : 'bg-transparent'
      }`}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:h-[72px] lg:px-8">
        <Link to="/" aria-label="知膳 NutriMind 首页">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-1 md:flex">
          {[
            ['核心能力', '#features'],
            ['工作机制', '#how'],
            ['科学依据', '#science'],
            ['适用场景', '#scenes'],
          ].map(([label, href]) => (
            <a
              key={href}
              href={href}
              className="rounded-full px-4 py-2 text-[13px] font-medium text-ink-600 transition-colors hover:bg-ink-900/[.05] hover:text-ink-900"
            >
              {label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link
            to="/login"
            className="btn-ghost hidden px-4 py-2 text-[13px] sm:inline-flex"
          >
            登录
          </Link>
          <button onClick={startFree} className="btn-primary px-4 py-2.5 text-[13px]">
            免费开始
            <ArrowUpRight size={15} />
          </button>
        </div>
      </div>
    </header>
  )
}

function HeroDemo() {
  const macros = [
    { label: '蛋白质', value: 62, max: 97, color: '#C8F169' },
    { label: '碳水', value: 104, max: 173, color: '#6FA8FF' },
    { label: '脂肪', value: 40, max: 44, color: '#FF7A45' },
  ]
  return (
    <div className="relative mx-auto w-full max-w-[440px]">
      {/* 装饰光环 */}
      <div className="absolute -inset-6 -z-10 rounded-[3rem] bg-lime-400/25 blur-3xl" />

      {/* 主卡片 */}
      <div className="relative overflow-hidden rounded-[2rem] bg-ink-900 p-5 shadow-lift sm:p-6">
        <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-lime-400/15 blur-2xl" />
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">
              Today · 11月12日
            </p>
            <p className="mt-1 text-[15px] font-semibold text-white">今日营养进度</p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-medium text-lime-400">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-lime-400 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-lime-400" />
            </span>
            AI 实时分析
          </span>
        </div>

        <div className="mt-5 flex items-center gap-5 sm:gap-6">
          <Ring value={1022} max={1477} size={132} thickness={11} color="#C8F169" track="rgba(255,255,255,.09)">
            <div>
              <p className="num text-[26px] font-semibold text-white">1022</p>
              <p className="text-[10px] text-white/45">/ 1477 kcal</p>
            </div>
          </Ring>
          <div className="flex-1 space-y-3">
            {macros.map((m) => (
              <div key={m.label}>
                <div className="flex items-baseline justify-between text-[11px]">
                  <span className="text-white/55">{m.label}</span>
                  <span className="num font-medium text-white/85">
                    {m.value}
                    <span className="text-white/35">/{m.max}g</span>
                  </span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${(m.value / m.max) * 100}%`, background: m.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-lime-400/20 bg-lime-400/[.08] p-3.5">
          <div className="flex items-center gap-2">
            <Sparkles size={13} className="text-lime-400" />
            <span className="text-[11px] font-semibold text-lime-400">AI 营养洞察</span>
          </div>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-white/80">
            蛋白质还差 <span className="font-semibold text-white">35g</span>。晚餐加 100g
            三文鱼 + 200g 西兰花，正好补齐缺口且不超热量。
          </p>
        </div>

        <div className="mt-3 grid grid-cols-4 gap-2">
          {['燕麦 40g', '牛奶 250ml', '水煮蛋 2 个', '沙拉 300g'].map((f) => (
            <div
              key={f}
              className="rounded-xl border border-white/10 bg-white/[.04] px-2 py-2 text-center text-[10px] text-white/70"
            >
              {f}
            </div>
          ))}
        </div>
      </div>

      {/* 浮动评分卡 */}
      <div className="absolute -left-4 -top-5 hidden animate-float rounded-2xl border border-clay bg-paper/95 px-3.5 py-2.5 shadow-lift backdrop-blur sm:block">
        <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-ink-500">Meal score</p>
        <div className="mt-1 flex items-center gap-2">
          <span className="num text-xl font-bold text-ink-900">88</span>
          <span className="rounded-full bg-lime-400/50 px-1.5 py-0.5 text-[9px] font-bold text-ink-900">
            B+
          </span>
        </div>
      </div>

      {/* 浮动识别卡 */}
      <div
        className="absolute -right-3 -top-5 hidden animate-float rounded-2xl border border-clay bg-paper/95 px-3.5 py-2.5 shadow-lift backdrop-blur sm:block"
        style={{ animationDelay: '1.2s' }}
      >
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-full bg-ink-900 text-lime-400">
            <ScanLine size={13} />
          </span>
          <div>
            <p className="text-[10px] font-semibold text-ink-900">已拆解 7 种食材</p>
            <p className="text-[9px] text-ink-500">用时 1.8s · 置信度 92%</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function Hero() {
  return (
    <section className="relative overflow-hidden pb-16 pt-28 sm:pt-32 lg:pb-24 lg:pt-40">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-x-0 top-0 h-[560px] grid-dots opacity-[.5] [mask-image:linear-gradient(to_bottom,black,transparent_85%)]" />
        <div className="absolute -right-24 top-16 h-[420px] w-[420px] rounded-full bg-lime-400/25 blur-[110px]" />
        <div className="absolute -left-32 top-64 h-[320px] w-[320px] rounded-full bg-sky/15 blur-[100px]" />
      </div>

      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-14 lg:grid-cols-[1.05fr_.95fr] lg:gap-10">
          <div>
            <Reveal>
              <span className="inline-flex items-center gap-2 rounded-full border border-ink-900/10 bg-paper/80 px-3 py-1.5 text-[11px] font-semibold text-ink-700 backdrop-blur">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-lime-500 opacity-70" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-lime-500" />
                </span>
                AI 健康与生活服务 · 营养分析
              </span>
            </Reveal>

            <Reveal delay={80}>
              <h1 className="mt-6 text-[clamp(2.5rem,6.4vw,4.35rem)] font-semibold leading-[1.04] tracking-[-0.03em] text-ink-900">
                读懂每一餐，
                <br />
                让营养
                <span className="relative mx-1 inline-block">
                  <span className="relative z-10">有据可依</span>
                  <span className="absolute inset-x-0 bottom-1 z-0 h-3 -rotate-[.6deg] rounded-sm bg-lime-400/70 sm:h-4" />
                </span>
                。
              </h1>
            </Reveal>

            <Reveal delay={140}>
              <p className="mt-6 max-w-xl text-[15px] leading-relaxed text-ink-600 sm:text-base">
                用一句话描述你吃了什么，知膳会完成
                <strong className="font-semibold text-ink-900">食物拆解、营养计算与个性化膳食建议</strong>
                。它记得你的身体数据、目标与今天的每一口。
              </p>
            </Reveal>

            <Reveal delay={200}>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link to="/app/analyze" className="btn-primary group px-6 py-3.5 text-[14px]">
                  <Sparkles size={16} />
                  开始 AI 营养分析
                  <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
                </Link>
                <Link to="/app" className="btn-ghost px-6 py-3.5 text-[14px]">
                  查看示例工作台
                </Link>
              </div>
            </Reveal>

            <Reveal delay={260}>
              <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
                {[
                  ['100+', '常见食物营养库'],
                  ['< 3s', '单餐智能拆解'],
                  ['3 类', '减脂 / 增肌 / 维持'],
                ].map(([num, label]) => (
                  <div key={label}>
                    <p className="num text-xl font-semibold text-ink-900">{num}</p>
                    <p className="mt-0.5 text-[11.5px] text-ink-500">{label}</p>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>

          <Reveal delay={180} className="lg:pl-4">
            <HeroDemo />
          </Reveal>
        </div>
      </div>
    </section>
  )
}

function TrustStrip() {
  const items = [
    '《中国居民膳食指南（2023）》',
    '中国食物成分表（第 6 版）',
    'Mifflin-St Jeor 代谢方程',
    '100+ 常见食物营养库',
    '本地优先的隐私设计',
    '可解释的营养评分',
  ]
  return (
    <div className="border-y border-clay/70 bg-paper/50 py-4">
      <div className="mask-fade-r overflow-hidden">
        <div className="flex w-max animate-marquee gap-10 whitespace-nowrap">
          {[...items, ...items].map((item, i) => (
            <span key={i} className="flex items-center gap-2 text-[12px] font-medium text-ink-500">
              <Leaf size={12} className="text-ink-500/60" />
              {item}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

function Features() {
  return (
    <section id="features" className="scroll-mt-24 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <div className="max-w-2xl">
            <p className="eyebrow">Core capabilities</p>
            <h2 className="mt-3 text-[clamp(1.9rem,3.6vw,2.75rem)] font-semibold leading-[1.15] tracking-[-0.02em] text-ink-900">
              不是一个热量计算器，
              <br className="hidden sm:block" />
              而是一位懂你的营养分析师。
            </h2>
            <p className="mt-4 text-[14.5px] leading-relaxed text-ink-600">
              把营养学知识、你的身体数据与当天的真实摄入放进同一个推理过程，
              让每一条建议都能回答「为什么」和「接下来怎么做」。
            </p>
          </div>
        </Reveal>

        <div className="mt-12 grid gap-4 md:grid-cols-6">
          {/* 大卡：AI 解析 */}
          <Reveal delay={60} className="md:col-span-4">
            <div className="group relative h-full overflow-hidden rounded-[2rem] bg-ink-900 p-7 text-white sm:p-8">
              <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-lime-400/15 blur-3xl transition-opacity group-hover:opacity-80" />
              <div className="flex items-start justify-between">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/10 text-lime-400">
                  <Brain size={20} />
                </span>
                <span className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] font-medium text-white/50">
                  01 / 语义解析
                </span>
              </div>
              <h3 className="mt-6 text-xl font-semibold">一句话，还原一餐的营养结构</h3>
              <p className="mt-2 max-w-md text-[13.5px] leading-relaxed text-white/60">
                自然语言理解食物名称、份量与烹饪方式，结合营养知识图谱完成拆分与估算，不再需要手动查表。
              </p>

              <div className="mt-6 space-y-2.5">
                <div className="flex items-start gap-3 rounded-2xl bg-white/[.06] p-3.5">
                  <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white/10 text-[10px] text-white/60">
                    你
                  </span>
                  <p className="text-[12.5px] text-white/80">
                    「中午吃了一碗牛肉面、一个煎蛋，还喝了杯无糖豆浆」
                  </p>
                </div>
                <div className="flex items-start gap-3 rounded-2xl border border-lime-400/20 bg-lime-400/[.07] p-3.5">
                  <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-lime-400 text-[10px] font-bold text-ink-900">
                    AI
                  </span>
                  <div className="flex-1">
                    <p className="text-[12.5px] text-white/80">
                      识别 3 项食物 · 612 kcal
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {['牛肉面 500g', '煎蛋 55g', '无糖豆浆 250ml'].map((t) => (
                        <span
                          key={t}
                          className="rounded-full bg-white/10 px-2 py-1 text-[10px] text-white/70"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                    <div className="mt-3 flex items-center gap-3">
                      <div className="flex-1">
                        <MacroSplit protein={32} fat={17} carbs={78} />
                      </div>
                      <span className="text-[10px] text-white/45">蛋白 32g</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>

          {/* 个性化膳食建议 */}
          <Reveal delay={120} className="md:col-span-2">
            <div className="flex h-full flex-col rounded-[2rem] border border-clay bg-paper p-7">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-lime-400/40 text-ink-900">
                <ClipboardCheck size={20} />
              </span>
              <h3 className="mt-6 text-[17px] font-semibold leading-snug text-ink-900">
                基于你，而不是平均人
              </h3>
              <p className="mt-2 text-[13px] leading-relaxed text-ink-600">
                依据年龄、身高、体重、活动量与目标，动态计算每日能量与宏量营养素区间。
              </p>
              <div className="mt-5 space-y-3 text-[12px]">
                {[
                  ['每日目标', '1477 kcal'],
                  ['蛋白质', '97 g'],
                  ['膳食纤维', '25 g'],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between border-b border-dashed border-clay pb-2 last:border-0">
                    <span className="text-ink-500">{k}</span>
                    <span className="num font-semibold text-ink-900">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>

          {/* AI 膳食助手 */}
          <Reveal delay={160} className="md:col-span-2">
            <div className="flex h-full flex-col rounded-[2rem] border border-clay bg-paper p-7">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-ink-900/5 text-ink-900">
                <MessageCircleMore size={20} />
              </span>
              <h3 className="mt-6 text-[17px] font-semibold leading-snug text-ink-900">
                随时可问的 AI 膳食助手
              </h3>
              <p className="mt-2 text-[13px] leading-relaxed text-ink-600">
                它知道你今天的全部摄入，回答不是通用科普，而是「你还差多少、怎么补」。
              </p>
              <div className="mt-5 space-y-2">
                <p className="w-fit rounded-2xl rounded-tl-md bg-cream px-3 py-2 text-[11.5px] text-ink-700">
                  晚上吃什么不容易饿？
                </p>
                <p className="ml-auto w-fit rounded-2xl rounded-tr-md bg-ink-900 px-3 py-2 text-[11.5px] text-white">
                  100g 三文鱼 + 200g 西兰花 + 半根玉米
                </p>
              </div>
            </div>
          </Reveal>

          {/* 趋势 */}
          <Reveal delay={200} className="md:col-span-2">
            <div className="flex h-full flex-col rounded-[2rem] border border-clay bg-paper p-7">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-ink-900/5 text-ink-900">
                <TrendingUp size={20} />
              </span>
              <h3 className="mt-6 text-[17px] font-semibold leading-snug text-ink-900">
                7 天趋势与阶段膳食总结
              </h3>
              <p className="mt-2 text-[13px] leading-relaxed text-ink-600">
                热量、蛋白质、纤维的达成趋势一目了然，本地规则根据真实记录总结模式与改进点。
              </p>
              <div className="mt-auto pt-5">
                <div className="flex h-16 items-end gap-1.5">
                  {[52, 68, 44, 76, 60, 84, 72].map((h, i) => (
                    <div
                      key={i}
                      className={`flex-1 rounded-t-md ${i === 5 ? 'bg-lime-400' : 'bg-ink-900/12'}`}
                      style={{ height: `${h}%` }}
                    />
                  ))}
                </div>
                <p className="mt-2 text-[10px] text-ink-500">近 7 日热量达成</p>
              </div>
            </div>
          </Reveal>

          {/* 隐私 */}
          <Reveal delay={240} className="md:col-span-2">
            <div className="flex h-full flex-col rounded-[2rem] border border-ink-900/5 gradient-lime p-7">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-ink-900 text-lime-400">
                <ShieldCheck size={20} />
              </span>
              <h3 className="mt-6 text-[17px] font-semibold leading-snug text-ink-900">
                隐私优先，数据留在你手里
              </h3>
              <p className="mt-2 text-[13px] leading-relaxed text-ink-800/80">
                健康档案与饮食记录默认仅保存在本地浏览器，无需注册；接入大模型时可自主选择服务端点。
              </p>
              <div className="mt-auto flex flex-wrap gap-1.5 pt-5 text-[10px] font-semibold text-ink-900/70">
                {['本地存储', '不采集身份信息', '可随时清空'].map((t) => (
                  <span key={t} className="rounded-full bg-ink-900/10 px-2.5 py-1">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}

function HowItWorks() {
  const steps = [
    {
      n: '01',
      icon: UtensilsCrossed,
      title: '说出你的一餐',
      desc: '用自然语言描述食物与份量，例如「两碗米饭、一份番茄炒蛋」。也可以从食物库快速添加。',
    },
    {
      n: '02',
      icon: ScanLine,
      title: 'AI 拆解营养',
      desc: '识别食物、估算克数，计算热量与七大营养素，并给出可解释的餐食评分。',
    },
    {
      n: '03',
      icon: HeartPulse,
      title: '获得膳食建议',
      desc: '结合目标与当天进度，告诉你缺口在哪、下一餐具体吃什么、吃多少。',
    },
  ]
  return (
    <section id="how" className="scroll-mt-24 border-y border-clay/70 bg-paper/50 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
            <div className="max-w-xl">
              <p className="eyebrow">How it works</p>
              <h2 className="mt-3 text-[clamp(1.9rem,3.6vw,2.75rem)] font-semibold leading-[1.15] tracking-[-0.02em] text-ink-900">
                三步完成一次
                <br />
                真正有用的营养分析。
              </h2>
            </div>
            <Link
              to="/app/analyze"
              className="inline-flex w-fit items-center gap-1.5 text-[13px] font-semibold text-ink-900 underline decoration-lime-500 decoration-2 underline-offset-4 hover:decoration-ink-900"
            >
              现在试一次
              <ChevronRight size={15} />
            </Link>
          </div>
        </Reveal>

        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {steps.map((s, i) => (
            <Reveal key={s.n} delay={i * 90}>
              <div className="group relative h-full overflow-hidden rounded-[1.75rem] border border-clay bg-paper p-7 transition-all hover:-translate-y-1 hover:shadow-soft">
                <div className="flex items-start justify-between">
                  <span className="grid h-11 w-11 place-items-center rounded-2xl bg-cream text-ink-900">
                    <s.icon size={19} />
                  </span>
                  <span className="font-display text-4xl italic text-ink-900/10">{s.n}</span>
                </div>
                <h3 className="mt-7 text-[17px] font-semibold text-ink-900">{s.title}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-ink-600">{s.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

function Science() {
  const items = [
    {
      title: 'Mifflin-St Jeor 方程',
      desc: '以国际通用的基础代谢预测方程起步，再叠加活动系数估算每日能量消耗（TDEE）。',
    },
    {
      title: '中国居民膳食指南（2023）',
      desc: '宏量营养素供能比、膳食纤维与钠的推荐区间，均参照最新版膳食指南设定。',
    },
    {
      title: '食物成分表校准',
      desc: '营养数值以《中国食物成分表》与 USDA 数据为基准，AI 给出的估算会与本地库交叉校验。',
    },
    {
      title: '可解释的评分机制',
      desc: '每餐评分由能量占比、蛋白密度、纤维、钠与糖共同构成，扣分项逐条展示，不黑箱。',
    },
  ]
  return (
    <section id="science" className="scroll-mt-24 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[.9fr_1.1fr] lg:gap-16">
          <Reveal>
            <div className="lg:sticky lg:top-28">
              <p className="eyebrow">Built on evidence</p>
              <h2 className="mt-3 text-[clamp(1.9rem,3.6vw,2.75rem)] font-semibold leading-[1.15] tracking-[-0.02em] text-ink-900">
                有温度的建议，
                <br />
                也必须有严谨的底稿。
              </h2>
              <p className="mt-4 text-[14.5px] leading-relaxed text-ink-600">
                我们不做玄学养生。每一条计算逻辑都可以被追溯，每一个数字都有出处。
                当 AI 生成建议时，它同时被约束在营养学的安全边界内。
              </p>

              <div className="mt-7 flex items-start gap-3 rounded-2xl border border-clay bg-paper p-4">
                <ShieldCheck size={18} className="mt-0.5 shrink-0 text-ink-700" />
                <p className="text-[12px] leading-relaxed text-ink-600">
                  <strong className="font-semibold text-ink-900">免责声明：</strong>
                  知膳提供的是营养教育与生活方式参考，不构成医疗诊断或治疗建议。孕期、慢性病与用药人群请遵医嘱。
                </p>
              </div>
            </div>
          </Reveal>

          <div className="space-y-3">
            {items.map((item, i) => (
              <Reveal key={item.title} delay={i * 80}>
                <div className="group flex gap-4 rounded-2xl border border-clay/80 bg-paper p-5 transition-colors hover:border-ink-900/20 sm:p-6">
                  <span className="num mt-0.5 text-[11px] font-semibold text-ink-500">
                    0{i + 1}
                  </span>
                  <div>
                    <h3 className="text-[15px] font-semibold text-ink-900">{item.title}</h3>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-ink-600">{item.desc}</p>
                  </div>
                  <ArrowUpRight
                    size={16}
                    className="ml-auto shrink-0 text-ink-500/0 transition-colors group-hover:text-ink-500"
                  />
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function Scenes() {
  const scenes = [
    {
      icon: TrendingUp,
      title: '减脂人群',
      desc: '不靠饿肚子，用蛋白质与纤维把饱腹感做起来，维持可持续的热量缺口。',
    },
    {
      icon: Camera,
      title: '外卖与聚餐',
      desc: '重油重盐的一餐也能被准确估算，并告诉你下一餐如何平衡回来。',
    },
    {
      icon: HeartPulse,
      title: '家庭膳食',
      desc: '为家人记录三餐，关注老人与孩子的蛋白质、钙与蔬菜摄入。',
    },
    {
      icon: Check,
      title: '健康管理',
      desc: '长期趋势与可追溯的记录，复诊时给医生一份清晰的饮食证据。',
    },
  ]
  return (
    <section id="scenes" className="scroll-mt-24 border-t border-clay/70 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <div className="max-w-2xl">
            <p className="eyebrow">For real life</p>
            <h2 className="mt-3 text-[clamp(1.9rem,3.6vw,2.75rem)] font-semibold leading-[1.15] tracking-[-0.02em] text-ink-900">
              为真实的生活设计，
              <br />
              而不是为完美的食谱。
            </h2>
          </div>
        </Reveal>
        <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {scenes.map((s, i) => (
            <Reveal key={s.title} delay={i * 70}>
              <div className="h-full rounded-2xl border border-clay/80 bg-paper p-6">
                <s.icon size={19} className="text-ink-700" />
                <h3 className="mt-5 text-[15px] font-semibold text-ink-900">{s.title}</h3>
                <p className="mt-2 text-[12.5px] leading-relaxed text-ink-600">{s.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

function FinalCTA() {
  return (
    <section className="px-4 pb-20 sm:px-6 lg:px-8">
      <Reveal>
        <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[2.5rem] gradient-dark px-6 py-16 text-center sm:px-12 sm:py-20">
          <div className="pointer-events-none absolute -left-16 -top-20 h-64 w-64 rounded-full bg-lime-400/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -right-10 h-72 w-72 rounded-full bg-sky/10 blur-3xl" />
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[11px] font-medium text-white/70">
            <Sparkles size={12} className="text-lime-400" />
            邮箱登录 · 数据按账号隔离 · 随时开始
          </span>
          <h2 className="mx-auto mt-6 max-w-2xl text-[clamp(1.9rem,4vw,3rem)] font-semibold leading-[1.12] tracking-[-0.02em] text-white">
            今天这一餐，
            <br className="sm:hidden" />
            值得被认真读懂。
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-[14px] leading-relaxed text-white/60">
            从一句话开始。知膳会替你完成剩下的计算、推理与建议。
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link to="/login" className="btn-lime group px-6 py-3.5 text-[14px]">
              开始 AI 营养分析
              <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              to="/login"
              className="btn border border-white/15 px-6 py-3.5 text-[14px] text-white hover:bg-white/10"
            >
              登录后体验
            </Link>
          </div>
        </div>
      </Reveal>
    </section>
  )
}

function Footer() {
  return (
    <footer className="border-t border-clay/70 py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div className="flex items-start gap-4">
          <Logo />
          <p className="max-w-xs text-[11.5px] leading-relaxed text-ink-500">
            AI 营养分析师，让每一餐都有据可依。
            <br />
            本项目为非医疗用途的营养教育工具。
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[11.5px] text-ink-500">
          <a href="#features" className="hover:text-ink-900">核心能力</a>
          <a href="#how" className="hover:text-ink-900">工作机制</a>
          <a href="#science" className="hover:text-ink-900">科学依据</a>
          <Link to="/login" className="hover:text-ink-900">登录</Link>
          <span className="text-ink-500/60">© {new Date().getFullYear()} 知膳 NutriMind</span>
        </div>
      </div>
    </footer>
  )
}

export default function Landing() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-cream">
      <TopNav />
      <Hero />
      <TrustStrip />
      <Features />
      <HowItWorks />
      <Science />
      <Scenes />
      <FinalCTA />
      <Footer />
    </div>
  )
}
