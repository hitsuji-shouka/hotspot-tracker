// Real IKEA browsing with deterministic decisions: no model or image charges.
import assert from 'node:assert/strict'
import { writeFileSync } from 'node:fs'
import { shopWithLuna } from '../server-room-browser.mjs'
let frames = 0, bags = 0, calls = 0
let lastFrame = ''
const result = await shopWithLuna({ room: '书房', style: '原木', needs: '书籍收纳', budget: 8000 }, {
  key: 'unused', executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  onStep(event) {
    if (event.type === 'frame') { frames++; lastFrame = event.image }
    if (event.type === 'bag') { bags++; assert.ok(event.added.image); assert.equal(event.added.currency, 'CNY') }
    if (event.type === 'step') {
      console.log(event.message)
      if (event.message.includes('没完成') && lastFrame) writeFileSync('design/room-browser-debug.jpg', Buffer.from(lastFrame.split(',')[1], 'base64'))
    }
  },
  async call(path, body) {
    const state = JSON.parse(body.input[1].content)
    console.log(JSON.stringify({ step: ++calls, url: state.page.url, feedback: state.previousResult, products: state.bag.length }))
    assert.ok(calls <= 12, 'Browser did not complete the deterministic search/add flow')
    let action
    const query = state.bag.length ? 'FADO' : 'BILLY'
    if (state.bag.length >= 2) action = { action: 'finish' }
    else if (state.page.url.includes('/p/') && !state.bag.some(item => item.url === state.page.url)) {
      assert.equal(bags, state.bag.length, 'Opening a product must not add it')
      action = { action: 'add', reason: '真实页面验证：这件家具适合书房' }
    } else if (state.page.url.includes('/search/') && new URL(state.page.url).searchParams.get('q') === query) {
      const target = state.page.controls.find(item => item.href.includes('/p/') && item.label.includes(query))
      assert.ok(target, `Fresh search results must expose ${query}, not the previous search`)
      action = { action: 'click', index: target.index }
    } else action = { action: 'search', query }
    return { output: [{ type: 'function_call', name: 'browse', arguments: JSON.stringify({ index: -1, query: '', reason: '', ...action }) }] }
  },
})
assert.equal(result.products.length, 2)
assert.equal(bags, 2)
assert.ok(frames > 10, 'Expected continuous browser frames')
assert.equal(result.products[0].quantity, 1)
assert.ok(result.products[0].name.includes('BILLY'))
assert.ok(result.products[1].name.includes('FADO'))
assert.ok(result.products[0].price > 0)
console.log(JSON.stringify({ passed: true, frames, modelCalls: 0, products: result.products, metrics: result.metrics }, null, 2))
