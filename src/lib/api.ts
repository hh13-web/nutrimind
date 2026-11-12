// 与后端服务通信：登录会话、AI 状态与 AI 代理

export interface AuthUser {
  id: string
  email: string
  name: string
}

export interface ServerAIStatus {
  configured: boolean
  model: string
}

export interface ChatPayloadMessage {
  role: string
  content: unknown
}

const TOKEN_KEY = 'nourish.token'
const USER_KEY = 'nourish.user'

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function getSessionUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY)
    if (!raw) return null
    const user = JSON.parse(raw) as AuthUser
    return user?.id ? user : null
  } catch {
    return null
  }
}

/** 当前数据命名空间：登录用户 id，未登录时为 guest */
export function currentUserId(): string {
  return getSessionUser()?.id || 'guest'
}

export function saveSession(token: string, user: AuthUser) {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers)
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
  const token = getToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)

  let res: Response
  try {
    res = await fetch(path, { ...init, headers })
  } catch {
    throw new Error('无法连接服务器，请确认后端服务已启动')
  }

  if (!res.ok) {
    let message = `请求失败（${res.status}）`
    try {
      const data = await res.json()
      if (data?.error) message = String(data.error)
    } catch {
      /* 忽略非 JSON 响应 */
    }
    throw new Error(message)
  }
  return res
}

async function readAuth(res: Response): Promise<{ token: string; user: AuthUser }> {
  const data = await res.json()
  if (!data?.token || !data?.user) throw new Error('登录响应异常')
  return { token: String(data.token), user: data.user as AuthUser }
}

export async function apiRegister(name: string, email: string, password: string) {
  const res = await apiFetch('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  })
  return readAuth(res)
}

export async function apiLogin(email: string, password: string) {
  const res = await apiFetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
  return readAuth(res)
}

export async function apiMe(): Promise<AuthUser> {
  const res = await apiFetch('/api/auth/me')
  const data = await res.json()
  if (!data?.user) throw new Error('登录状态异常')
  return data.user as AuthUser
}

export async function fetchAIStatus(): Promise<ServerAIStatus> {
  let res: Response
  try {
    res = await fetch('/api/ai/status')
  } catch {
    throw new Error('无法连接服务器')
  }
  if (!res.ok) throw new Error('AI 状态不可用')
  const data = await res.json()
  return { configured: Boolean(data?.configured), model: String(data?.model || '') }
}

export async function aiChat(
  messages: ChatPayloadMessage[],
  opts: { temperature?: number; max_tokens?: number } = {},
): Promise<string> {
  const res = await apiFetch('/api/ai/chat', {
    method: 'POST',
    body: JSON.stringify({ messages, ...opts }),
  })
  const data = await res.json()
  if (!data?.content) throw new Error('AI 接口返回内容为空')
  return String(data.content)
}

/** 流式对话：逐段回调 delta，返回完整文本 */
export async function aiChatStream(
  messages: ChatPayloadMessage[],
  opts: { temperature?: number; max_tokens?: number },
  onDelta: (delta: string) => void,
): Promise<string> {
  const headers = new Headers({ 'Content-Type': 'application/json' })
  const token = getToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)

  let res: Response
  try {
    res = await fetch('/api/ai/chat', {
      method: 'POST',
      headers,
      body: JSON.stringify({ messages, ...opts, stream: true }),
    })
  } catch {
    throw new Error('无法连接服务器')
  }
  if (!res.ok || !res.body) {
    let message = `对话接口异常（${res.status}）`
    try {
      const data = await res.json()
      if (data?.error) message = String(data.error)
    } catch {
      /* 忽略 */
    }
    throw new Error(message)
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let content = ''
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed.startsWith('data:')) continue
      const payload = trimmed.slice(5).trim()
      if (!payload || payload === '[DONE]') continue
      try {
        const json = JSON.parse(payload)
        const delta = json?.choices?.[0]?.delta?.content
        if (delta) {
          content += delta
          onDelta(delta)
        }
      } catch {
        /* 忽略不完整分片 */
      }
    }
  }
  if (!content.trim()) throw new Error('对话返回为空')
  return content
}
