// Exercises the Jev executor against real IKEA pages with deterministic choices; no paid model calls.
import assert from 'node:assert/strict'
import { shopWithLuna } from '../server-room-browser.mjs'

let calls = 0, frames = 0
const result = await shopWithLuna({ room: '书房', style: '原木', needs: '书籍收纳', budget: 8000, duration: 120 }, {
  key: 'unused', executablePath: process.env.ROOM_BROWSER_EXECUTABLE || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  onStep(event) { if (event.type === 'frame') frames++ },
  async decide(state) {
    calls++
    assert.ok(calls <= 10, 'Browser did not complete the observed search/open/add flow')
    if (state.products.length) return { action: 'finish' }
    if (state.page.url.includes('/p/')) return { action: 'add', reason: '当前详情页已核实' }
    if (new URL(state.page.url).searchParams.get('q') === 'BILLY') {
      const link = state.page.controls.find(item => item.tag === 'a' && item.href.includes('/p/') && item.label.includes('BILLY'))
      if (!link && state.page.canScroll) return { action: 'scroll' }
      assert.ok(link, 'Fresh results must expose a BILLY product')
      return { action: 'click', index: link.index }
    }
    const field = state.page.controls.find(item => item.tag === 'input' && /search|搜索/i.test(item.label))
    assert.ok(field, 'Search target must be observed on the current page')
    return { action: 'search', index: field.index, query: 'BILLY' }
  },
})
assert.equal(result.products.length, 1)
assert.ok(result.products[0].name.includes('BILLY'))
assert.ok(result.products[0].image)
assert.ok(frames > 0, 'Expected the live browser stream')
console.log(JSON.stringify({ passed: true, calls, frames, stopReason: result.stopReason }))
