// 可移植的接口核心：不依赖 process、Buffer 或 node:crypto，
// 同一份逻辑可运行在 Node、IGA Pages 与 Cloudflare Pages Functions 上。

const TOKEN_TTL = 7 * 24 * 3600 * 1000
const BODY_LIMIT = 12 * 1024 * 1024
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PBKDF2_ITERATIONS = 2100
const DEMO_EMAIL = 'demo@nutrimind.app'
const DEMO_PASSWORD = 'demo1234'

const encoder = new TextEncoder()
const decoder = new TextDecoder()

function randomHex(bytes) {
  const buf = crypto.getRandomValues(new Uint8Array(bytes))
  return Array.from(buf, (b) => b.toString(16).padStart(2, '0')).join('')
}

function toBase64Url(bytes) {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(value) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4)
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return bytes
}

function safeEqual(a, b) {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

async function pbkdf2(password, salt) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, [
    'deriveBits',
  ])
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: encoder.encode(salt),
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    key,
    512,
  )
  return toBase64Url(new Uint8Array(bits))
}

async function hashPassword(password) {
  const salt = randomHex(16)
  return { salt, hash: await pbkdf2(password, salt) }
}

async function verifyPassword(password, user) {
  if (!user?.salt || !user?.hash) return false
  try {
    return safeEqual(await pbkdf2(password, user.salt), user.hash)
  } catch {
    return false
  }
}

async function signToken(user, secret) {
  const payload = toBase64Url(
    encoder.encode(
      JSON.stringify({
        sub: user.id,
        email: user.email,
        name: user.name,
        exp: Date.now() + TOKEN_TTL,
      }),
    ),
  )
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload))
  return `${payload}.${toBase64Url(new Uint8Array(signature))}`
}

async function verifyToken(token, secret) {
  if (!token || !token.includes('.')) return null
  const [payload, signature] = token.split('.')
  try {
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    )
    const expected = toBase64Url(
      new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(payload))),
    )
    if (!safeEqual(signature, expected)) return null
    const data = JSON.parse(decoder.decode(fromBase64Url(payload)))
    if (!data.exp || data.exp < Date.now()) return null
    return data
  } catch {
    return null
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

function readConfig(env) {
  const get = (key) => (typeof env?.[key] === 'string' ? env[key].trim() : '')
  const baseUrl = get('AI_BASE_URL').replace(/\/+$/, '')
  const apiKey = get('AI_API_KEY')
  const model = get('AI_MODEL')
  return {
    baseUrl,
    apiKey,
    model,
    secret: get('AUTH_SECRET') || 'nutrimind-dev-secret-change-me',
    ready: Boolean(baseUrl && apiKey && model),
  }
}

// 有 KV 绑定时写入持久存储；没有时退回实例内存，与原有 IGA 行为一致。
const memoryUsers = new Map()

function createUserStore(env) {
  const kv = env?.USERS && typeof env.USERS.get === 'function' ? env.USERS : null

  if (!kv) {
    return {
      async getByEmail(email) {
        return memoryUsers.get(`email:${email}`) || null
      },
      async getById(id) {
        return memoryUsers.get(`user:${id}`) || null
      },
      async put(user) {
        memoryUsers.set(`email:${user.email}`, user)
        memoryUsers.set(`user:${user.id}`, user)
      },
    }
  }

  const read = async (key) => {
    const raw = await kv.get(key)
    if (!raw) return null
    try {
      return JSON.parse(raw)
    } catch {
      return null
    }
  }

  return {
    getByEmail: (email) => read(`email:${email}`),
    getById: (id) => read(`user:${id}`),
    async put(user) {
      await Promise.all([
        kv.put(`email:${user.email}`, JSON.stringify(user)),
        kv.put(`user:${user.id}`, JSON.stringify(user)),
      ])
    },
  }
}

const publicUser = (user) => ({ id: user.id, email: user.email, name: user.name })

async function seedDemoUser(store) {
  const existing = await store.getByEmail(DEMO_EMAIL)
  if (existing) return existing
  const demo = {
    id: 'demo-user',
    email: DEMO_EMAIL,
    name: '林小满',
    ...(await hashPassword(DEMO_PASSWORD)),
    createdAt: Date.now(),
  }
  await store.put(demo)
  return demo
}

async function authUser(request, config, store) {
  const header = request.headers.get('authorization') || ''
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : ''
  const data = await verifyToken(token, config.secret)
  if (!data?.sub) return null
  return (
    (await store.getById(data.sub)) || {
      id: data.sub,
      email: data.email,
      name: data.name,
    }
  )
}

export function createHandler(getEnv = () => ({})) {
  return async function handle(request) {
    const env = getEnv()
    const config = readConfig(env)
    const store = createUserStore(env)

    const respond = async () => {
      const url = new URL(request.url)
      const pathname = url.pathname.replace(/\/+$/, '') || '/'
      const route = pathname.startsWith('/api') ? pathname.slice(4) || '/' : pathname

      if (route === '/health' && request.method === 'GET') return json({ ok: true })
      if (route === '/ai/status' && request.method === 'GET') {
        return json({ configured: config.ready, model: config.ready ? config.model : '' })
      }

      if (route === '/auth/register' && request.method === 'POST') {
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
        if (await store.getByEmail(email)) {
          return json({ error: '该邮箱已注册，请直接登录' }, 409)
        }

        const user = {
          id: randomHex(8),
          email,
          name,
          ...(await hashPassword(password)),
          createdAt: Date.now(),
        }
        await store.put(user)
        return json({ token: await signToken(user, config.secret), user: publicUser(user) }, 201)
      }

      if (route === '/auth/login' && request.method === 'POST') {
        let body
        try {
          body = await readJSON(request)
        } catch {
          return json({ error: '请求格式不正确' }, 400)
        }

        const email = String(body.email || '').trim().toLowerCase()
        const password = String(body.password || '')
        if (!email || !password) return json({ error: '请输入邮箱和密码' }, 400)

        let user = await store.getByEmail(email)
        if (!user && email === DEMO_EMAIL) user = await seedDemoUser(store)
        if (!user || !(await verifyPassword(password, user))) {
          return json({ error: '邮箱或密码不正确' }, 401)
        }
        return json({ token: await signToken(user, config.secret), user: publicUser(user) })
      }

      if (route === '/auth/me' && request.method === 'GET') {
        const user = await authUser(request, config, store)
        if (!user) return json({ error: '登录已失效，请重新登录' }, 401)
        return json({ user: publicUser(user) })
      }

      if (route === '/ai/chat' && request.method === 'POST') {
        const user = await authUser(request, config, store)
        if (!user) return json({ error: '请先登录后再使用 AI 功能' }, 401)
        if (!config.ready) return json({ error: 'AI 引擎尚未在后端配置' }, 503)

        let body
        try {
          body = await readJSON(request)
        } catch {
          return json({ error: '请求格式不正确' }, 400)
        }
        const messages = Array.isArray(body.messages) ? body.messages : []
        if (messages.length === 0) return json({ error: '缺少对话内容' }, 400)

        const stream = Boolean(body.stream)
        const upstream = await fetch(`${config.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${config.apiKey}`,
          },
          body: JSON.stringify({
            model: config.model,
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

      return json({ error: '接口不存在' }, 404)
    }

    try {
      return await respond()
    } catch (error) {
      console.error('[知膳] 请求处理失败：', error)
      return json({ error: '服务器内部错误' }, 500)
    }
  }
}
