// 静态服务器：serve dist/ 到局域网，手机可访问
// 用法: node server.mjs [端口，默认 8080]
import http from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'
import { networkInterfaces } from 'node:os'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('./dist', import.meta.url))
const port = Number(process.argv[2] || 8080)

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
    let path = decodeURIComponent(new URL(req.url, 'http://x').pathname)
    if (path === '/') path = '/index.html'
    const file = normalize(join(root, path))
    if (!file.startsWith(root)) throw new Error('forbidden')
    let data
    try {
      data = await readFile(file)
    } catch {
      // SPA 回退
      data = await readFile(join(root, 'index.html'))
      res.writeHead(200, { 'Content-Type': MIME['.html'] })
      return res.end(data)
    }
    res.writeHead(200, { 'Content-Type': MIME[extname(file)] ?? 'application/octet-stream' })
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
