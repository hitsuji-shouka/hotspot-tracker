// Local visual verification only. Never used by the application server.
// Recorded, verified IKEA product; no model calls or merchant cart writes.
import http from 'node:http'
import { readFile } from 'node:fs/promises'
import { resolve, extname, sep } from 'node:path'
const root = resolve('dist')
const product = { id: 'verified-ivar', name: 'IVAR 伊娃', description: '柜子，松木，80x30x83 厘米', image: 'https://file.app.ikea.cn/cn/zh/images/products/ivar-yi-wa-gui-zi-song-mu__21439_pe106384_s5.jpg', quantity: 1, currency: 'CNY', reason: '原木松木柜，适合客厅并提供实用收纳空间', price: 750, url: 'https://www.ikea.cn/cn/zh/p/ivar-yi-wa-gui-zi-song-mu-50214999/', store: '宜家' }
const mobile = process.argv.includes('--mobile')
const products = mobile ? JSON.parse(await readFile('design/room-render-products.json', 'utf8')).products : [product]
const frame = mobile ? `data:image/jpeg;base64,${(await readFile('design/room-browser-debug.jpg')).toString('base64')}` : ''
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost')
  if (url.pathname === '/api/room/status') { res.setHeader('Content-Type', 'application/json'); return res.end('{"available":true,"provider":"jev","renderAvailable":false}') }
  if (url.pathname === '/api/room/play') {
    let body = ''; for await (const chunk of req) body += chunk
    const brief = JSON.parse(body)
    res.writeHead(200, { 'Content-Type': 'text/event-stream' })
    if (mobile) {
      const send = event => res.write(`data: ${JSON.stringify(event)}\n\n`)
      send({ type: 'session', runId: 'visual-check', startedAt: Date.now(), duration: 60 })
      send({ type: 'frame', image: frame })
      send({ type: 'step', message: '正在看商品，想想怎么搭配' })
      send({ type: 'bag', products })
      const timer = setTimeout(() => { send({ type: 'done', result: { runId: 'visual-check', brief, elapsed: 60, products } }); res.end() }, 60_000)
      res.on('close', () => clearTimeout(timer))
      return
    }
    for (const event of [
      { type: 'session', runId: 'visual-check' },
      { type: 'bag', products: [product], added: product },
      { type: 'done', result: { runId: 'visual-check', brief, elapsed: 0, products: [product] } },
    ]) res.write(`data: ${JSON.stringify(event)}\n\n`)
    return res.end()
  }
  if (url.pathname.startsWith('/api/')) { res.writeHead(400, { 'Content-Type': 'application/json' }); return res.end('{"error":"界面验证模式不会调用模型或生图"}') }
  const path = url.pathname.startsWith('/assets/') || extname(url.pathname) ? resolve(root, '.' + url.pathname) : resolve(root, 'index.html')
  if (!path.startsWith(root + sep)) { res.writeHead(403); return res.end() }
  try {
    let body = await readFile(path)
    const types = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.png': 'image/png' }
    res.setHeader('Content-Type', types[extname(path)] || 'application/octet-stream')
    if (extname(path) === '.html') body = body.toString().replace('</body>', '<aside style="position:fixed;bottom:0;left:0;z-index:9999;background:#fff2cd;color:#513b00;padding:4px 12px;font:12px sans-serif">界面验证：已核实商品样本，不调用 Agent 或生图</aside></body>')
    res.end(body)
  } catch { res.writeHead(404); res.end() }
})
const port = mobile ? 4193 : 8082
server.listen(port, '127.0.0.1', () => console.log(`Visual-only preview http://127.0.0.1:${port}/lab/sheep-room`))
