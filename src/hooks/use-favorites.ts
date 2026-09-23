import type { Repo } from '@/lib/github'
import { useCollection } from './use-collection'

const repoId = (repo: Repo) => String(repo.id)
export function useFavorites() {
  const { items, toggle, has, canEdit } = useCollection<Repo>('favorites', repoId)
  return { favorites: items, toggle, isFavorite: (id: number) => has(String(id)), canEdit }
}
