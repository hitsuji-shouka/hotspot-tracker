import assert from 'node:assert/strict'
import { jevActions, decideWithJev, planSearchChoices, writeSearchText } from '../server-room-jev.mjs'
import { createRoomService } from '../server-room.mjs'

const url = 'https://www.ikea.cn/cn/zh/p/chair/'
const product = { url, name: '测试椅', price: 199, quantity: 1, image: 'https://file.app.ikea.cn/chair.jpg', type: '餐椅' }
const brief = { room: '客厅', style: '原木', needs: '想要绿植和收纳，不要沙发', budget: 8000, duration: 150 }
const state = { brief, secondsLeft: 120, previousResult: '', products: [], history: [], currentProduct: product,
  page: { url, title: '商品', text: '测试椅 ¥199', canScroll: true, controls: [
    { index: 0, tag: 'input', role: '', type: '', value: '', href: '', label: 'search' },
    { index: 1, tag: 'a', href: '/cn/zh/p/lamp/', label: '灯' },
    { index: 2, tag: 'a', href: 'https://evil.test/p/lamp/', label: '外站' },
    { index: 3, tag: 'button', href: '', label: '加入购物袋' },
    { index: 4, tag: 'a', href: '/cn/zh/cart/', label: '结算' },
  ] } }
const space = jevActions(state)
assert.deepEqual(Object.keys(space.targets.TYPE_TEXT), ['0'])
assert.deepEqual(Object.keys(space.targets.CLICK), ['1'])
assert.deepEqual(space.elements.map(item => item.operations[0]), ['TYPE_TEXT', 'CLICK'])
assert.ok(space.operations.ADD)
assert.ok(space.operations.SCROLL_DOWN)
assert.equal(space.operations.DONE, undefined, 'An empty bag cannot finish before trying to shop')
assert.equal(space.operations.BLOCKED, undefined, 'A first search must not end while targets remain')
assert.equal(jevActions({ ...state, history: [{ action: 'search', query: '绿植', result: '搜索了绿植' }] }).operations.BLOCKED, undefined)
assert.equal(jevActions({ ...state, history: [{ action: 'search', query: '绿植', result: '搜索了绿植' }, { action: 'search', query: '室内植物', result: '搜索了室内植物' }] }).operations.BLOCKED, undefined)
assert.ok(jevActions({ ...state, currentProduct: null, page: { ...state.page, controls: [], canScroll: false } }).operations.BLOCKED)
assert.ok(jevActions({ ...state, products: [product] }).operations.DONE)
assert.equal(jevActions({ ...state, brief: { ...brief, budget: 198 } }).operations.ADD, undefined)
assert.equal(jevActions({ ...state, currentProduct: { ...product, image: '' } }).operations.ADD, undefined)
assert.equal(jevActions({ ...state, products: [{ ...product, url: `${url}?tracking=1` }] }).operations.ADD, undefined)
assert.equal(Object.keys(jevActions({ ...state, history: [{ action: 'click', url: 'https://www.ikea.cn/cn/zh/p/lamp/' }] }).targets.CLICK).length, 0)
assert.equal(jevActions({ ...state, page: { ...state.page, canScroll: false } }).operations.SCROLL_DOWN, undefined)
assert.ok(!JSON.stringify(space).includes('search_沙发'), 'No preset furniture list')

const modelOutput = query => ({ output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify({ query }) }] }] })
const planned = await planSearchChoices(brief, { key: 'fixture', request: async (path, body, key) => {
  assert.equal(path, 'responses')
  assert.equal(body.text.format.name, 'room_search_choices')
  assert.equal(key, 'fixture')
  assert.match(body.input[1].content, /绿植和收纳/)
  return { output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify({ queries: ['绿植', '收纳柜', '沙发', '绿植', 'https://evil.test'] }) }] }] }
} })
assert.deepEqual(planned, ['绿植', '收纳柜'])
const query = await writeSearchText(state, { key: 'fixture', model: 'query-model', request: async (path, body, key) => {
  assert.equal(path, 'responses')
  assert.equal(body.model, 'query-model')
  assert.equal(body.text.format.name, 'room_search_text')
  assert.equal(key, 'fixture')
  assert.match(body.input[1].content, /绿植和收纳/)
  return modelOutput('绿植')
} })
assert.equal(query, '绿植')
for (const bad of ['沙发', 'https://evil.test', '绿植,茶几', '绿植']) {
  const prior = bad === '绿植' ? [{ action: 'search', query: '绿植' }] : []
  await assert.rejects(writeSearchText({ ...state, history: prior }, { request: async () => modelOutput(bad) }), /可用的新搜索词/)
}
await assert.rejects(writeSearchText(state, { request: async () => ({ output: [] }) }), /可用的新搜索词/)

const response = (operation, target) => Response.json({ answers: {
  operation: { type: 'choice', choice: operation, confidence: 0.9 },
  ...(target === undefined ? {} : { [`${operation.toLowerCase()}_target`]: { type: 'choice', choice: String(target) } }),
} })
let textCalls = 0
const candidateState = { ...state, searchCandidates: planned }
const selectedCandidate = await decideWithJev(candidateState, { key: 'fixture', text: async () => { textCalls++; return 'unexpected' }, fetchImpl: async (_endpoint, options) => {
  const body = JSON.parse(options.body)
  assert.ok(body.questions.operation.criteria.SEARCH)
  assert.equal(body.questions.operation.criteria.TYPE_TEXT, undefined)
  assert.match(JSON.stringify(body.questions.search_target.criteria), /绿植/)
  return response('SEARCH', 0)
} })
assert.equal(selectedCandidate.query, '绿植')
assert.equal(selectedCandidate.action, 'search')
assert.equal(selectedCandidate.planned, true)
assert.equal(textCalls, 0, 'Jev picks a planned term without another text call')
assert.ok(jevActions({ ...candidateState, history: [{ action: 'search', query: '绿植' }] }).operations.SEARCH)
const productWithoutSearch = jevActions({ ...candidateState, currentProduct: null, page: { ...state.page, controls: [], canScroll: false }, history: [{ action: 'search', query: '绿植' }, { action: 'click', url: state.page.url }] })
assert.ok(productWithoutSearch.operations.SEARCH, 'Continue planned search even when product page hides search input')
assert.equal(productWithoutSearch.operations.BLOCKED, undefined)
assert.equal(productWithoutSearch.targets.SEARCH['0'].index, -1)
assert.ok(jevActions({ ...candidateState, history: planned.map(query => ({ action: 'search', query })) }).operations.TYPE_TEXT)
const results = { ...candidateState, history: [{ action: 'search', query: '绿植', result: '搜索了绿植' }],
  page: { ...state.page, url: 'https://www.ikea.cn/cn/zh/search/products/?q=绿植' } }
assert.equal(jevActions(results).operations.SEARCH, undefined, 'Inspect visible results before another search')
assert.equal(jevActions(results).operations.TYPE_TEXT, undefined)
assert.ok(jevActions(results).operations.CLICK)
const chosenSearch = await decideWithJev(state, { key: 'fixture-key', text: async () => { textCalls++; return '绿植' }, fetchImpl: async (endpoint, options) => {
  assert.equal(endpoint, 'https://api.typesafe.ai/v1/systemone')
  assert.equal(options.headers.Authorization, 'Bearer fixture-key')
  assert.equal(options.redirect, 'error')
  const body = JSON.parse(options.body)
  assert.equal(body.model, 'jev-latest')
  assert.ok(body.questions.operation.criteria.TYPE_TEXT)
  assert.ok(body.questions.click_target.criteria['1'])
  assert.ok(body.questions.type_text_target.criteria['0'])
  assert.equal(body.state.elements.length, 2)
  assert.ok(!options.body.includes('fixture-key'))
  return response('TYPE_TEXT', 0)
} })
assert.equal(chosenSearch.action, 'search')
assert.equal(chosenSearch.query, '绿植')
assert.equal(chosenSearch.index, 0)
assert.equal(textCalls, 1)
const badText = async () => { throw Object.assign(new Error('没有生成可用的新搜索词，请稍后重试'), { status: 502 }) }
assert.equal((await decideWithJev(state, { key: 'fixture', text: badText, fetchImpl: async () => response('TYPE_TEXT', 0) })).action, 'blocked')
assert.equal((await decideWithJev({ ...state, products: [product] }, { key: 'fixture', text: badText, fetchImpl: async () => response('TYPE_TEXT', 0) })).action, 'finish')
const chosenClick = await decideWithJev(state, { key: 'fixture', text: async () => { textCalls++; return 'bad' }, fetchImpl: async () => response('CLICK', 1) })
assert.equal(chosenClick.action, 'click')
assert.equal(chosenClick.index, 1)
assert.equal(textCalls, 1, 'Only TYPE_TEXT calls the helper')
assert.equal((await decideWithJev(state, { key: 'fixture', fetchImpl: async () => response('ADD') })).action, 'add')
assert.equal((await decideWithJev({ ...state, products: [product] }, { key: 'fixture', fetchImpl: async () => response('DONE') })).action, 'finish')
for (const result of [response('CLICK', 2), response('CLICK', '__proto__'), response('TYPE_TEXT', 1), response('TYPE_TEXT', 'constructor'), response('DONE'), response('BLOCKED'), response('__proto__'), response('ARBITRARY')]) {
  await assert.rejects(decideWithJev(state, { key: 'fixture', fetchImpl: async () => result.clone() }), /有效的/)
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
assert.equal(service.browserReady, false, 'TYPE_TEXT needs a text model')
assert.equal(service.provider, 'jev')
assert.equal(service.renderAvailable, false)
await assert.rejects(service.plan('visitor', state.brief), { status: 503 })
await assert.rejects(service.render('visitor', {}), { status: 503, retryable: true })
assert.equal(createRoomService({ ROOM_ENABLED: '1', JEV_API_KEY: 'fixture', ROOM_API_KEY: 'helper', ROOM_BROWSER_EXECUTABLE: process.execPath }).browserReady, true)
console.log('Jev checks passed: dynamic operation/target heads, text helper, observed links, budget, API boundaries')
