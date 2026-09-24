import { randomUUID } from 'node:crypto'
import { existsSync } from 'node:fs'
import { isIP } from 'node:net'
import { shopWithLuna, productImage } from './server-room-browser.mjs'
import { decideWithJev } from './server-room-jev.mjs'

const STORES = ['ikea.cn', 'yeswood.com', 'item.jd.com']
const DAY = 24 * 60 * 60 * 1000

export function productUrl(value) {
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:' || url.username || url.password) return null
    if (!STORES.some(domain => url.hostname === domain || url.hostname.endsWith(`.${domain}`))) return null
    if (url.hostname.endsWith('ikea.cn') && !url.pathname.includes('/p/')) return null
    if (url.hostname === 'item.jd.com' && !/^\/\d+\.html$/.test(url.pathname)) return null
    if (url.hostname.endsWith('yeswood.com') && !/\/(product|goods|item)s?\//.test(url.pathname)) return null
    url.search = ''
    url.hash = ''
    return url.href
  } catch { return null }
}

function text(value, max) { return typeof value === 'string' ? value.trim().slice(0, max) : '' }
function amount(value) { return Number.isFinite(value) && value > 0 && value <= 1_000_000 ? value : null }

export async function readProductPhoto(item) {
  if (!productImage(item.image)) throw Object.assign(new Error(`${item.name}的参考图片缺失，清单已保留`), { status: 422 })
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      let url = item.image
      const signal = AbortSignal.timeout(30_000)
      for (let redirects = 0; redirects <= 3; redirects++) {
        const response = await fetch(url, { redirect: 'manual', signal })
        if ([301, 302, 303, 307, 308].includes(response.status)) {
          await response.body?.cancel()
          const next = new URL(response.headers.get('location') || '', url).href
          if (redirects === 3 || !productImage(next)) throw Object.assign(new Error('图片跳转地址不可用'), { status: 422 })
          url = next
          continue
        }
        const mime = response.headers.get('content-type')?.split(';')[0].trim()
        if (!response.ok) {
          await response.body?.cancel()
          throw Object.assign(new Error(`HTTP ${response.status}`), { transient: response.status >= 500 || response.status === 429 })
        }
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(mime) || !response.body) {
          await response.body?.cancel()
          throw Object.assign(new Error('图片格式不支持'), { status: 422 })
        }
        let length = 0
        const chunks = []
        for await (const chunk of response.body) {
          length += chunk.length
          if (length > 4_000_000) throw Object.assign(new Error('图片超过 4 MB'), { status: 422 })
          chunks.push(chunk)
        }
        if (!length) throw Object.assign(new Error('图片内容为空'), { status: 422 })
        return new Blob(chunks, { type: mime })
      }
    } catch (error) {
      const transient = error.name === 'TimeoutError' || error instanceof TypeError || error.transient
      if (attempt === 0 && transient) continue
      const reason = error.name === 'TimeoutError' ? '下载超时' : error instanceof TypeError ? '网络连接中断' : error.message
      throw Object.assign(new Error(`${item.name}的参考图读取失败（${reason}），清单已保留，可以重试`), { status: error.status || 502, retryable: true })
    }
  }
}

export async function prepareRoomImage(brief, products, photos = new Map()) {
  // Cache each successful download so one flaky photo does not restart the entire preparation.
  const loaded = await Promise.allSettled(products.map(async item => {
    if (!photos.has(item.image)) photos.set(item.image, await readProductPhoto(item))
    return photos.get(item.image)
  }))
  const failed = loaded.find(result => result.status === 'rejected')
  if (failed) throw failed.reason
  const form = new FormData()
  form.set('size', '1536x1024')
  form.set('quality', 'medium')
  form.set('n', '1')
  form.set('prompt', `根据这些真实商品参考照片布置一间${brief.room}，只生成一张完整的室内搭配概念效果图。风格：${brief.style}；需求：${brief.needs}。保持照片中的家具颜色、形态与材质，按清单数量放置，空间布局合理。每张参考图按以下清单顺序对应商品：${products.map((item, index) => `${index + 1}. ${item.name}；${item.description}；数量${item.quantity}；单价人民币${item.price}`).join('\n')}。不要添加文字、标志或购物界面。`)
  loaded.forEach(({ value }, index) => form.append('image[]', value, `product-${index + 1}.${value.type.split('/')[1]}`))
  return form
}

export function validateBrief(body) {
  const room = text(body?.room, 24)
  const style = text(body?.style, 120)
  const needs = text(body?.needs, 500)
  const budget = amount(body?.budget)
  const duration = body?.duration ?? 150
  if (!room || !style || !needs || !budget || !Number.isInteger(duration) || duration < 30 || duration > 600) return null
  return { room, style, needs, budget, duration }
}

export function verifiedProducts(response) {
  const sources = new Set(response.output?.filter(item => item.type === 'web_search_call')
    .flatMap(item => item.action?.sources ?? []).map(item => productUrl(item.url)).filter(Boolean))
  const raw = response.output?.filter(item => item.type === 'message')
    .flatMap(item => item.content ?? []).filter(item => item.type === 'output_text').map(item => item.text).join('') ?? ''
  let parsed
  try { parsed = JSON.parse(raw) } catch { return [] }
  if (!Array.isArray(parsed.products)) return []
  const seen = new Set()
  return parsed.products.flatMap(item => {
    const url = productUrl(item.url)
    const name = text(item.name, 100)
    const type = text(item.type, 30)
    const reason = text(item.reason, 180)
    const price = amount(item.price)
    if (!url || !sources.has(url) || seen.has(url) || !name || !type || !price) return []
    seen.add(url)
    return [{ id: randomUUID(), name, type, reason, price, url, store: new URL(url).hostname.includes('ikea.cn') ? '宜家' : new URL(url).hostname.includes('yeswood.com') ? '源氏木语' : '京东', checkedAt: new Date().toISOString() }]
  }).slice(0, 8)
}

export async function openai(path, body, key, timeout = 90_000, baseUrl = 'https://api.openai.com/v1', signal) {
  const multipart = body instanceof FormData
  const response = await fetch(`${baseUrl.replace(/\/+$/, '')}/${path}`, {
    method: 'POST', signal: AbortSignal.any([AbortSignal.timeout(timeout), ...(signal ? [signal] : [])]),
    headers: { Authorization: `Bearer ${key}`, ...(multipart ? {} : { 'Content-Type': 'application/json' }) },
    body: multipart ? body : JSON.stringify(body),
  })
  if (!response.ok) {
    // Return a safe, specific failure; never expose provider HTML, headers or credentials.
    const retryable = [400, 401, 403, 404, 413, 415, 422, 429].includes(response.status)
    const reason = ({ 400: '请求参数被拒绝', 401: 'API 密钥验证失败', 403: '当前密钥没有调用权限', 404: '接口或模型不可用', 413: '参考图片超过接口大小限制', 415: '接口不支持参考图片格式', 422: '请求参数或参考图片不受支持', 429: '调用额度或频率受限' })[response.status]
    const label = path.startsWith('images/') ? '生图接口' : 'AI 接口'
    throw Object.assign(new Error(`${label}${reason || '网关或上游服务异常'}（HTTP ${response.status}）。${retryable ? '清单已保留，修复后可重新提交。' : '未收到生成结果，请先核对服务商记录，避免重复扣费。'}`), { status: 502, retryable, upstreamStatus: response.status })
  }
  return response.json()
}

export function createRoomService(env = process.env, call = openai) {
  const apiKey = env.ROOM_API_KEY || env.OPENAI_API_KEY
  const jevKey = env.JEV_API_KEY || env.TYPESAFE_API_KEY
  const provider = jevKey ? 'jev' : 'luna'
  const configured = env.ROOM_ENABLED === '1' && !!(apiKey || jevKey)
  const renderAvailable = env.ROOM_ENABLED === '1' && !!apiKey
  const request = (path, body, key, timeout, signal) => call(path, body, key, timeout, env.ROOM_API_BASE_URL || 'https://api.openai.com/v1', signal)
  const browserReady = configured && !!env.ROOM_BROWSER_EXECUTABLE && existsSync(env.ROOM_BROWSER_EXECUTABLE)
  const quotaExemptIps = new Set(String(env.ROOM_QUOTA_EXEMPT_IPS || '').split(',').map(ip => ip.trim()).filter(ip => isIP(ip)))
  const quotas = new Map()
  const sessions = new Map()
  const global = { day: 0, plan: 0, render: 0 }
  let active = 0
  function useQuota(ip, kind) {
    const day = Math.floor(Date.now() / DAY)
    if (global.day !== day) { Object.assign(global, { day, plan: 0, render: 0 }); quotas.clear() }
    const row = quotas.get(ip) ?? { day, plan: 0, render: 0 }
    if (row.day !== day) Object.assign(row, { day, plan: 0, render: 0 })
    if (row[kind] >= (kind === 'plan' ? 2 : 1) || global[kind] >= (kind === 'plan' ? 30 : 10)) return false
    row[kind]++; global[kind]++; quotas.set(ip, row)
    return true
  }
  async function run(ip, kind, fn) {
    if (!configured) throw Object.assign(new Error('实验服务尚未开通'), { status: 503, retryable: kind === 'render' })
    if (active >= 3) throw Object.assign(new Error('当前实验较多，请稍后再试'), { status: 429, retryable: kind === 'render' })
    const charged = !quotaExemptIps.has(ip)
    if (charged && !useQuota(ip, kind)) throw Object.assign(new Error('今天的实验次数已用完，请明天再来'), { status: 429, retryable: kind === 'render' })
    active++
    const day = global.day
    try { return await fn() }
    catch (error) {
      // Only release image quota when no generation was submitted or it was explicitly rejected.
      if (charged && kind === 'render' && error.retryable === true && global.day === day) {
        global.render--; quotas.get(ip).render--
      }
      throw error
    } finally { active-- }
  }
  return {
    configured,
    browserReady,
    provider,
    renderAvailable,
    async play(ip, body, onStep, cancelled) {
      const brief = validateBrief(body)
      if (!brief) throw Object.assign(new Error('请填写布置想法、有效预算和 0.5–10 分钟的购物时间'), { status: 400 })
      if (!browserReady) throw Object.assign(new Error('逛店浏览器尚未开通'), { status: 503 })
      if (active > 0) throw Object.assign(new Error('当前有人正在逛店，请稍后再试'), { status: 429 })
      return run(ip, 'plan', async () => {
        for (const [id, record] of sessions) if (Date.now() - record.created > 60 * 60 * 1000) sessions.delete(id)
        const runId = randomUUID()
        const record = { brief, products: [], created: Date.now(), completed: false, attempted: false }
        sessions.set(runId, record)
        onStep({ type: 'session', runId, duration: brief.duration, startedAt: record.created })
        const result = await shopWithLuna(brief, {
          key: apiKey, model: env.ROOM_TEXT_MODEL || 'gpt-6-luna',
          executablePath: env.ROOM_BROWSER_EXECUTABLE, call: request, startedAt: record.created,
          decide: jevKey ? (state, timeout, signal) => decideWithJev(state, { key: jevKey, model: env.JEV_MODEL || 'jev-latest', timeout, signal }) : undefined,
          onStep: event => { if (event.type === 'bag') record.products = event.products; onStep(event) }, cancelled,
        })
        record.products = result.products
        record.completed = !cancelled()
        return { ...result, runId, provider }
      })
    },
    async plan(ip, body) {
      if (!renderAvailable) throw Object.assign(new Error('文字搜索服务尚未配置，请使用浏览器逛店'), { status: 503 })
      const brief = validateBrief(body)
      if (!brief) throw Object.assign(new Error('请填写房间、风格、需求和有效预算'), { status: 400 })
      return run(ip, 'plan', async () => {
        const response = await request('responses', {
          model: env.ROOM_TEXT_MODEL || 'gpt-6-luna', store: false,
          tools: [{ type: 'web_search', filters: { allowed_domains: STORES } }], tool_choice: 'required',
          include: ['web_search_call.action.sources'],
          text: { format: { type: 'json_schema', name: 'room_products', strict: true, schema: {
            type: 'object', additionalProperties: false, required: ['products'], properties: { products: { type: 'array', items: {
              type: 'object', additionalProperties: false, required: ['name', 'type', 'price', 'url', 'reason'],
              properties: { name: { type: 'string' }, type: { type: 'string' }, price: { type: 'number' }, url: { type: 'string' }, reason: { type: 'string' } },
            } } },
          } } },
          input: `你是家具选品助手。实际搜索宜家中国、源氏木语官网或京东商品页，为用户挑 3～8 件不同类别的家具。只给可以在搜索来源中核对的商品详情页，价格用人民币数字；找不到就少给，绝不编造链接或价格。预算是全部商品总额上限。用户需求：${JSON.stringify(brief)}`,
        }, apiKey)
        return { brief, products: verifiedProducts(response), searchedAt: new Date().toISOString() }
      })
    },
    async render(ip, body) {
      if (!renderAvailable) throw Object.assign(new Error('效果图服务尚未配置，选品清单仍然保留'), { status: 503, retryable: true })
      const record = sessions.get(body?.runId)
      if (!record || Date.now() - record.created > 60 * 60 * 1000 || !record.completed || !record.products.length) throw Object.assign(new Error('本轮逛店记录未完成或已失效；请先保存当前清单，再重新逛店'), { status: 400, retryable: true })
      if (record.image) return record.image
      if (record.rendering) throw Object.assign(new Error('效果图正在生成，请等待本次请求完成'), { status: 409, retryable: false })
      if (record.attempted) throw Object.assign(new Error('上次生图结果尚未确认，请先核对服务商记录，避免重复扣费'), { status: 409, retryable: false })
      const { brief, products } = record
      return run(ip, 'render', async () => {
        record.rendering = true
        let submitted = false
        try {
          record.photos ??= new Map()
          const form = await prepareRoomImage(brief, products, record.photos)
          form.set('model', env.ROOM_IMAGE_MODEL || 'gpt-image-2')
          record.attempted = true
          submitted = true
          const result = await request('images/edits', form, apiKey, 180_000)
          const base64 = result.data?.[0]?.b64_json
          if (typeof base64 !== 'string' || !/^[A-Za-z0-9+/=]+$/.test(base64) || base64.length > 15_000_000) throw Object.assign(new Error('生图接口未返回有效图片，请先核对服务商记录，清单已保留'), { status: 502 })
          record.image = { image: `data:image/png;base64,${base64}`, note: 'AI 概念效果图；商品尺寸、颜色和实物可能不同。' }
          return record.image
        } catch (error) {
          const retryable = !submitted || error.retryable === true
          if (retryable) record.attempted = false
          const message = error.status ? error.message : submitted
            ? '生图连接中断或等待超时，结果尚未确认，请先核对服务商记录，避免重复扣费'
            : '商品参考图片读取失败，清单已保留，可以重试'
          throw Object.assign(new Error(message), { status: error.status || 502, retryable })
        } finally { record.rendering = false }
      })
    },
  }
}

export function createRenderJobs(render) {
  const jobs = new Map()
  const get = runId => {
    for (const [id, job] of jobs) if (Date.now() - job.started > 60 * 60 * 1000) jobs.delete(id)
    const job = jobs.get(runId)
    if (!job) throw Object.assign(new Error('生成记录已失效，请保存清单后重新逛店'), { status: 404 })
    return job
  }
  const state = (runId, job) => job.status === 'done'
    ? { status: 'done', image: `/api/room/image?runId=${runId}` }
    : job.status === 'error' ? { status: 'error', error: job.error, retryable: job.retryable }
      : { status: 'pending' }
  return {
    start(ip, runId) {
      if (typeof runId !== 'string' || !/^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(runId)) {
        throw Object.assign(new Error('逛店记录无效'), { status: 400, retryable: true })
      }
      let job
      try { job = get(runId) } catch (error) { if (error.status !== 404) throw error }
      if (job && !(job.status === 'error' && job.retryable)) return state(runId, job)
      job = { status: 'pending', started: Date.now() }
      jobs.set(runId, job)
      Promise.resolve().then(() => render(ip, { runId })).then(result => {
        if (typeof result?.image !== 'string' || !result.image.startsWith('data:image/png;base64,')) throw new Error('生图接口未返回有效图片')
        job.image = result.image
        job.status = 'done'
      }).catch(error => {
        job.status = 'error'
        job.error = error.status ? error.message : '生图连接中断，结果尚未确认；请先核对服务商记录'
        job.retryable = error.retryable === true
      })
      return state(runId, job)
    },
    status(runId) { return state(runId, get(runId)) },
    image(runId) {
      const job = get(runId)
      if (job.status !== 'done') throw Object.assign(new Error('效果图尚未生成'), { status: 404 })
      return Buffer.from(job.image.slice('data:image/png;base64,'.length), 'base64')
    },
  }
}
