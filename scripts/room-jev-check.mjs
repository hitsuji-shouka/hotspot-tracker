import assert from 'node:assert/strict'
import { jevActions, decideWithJev } from '../server-room-jev.mjs'
import { createRoomService } from '../server-room.mjs'

const url = 'https://www.ikea.cn/cn/zh/p/chair/'
const product = { url, name: '测试椅', price: 199, quantity: 1, image: 'https://file.app.ikea.cn/chair.jpg', type: '餐椅' }
const state = { brief: { room: '餐厅', needs: '原木餐椅', budget: 300 }, secondsLeft: 120, previousResult: '', products: [], history: [{ action: 'search', query: '餐椅' }], currentProduct: product,
  page: { url, title: '商品', text: '测试椅 ¥199', controls: [
    { index: 0, tag: 'a', href: '/cn/zh/p/lamp/', label: '灯' },
    { index: 1, tag: 'a', href: 'https://evil.test/p/lamp/', label: '外站' },
    { index: 2, tag: 'button', href: '', label: '加入购物袋' },
    { index: 3, tag: 'a', href: '/cn/zh/cart/', label: '结算' },
  ] } }
const actions = jevActions(state)
assert.equal(actions.get('add').category, '餐椅')
assert.ok(actions.has('click_0'))
assert.equal(jevActions({ ...state, history: [{ action: 'click', url: 'https://www.ikea.cn/cn/zh/p/lamp/' }] }).has('click_0'), false)
for (const id of ['click_1', 'click_2', 'click_3']) assert.equal(actions.has(id), false)
assert.equal(jevActions({ ...state, brief: { budget: 198 } }).has('add'), false)
assert.equal(jevActions({ ...state, currentProduct: { ...product, image: '' } }).has('add'), false)
assert.equal(jevActions({ ...state, products: [{ ...product, url: `${url}?tracking=1` }] }).has('add'), false)
assert.equal(jevActions({ ...state, products: [product], history: [] }).has('search_餐椅'), true)
assert.equal(actions.has('search_餐椅'), false, 'Do not repeat a recent search')
const searchActions = jevActions({ ...state, page: { ...state.page, url: 'https://www.ikea.cn/cn/zh/search/products/?q=餐椅' } })
assert.ok([...searchActions.values()].every(action => action.action !== 'search'), 'Inspect the fresh search results first')
const bottomActions = jevActions({ ...state, currentProduct: null, page: { url: 'https://www.ikea.cn/cn/zh/search/products/?q=餐椅', controls: [], canScroll: false } })
assert.equal(bottomActions.has('scroll'), false, 'Do not scroll indefinitely at the bottom')
assert.ok([...bottomActions.values()].some(action => action.action === 'search'), 'A fully inspected page must allow a new search')
assert.equal(actions.has('finish'), false, 'Keep searching until the deadline, not a model-selected item count')
let sentSignal
const action = await decideWithJev(state, { key: 'fixture-key', fetchImpl: async (endpoint, options) => {
  assert.equal(endpoint, 'https://api.typesafe.ai/v1/systemone')
  assert.equal(options.headers.Authorization, 'Bearer fixture-key')
  assert.equal(options.redirect, 'error')
  const body = JSON.parse(options.body)
  assert.equal(body.model, 'jev-latest')
  assert.equal(body.questions.next.type, 'choice')
  assert.ok(!options.body.includes('fixture-key'))
  assert.ok(body.questions.next.criteria.add)
  sentSignal = options.signal
  return Response.json({ answers: { next: { type: 'choice', choice: 'add', confidence: 0.8 } } })
} })
assert.equal(action.action, 'add')
assert.equal(action.confidence, 0.8)
assert.equal(sentSignal.aborted, false)
for (const choice of ['click_1', '__proto__', 'arbitrary', 'finish']) {
  await assert.rejects(decideWithJev(state, { key: 'fixture', fetchImpl: async () => Response.json({ answers: { next: { type: 'choice', choice } } }) }), /有效的浏览动作/)
}
for (const status of [401, 422, 429, 529]) {
  await assert.rejects(decideWithJev(state, { key: 'fixture', fetchImpl: async () => new Response('secret upstream response', { status }) }), error => {
    assert.ok(error.message.includes(String(status)))
    assert.ok(!error.message.includes('secret'))
    return true
  })
}
const controller = new AbortController()
controller.abort()
await assert.rejects(decideWithJev(state, { key: 'fixture', signal: controller.signal, fetchImpl: async (_url, options) => options.signal.throwIfAborted() }), { name: 'AbortError' })
const service = createRoomService({ ROOM_ENABLED: '1', JEV_API_KEY: 'fixture', ROOM_BROWSER_EXECUTABLE: process.execPath })
assert.equal(service.browserReady, true)
assert.equal(service.provider, 'jev')
assert.equal(service.renderAvailable, false)
await assert.rejects(service.plan('visitor', state.brief), { status: 503 })
await assert.rejects(service.render('visitor', {}), { status: 503, retryable: true })
assert.equal(createRoomService({ JEV_API_KEY: 'fixture', ROOM_BROWSER_EXECUTABLE: process.execPath }).browserReady, false)
console.log('Jev checks passed: grounded actions, budget, duplicates, API contract, safe failures, abort, Jev-only availability')
