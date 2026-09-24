// node scripts/admin-check.mjs — isolated server, disposable collection data.
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createAdmin } from '../server-auth.mjs'

const password = 'only-a-test-password-123'
const origin = 'http://localhost:4198'
const dir = await mkdtemp(join(tmpdir(), 'hotspot-admin-'))
const file = join(dir, 'sync.json')
await writeFile(file, JSON.stringify({ bookmarks: [{ id: 'existing' }], account: { token: 'private-test-token' } }))
const child = spawn(process.execPath, ['server.mjs', '0'], { env: { ...process.env, ADMIN_PASSWORD: password, SITE_ORIGIN: origin, SYNC_FILE: file, HOST: '127.0.0.1' }, stdio: ['ignore', 'pipe', 'pipe'] })
try {
  const port = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Server did not start')), 10000)
    child.stdout.on('data', data => { const match = String(data).match(/SERVER_PORT=(\d+)/); if (match) { clearTimeout(timer); resolve(match[1]) } })
    child.once('exit', code => { clearTimeout(timer); reject(new Error(`Server exited: ${code}`)) })
    child.stderr.on('data', data => process.stderr.write(data))
  })
  const request = (path, body, cookie = '', source = origin) => fetch(`http://127.0.0.1:${port}${path}`, {
    method: body === undefined ? 'GET' : 'POST', headers: { 'Content-Type': 'application/json', Origin: source, Cookie: cookie }, body: body === undefined ? undefined : JSON.stringify(body),
  })
  let res = await request('/api/sync')
  assert.equal(res.headers.get('cache-control'), 'no-store')
  assert.deepEqual(await res.json(), { bookmarks: [{ id: 'existing' }] })
  for (const key of ['favorites', 'bookmarks', 'fav_skills', 'fav_papers', 'readingArticles']) {
    assert.equal((await request('/api/sync', { key, value: [] })).status, 401)
  }
  assert.equal((await request('/api/admin/login', { password: 'wrong' })).status, 401)
  assert.equal((await request('/api/admin/login', { password }, '', 'https://evil.example')).status, 403)
  res = await request('/api/admin/login', { password })
  assert.equal(res.status, 200)
  const header = res.headers.get('set-cookie')
  assert.match(header, /HttpOnly/); assert.match(header, /SameSite=Strict/); assert.match(header, /Max-Age=2592000/)
  const cookie = header.split(';')[0]
  assert.equal((await (await request('/api/admin', undefined, cookie)).json()).authenticated, true)
  assert.equal((await request('/api/sync', { key: 'bookmarks', value: [] }, cookie, 'https://evil.example')).status, 403)
  assert.equal((await request('/api/sync', { key: 'bookmarks', value: [] }, cookie + 'tampered')).status, 401)
  assert.equal((await request('/api/sync', { key: '__proto__', value: [] }, cookie)).status, 400)
  assert.equal((await request('/api/sync', { key: 'bookmarks', value: {} }, cookie)).status, 400)
  const results = await Promise.all(['favorites', 'fav_skills', 'fav_papers', 'readingArticles'].map(key => request('/api/sync', { key, value: [{ id: key }] }, cookie)))
  results.forEach(result => assert.equal(result.status, 200))
  const saved = JSON.parse(await readFile(file, 'utf8'))
  for (const key of ['favorites', 'fav_skills', 'fav_papers', 'readingArticles']) assert.equal(saved[key][0].id, key)
  assert.equal(saved.account.token, 'private-test-token', 'Unrelated server data retained, never publicly returned')
  res = await request('/api/admin/logout', {}, cookie)
  assert.match(res.headers.get('set-cookie'), /Max-Age=0/)
  assert.equal((await request('/api/sync', { key: 'bookmarks', value: [] })).status, 401)
  for (let i = 0; i < 10; i++) assert.equal((await request('/api/admin/login', { password: 'wrong' })).status, 401)
  assert.equal((await request('/api/admin/login', { password })).status, 429)

  const admin = createAdmin(password, 'https://example.com')
  const publicSite = createAdmin(password, 'https://hitsuji-shouka.com')
  assert.equal(publicSite.sameOrigin({ headers: { origin: 'https://www.hitsuji-shouka.com', 'sec-fetch-site': 'same-origin' } }), true)
  assert.equal(publicSite.sameOrigin({ headers: { origin: 'https://www.hitsuji-shouka.com', 'sec-fetch-site': 'cross-site' } }), false)
  assert.equal(publicSite.sameOrigin({ headers: { origin: 'https://evil.hitsuji-shouka.com' } }), false)
  const login = admin.login(password)
  assert.match(login.cookie, /; Secure/)
  const req = { headers: { cookie: login.cookie.split(';')[0] } }
  assert.ok(admin.session(req))
  assert.equal(createAdmin(password + '-rotated', 'https://example.com').session(req), null)
  const now = Date.now
  try { Date.now = () => login.expiresAt + 1; assert.equal(admin.session(req), null) } finally { Date.now = now }
  assert.equal(createAdmin(undefined, undefined).login(password).status, 503)
  assert.throws(() => createAdmin('short', origin))
  assert.throws(() => createAdmin(password, 'http://public.example'))
  console.log('Admin checks passed: public reads, every write protected, origin checks, cookie flags, tampering, expiry, rotation, throttling, atomic concurrent writes and private data filtering.')
} finally {
  const exited = new Promise(resolve => child.once('exit', resolve))
  if (child.exitCode === null) { child.kill(); await exited }
  await rm(dir, { recursive: true, force: true })
}
