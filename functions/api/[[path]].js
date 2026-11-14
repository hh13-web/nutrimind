import { createHandler } from '../../api/core.js'

// Cloudflare Pages Functions 适配层：环境变量与 KV 绑定来自 env 参数。
export function onRequest({ request, env }) {
  return createHandler(() => env)(request)
}
