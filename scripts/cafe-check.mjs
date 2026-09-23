// HTTP integration checks with isolated data, no remote services.
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtemp, readFile, rm, mkdir } from 'node:fs/promises'
import { join, resolve, sep } from 'node:path'
import { defaultMusic, validateMusic } from '../server-cafe.mjs'

await mkdir('state', { recursive: true })
const directory = await mkdtemp(resolve('state/cafe-check-'))
const password = 'cafe-isolated-test-password', origin = 'http://localhost:4197'
let child, base
async function start() {
  child = spawn(process.execPath, ['server.mjs', '0'], { env: { ...process.env, ADMIN_PASSWORD: password, SITE_ORIGIN: origin, CAFE_DATA_DIR: directory, SYNC_FILE: join(directory, 'sync.json'), HOST: '127.0.0.1' }, stdio: ['ignore', 'pipe', 'pipe'] })
  const port = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => { child.kill(); reject(new Error('Server startup timeout')) }, 10000)
    child.stdout.on('data', chunk => { const m = String(chunk).match(/SERVER_PORT=(\d+)/); if (m) { clearTimeout(timer); resolve(m[1]) } })
    child.once('error', error => { clearTimeout(timer); reject(error) })
    child.once('exit', code => { clearTimeout(timer); reject(new Error(`Server exited ${code}`)) })
    child.stderr.on('data', data => process.stderr.write(data))
  }); base = `http://127.0.0.1:${port}`
}
async function stop() { if (child && child.exitCode === null) { const exited = new Promise(r => child.once('exit', r)); child.kill(); await exited } }
const request = (path, body, cookie = '', source = origin, type = 'application/json') => fetch(base + path, { method: body === undefined ? 'GET' : 'POST', headers: { Origin: source, Cookie: cookie, 'Content-Type': type }, body: body === undefined ? undefined : type === 'application/json' ? JSON.stringify(body) : body })
try {
  for (const url of ['javascript:alert(1)', 'file:///test.mp3', '//evil.test/song.mp3', 'http://example.com/a.mp3', 'https://user:password@example.com/a.mp3', '/api/cafe/audio/../../secret']) assert.throws(() => validateMusic({ ...defaultMusic, url }))
  for (const volume of [-1, 2, NaN, Infinity, '0.3']) assert.throws(() => validateMusic({ ...defaultMusic, volume }))
  assert.throws(() => validateMusic({ ...defaultMusic, loop: 'true' }))
  await start()
  assert.deepEqual(await (await request('/api/cafe/music')).json(), defaultMusic)
  assert.equal((await request('/api/cafe/music', defaultMusic)).status, 401)
  assert.equal((await request('/api/cafe/upload', Buffer.from('test'), '', origin, 'audio/mpeg')).status, 401)
  const login = await request('/api/admin/login', { password }); assert.equal(login.status, 200)
  const cookie = login.headers.get('set-cookie').split(';')[0]
  assert.equal((await request('/api/cafe/music', defaultMusic, cookie, 'https://evil.example')).status, 403)
  assert.equal((await request('/api/cafe/music', { ...defaultMusic, url: '/api/cafe/audio/11111111-1111-1111-1111-111111111111.mp3' }, cookie)).status, 400)
  assert.equal((await request('/api/cafe/upload', Buffer.from('ID3 not an audio file'), cookie, origin, 'audio/mpeg')).status, 415)
  assert.equal((await request('/api/cafe/upload', Buffer.alloc(21 * 1024 * 1024), cookie, origin, 'audio/mpeg')).status, 413)
  const audio = await readFile('public/lab/central-perk/with-or-without-you.mp3')
  const upload = await request('/api/cafe/upload', audio, cookie, origin, 'audio/mpeg')
  assert.equal(upload.status, 201, JSON.stringify(await upload.clone().json()))
  const { url } = await upload.json()
  const updated = { ...defaultMusic, url, title: 'Test café track', volume: .22, loop: false }
  const save = await request('/api/cafe/music', updated, cookie)
  assert.equal(save.status, 200); assert.deepEqual(await save.json(), updated)
  const range = await fetch(base + url, { headers: { Range: 'bytes=0-99' } })
  assert.equal(range.status, 206); assert.equal(range.headers.get('content-type'), 'audio/mpeg'); assert.equal(range.headers.get('content-range'), `bytes 0-99/${audio.length}`)
  assert.deepEqual(Buffer.from(await range.arrayBuffer()), audio.subarray(0, 100))
  const suffix = await fetch(base + url, { headers: { Range: 'bytes=-15' } }); assert.equal(suffix.status, 206); assert.deepEqual(Buffer.from(await suffix.arrayBuffer()), audio.subarray(-15))
  assert.equal((await fetch(base + url, { headers: { Range: 'bytes=999999999-' } })).status, 416)
  const head = await fetch(base + url, { method: 'HEAD' }); assert.equal(head.status, 200); assert.equal(head.headers.get('content-length'), String(audio.length)); assert.equal((await head.arrayBuffer()).byteLength, 0)
  assert.equal((await fetch(base + '/api/cafe/audio/does-not-exist.mp3')).status, 404)
  assert.equal((await request('/api/cafe/music', { ...updated, url: 'data:audio/mp3;base64,invalid' }, cookie)).status, 400)
  assert.deepEqual(await (await request('/api/cafe/music')).json(), updated, 'Rejected replacement keeps current music')
  assert.equal((await fetch(base + defaultMusic.url, { headers: { Range: 'bytes=0-20' } })).status, 206)
  await stop(); await start()
  assert.deepEqual(await (await request('/api/cafe/music')).json(), updated, 'Configuration survives restart')
  assert.equal((await fetch(base + url)).status, 200, 'Upload survives restart')
  console.log('Cafe checks passed: auth/origin, validated MP3 upload/limits, safe metadata, failed replacement, range/HEAD playback and persistence after restart.')
} finally {
  await stop()
  if (!directory.startsWith(resolve('state') + sep)) throw new Error('Unexpected test directory')
  await rm(directory, { recursive: true, force: true })
}
