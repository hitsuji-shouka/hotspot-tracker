// 通用收藏集合 hook：服务器多端同步 + localStorage 本地缓存
// 用于 Skill 收藏、论文收藏等非仓库类条目
import { useCallback, useEffect, useRef, useState } from 'react'
import { pullKey, pushSync } from '@/lib/sync'
import { adminMessage, canEdit as mayEdit, useAdmin } from '@/lib/admin'

function loadLocal<T>(key: string): T[] {
  try {
    return JSON.parse(localStorage.getItem('ghhot:' + key) ?? '[]')
  } catch {
    return []
  }
}

/**
 * 通用收藏夹。key 为同步存储键，idOf 从条目取唯一标识。
 * 注意：每个挂载的组件持有独立实例，但挂载时会从服务器/本地拉取最新数据，
 * 本站各视图按需挂载，因此切换 Tab 后总能看到最新收藏。
 */
export function useCollection<T>(key: string, idOf: (item: T) => string) {
  const [items, setItems] = useState<T[]>(() => loadLocal<T>(key))
  const [ready, setReady] = useState(false)
  const busy = useRef(false)
  const { canEdit } = useAdmin()

  useEffect(() => {
    pullKey<T[]>(key).then((v) => {
      if (v) setItems(v)
      setReady(true)
    })
  }, [key])

  const toggle = useCallback(
    async (item: T) => {
      if (!mayEdit() || busy.current) return false
      if (!ready) { adminMessage('正在同步已有收藏，请稍后再试。'); return false }
      busy.current = true
      try {
        const id = idOf(item)
        const exists = items.some((x) => idOf(x) === id)
        const next = exists ? items.filter((x) => idOf(x) !== id) : [item, ...items]
        if (!await pushSync(key, next)) return false
        setItems(next)
        return true
      } finally { busy.current = false }
    },
    [idOf, items, key, ready],
  )

  const has = useCallback((id: string) => items.some((x) => idOf(x) === id), [items, idOf])

  return { items, toggle, has, canEdit }
}
