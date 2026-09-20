// 多端同步层：数据以服务器为准（/api/sync），localStorage 作为本地缓存
// 手机和电脑都从同一台服务器加载页面，因此天然共享同一份数据

type SyncData = Record<string, unknown>

let cache: SyncData | null = null
let pulling: Promise<SyncData | null> | null = null

/** 从服务器拉取全量同步数据；失败（如 dev 预览无此接口）返回 null */
export async function pullSync(): Promise<SyncData | null> {
  if (pulling) return pulling
  pulling = (async () => {
    try {
      const res = await fetch(`/api/sync?t=${Date.now()}`)
      if (!res.ok) return null
      cache = await res.json()
      return cache
    } catch {
      return null
    } finally {
      pulling = null
    }
  })()
  return pulling
}

/** 写入：先写 localStorage（立即生效），再异步推送到服务器 */
export function pushSync(key: string, value: unknown) {
  try {
    localStorage.setItem('ghhot:' + key, JSON.stringify(value))
  } catch {
    /* ignore */
  }
  if (cache) cache[key] = value
  fetch('/api/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, value }),
  }).catch(() => {
    /* 离线时静默失败，本地已保存 */
  })
}

/**
 * 读取某个 key：优先服务器数据，其次本地缓存。
 * 首次调用时若服务器为空而本地有数据，自动把本地数据上传（数据迁移）。
 */
export async function pullKey<T>(key: string): Promise<T | null> {
  const server = await pullSync()
  const localRaw = localStorage.getItem('ghhot:' + key)
  const local: T | null = localRaw ? safeParse<T>(localRaw) : null

  if (server) {
    if (key in server) {
      const v = server[key] as T
      try {
        localStorage.setItem('ghhot:' + key, JSON.stringify(v))
      } catch {
        /* ignore */
      }
      return v
    }
    if (local != null) {
      // 服务器还没有这个 key：把本地数据迁移上去
      pushSync(key, local)
      return local
    }
    return null
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
