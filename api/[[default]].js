import { createHandler } from './core.js'

// IGA Pages Serverless Function 适配层：环境变量来自 process.env。
const handle = createHandler(() => process.env)

export default {
  fetch(request) {
    return handle(request)
  },
}
