import assert from 'node:assert/strict'
import { createRoomService, createRenderJobs, productUrl, validateBrief, verifiedProducts, readProductPhoto, prepareRoomImage } from '../server-room.mjs'
import { ikeaPage, readIkeaProduct, productImage } from '../server-room-browser.mjs'

const brief = { room: '客厅', style: '原木', needs: '看书和收纳', budget: 8000, duration: 150 }
assert.deepEqual(validateBrief(brief), brief)
assert.equal(validateBrief({ ...brief, duration: undefined }).duration, 150)
for (const duration of [0, 29, 601, -1, 90.5, '150', NaN, Infinity]) assert.equal(validateBrief({ ...brief, duration }), null)
for (const duration of [30, 90, 600]) assert.equal(validateBrief({ ...brief, duration }).duration, duration)
assert.equal(validateBrief({ ...brief, budget: -1 }), null)
assert.equal(productUrl('https://www.ikea.cn/cn/zh/p/example?tracking=1'), 'https://www.ikea.cn/cn/zh/p/example')
assert.equal(productUrl('http://www.ikea.cn/cn/zh/p/example'), null)
assert.equal(productUrl('https://ikea.cn.evil.test/p/1'), null)
assert.equal(productUrl('https://www.ikea.cn/cn/zh/cat/sha-fa/'), null)
assert.equal(ikeaPage('https://www.ikea.cn/cn/zh/'), true)
assert.equal(ikeaPage('https://ikea.cn.evil.test/cn/zh/'), false)
assert.equal(readIkeaProduct({ url: 'https://www.ikea.cn/cn/zh/p/test/', name: '测试椅', scripts: [JSON.stringify({ '@type': 'Product', name: '测试椅', offers: { price: '499' } })] }).price, 499)
assert.equal(readIkeaProduct({ url: 'https://www.ikea.cn/cn/zh/p/test/', name: '测试椅', scripts: [] }), null)
assert.equal(productImage('https://file.app.ikea.cn/cn/zh/images/products/test.jpg'), 'https://file.app.ikea.cn/cn/zh/images/products/test.jpg')
assert.equal(productImage('https://file.app.ikea.cn.evil.test/test.jpg'), '')
assert.equal(productImage('http://127.0.0.1/image.jpg'), '')
const item = readIkeaProduct({ url: 'https://www.ikea.cn/cn/zh/p/test/?tracking=123', name: '测试椅', priceText: '¥1,299.50', image: 'https://file.app.ikea.cn/test.jpg', description: '绿色，实木' })
assert.equal(item.price, 1299.5)
assert.equal(item.quantity, 1)
assert.equal(item.currency, 'CNY')
assert.equal(item.url, 'https://www.ikea.cn/cn/zh/p/test/')
assert.equal(item.description, '绿色，实木')
assert.equal(readIkeaProduct({ url: item.url, name: 'IVAR 伊娃', priceText: '¥750', scripts: [JSON.stringify({ '@type': 'Product', name: '宜家家居官网', offers: { price: 700 } })] }).name, 'IVAR 伊娃')
assert.equal(readIkeaProduct({ url: item.url, name: 'IVAR 伊娃', priceText: '¥750', scripts: [JSON.stringify({ '@type': 'Product', name: '宜家家居官网', offers: { price: 700 } })] }).price, 750)

const source = 'https://www.ikea.cn/cn/zh/p/test-123/'
const result = { output: [
  { type: 'web_search_call', action: { sources: [{ url: source }] } },
  { type: 'message', content: [{ type: 'output_text', text: JSON.stringify({ products: [
    { name: '真商品', type: '沙发', price: 2999, url: source, reason: '适合阅读' },
    { name: '无来源商品', type: '灯', price: 200, url: 'https://www.ikea.cn/cn/zh/p/unknown/', reason: '无' },
    { name: '外站商品', type: '柜', price: 500, url: 'https://evil.test/p/1', reason: '无' },
  ] }) }] },
] }
assert.equal(verifiedProducts(result).length, 1)

let calls = 0
const service = createRoomService({ ROOM_ENABLED: '1', OPENAI_API_KEY: 'test' }, async (path, body) => {
  calls++
  assert.equal(path, 'responses')
  assert.equal(body.model, 'gpt-6-luna')
  return result
})
assert.equal((await service.plan('visitor', brief)).products.length, 1)
assert.equal((await service.plan('visitor', brief)).products.length, 1)
await assert.rejects(service.plan('visitor', brief), { status: 429 })
assert.equal(calls, 2)
const exempt = createRoomService({ ROOM_ENABLED: '1', OPENAI_API_KEY: 'test', ROOM_QUOTA_EXEMPT_IPS: '203.0.113.7' }, async () => result)
for (let index = 0; index < 32; index++) await exempt.plan('203.0.113.7', brief)
for (let index = 0; index < 2; index++) await exempt.plan('visitor', brief)
await assert.rejects(exempt.plan('visitor', brief), { status: 429 })
await assert.rejects(service.render('visitor', { runId: 'invented', products: [item] }), { status: 400 })
assert.equal(calls, 2, 'Unverified render requests must not spend a model call')
assert.equal(createRoomService({}).configured, false)
assert.equal(createRoomService({ ROOM_ENABLED: '1', OPENAI_API_KEY: 'test', ROOM_BROWSER_EXECUTABLE: process.execPath }).browserReady, true)
const runId = '00000000-0000-4000-8000-000000000001'
let resolveImage, renderCalls = 0
const jobs = createRenderJobs(async () => { renderCalls++; return await new Promise(resolve => { resolveImage = resolve }) })
assert.deepEqual(jobs.start('visitor', runId), { status: 'pending' })
assert.deepEqual(jobs.start('visitor', runId), { status: 'pending' })
await new Promise(resolve => setImmediate(resolve))
assert.equal(renderCalls, 1, 'Polling or duplicate clicks must not submit a second paid request')
resolveImage({ image: 'data:image/png;base64,iVBORw==' })
await new Promise(resolve => setImmediate(resolve))
assert.deepEqual(jobs.status(runId), { status: 'done', image: `/api/room/image?runId=${runId}` })
assert.deepEqual([...jobs.image(runId)], [137, 80, 78, 71])
await assert.rejects(Promise.resolve().then(() => jobs.status('missing')), { status: 404 })
let failedCalls = 0
const uncertain = createRenderJobs(async () => { failedCalls++; throw new Error('provider timeout') })
assert.deepEqual(uncertain.start('visitor', runId), { status: 'pending' })
await new Promise(resolve => setImmediate(resolve))
assert.equal(uncertain.status(runId).retryable, false)
assert.equal(uncertain.start('visitor', runId).status, 'error')
assert.equal(failedCalls, 1, 'An uncertain generation must never be submitted again')
const relay = createRoomService({ ROOM_ENABLED: '1', ROOM_API_KEY: 'test', ROOM_API_BASE_URL: 'https://api.aicode007.com', ROOM_TEXT_MODEL: 'gpt-5.6-luna' }, async (path, body, key, timeout, baseUrl) => {
  assert.equal(path, 'responses')
  assert.equal(body.model, 'gpt-5.6-luna')
  assert.equal(key, 'test')
  assert.equal(baseUrl, 'https://api.aicode007.com')
  return result
})
assert.equal((await relay.plan('relay-visitor', brief)).products.length, 1)
const originalFetch = globalThis.fetch
try {
  let imageCalls = 0
  const image = () => new Response(new Uint8Array([137, 80, 78, 71]), { headers: { 'content-type': 'image/png' } })
  globalThis.fetch = async () => { if (++imageCalls === 1) throw new TypeError('network failure'); return image() }
  assert.equal((await readProductPhoto(item)).size, 4)
  assert.equal(imageCalls, 2, 'A transient photo failure gets one retry, without calling a model')
  imageCalls = 0
  globalThis.fetch = async () => ++imageCalls === 1 ? new Response(null, { status: 302, headers: { location: 'https://file.app.ikea.cn/redirected.png' } }) : image()
  assert.equal((await readProductPhoto(item)).type, 'image/png')
  imageCalls = 0
  globalThis.fetch = async () => { imageCalls++; return new Response(null, { status: 302, headers: { location: 'http://127.0.0.1/private' } }) }
  await assert.rejects(readProductPhoto(item), /跳转地址/)
  assert.equal(imageCalls, 1, 'Never follow a redirect outside the image allowlist')
  globalThis.fetch = async () => new Response('<html>error</html>', { headers: { 'content-type': 'text/html' } })
  await assert.rejects(readProductPhoto(item), /格式/)
  globalThis.fetch = async () => new Response(new Uint8Array(4_000_001), { headers: { 'content-type': 'image/png' } })
  await assert.rejects(readProductPhoto(item), /4 MB/)
  const photos = new Map(), imageCounts = new Map()
  const lamp = { ...item, name: '测试灯', image: 'https://file.app.ikea.cn/lamp.png' }
  let lampOffline = true
  globalThis.fetch = async url => {
    imageCounts.set(url, (imageCounts.get(url) || 0) + 1)
    if (url === lamp.image && lampOffline) throw new TypeError('network failure')
    return image()
  }
  await assert.rejects(prepareRoomImage(brief, [item, lamp], photos), /测试灯.*网络连接中断/)
  assert.equal(photos.size, 1, 'A failed batch retains the successfully downloaded reference')
  lampOffline = false
  const form = await prepareRoomImage(brief, [item, lamp], photos)
  assert.equal(imageCounts.get(item.image), 1, 'Retry downloads only missing photos')
  assert.equal(form.getAll('image[]').length, 2)
  assert.match(form.get('prompt'), /1\. 测试椅[\s\S]+2\. 测试灯/)
  assert.equal(form.get('n'), '1')
} finally { globalThis.fetch = originalFetch }
console.log('room checks passed')
