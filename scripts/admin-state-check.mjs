// node scripts/admin-state-check.mjs — delayed status replies must not undo login/logout.
import assert from 'node:assert/strict'
import { build } from 'esbuild'
const original = { fetch, setTimeout, clearTimeout }
globalThis.setTimeout = () => 0
globalThis.clearTimeout = () => {}
const { outputFiles } = await build({ entryPoints: ['src/lib/admin.ts'], bundle: true, write: false, platform: 'node', format: 'esm' })
const admin = await import(`data:text/javascript;base64,${Buffer.from(outputFiles[0].text).toString('base64')}`)
const pending = []
globalThis.fetch = (url) => new Promise(resolve => pending.push({ url, resolve }))
const reply = (url, data) => {
  const index = pending.findIndex(request => request.url === url)
  assert.notEqual(index, -1)
  pending.splice(index, 1)[0].resolve({ ok: true, json: async () => data })
}
const loggedIn = { configured: true, authenticated: true, expiresAt: Date.now() + 60000 }
try {
  const login = admin.unlockAdmin('test-only-password')
  const oldVisitorStatus = admin.refreshAdmin()
  reply('/api/admin/login', loggedIn)
  await login
  assert.ok(admin.canEdit())
  reply('/api/admin', { configured: true, authenticated: false })
  await oldVisitorStatus
  assert.ok(admin.canEdit(), 'A status reply from before login cannot lock the user again')

  const logout = admin.lockAdmin()
  const oldOwnerStatus = admin.refreshAdmin()
  reply('/api/admin/logout', {})
  await logout
  assert.equal(admin.canEdit(), false)
  reply('/api/admin', loggedIn)
  await oldOwnerStatus
  assert.equal(admin.canEdit(), false, 'A status reply from before logout cannot unlock again')
  console.log('Admin state checks passed: delayed focus refresh cannot override login or logout.')
} finally { Object.assign(globalThis, original) }
