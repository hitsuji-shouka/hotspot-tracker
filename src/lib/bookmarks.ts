// 网址收藏：本地存储 + 链接预览抓取（microlink.io，支持跨域）

export interface BookmarkCategory {
  id: string
  label: string
  emoji: string
  /** 卡片渐变色 */
  gradient: string
}

export const BOOKMARK_CATEGORIES: BookmarkCategory[] = [
  { id: 'blog', label: 'Blog', emoji: '📖', gradient: 'from-[#58a6ff] to-[#1f6feb]' },
  { id: 'work', label: '工作', emoji: '💼', gradient: 'from-[#3fb950] to-[#238636]' },
  { id: 'media', label: '影视', emoji: '🎬', gradient: 'from-[#f78166] to-[#da3633]' },
  { id: 'design', label: '设计', emoji: '🎨', gradient: 'from-[#d2a8ff] to-[#a371f7]' },
  { id: 'other', label: '其他', emoji: '📦', gradient: 'from-[#8b949e] to-[#6e7681]' },
]

export interface Bookmark {
  id: string
  url: string
  title: string
  description: string
  image: string | null
  logo: string | null
  siteName: string | null
  category: string
  addedAt: number
}

const KEY = 'ghhot:bookmarks'

export function loadBookmarks(): Bookmark[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]')
  } catch {
    return []
  }
}

export function saveBookmarks(list: Bookmark[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list))
  } catch {
    /* ignore */
  }
}

export function normalizeUrl(input: string): string {
  let u = input.trim()
  if (!/^https?:\/\//i.test(u)) u = 'https://' + u
  return new URL(u).toString()
}

export function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

export function faviconUrl(url: string): string {
  return `https://www.google.com/s2/favicons?domain=${domainOf(url)}&sz=128`
}

interface MicrolinkResponse {
  status: string
  data?: {
    title?: string | null
    description?: string | null
    image?: { url?: string } | null
    logo?: { url?: string } | null
    publisher?: string | null
  }
}

/** 抓取网页预览元数据（8 秒超时，失败时返回 null，调用方降级展示） */
export async function fetchLinkPreview(url: string): Promise<Partial<Bookmark> | null> {
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 8000)
    const res = await fetch(`https://api.microlink.io/?url=${encodeURIComponent(url)}`, {
      signal: ctrl.signal,
    })
    clearTimeout(timer)
    if (!res.ok) return null
    const json = (await res.json()) as MicrolinkResponse
    if (json.status !== 'success' || !json.data) return null
    return {
      title: json.data.title ?? undefined,
      description: json.data.description ?? undefined,
      image: json.data.image?.url ?? null,
      logo: json.data.logo?.url ?? null,
      siteName: json.data.publisher ?? null,
    }
  } catch {
    return null
  }
}
