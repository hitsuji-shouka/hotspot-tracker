// Exercise the real browser runner against local fixtures, without merchant or model requests.
import assert from 'node:assert/strict'
import { chromium } from 'playwright-core'
import { shopWithLuna } from '../server-room-browser.mjs'
import { createRoomService, openai } from '../server-room.mjs'

const executablePath = process.env.ROOM_BROWSER_EXECUTABLE || 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const brief = { room: '客厅', style: '原木', needs: '收纳', budget: 8000, duration: 30 }
const launch = chromium.launch.bind(chromium)
let browser, stallPage = false, navigationStarted = false
chromium.launch = async options => {
  browser = await launch(options)
  const newContext = browser.newContext.bind(browser)
  browser.newContext = async options => {
    const context = await newContext(options)
    const newPage = context.newPage.bind(context)
    context.newPage = async () => {
      const page = await newPage()
      // Page routes take precedence over the runner's context allowlist.
      await page.route('**/*', async route => {
        navigationStarted = true
        if (stallPage) return // Keep navigation pending until the deadline closes the browser.
        if (route.request().url().endsWith('.png')) return route.fulfill({ contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aJVkAAAAASUVORK5CYII=', 'base64') })
        return route.fulfill({ contentType: 'text/html; charset=utf-8', body: `<input aria-label="search"><a href="/cn/zh/p/test-chair/">测试椅</a><a href="/cn/zh/p/test-lamp/">测试灯</a><a href="/cn/zh/p/test-shelf/">测试柜</a><div class="info"><h1 class="name">测试椅</h1><p class="des">原木</p><p class="i-product-price">¥199</p></div><img alt="gallery-image" src="https://file.app.ikea.cn/fixture.png" width="100" height="100">` })
      })
      return page
    }
    return context
  }
  return browser
}
const action = (action, index = -1) => ({ output: [{ type: 'function_call', name: 'browse', arguments: JSON.stringify({ action, index, query: '', reason: '符合目标' }) }] })
try {
  let calls = 0, signalAborted = false
  const bagEvents = []
  const began = Date.now()
  const result = await shopWithLuna(brief, {
    executablePath, startedAt: began - 18_000,
    onStep: event => { if (event.type === 'bag') bagEvents.push(event) },
    call: async (_path, body, _key, _timeout, signal) => {
      calls++
      if (calls === 1) {
        const { page } = JSON.parse(body.input[1].content)
        return action('click', page.controls.find(item => item.href.includes('/p/')).index)
      }
      if (calls === 2) return action('add')
      // Resolve with another add at the boundary: it must never execute.
      await new Promise(resolve => signal.addEventListener('abort', resolve, { once: true }))
      signalAborted = signal.aborted
      return action('add')
    },
  })
  assert.equal(calls, 3)
  assert.equal(signalAborted, true, 'Deadline must abort the in-flight model request')
  assert.equal(result.timedOut, true)
  assert.equal(result.elapsed, 30)
  assert.equal(result.products.length, 1, 'Keep the already selected product')
  assert.equal(bagEvents.length, 1, 'Never accept a late add')
  assert.equal(browser.isConnected(), false)
  assert.ok(Date.now() - began < 14_000, 'Must not wait for the usual model timeout')

  let recoveryCalls = 0
  const recovered = await shopWithLuna({ ...brief, duration: 60 }, {
    executablePath,
    call: async (_path, body) => {
      recoveryCalls++
      const state = JSON.parse(body.input[1].content)
      if (recoveryCalls === 1) throw new DOMException('Fixture timeout', 'TimeoutError')
      if (recoveryCalls === 2) {
        assert.match(state.previousResult, /超时/)
        return action('finish')
      }
      if (recoveryCalls === 3) assert.match(state.previousResult, /继续补齐/)
      if (state.bag.length === 3) return action('finish')
      if (state.page.url.includes('/p/') && !state.bag.some(item => item.url === state.page.url)) return action('add')
      return action('click', state.page.controls.find(item => item.href.includes('/p/') && !state.bag.some(product => product.url.endsWith(item.href))).index)
    },
  })
  assert.equal(recovered.products.length, 3, 'One slow response must not end the whole shopping session')
  assert.equal(recovered.stopReason, 'finished')
  assert.equal(recovered.metrics.modelTimeouts, 1)
  assert.equal(recovered.metrics.actionErrors, 0)
  assert.equal(recovered.metrics.modelCalls, recoveryCalls)

  // Exercise render state with a trusted shopping session; all model/image traffic is stubbed.
  const originalFetch = globalThis.fetch
  let renderCalls = 0, renderMode = 'reject', failPhoto = true, releaseImage
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aJVkAAAAASUVORK5CYII=', 'base64')
  const service = createRoomService({ ROOM_ENABLED: '1', ROOM_API_KEY: 'fixture', ROOM_BROWSER_EXECUTABLE: executablePath }, async (path, body) => {
    if (path === 'responses') {
      const state = JSON.parse(body.input[1].content)
      if (state.bag.length) return action('finish')
      if (state.page.url.includes('/p/')) return action('add')
      return action('click', state.page.controls.find(item => item.href.includes('/p/')).index)
    }
    renderCalls++
    assert.equal(path, 'images/edits')
    assert.equal(body.get('model'), 'gpt-image-2')
    assert.equal(body.get('n'), '1')
    assert.equal(body.getAll('image[]').length, 1)
    if (renderMode === 'reject') throw Object.assign(new Error('rejected'), { status: 502, retryable: true })
    if (renderMode === 'unknown') throw new DOMException('timeout', 'TimeoutError')
    await new Promise(resolve => { releaseImage = resolve })
    return { data: [{ b64_json: png.toString('base64') }] }
  })
  try {
    globalThis.fetch = async () => { if (failPhoto) throw new Error('photo unavailable'); return new Response(png, { headers: { 'content-type': 'image/png' } }) }
    const picked = await service.play('image-visitor', brief, () => {}, () => false)
    await assert.rejects(service.render('image-visitor', picked), { retryable: true })
    assert.equal(renderCalls, 0, 'Failed reference preparation must not submit or lock generation')
    failPhoto = false
    await assert.rejects(service.render('image-visitor', picked), { retryable: true })
    renderMode = 'success'
    const pending = service.render('image-visitor', picked)
    await assert.rejects(service.render('image-visitor', picked), { status: 409 })
    while (!releaseImage) await new Promise(resolve => setTimeout(resolve, 5))
    releaseImage()
    const generated = await pending
    assert.match(generated.image, /^data:image\/png;base64,/)
    assert.deepEqual(await service.render('image-visitor', picked), generated)
    assert.equal(renderCalls, 2, 'A successful image is reused; rejected attempts refund local quota')
    const uncertain = await service.play('unknown-visitor', brief, () => {}, () => false)
    renderMode = 'unknown'
    await assert.rejects(service.render('unknown-visitor', uncertain), { retryable: false })
    await assert.rejects(service.render('unknown-visitor', uncertain), { status: 409 })
    assert.equal(renderCalls, 3, 'Unknown outcomes must not trigger another paid request')
    for (const status of [400, 401, 429, 502, 504]) {
      globalThis.fetch = async () => new Response('upstream body with secret', { status })
      await assert.rejects(openai('images/edits', {}, 'fixture'), error => {
        assert.equal(error.retryable, status < 500)
        assert.match(error.message, new RegExp(`HTTP ${status}`))
        assert.ok(!error.message.includes('secret'))
        return true
      })
    }
  } finally { globalThis.fetch = originalFetch }

  stallPage = true; navigationStarted = false
  const pageBegan = Date.now()
  const stalled = await shopWithLuna(brief, {
    executablePath, startedAt: pageBegan - 28_000,
    call: () => assert.fail('No model call while navigation is stalled'),
  })
  assert.equal(navigationStarted, true)
  assert.equal(stalled.timedOut, true)
  assert.equal(browser.isConnected(), false)
  assert.ok(Date.now() - pageBegan < 4_000, 'Deadline interrupts pending navigation')
  console.log('room checks passed: deadlines, selection recovery, render retries, quota refunds, cached image, no duplicate generation, safe upstream errors')
} finally {
  chromium.launch = launch
  await browser?.close()
}
