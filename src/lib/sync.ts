// 多端同步层：数据以服务器为准（/api/sync），localStorage 作为本地缓存
// 手机和电脑都从同一台服务器加载页面，因此天然共享同一份数据

import { adminMessage, canEdit } from './admin'
type SyncData = Record<string, unknown>

let cache: SyncData | null = null
let pulling: Promise<SyncData | null> | null = null
const hydratedKeys = new Set<string>()

/** 从服务器拉取全量同步数据；失败（如 dev 预览无此接口）返回 null */
export async function pullSync(): Promise<SyncData | null> {
  if (pulling) return pulling
  pulling = (async () => {
    try {
      const res = await fetch(`/api/sync?t=${Date.now()}`)
      if (!res.ok) return null
      cache = await res.json()
      if (!cache || typeof cache !== 'object' || Array.isArray(cache)) return null
      return cache
    } catch {
      return null
    } finally {
      pulling = null
    }
  })()
  return pulling
}

/** 服务端确认后再更新缓存；失败不显示成已保存。 */
export async function pushSync(key: string, value: unknown): Promise<boolean> {
  if (!canEdit()) { adminMessage('请先在页脚解锁编辑，再修改收藏。', true); return false }
  if (!hydratedKeys.has(key)) { adminMessage('尚未同步到服务器收藏，请刷新页面后再编辑。'); return false }
  try {
    const res = await fetch('/api/sync', {
      method: 'POST', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value }),
    })
    if (!res.ok) {
      adminMessage(res.status === 401 ? '编辑权限已过期，请在页脚重新输入管理口令。' : '保存失败，收藏未修改，请稍后重试。', res.status === 401)
      return false
    }
    try { localStorage.setItem('ghhot:' + key, JSON.stringify(value)) } catch { /* server already saved */ }
    if (cache) cache[key] = value
    return true
  } catch {
    adminMessage('未能确认保存，请检查网络并刷新核对。')
    return false
  }
}

/**
 * 读取某个 key：优先服务器数据，其次本地缓存。
 * 服务器缺少的集合按空集合处理，访客本地数据不会自动上传。
 */
export async function pullKey<T>(key: string): Promise<T | null> {
  hydratedKeys.delete(key)
  const server = await pullSync()
  const localRaw = localStorage.getItem('ghhot:' + key)
  const local: T | null = localRaw ? safeParse<T>(localRaw) : null

  if (server) {
    hydratedKeys.add(key)
    if (key in server) {
      const v = server[key] as T
      try {
        localStorage.setItem('ghhot:' + key, JSON.stringify(v))
      } catch {
        /* ignore */
      }
      return v
    }
    try { localStorage.removeItem('ghhot:' + key) } catch { /* ignore */ }
    return [] as T
  }
  return local
}

function safeParse<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}
