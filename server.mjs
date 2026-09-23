// 静态服务器：serve dist/ 到局域网，手机可访问
// 同时提供 /api/sync 多端同步接口（收藏、网址收藏、GitHub 账号）
// 用法: node server.mjs [端口，默认 8080]
import http from 'node:http'
import { readFile, writeFile, rename } from 'node:fs/promises'
import { extname, join, resolve, relative, isAbsolute } from 'node:path'
import { networkInterfaces } from 'node:os'
import { fileURLToPath } from 'node:url'
import { createAdmin } from './server-auth.mjs'

const root = fileURLToPath(new URL('./dist', import.meta.url))
const syncFile = process.env.SYNC_FILE || fileURLToPath(new URL('./sync-data.json', import.meta.url))
const port = Number(process.argv[2] || 8080)
const admin = createAdmin(process.env.ADMIN_PASSWORD, process.env.SITE_ORIGIN)
const publicKeys = ['favorites', 'bookmarks', 'fav_skills', 'fav_papers', 'readingArticles']
let writes = Promise.resolve()

async function jsonBody(req, limit = 2 * 1024 * 1024) {
  if (!req.headers['content-type']?.startsWith('application/json')) throw Object.assign(new Error('Expected JSON'), { status: 415 })
  let size = 0
  const chunks = []
  for await (const chunk of req) {
    size += chunk.length
    if (size > limit) throw Object.assign(new Error('Request too large'), { status: 413 })
    chunks.push(chunk)
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')) }
  catch { throw Object.assign(new Error('Invalid JSON'), { status: 400 }) }
}

async function readSync() {
  try {
    return JSON.parse(await readFile(syncFile, 'utf-8'))
  } catch (error) {
    if (error.code === 'ENOENT') return {}
    throw error
  }
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://x')
    const json = (status, value) => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(value)) }
    if (url.pathname.startsWith('/api/')) {
      if (url.pathname === '/api/admin' && req.method === 'GET') return json(200, { configured: admin.configured, authenticated: !!admin.session(req), expiresAt: admin.session(req)?.expiresAt ?? null })
      if (req.method !== 'GET') {
        if (!admin.configured) return json(503, { error: '管理口令尚未配置，当前只读' })
        if (!admin.sameOrigin(req)) return json(403, { error: '请求来源不匹配，请刷新页面后重试' })
      }
      if (url.pathname === '/api/admin/login' && req.method === 'POST') {
        const body = await jsonBody(req, 4096)
        const result = admin.login(body?.password)
        if (result.cookie) res.setHeader('Set-Cookie', result.cookie)
        return json(result.status, { error: result.error, authenticated: result.status === 200, expiresAt: result.expiresAt })
      }
      if (url.pathname === '/api/admin/logout' && req.method === 'POST') {
        res.setHeader('Set-Cookie', admin.logoutCookie())
        return json(200, { authenticated: false })
      }
      if (url.pathname !== '/api/sync') return json(404, { error: 'Not Found' })
    }
    // ─── 多端同步 API ───
    if (url.pathname === '/api/sync') {
      res.setHeader('Content-Type', 'application/json; charset=utf-8')
      res.setHeader('Cache-Control', 'no-store')
      if (req.method === 'GET') {
        const data = await readSync()
        res.end(JSON.stringify(Object.fromEntries(publicKeys.filter(key => Object.hasOwn(data, key)).map(key => [key, data[key]]))))
        return
      }
      if (req.method === 'POST') {
        if (!admin.session(req)) return json(401, { error: '编辑权限已过期，请重新输入管理口令' })
        const { key, value } = (await jsonBody(req)) ?? {}
        if (!publicKeys.includes(key) || !Array.isArray(value)) {
          res.writeHead(400)
          res.end(JSON.stringify({ error: 'invalid key' }))
          return
        }
        const write = writes.then(async () => {
          const data = await readSync()
          data[key] = value
          await writeFile(`${syncFile}.tmp`, JSON.stringify(data), { encoding: 'utf-8', mode: 0o600 })
          await rename(`${syncFile}.tmp`, syncFile)
        })
        writes = write.catch(() => {})
        await write
        res.end(JSON.stringify({ ok: true }))
        return
      }
      res.writeHead(405)
      res.end('{}')
      return
    }

    let path = decodeURIComponent(url.pathname)
    if (path === '/') path = '/index.html'
    const file = resolve(root, '.' + path)
    const rel = relative(root, file)
    if (rel.startsWith('..') || isAbsolute(rel)) throw new Error('forbidden')
    let data
    try {
      data = await readFile(file)
    } catch {
      // 带扩展名的请求视为静态资源，缺失时返回 404 ——
      // 不能回退到 index.html，否则 Cloudflare 会把 HTML 当 JS 缓存 4 小时，整站白屏
      if (extname(path)) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
        return res.end('Not Found')
      }
      // SPA 回退
      data = await readFile(join(root, 'index.html'))
      res.writeHead(200, { 'Content-Type': MIME['.html'], 'Cache-Control': 'no-cache' })
      return res.end(data)
    }
    const headers = { 'Content-Type': MIME[extname(file)] ?? 'application/octet-stream' }
    // index.html 不缓存（内容hash在JS文件名里），assets 可长缓存，其余静态文件短缓存
    if (path === '/index.html') headers['Cache-Control'] = 'no-cache'
    else if (path.startsWith('/assets/')) headers['Cache-Control'] = 'public, max-age=31536000, immutable'
    else headers['Cache-Control'] = 'public, max-age=3600'
    res.writeHead(200, headers)
    res.end(data)
  } catch (error) {
    res.writeHead(error.status || 500, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
    res.end(JSON.stringify({ error: error.status ? error.message : '服务暂不可用，请稍后重试' }))
  }
})

server.listen(port, process.env.HOST || '0.0.0.0', () => {
  console.log(`SERVER_PORT=${server.address().port}`)
  const nets = networkInterfaces()
  const ips = Object.values(nets)
    .flat()
    .filter((n) => n && n.family === 'IPv4' && !n.internal)
    .map((n) => n.address)
  console.log('')
  console.log('  ✅ GitHub 热点追踪站已启动！')
  console.log('')
  console.log(`  💻 电脑访问:   http://localhost:${port}/`)
  for (const ip of ips) {
    console.log(`  📱 手机访问:   http://${ip}:${port}/   (手机需连接同一 Wi-Fi)`)
  }
  console.log('')
  console.log('  按 Ctrl+C 停止服务')
  console.log('')
})
