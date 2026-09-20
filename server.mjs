// 静态服务器：serve dist/ 到局域网，手机可访问
// 同时提供 /api/sync 多端同步接口（收藏、网址收藏、GitHub 账号）
// 用法: node server.mjs [端口，默认 8080]
import http from 'node:http'
import { readFile, writeFile } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'
import { networkInterfaces } from 'node:os'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('./dist', import.meta.url))
const syncFile = fileURLToPath(new URL('./sync-data.json', import.meta.url))
const port = Number(process.argv[2] || 8080)

async function readSync() {
  try {
    return JSON.parse(await readFile(syncFile, 'utf-8'))
  } catch {
    return {}
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
    // ─── 多端同步 API ───
    if (url.pathname === '/api/sync') {
      res.setHeader('Content-Type', 'application/json; charset=utf-8')
      if (req.method === 'GET') {
        res.end(JSON.stringify(await readSync()))
        return
      }
      if (req.method === 'POST') {
        let body = ''
        for await (const chunk of req) body += chunk
        const { key, value } = JSON.parse(body || '{}')
        if (typeof key !== 'string' || !/^[\w:-]{1,50}$/.test(key)) {
          res.writeHead(400)
          res.end(JSON.stringify({ error: 'invalid key' }))
          return
        }
        const data = await readSync()
        data[key] = value
        await writeFile(syncFile, JSON.stringify(data), 'utf-8')
        res.end(JSON.stringify({ ok: true }))
        return
      }
      res.writeHead(405)
      res.end('{}')
      return
    }

    let path = decodeURIComponent(url.pathname)
    if (path === '/') path = '/index.html'
    const file = normalize(join(root, path))
    if (!file.startsWith(root)) throw new Error('forbidden')
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
  } catch {
    res.writeHead(404)
    res.end('Not Found')
  }
})

server.listen(port, '0.0.0.0', () => {
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
