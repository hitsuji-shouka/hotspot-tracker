import { useCallback, useState } from 'react'
import type { Repo } from '@/lib/github'

const KEY = 'ghhot:favorites'

function load(): Repo[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]')
  } catch {
    return []
  }
}

/** 收藏夹：localStorage 持久化，跨页面刷新保留 */
export function useFavorites() {
  const [favorites, setFavorites] = useState<Repo[]>(load)

  const toggle = useCallback((repo: Repo) => {
    setFavorites((prev) => {
      const exists = prev.some((r) => r.id === repo.id)
      const next = exists ? prev.filter((r) => r.id !== repo.id) : [repo, ...prev]
      try {
        localStorage.setItem(KEY, JSON.stringify(next))
      } catch {
        /* ignore */
      }
      return next
    })
  }, [])

  const isFavorite = useCallback(
    (id: number) => favorites.some((r) => r.id === id),
    [favorites],
  )

  return { favorites, toggle, isFavorite }
}
