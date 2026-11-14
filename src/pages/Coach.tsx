import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowUp,
  Bot,
  Loader2,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  Wifi,
  WifiOff,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import { coachReply } from '../lib/ai'
import { MarkdownLite } from '../components/ui'
import { isProfileComplete, pct } from '../lib/nutrition'
import type { ChatMessage } from '../types'

const QUICK_QUESTIONS = [
  '今天吃得怎么样？',
  '早上吃什么不容易饿？',
  '晚餐吃什么不容易饿？',
  '蛋白质还差多少，怎么补？',
  '帮我安排明天的一日三餐',
]

export default function Coach() {
  const {
    chat,
    addChatMessage,
    updateChatMessage,
    clearChat,
    profile,
    meals,
    aiStatus,
    targets,
    todayNutrition,
    todayMeals,
    notify,
  } = useApp()
  const { requireAuth } = useAuth()
  const navigate = useNavigate()
  const [draft, setDraft] = useState('')
  const [pending, setPending] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const aiReady = aiStatus.configured

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [chat, pending])

  async function send(text?: string) {
    const question = (text ?? draft).trim()
    if (!question || pending) return
    if (!requireAuth('AI 膳食助手')) return
    if (!isProfileComplete(profile)) {
      notify('请先填写有效的年龄、身高和当前体重，AI 才能结合你的身体数据回答', 'info')
      navigate('/app/profile')
      return
    }
    setDraft('')
    setPending(true)

    const userMsg: ChatMessage = {
      id: Math.random().toString(36).slice(2, 10),
      role: 'user',
      content: question,
      createdAt: Date.now(),
    }
    addChatMessage(userMsg)

    const replyId = Math.random().toString(36).slice(2, 10)
    addChatMessage({
      id: replyId,
      role: 'assistant',
      content: '',
      createdAt: Date.now(),
      engine: 'local',
    })

    let buffer = ''
    try {
      const res = await coachReply(
        chat.filter((m) => m.id !== 'welcome'),
        question,
        { profile, meals },
        aiStatus,
        (delta) => {
          buffer += delta
          updateChatMessage(replyId, buffer)
        },
      )
      updateChatMessage(replyId, res.content, res.engine)
    } catch {
      updateChatMessage(replyId, '抱歉，我暂时无法回答这个问题，请稍后再试。')
      notify('AI 膳食助手响应失败', 'error')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="flex h-[calc(100dvh-10.5rem)] flex-col gap-4 lg:h-[calc(100dvh-6rem)] lg:flex-row">
      {/* 上下文侧栏 */}
      <aside className="hidden w-[276px] shrink-0 flex-col gap-3 lg:flex">
        <div className="rounded-[1.75rem] border border-clay bg-paper p-5 shadow-soft">
          <div className="flex items-center gap-2.5">
            <span className="relative grid h-10 w-10 place-items-center rounded-full bg-ink-900 text-lime-400">
              <Bot size={18} />
              <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-paper bg-lime-500" />
            </span>
            <div>
              <p className="text-[13.5px] font-semibold text-ink-900">知膳 AI 膳食助手</p>
              <p className="text-[10.5px] text-ink-500">{aiReady ? aiStatus.model : '本地营养引擎'}</p>
            </div>
          </div>
          <div className="mt-4 flex items-start gap-2 rounded-xl bg-cream/70 p-2.5">
            {aiReady ? (
              <Wifi size={12} className="mt-0.5 shrink-0 text-ink-600" />
            ) : (
              <WifiOff size={12} className="mt-0.5 shrink-0 text-ink-600" />
            )}
            <p className="text-[10.5px] leading-relaxed text-ink-600">
              {aiReady
                ? '已接入服务端大模型，结合你的档案与今日记录实时推理。'
                : '当前使用本地营养引擎；大模型由服务端统一配置，启用后自动切换。'}
            </p>
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-clay bg-paper p-5 shadow-soft">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-500">
            已读取的上下文
          </p>
          <div className="mt-3 space-y-3">
            {[
              ['今日热量', `${Math.round(todayNutrition.calories)} / ${targets.calories}`, pct(todayNutrition.calories, targets.calories)],
              ['蛋白质', `${Math.round(todayNutrition.protein)} / ${targets.protein}g`, pct(todayNutrition.protein, targets.protein)],
              ['膳食纤维', `${Math.round(todayNutrition.fiber)} / ${targets.fiber}g`, pct(todayNutrition.fiber, targets.fiber)],
            ].map(([label, value, p]) => (
              <div key={String(label)}>
                <div className="flex items-baseline justify-between">
                  <span className="text-[11px] text-ink-500">{label}</span>
                  <span className="num text-[11px] font-semibold text-ink-900">{value}</span>
                </div>
                <div className="mt-1 h-1 overflow-hidden rounded-full bg-clay/60">
                  <div
                    className="h-full rounded-full bg-ink-900/70"
                    style={{ width: `${Math.min(100, Number(p))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-1.5">
            <span className="tag">{profile.age ? `${profile.age} 岁` : '年龄待填写'}</span>
            <span className="tag">{profile.weight ? `${profile.weight} kg` : '体重待填写'}</span>
            <span className="tag">
              {profile.goal === 'lose' ? '减脂' : profile.goal === 'gain' ? '增肌' : '维持'}
            </span>
            <span className="tag">{todayMeals.length} 餐记录</span>
          </div>
        </div>

        <div className="mt-auto flex items-start gap-2 rounded-2xl border border-clay/70 bg-cream/60 p-3.5">
          <ShieldAlert size={13} className="mt-0.5 shrink-0 text-ink-500" />
          <p className="text-[10px] leading-relaxed text-ink-500">
            AI 建议仅供营养教育参考，不构成医疗诊断。如有慢性疾病或特殊生理阶段，请咨询医生。
          </p>
        </div>
      </aside>

      {/* 聊天主体 */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[2rem] border border-clay bg-paper shadow-soft">
        <header className="flex items-center justify-between border-b border-clay/70 px-4 py-3 sm:px-5">
          <div className="flex items-center gap-2.5">
            <span className="relative grid h-8 w-8 place-items-center rounded-full bg-ink-900 text-lime-400 lg:hidden">
              <Bot size={15} />
            </span>
            <div>
              <h1 className="text-[14px] font-semibold text-ink-900">膳食建议</h1>
              <p className="flex items-center gap-1.5 text-[10px] text-ink-500">
                <span className="h-1.5 w-1.5 rounded-full bg-lime-500" />
                {aiReady ? '在线 · 已读取你的健康档案' : '本地模式 · 已读取你的健康档案'}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              clearChat()
              notify('对话已清空', 'info')
            }}
            className="flex items-center gap-1.5 rounded-full border border-clay px-3 py-1.5 text-[11px] font-medium text-ink-600 transition-colors hover:bg-cream"
          >
            <RotateCcw size={12} />
            新对话
          </button>
        </header>

        <div ref={scrollRef} className="hide-scrollbar flex-1 space-y-5 overflow-y-auto px-4 py-5 sm:px-6">
          {chat.map((m) => (
            <div
              key={m.id}
              className={`flex gap-2.5 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              {m.role === 'assistant' && (
                <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-ink-900 text-lime-400">
                  <Sparkles size={13} />
                </span>
              )}
              <div
                className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 ${
                  m.role === 'user'
                    ? 'rounded-tr-md bg-ink-900 text-white'
                    : 'rounded-tl-md border border-clay/70 bg-cream/50 text-ink-800'
                }`}
              >
                {m.role === 'user' ? (
                  <p className="text-[13px] leading-relaxed">{m.content}</p>
                ) : m.content === '' ? (
                  <div className="flex items-center gap-1 py-1">
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-500/50"
                        style={{ animationDelay: `${i * 120}ms` }}
                      />
                    ))}
                  </div>
                ) : (
                  <>
                    <MarkdownLite text={m.content} />
                    {m.engine && (
                      <p className="mt-2 text-[9px] uppercase tracking-[0.12em] text-ink-500/60">
                        {m.engine === 'llm' ? '由大模型生成' : '本地营养引擎'}
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
          <div ref={endRef} />
        </div>

        <div className="border-t border-clay/70 px-3 pb-3 pt-3 sm:px-4">
          <div className="hide-scrollbar mb-2.5 flex gap-1.5 overflow-x-auto">
            {QUICK_QUESTIONS.map((q) => (
              <button
                key={q}
                onClick={() => send(q)}
                disabled={pending}
                className="chip shrink-0 whitespace-nowrap"
              >
                {q}
              </button>
            ))}
          </div>
          <div className="flex items-end gap-2 rounded-2xl border border-clay bg-cream/40 p-2 focus-within:border-ink-900/25 focus-within:ring-4 focus-within:ring-lime-400/30">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  send()
                }
              }}
              rows={1}
              placeholder="问点什么，例如：晚上吃什么不容易饿？"
              className="max-h-28 min-h-[36px] flex-1 resize-none bg-transparent px-2 py-2 text-[13px] text-ink-900 outline-none placeholder:text-ink-500/50"
            />
            <button
              onClick={() => send()}
              disabled={pending || !draft.trim()}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-ink-900 text-lime-400 transition-all hover:bg-ink-800 disabled:opacity-30"
              aria-label="发送"
            >
              {pending ? <Loader2 size={15} className="animate-spin" /> : <ArrowUp size={16} />}
            </button>
          </div>
          <p className="mt-2 text-center text-[9.5px] text-ink-500/70">
            AI 可能出错，请结合实际情况判断 · 模型与密钥由服务端统一管理
          </p>
        </div>
      </div>
    </div>
  )
}
