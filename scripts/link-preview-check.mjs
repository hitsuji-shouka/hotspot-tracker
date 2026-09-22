// Run: node scripts/link-preview-check.mjs
import assert from 'node:assert/strict'
import { build } from 'esbuild'

const { outputFiles } = await build({ entryPoints: ['src/lib/bookmarks.ts'], bundle: true, write: false, platform: 'node', format: 'esm' })
const { fetchLinkPreview } = await import(`data:text/javascript;base64,${Buffer.from(outputFiles[0].text).toString('base64')}`)
const originalFetch = globalThis.fetch
const originalSetTimeout = globalThis.setTimeout
const originalClearTimeout = globalThis.clearTimeout
let timerCallback, cleared, message
globalThis.setTimeout = callback => { timerCallback = callback; cleared = false; return 1 }
globalThis.clearTimeout = () => { cleared = true }
async function check(response, expected, error) {
  message = ''
  globalThis.fetch = async () => response
  const result = await fetchLinkPreview('https://zhuanlan.zhihu.com/p/123', value => { message = value })
  assert.deepEqual(result, expected)
  assert.match(message, error)
  assert.ok(cleared, 'Timeout is cleaned up on every path')
}
const json = value => ({ ok: true, json: async () => value })
try {
  await check(json({ status: 'success', statusCode: 403, data: { title: '123' } }), null, /原网站拒绝/)
  await check(json({ status: 'success', statusCode: 404, data: { title: 'Not found' } }), null, /404/)
  await check({ ok: false, status: 429 }, null, /额度|频繁/)
  await check({ ok: false, status: 503 }, null, /503/)
  await check(json({ status: 'success', data: { title: ' ' } }), null, /未获取到/)
  await check(json({ status: 'success', data: { title: '文章', description: '简介' } }), {
    title: '文章', description: '简介', image: null, logo: null, siteName: null,
  }, /^$/)
  // Timeout also covers reading the response body, not just receiving headers.
  globalThis.fetch = async (_url, { signal }) => ({ ok: true, json: async () => {
    assert.equal(cleared, false)
    timerCallback()
    signal.throwIfAborted()
  } })
  assert.equal(await fetchLinkPreview('https://example.com', value => { message = value }), null)
  assert.match(message, /超时/)
  assert.ok(cleared)
  globalThis.fetch = async () => { throw new TypeError('Network error') }
  assert.equal(await fetchLinkPreview('https://example.com', value => { message = value }), null)
  assert.match(message, /网络/)
  assert.equal(await fetchLinkPreview('https://example.com'), null, 'Existing bookmark caller remains compatible')
  console.log('Preview checks passed: upstream errors, rate limit, success, body timeout, network failure and timer cleanup.')
} finally {
  globalThis.fetch = originalFetch
  globalThis.setTimeout = originalSetTimeout
  globalThis.clearTimeout = originalClearTimeout
}
