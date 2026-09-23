import { mkdir, readFile, writeFile, rename, stat, open } from 'node:fs/promises'
import { createReadStream } from 'node:fs'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'

export const defaultMusic = { title: 'With or Without You', artist: 'U2', url: '/lab/central-perk/with-or-without-you.mp3', volume: 0.35, loop: true }
const fail = (status, message) => Object.assign(new Error(message), { status })
export function validateMusic(body) {
  if (!body || typeof body.title !== 'string' || !body.title.trim() || body.title.length > 100 || typeof body.artist !== 'string' || body.artist.length > 100) throw fail(400, '请填写曲名，曲名和歌手不超过 100 字')
  if (typeof body.volume !== 'number' || !Number.isFinite(body.volume) || body.volume < 0 || body.volume > 1 || typeof body.loop !== 'boolean') throw fail(400, '音量或循环设置无效')
  const url = body.url
  if (typeof url !== 'string' || url.length > 2048) throw fail(400, '音频地址无效')
  const local = url === defaultMusic.url || /^\/api\/cafe\/audio\/[a-f0-9-]{36}\.mp3$/.test(url)
  let remote = false
  try { const parsed = new URL(url); remote = parsed.protocol === 'https:' && !parsed.username && !parsed.password } catch { /* A local uploaded file has no origin. */ }
  if (!local && !remote) throw fail(400, '请上传 MP3 或使用 HTTPS 音频直链')
  return { title: body.title.trim(), artist: body.artist.trim(), url, volume: body.volume, loop: body.loop }
}

// Streams both bundled and uploaded audio, including Safari's small range probes.
export async function serveAudio(req, res, file) {
  let info
  try { info = await stat(file) } catch (error) { if (error.code === 'ENOENT') throw fail(404, '音频文件不存在'); throw error }
  const headers = { 'Content-Type': 'audio/mpeg', 'Accept-Ranges': 'bytes', 'Cache-Control': 'public, max-age=3600', 'X-Content-Type-Options': 'nosniff' }
  let start = 0, end = info.size - 1
  if (req.headers.range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range)
    if (!match || (!match[1] && !match[2])) { res.writeHead(416, { ...headers, 'Content-Range': `bytes */${info.size}` }); res.end(); return }
    if (match[1]) { start = Number(match[1]); end = match[2] ? Math.min(Number(match[2]), end) : end }
    else start = Math.max(0, info.size - Number(match[2]))
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || start > end || start >= info.size) { res.writeHead(416, { ...headers, 'Content-Range': `bytes */${info.size}` }); res.end(); return }
    headers['Content-Range'] = `bytes ${start}-${end}/${info.size}`
  }
  headers['Content-Length'] = end - start + 1
  res.writeHead(req.headers.range ? 206 : 200, headers)
  if (req.method === 'HEAD') { res.end(); return }
  const stream = createReadStream(file, { start, end })
  stream.on('error', () => res.destroy())
  res.on('close', () => stream.destroy())
  stream.pipe(res)
}

export function createCafeService(directory, admin, jsonBody) {
  const configFile = join(directory, 'music.json')
  let writes = Promise.resolve()
  async function read() {
    try { return validateMusic(JSON.parse(await readFile(configFile, 'utf8'))) }
    catch (error) { if (error.code === 'ENOENT') return defaultMusic; throw error }
  }
  return async function handle(req, res, path, json) {
    if (!path.startsWith('/api/cafe/')) return false
    if (path.startsWith('/api/cafe/audio/') && ['GET', 'HEAD'].includes(req.method)) {
      if (!/^\/api\/cafe\/audio\/[a-f0-9-]{36}\.mp3$/.test(path)) throw fail(404, '音频文件不存在')
      await serveAudio(req, res, join(directory, path.split('/').pop())); return true
    }
    if (path === '/api/cafe/music' && req.method === 'GET') { json(200, await read()); return true }
    if (!['/api/cafe/music', '/api/cafe/upload'].includes(path)) throw fail(404, '接口不存在')
    if (req.method !== 'POST') throw fail(405, '不支持此操作')
    if (!admin.configured) throw fail(503, '管理口令尚未配置')
    if (!admin.sameOrigin(req)) throw fail(403, '请求来源不匹配')
    if (!admin.session(req)) throw fail(401, '请先解锁管理')
    if (path.endsWith('/upload')) {
      if (req.headers['content-type']?.split(';')[0] !== 'audio/mpeg') throw fail(415, '请上传 MP3 文件')
      if (Number(req.headers['content-length']) > 20 * 1024 * 1024) { req.resume(); throw fail(413, '音频不能超过 20 MB') }
      const chunks = []; let size = 0
      for await (const chunk of req.iterator({ destroyOnReturn: false })) { size += chunk.length; if (size > 20 * 1024 * 1024) { req.resume(); throw fail(413, '音频不能超过 20 MB') } chunks.push(chunk) }
      const bytes = Buffer.concat(chunks)
      // Check actual MPEG frame sync, not just the filename or ID3 label.
      let offset = 0
      if (bytes.subarray(0, 3).toString() === 'ID3' && bytes.length >= 10) {
        if ([6, 7, 8, 9].some(i => bytes[i] & 128)) throw fail(415, 'MP3 标签格式无效')
        offset = 10 + ((bytes[6] << 21) | (bytes[7] << 14) | (bytes[8] << 7) | bytes[9])
        if (bytes[5] & 16) offset += 10
      }
      const frame = bytes.subarray(offset, offset + 4)
      if (frame.length !== 4 || frame[0] !== 255 || (frame[1] & 224) !== 224 || (frame[1] & 6) === 0 || (frame[1] & 24) === 8 || (frame[2] & 240) === 240 || (frame[2] & 240) === 0 || (frame[2] & 12) === 12) throw fail(415, '文件不是有效的 MP3 音频')
      await mkdir(directory, { recursive: true })
      const name = `${randomUUID()}.mp3`
      await writeFile(join(directory, name), bytes, { flag: 'wx', mode: 0o600 })
      json(201, { url: `/api/cafe/audio/${name}` }); return true
    }
    const music = validateMusic(await jsonBody(req, 8192))
    if (music.url.startsWith('/api/cafe/audio/')) {
      try { const file = await open(join(directory, music.url.split('/').pop()), 'r'); await file.close() }
      catch (error) { if (error.code === 'ENOENT') throw fail(400, '上传的音频不存在，请重新上传'); throw error }
    }
    const write = writes.then(async () => {
      await mkdir(directory, { recursive: true })
      await writeFile(`${configFile}.tmp`, JSON.stringify(music), { mode: 0o600 })
      await rename(`${configFile}.tmp`, configFile)
    })
    writes = write.catch(() => {})
    await write; json(200, music); return true
  }
}
