import { useCallback, useEffect, useState } from 'react'
import type { Repo } from '@/lib/github'
import { pullKey, pushSync } from '@/lib/sync'

function loadLocal(): Repo[] {
  try {
    return JSON.parse(localStorage.getItem('ghhot:favorites') ?? '[]')
  } catch {
    return []
  }
}

/** 收藏夹：服务器多端同步 + localStorage 本地缓存 */
export function useFavorites() {
  const [favorites, setFavorites] = useState<Repo[]>(loadLocal)

  // 启动时从服务器拉取（其他设备的收藏会同步过来）
  useEffect(() => {
    pullKey<Repo[]>('favorites').then((v) => {
      if (v) setFavorites(v)
    })
  }, [])

  const toggle = useCallback((repo: Repo) => {
    setFavorites((prev) => {
      const exists = prev.some((r) => r.id === repo.id)
      const next = exists ? prev.filter((r) => r.id !== repo.id) : [repo, ...prev]
      pushSync('favorites', next)
      return next
    })
  }, [])

  const isFavorite = useCallback(
    (id: number) => favorites.some((r) => r.id === id),
    [favorites],
  )

  return { favorites, toggle, isFavorite }
}
