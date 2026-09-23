import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'

const MONTH = 30 * 24 * 60 * 60
const COOKIE = 'hotspot_admin'

export function createAdmin(password, origin) {
  if (password && (password.length < 12 || !origin)) throw new Error('Set ADMIN_PASSWORD (at least 12 characters) and SITE_ORIGIN.')
  const site = origin ? new URL(origin) : null
  if (site && site.protocol !== 'https:' && !(site.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(site.hostname))) {
    throw new Error('SITE_ORIGIN must use HTTPS, except on localhost.')
  }
  const key = password ? scryptSync(password, 'hotspot-admin-v1', 32) : null
  let attempts = 0
  let retryAt = 0
  const sign = text => createHmac('sha256', key).update(text).digest('base64url')
  const equal = (a, b) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b))
  const cookie = (value, age) => `${COOKIE}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${age}${site?.protocol === 'https:' ? '; Secure' : ''}`

  return {
    configured: !!key,
    sameOrigin(req) {
      return !!site && req.headers.origin === site.origin && req.headers['sec-fetch-site'] !== 'cross-site'
    },
    session(req) {
      if (!key) return null
      const value = (req.headers.cookie || '').split(';').map(s => s.trim()).find(s => s.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1)
      if (!value || value.length > 256) return null
      const [expires, nonce, signature, extra] = value.split('.')
      if (extra || !/^\d+$/.test(expires) || !/^[\w-]{32}$/.test(nonce || '') || !/^[\w-]{43}$/.test(signature || '')) return null
      const expiresAt = Number(expires)
      if (expiresAt <= Date.now() || expiresAt > Date.now() + MONTH * 1000 || !equal(signature, sign(`${expires}.${nonce}`))) return null
      return { expiresAt }
    },
    login(input) {
      if (!key) return { status: 503, error: '管理口令尚未配置' }
      if (Date.now() >= retryAt) { attempts = 0; retryAt = Date.now() + 15 * 60 * 1000 }
      // Single owner: one global budget also works safely behind the reverse proxy.
      if (attempts >= 10) return { status: 429, error: '尝试次数过多，请 15 分钟后再试' }
      attempts++
      if (typeof input !== 'string' || input.length > 1024 || !timingSafeEqual(scryptSync(input, 'hotspot-admin-v1', 32), key)) return { status: 401, error: '管理口令不正确' }
      attempts = 0
      const expiresAt = Date.now() + MONTH * 1000
      const payload = `${expiresAt}.${randomBytes(24).toString('base64url')}`
      return { status: 200, expiresAt, cookie: cookie(`${payload}.${sign(payload)}`, MONTH) }
    },
    logoutCookie: () => cookie('', 0),
  }
}
