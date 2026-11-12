import { useMemo } from 'react'
import { Apple, Check, Info, Moon, Sun, Sunrise, X } from 'lucide-react'
import { useApp } from '../context/AppContext'
import type { MealType } from '../types'

// ── 食物类别色板 ────────────────────────────────────────────
const CATEGORY_STYLE: Record<string, { bg: string; fg: string }> = {
  主食: { bg: '#F4ECD9', fg: '#8A6A2F' },
  蛋白质: { bg: '#FBE5DA', fg: '#AE552E' },
  乳制品: { bg: '#E7EEF9', fg: '#49699B' },
  蔬菜: { bg: '#E4F2E4', fg: '#3F7A48' },
  水果: { bg: '#FCE6E9', fg: '#AE4F5C' },
  坚果油脂: { bg: '#F4EBDD', fg: '#86663A' },
  饮品: { bg: '#E6F0F5', fg: '#3B6F85' },
  零食甜点: { bg: '#F7E7F2', fg: '#944C7A' },
  快餐: { bg: '#FBEBD8', fg: '#A3642B' },
  家常菜: { bg: '#EAF0E3', fg: '#54713D' },
  调味: { bg: '#F3EEDB', fg: '#867830' },
}

export function FoodAvatar({
  name,
  category,
  size = 40,
}: {
  name: string
  category?: string
  size?: number
}) {
  const style = CATEGORY_STYLE[category ?? ''] ?? { bg: '#EDEADF', fg: '#58695E' }
  return (
    <span
      aria-hidden
      className="grid shrink-0 place-items-center rounded-xl font-semibold"
      style={{
        width: size,
        height: size,
        background: style.bg,
        color: style.fg,
        fontSize: size * 0.36,
      }}
    >
      {name.slice(0, 1)}
    </span>
  )
}

const MEAL_ICONS = { breakfast: Sunrise, lunch: Sun, dinner: Moon, snack: Apple }

export function MealIcon({ type, size = 15 }: { type: MealType; size?: number }) {
  const Icon = MEAL_ICONS[type]
  return <Icon size={size} strokeWidth={1.8} />
}

// ── 品牌标识 ────────────────────────────────────────────────
export function Logo({ size = 34, dark = false }: { size?: number; dark?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span
        className="relative grid place-items-center rounded-full"
        style={{
          width: size,
          height: size,
          background: dark ? '#C8F169' : '#0B1F19',
        }}
      >
        <svg width={size * 0.62} height={size * 0.62} viewBox="0 0 24 24" fill="none">
          <path
            d="M12 21c0-6.5 3.4-10.2 8-11.3C19.4 16 16.4 19.4 12 21Z"
            fill={dark ? '#0B1F19' : '#C8F169'}
          />
          <path
            d="M12 21C6.9 19.6 4 15.4 4 9c4.5 1.1 7.4 4.6 8 12Z"
            fill={dark ? '#0B1F19' : '#C8F169'}
            opacity=".55"
          />
        </svg>
      </span>
      <span className="flex flex-col leading-none">
        <span
          className={`text-[15px] font-bold tracking-tight ${dark ? 'text-white' : 'text-ink-900'}`}
        >
          知膳
        </span>
        <span
          className={`mt-0.5 text-[9px] font-semibold uppercase tracking-[0.2em] ${
            dark ? 'text-white/50' : 'text-ink-500'
          }`}
        >
          NutriMind
        </span>
      </span>
    </span>
  )
}

// ── 环形进度 ────────────────────────────────────────────────
export function Ring({
  value,
  max,
  size = 168,
  thickness = 12,
  color = '#0B1F19',
  track = '#EDEADE',
  children,
}: {
  value: number
  max: number
  size?: number
  thickness?: number
  color?: string
  track?: string
  children?: React.ReactNode
}) {
  const r = (size - thickness) / 2
  const c = 2 * Math.PI * r
  const ratio = max > 0 ? Math.min(value / max, 1) : 0
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={thickness} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - ratio)}
          style={{ transition: 'stroke-dashoffset 1s cubic-bezier(.22,1,.36,1)' }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  )
}

// ── 横向进度条 ──────────────────────────────────────────────
export function Bar({
  value,
  max,
  color = '#0B1F19',
  height = 7,
  track = '#EFECE2',
}: {
  value: number
  max: number
  color?: string
  height?: number
  track?: string
}) {
  const ratio = max > 0 ? Math.min(value / max, 1) : 0
  const over = max > 0 && value > max * 1.02
  return (
    <div
      className="w-full overflow-hidden rounded-full"
      style={{ height, background: track }}
      role="progressbar"
      aria-valuenow={Math.round(value)}
      aria-valuemax={Math.round(max)}
    >
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{
          width: `${ratio * 100}%`,
          background: over ? '#FF7A45' : color,
        }}
      />
    </div>
  )
}

// ── 折线趋势图 ──────────────────────────────────────────────
export function LineChart({
  data,
  labels,
  target,
  height = 170,
  color = '#0B1F19',
  fill = 'rgba(200,241,105,.45)',
}: {
  data: number[]
  labels: string[]
  target?: number
  height?: number
  color?: string
  fill?: string
}) {
  const width = 640
  const pad = { top: 18, right: 12, bottom: 26, left: 12 }
  const allValues = [...data, ...(target ? [target] : [])]
  const hi = Math.max(...allValues, 1)
  const lo = Math.min(...allValues)
  const padValue = Math.max((hi - lo) * 0.45, hi * 0.06, 1)
  const yMin = Math.max(0, lo - padValue)
  const yMax = hi + padValue
  const innerW = width - pad.left - pad.right
  const innerH = height - pad.top - pad.bottom
  const stepX = data.length > 1 ? innerW / (data.length - 1) : innerW
  const scaleY = (v: number) => pad.top + innerH - ((v - yMin) / Math.max(1, yMax - yMin)) * innerH
  const points = data.map((v, i) => ({
    x: pad.left + i * stepX,
    y: scaleY(v),
  }))

  const linePath = useMemo(() => {
    if (points.length === 0) return ''
    let d = `M ${points[0].x} ${points[0].y}`
    for (let i = 1; i < points.length; i++) {
      const p0 = points[i - 1]
      const p1 = points[i]
      const cx = (p0.x + p1.x) / 2
      d += ` C ${cx} ${p0.y}, ${cx} ${p1.y}, ${p1.x} ${p1.y}`
    }
    return d
  }, [points])

  const areaPath = `${linePath} L ${points[points.length - 1]?.x ?? 0} ${pad.top + innerH} L ${
    points[0]?.x ?? 0
  } ${pad.top + innerH} Z`

  const targetY = target ? scaleY(target) : null

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ height }} preserveAspectRatio="none">
      <defs>
        <linearGradient id="lineFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={fill} />
          <stop offset="100%" stopColor="rgba(200,241,105,0)" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map((p) => (
        <line
          key={p}
          x1={pad.left}
          x2={width - pad.right}
          y1={pad.top + innerH * p}
          y2={pad.top + innerH * p}
          stroke="#EFECE2"
          strokeDasharray="3 6"
        />
      ))}
      {targetY !== null && (
        <g>
          <line
            x1={pad.left}
            x2={width - pad.right}
            y1={targetY}
            y2={targetY}
            stroke="#FF7A45"
            strokeDasharray="5 5"
            strokeWidth="1.2"
          />
          <text x={width - pad.right - 4} y={targetY - 6} textAnchor="end" fontSize="10" fill="#FF7A45">
            目标 {Math.round(target ?? 0)}
          </text>
        </g>
      )}
      {points.length > 1 && <path d={areaPath} fill="url(#lineFill)" />}
      <path d={linePath} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="4" fill="#FFFEFA" stroke={color} strokeWidth="2" />
          <text
            x={p.x}
            y={height - 6}
            textAnchor="middle"
            fontSize="10"
            fill="#7C8A83"
            fontFamily="Inter, sans-serif"
          >
            {labels[i]}
          </text>
        </g>
      ))}
    </svg>
  )
}

// ── 堆叠占比条 ──────────────────────────────────────────────
export function MacroSplit({
  protein,
  fat,
  carbs,
}: {
  protein: number
  fat: number
  carbs: number
}) {
  const pCal = protein * 4
  const fCal = fat * 9
  const cCal = carbs * 4
  const total = Math.max(pCal + fCal + cCal, 1)
  return (
    <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-clay/60">
      <div style={{ width: `${(pCal / total) * 100}%`, background: '#0B1F19' }} />
      <div style={{ width: `${(fCal / total) * 100}%`, background: '#B4E84F' }} />
      <div style={{ width: `${(cCal / total) * 100}%`, background: '#FF7A45' }} />
    </div>
  )
}

// ── 轻量 Markdown 渲染 ──────────────────────────────────────
export function MarkdownLite({ text }: { text: string }) {
  const blocks = text.split('\n')
  const renderInline = (s: string) => {
    const parts = s.split(/(\*\*[^*]+\*\*)/g)
    return parts.map((part, i) =>
      part.startsWith('**') && part.endsWith('**') ? (
        <strong key={i} className="font-semibold text-ink-900">
          {part.slice(2, -2)}
        </strong>
      ) : (
        <span key={i}>{part}</span>
      ),
    )
  }
  return (
    <div className="space-y-1.5 text-[13.5px] leading-relaxed">
      {blocks.map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-1.5" />
        if (/^#{1,4}\s/.test(line)) {
          return (
            <p key={i} className="pt-1 text-sm font-semibold text-ink-900">
              {renderInline(line.replace(/^#{1,4}\s/, ''))}
            </p>
          )
        }
        if (/^[-*]\s/.test(line)) {
          return (
            <div key={i} className="flex gap-2 pl-0.5">
              <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-ink-900/40" />
              <p>{renderInline(line.replace(/^[-*]\s/, ''))}</p>
            </div>
          )
        }
        if (/^\d+\.\s/.test(line)) {
          const [num, ...rest] = line.split('. ')
          return (
            <div key={i} className="flex gap-2">
              <span className="mt-0.5 shrink-0 text-xs font-semibold text-ink-500">{num}.</span>
              <p>{renderInline(rest.join('. '))}</p>
            </div>
          )
        }
        return <p key={i}>{renderInline(line)}</p>
      })}
    </div>
  )
}

// ── 全局提示 ────────────────────────────────────────────────
export function Toasts() {
  const { toasts, dismissToast } = useApp()
  return (
    <div className="pointer-events-none fixed bottom-6 right-4 z-[100] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2 sm:right-6">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto flex animate-fadeUp items-center gap-3 rounded-2xl border border-clay bg-paper px-4 py-3 shadow-lift"
        >
          <span
            className={`grid h-7 w-7 shrink-0 place-items-center rounded-full ${
              t.tone === 'error' ? 'bg-coral/15 text-coral' : t.tone === 'info' ? 'bg-sky/15 text-sky' : 'bg-lime-400/40 text-ink-900'
            }`}
          >
            {t.tone === 'info' ? <Info size={14} /> : <Check size={14} />}
          </span>
          <p className="flex-1 text-[13px] font-medium text-ink-800">{t.message}</p>
          <button onClick={() => dismissToast(t.id)} className="text-ink-500 hover:text-ink-900">
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}

// ── 视觉装饰：噪点纹理 ──────────────────────────────────────
export function Grain({ opacity = 0.035 }: { opacity?: number }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0"
      style={{
        opacity,
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        mixBlendMode: 'multiply',
      }}
    />
  )
}
