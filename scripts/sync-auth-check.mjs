// node scripts/sync-auth-check.mjs — authenticated sync with isolated network/storage.
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import ts from 'typescript'

// Keep the real sync implementation; stub only the already-unlocked admin boundary.
const source = await readFile(new URL('../src/lib/sync.ts', import.meta.url), 'utf8')
const adminImport = "import { adminMessage, canEdit } from './admin'"
assert.ok(source.includes(adminImport))
const code = ts.transpileModule(source.replace(adminImport, 'const canEdit = () => true; const adminMessage = () => {};'), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText
const originalFetch = globalThis.fetch
const originalStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
const local = new Map([['ghhot:fav_papers', JSON.stringify([{ id: 'old' }])]])
const server = { favorites: [], fav_papers: [{ id: 'old' }, { id: 'server-new' }] }
let failRead = false
const posts = []

try {
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: key => local.get(key) ?? null,
    setItem: (key, value) => local.set(key, value),
    removeItem: key => local.delete(key),
  } })
  globalThis.fetch = async (_url, options = {}) => {
    if (options.method === 'POST') {
      const body = JSON.parse(options.body)
      posts.push(body)
      server[body.key] = body.value
      return { ok: true }
    }
    return failRead ? { ok: false, status: 503 } : { ok: true, json: async () => structuredClone(server) }
  }
  const { pullKey, pushSync } = await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'))
  assert.equal(await pushSync('fav_papers', []), false, 'Unlock alone must not permit writes before sync')
  await pullKey('favorites')
  failRead = true
  const fallback = await pullKey('fav_papers')
  assert.deepEqual(fallback, [{ id: 'old' }], 'Stale local items can remain visible during an outage')
  assert.equal(await pushSync('fav_papers', [{ id: 'user-add' }, ...fallback]), false)
  assert.equal(posts.length, 0, 'Reading collection A must not authorize a write based on failed collection B hydration')

  failRead = false
  const fresh = await pullKey('fav_papers')
  assert.deepEqual(fresh, server.fav_papers)
  assert.equal(await pushSync('fav_papers', [{ id: 'user-add' }, ...fresh]), true)
  assert.deepEqual(posts[0].value.map(item => item.id), ['user-add', 'old', 'server-new'])

  failRead = true
  await pullKey('fav_papers')
  assert.equal(await pushSync('fav_papers', []), false, 'A failed later reload must revoke that collection readiness')
  assert.equal(posts.length, 1)
  console.log('Sync auth checks passed: failed collection hydration blocks writes until its own successful reload, retaining server items.')
} finally {
  globalThis.fetch = originalFetch
  if (originalStorage) Object.defineProperty(globalThis, 'localStorage', originalStorage)
  else delete globalThis.localStorage
}
