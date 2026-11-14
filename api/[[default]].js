import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'

const AI_BASE_URL = (process.env.AI_BASE_URL || '').trim().replace(/\/+$/, '')
const AI_API_KEY = (process.env.AI_API_KEY || '').trim()
const AI_MODEL = (process.env.AI_MODEL || '').trim()
const AUTH_SECRET = process.env.AUTH_SECRET || 'nutrimind-dev-secret-change-me'
const AI_READY = Boolean(AI_BASE_URL && AI_API_KEY && AI_MODEL)
const TOKEN_TTL = 7 * 24 * 3600 * 1000
const BODY_LIMIT = 12 * 1024 * 1024
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function hashPassword(password, salt = randomBytes(16).toString('hex')) {
  return { salt, hash: scryptSync(password, salt, 64).toString('hex') }
}

function verifyPassword(password, user) {
  try {
    const actual = scryptSync(password, user.salt, 64)
    const stored = Buffer.from(user.hash, 'hex')
    return actual.length === stored.length && timingSafeEqual(actual, stored)
  } catch {
    return false
  }
}

// Serverless 实例间不共享磁盘；注册用户保存在当前实例内存中，登录令牌本身为无状态令牌。
const users = [
  {
    id: 'demo-user',
    email: 'demo@nutrimind.app',
    name: '林小满',
    ...hashPassword('demo1234'),
    createdAt: Date.now(),
  },
]

const publicUser = (user) => ({ id: user.id, email: user.email, name: user.name })

function signToken(user) {
  const payload = Buffer.from(
    JSON.stringify({
      sub: user.id,
      email: user.email,
      name: user.name,
      exp: Date.now() + TOKEN_TTL,
    }),
  ).toString('base64url')
  const signature = createHmac('sha256', AUTH_SECRET).update(payload).digest('base64url')
  return `${payload}.${signature}`
}

function verifyToken(token) {
  if (!token || !token.includes('.')) return null
  const [payload, signature] = token.split('.')
  const expected = createHmac('sha256', AUTH_SECRET).update(payload).digest('base64url')
  const actualBuffer = Buffer.from(signature)
  const expectedBuffer = Buffer.from(expected)
  if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) {
    return null
  }
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    if (!data.exp || data.exp < Date.now()) return null
    return data
  } catch {
    return null
  }
}

function authUser(request) {
  const header = request.headers.get('authorization') || ''
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : ''
  const data = verifyToken(token)
  if (!data?.sub) return null
  return users.find((user) => user.id === data.sub) || {
    id: data.sub,
    email: data.email,
    name: data.name,
  }
}

function json(data, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}

async function readJSON(request) {
  const raw = await request.text()
  if (raw.length > BODY_LIMIT) throw new Error('请求体过大')
  return raw ? JSON.parse(raw) : {}
}

async function handleRegister(request) {
  let body
  try {
    body = await readJSON(request)
  } catch {
    return json({ error: '请求格式不正确' }, 400)
  }

  const email = String(body.email || '').trim().toLowerCase()
  const password = String(body.password || '')
  const name = String(body.name || '').trim().slice(0, 20)

  if (!EMAIL_RE.test(email)) return json({ error: '请输入正确的邮箱地址' }, 400)
  if (password.length < 6) return json({ error: '密码至少 6 位' }, 400)
  if (password.length > 72) return json({ error: '密码过长' }, 400)
  if (!name) return json({ error: '请填写你的称呼' }, 400)
  if (users.some((user) => user.email === email)) {
    return json({ error: '该邮箱已注册，请直接登录' }, 409)
  }

  const user = {
    id: randomBytes(8).toString('hex'),
    email,
    name,
    ...hashPassword(password),
    createdAt: Date.now(),
  }
  users.push(user)
  return json({ token: signToken(user), user: publicUser(user) }, 201)
}

async function handleLogin(request) {
  let body
  try {
    body = await readJSON(request)
  } catch {
    return json({ error: '请求格式不正确' }, 400)
  }

  const email = String(body.email || '').trim().toLowerCase()
  const password = String(body.password || '')
  if (!email || !password) return json({ error: '请输入邮箱和密码' }, 400)

  const user = users.find((item) => item.email === email)
  if (!user || !verifyPassword(password, user)) {
    return json({ error: '邮箱或密码不正确' }, 401)
  }
  return json({ token: signToken(user), user: publicUser(user) })
}

function handleMe(request) {
  const user = authUser(request)
  if (!user) return json({ error: '登录已失效，请重新登录' }, 401)
  return json({ user: publicUser(user) })
}

async function handleChat(request) {
  const user = authUser(request)
  if (!user) return json({ error: '请先登录后再使用 AI 功能' }, 401)
  if (!AI_READY) return json({ error: 'AI 引擎尚未在后端配置' }, 503)

  let body
  try {
    body = await readJSON(request)
  } catch {
    return json({ error: '请求格式不正确' }, 400)
  }
  const messages = Array.isArray(body.messages) ? body.messages : []
  if (messages.length === 0) return json({ error: '缺少对话内容' }, 400)

  const stream = Boolean(body.stream)
  const upstream = await fetch(`${AI_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${AI_API_KEY}`,
    },
    body: JSON.stringify({
      model: AI_MODEL,
      messages,
      temperature: typeof body.temperature === 'number' ? body.temperature : 0.5,
      max_tokens: Number(body.max_tokens) || 1200,
      stream,
    }),
  })

  if (!upstream.ok) {
    const detail = await upstream.text().catch(() => '')
    return json({ error: `AI 接口请求失败（${upstream.status}）${detail.slice(0, 160)}` }, 502)
  }

  if (stream && upstream.body) {
    return new Response(upstream.body, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'X-Accel-Buffering': 'no',
      },
    })
  }

  const data = await upstream.json()
  const content = data?.choices?.[0]?.message?.content
  if (!content) return json({ error: 'AI 接口返回内容为空' }, 502)
  return json({ content })
}

export default {
  async fetch(request) {
    try {
      const url = new URL(request.url)
      const pathname = url.pathname.replace(/\/+$/, '') || '/'
      const route = pathname.startsWith('/api') ? pathname.slice(4) || '/' : pathname

      if (route === '/health' && request.method === 'GET') return json({ ok: true })
      if (route === '/ai/status' && request.method === 'GET') {
        return json({ configured: AI_READY, model: AI_READY ? AI_MODEL : '' })
      }
      if (route === '/auth/register' && request.method === 'POST') return handleRegister(request)
      if (route === '/auth/login' && request.method === 'POST') return handleLogin(request)
      if (route === '/auth/me' && request.method === 'GET') return handleMe(request)
      if (route === '/ai/chat' && request.method === 'POST') return handleChat(request)

      return json({ error: '接口不存在' }, 404)
    } catch (error) {
      console.error('[知膳] 请求处理失败：', error)
      return json({ error: '服务器内部错误' }, 500)
    }
  },
}
