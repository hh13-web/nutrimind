#!/usr/bin/env node
/**
 * 知膳 NutriMind 后端服务
 * - 账号注册 / 登录（scrypt 加盐哈希 + HMAC 签名令牌）
 * - AI 引擎代理（密钥只保存在服务端环境变量，不下发到浏览器）
 * - 托管 dist 静态资源（SPA 回退到 index.html）
 *
 * 仅依赖 Node.js 内置模块，兼容 Node.js 20+。
 */
import http from 'node:http'
import {
  createReadStream,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const STATIC_DIR = process.env.STATIC_DIR ? path.resolve(process.env.STATIC_DIR) : path.join(ROOT, 'dist')
const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(ROOT, 'data')
const USERS_FILE = path.join(DATA_DIR, 'users.json')

const PORT = Number(process.env.PORT) || 8000
const AI_BASE_URL = (process.env.AI_BASE_URL || '').trim().replace(/\/+$/, '')
const AI_API_KEY = (process.env.AI_API_KEY || '').trim()
const AI_MODEL = (process.env.AI_MODEL || '').trim()
const AUTH_SECRET = process.env.AUTH_SECRET || 'nutrimind-dev-secret-change-me'
const AI_READY = Boolean(AI_BASE_URL && AI_API_KEY && AI_MODEL)
const TOKEN_TTL = 7 * 24 * 3600 * 1000
const BODY_LIMIT = 12 * 1024 * 1024

// ─────────────────────────────────────────────
// 用户存储
// ─────────────────────────────────────────────
function loadUsers() {
  try {
    const list = JSON.parse(readFileSync(USERS_FILE, 'utf8'))
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

function saveUsers() {
  mkdirSync(DATA_DIR, { recursive: true })
  const tmp = `${USERS_FILE}.${process.pid}.tmp`
  writeFileSync(tmp, JSON.stringify(users, null, 2))
  renameSync(tmp, USERS_FILE)
}

let users = loadUsers()

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

// ─────────────────────────────────────────────
// 令牌
// ─────────────────────────────────────────────
function signToken(user) {
  const payload = Buffer.from(
    JSON.stringify({
      sub: user.id,
      email: user.email,
      name: user.name,
      exp: Date.now() + TOKEN_TTL,
    }),
  ).toString('base64url')
  const sig = createHmac('sha256', AUTH_SECRET).update(payload).digest('base64url')
  return `${payload}.${sig}`
}

function verifyToken(token) {
  if (!token || !token.includes('.')) return null
  const [payload, sig] = token.split('.')
  const expected = createHmac('sha256', AUTH_SECRET).update(payload).digest('base64url')
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    if (!data.exp || data.exp < Date.now()) return null
    return data
  } catch {
    return null
  }
}

function authUser(req) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : ''
  const data = verifyToken(token)
  if (!data) return null
  return users.find((u) => u.id === data.sub) || null
}

const publicUser = (u) => ({ id: u.id, email: u.email, name: u.name })

// ─────────────────────────────────────────────
// HTTP 工具
// ─────────────────────────────────────────────
function sendJSON(res, status, data) {
  if (res.headersSent) return res.end()
  const body = JSON.stringify(data)
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  })
  res.end(body)
}

function readBody(req, limit = BODY_LIMIT) {
  return new Promise((resolve, reject) => {
    let size = 0
    const chunks = []
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > limit) {
        reject(new Error('请求体过大'))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

async function readJSON(req) {
  const raw = await readBody(req)
  if (!raw) return {}
  return JSON.parse(raw)
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// ─────────────────────────────────────────────
// 认证接口
// ─────────────────────────────────────────────
async function handleRegister(req, res) {
  let body
  try {
    body = await readJSON(req)
  } catch {
    return sendJSON(res, 400, { error: '请求格式不正确' })
  }

  const email = String(body.email || '').trim().toLowerCase()
  const password = String(body.password || '')
  const name = String(body.name || '').trim().slice(0, 20)

  if (!EMAIL_RE.test(email)) return sendJSON(res, 400, { error: '请输入正确的邮箱地址' })
  if (password.length < 6) return sendJSON(res, 400, { error: '密码至少 6 位' })
  if (password.length > 72) return sendJSON(res, 400, { error: '密码过长' })
  if (!name) return sendJSON(res, 400, { error: '请填写你的称呼' })
  if (users.some((u) => u.email === email)) {
    return sendJSON(res, 409, { error: '该邮箱已注册，请直接登录' })
  }

  const { salt, hash } = hashPassword(password)
  const user = {
    id: randomBytes(8).toString('hex'),
    email,
    name,
    salt,
    hash,
    createdAt: Date.now(),
  }
  users.push(user)
  saveUsers()
  return sendJSON(res, 201, { token: signToken(user), user: publicUser(user) })
}

async function handleLogin(req, res) {
  let body
  try {
    body = await readJSON(req)
  } catch {
    return sendJSON(res, 400, { error: '请求格式不正确' })
  }

  const email = String(body.email || '').trim().toLowerCase()
  const password = String(body.password || '')
  if (!email || !password) return sendJSON(res, 400, { error: '请输入邮箱和密码' })

  const user = users.find((u) => u.email === email)
  if (!user || !verifyPassword(password, user)) {
    return sendJSON(res, 401, { error: '邮箱或密码不正确' })
  }
  return sendJSON(res, 200, { token: signToken(user), user: publicUser(user) })
}

function handleMe(req, res) {
  const user = authUser(req)
  if (!user) return sendJSON(res, 401, { error: '登录已失效，请重新登录' })
  return sendJSON(res, 200, { user: publicUser(user) })
}

// ─────────────────────────────────────────────
// AI 代理（密钥仅存在于服务端）
// ─────────────────────────────────────────────
async function handleChat(req, res) {
  const user = authUser(req)
  if (!user) return sendJSON(res, 401, { error: '请先登录后再使用 AI 功能' })
  if (!AI_READY) return sendJSON(res, 503, { error: 'AI 引擎尚未在后端配置' })

  let body
  try {
    body = await readJSON(req)
  } catch {
    return sendJSON(res, 400, { error: '请求格式不正确' })
  }
  const messages = Array.isArray(body.messages) ? body.messages : []
  if (messages.length === 0) return sendJSON(res, 400, { error: '缺少对话内容' })

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
    return sendJSON(res, 502, {
      error: `AI 接口请求失败（${upstream.status}）${detail.slice(0, 160)}`,
    })
  }

  if (stream && upstream.body) {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    })
    const reader = upstream.body.getReader()
    try {
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        res.write(Buffer.from(value))
      }
    } catch {
      /* 客户端中断时忽略 */
    } finally {
      res.end()
    }
    return
  }

  const data = await upstream.json()
  const content = data?.choices?.[0]?.message?.content
  if (!content) return sendJSON(res, 502, { error: 'AI 接口返回内容为空' })
  return sendJSON(res, 200, { content })
}

// ─────────────────────────────────────────────
// API 路由
// ─────────────────────────────────────────────
async function handleApi(req, res, url) {
  const { pathname } = url

  if (pathname === '/api/health') return sendJSON(res, 200, { ok: true })
  if (pathname === '/api/ai/status') {
    return sendJSON(res, 200, { configured: AI_READY, model: AI_READY ? AI_MODEL : '' })
  }
  if (pathname === '/api/auth/register' && req.method === 'POST') return handleRegister(req, res)
  if (pathname === '/api/auth/login' && req.method === 'POST') return handleLogin(req, res)
  if (pathname === '/api/auth/me' && req.method === 'GET') return handleMe(req, res)
  if (pathname === '/api/ai/chat' && req.method === 'POST') return handleChat(req, res)

  return sendJSON(res, 404, { error: '接口不存在' })
}

// ─────────────────────────────────────────────
// 静态资源
// ─────────────────────────────────────────────
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
}

function serveStatic(req, res, url) {
  let pathname
  try {
    pathname = decodeURIComponent(url.pathname)
  } catch {
    res.writeHead(400)
    return res.end('Bad request')
  }

  const filePath = path.join(STATIC_DIR, pathname)
  if (!filePath.startsWith(STATIC_DIR)) {
    res.writeHead(403)
    return res.end('Forbidden')
  }

  let target = filePath
  const exists = existsSync(target) && statSync(target).isFile()
  if (!exists) {
    if (path.extname(pathname)) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
      return res.end('Not found')
    }
    target = path.join(STATIC_DIR, 'index.html')
  }

  if (!existsSync(target)) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
    return res.end('静态资源未构建，请先执行 npm run build')
  }

  const ext = path.extname(target).toLowerCase()
  const isAsset = target.includes(`${path.sep}assets${path.sep}`)
  res.writeHead(200, {
    'Content-Type': MIME[ext] || 'application/octet-stream',
    'Cache-Control': isAsset ? 'public, max-age=31536000, immutable' : 'no-cache',
    'X-Content-Type-Options': 'nosniff',
  })
  if (req.method === 'HEAD') return res.end()
  createReadStream(target).pipe(res)
}

// ─────────────────────────────────────────────
// 启动
// ─────────────────────────────────────────────
function ensureDemoUser() {
  const email = 'demo@nutrimind.app'
  if (users.some((u) => u.email === email)) return
  const { salt, hash } = hashPassword('demo1234')
  users.push({
    id: 'demo-user',
    email,
    name: '林小满',
    salt,
    hash,
    createdAt: Date.now(),
  })
  saveUsers()
}

ensureDemoUser()

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`)
  try {
    if (url.pathname.startsWith('/api/')) return await handleApi(req, res, url)
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { Allow: 'GET, HEAD' })
      return res.end('Method not allowed')
    }
    return serveStatic(req, res, url)
  } catch (err) {
    console.error('[知膳] 请求处理失败：', err)
    if (!res.headersSent) sendJSON(res, 500, { error: '服务器内部错误' })
  }
})

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[知膳] 服务已启动：http://0.0.0.0:${PORT}`)
  console.log(`[知膳] 静态目录：${STATIC_DIR}`)
  console.log(`[知膳] 用户数据：${USERS_FILE}`)
  console.log(`[知膳] AI 引擎：${AI_READY ? AI_MODEL : '未配置（前端将使用本地营养引擎）'}`)
})
