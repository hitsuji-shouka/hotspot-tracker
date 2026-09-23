// 网址收藏：服务器多端同步 + 本地缓存 + 链接预览抓取（microlink.io，支持跨域）
import { pushSync } from './sync'

export interface BookmarkCategory {
  id: string
  label: string
  emoji: string
  /** 卡片渐变色 */
  gradient: string
}

export const BOOKMARK_CATEGORIES: BookmarkCategory[] = [
  { id: 'blog', label: 'Blog', emoji: '📖', gradient: 'from-[#58a6ff] to-[#1f6feb]' },
  { id: 'tech', label: '技术', emoji: '💻', gradient: 'from-[#39c5cf] to-[#0e7490]' },
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
  return pushSync('bookmarks', list)
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

/** 规范化 URL 用于查重：协议/域名小写、去 www、去末尾斜杠、去 # 锚点 */
export function canonicalUrl(url: string): string {
  try {
    const u = new URL(url)
    const host = u.hostname.toLowerCase().replace(/^www\./, '')
    const path = u.pathname.replace(/\/+$/, '')
    return `${u.protocol.toLowerCase()}//${host}${path}${u.search}`
  } catch {
    return url.trim().toLowerCase().replace(/\/+$/, '')
  }
}

export function faviconUrl(url: string): string {
  return `https://www.google.com/s2/favicons?domain=${domainOf(url)}&sz=128`
}

interface MicrolinkResponse {
  status: string
  statusCode?: number
  data?: {
    title?: string | null
    description?: string | null
    image?: { url?: string } | null
    logo?: { url?: string } | null
    publisher?: string | null
  }
}

/** 抓取网页预览元数据，失败返回 null，可选回调说明原因。 */
export async function fetchLinkPreview(url: string, onError?: (message: string) => void): Promise<Partial<Bookmark> | null> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 20000)
  const fail = (message: string) => { onError?.(message); return null }
  try {
    const res = await fetch(`https://api.microlink.io/?url=${encodeURIComponent(url)}`, {
      signal: ctrl.signal,
    })
    if (res.status === 429) return fail('预览服务请求额度已用完或请求过于频繁，请稍后再试。')
    if (!res.ok) return fail(`预览服务暂不可用（HTTP ${res.status}）。`)
    const json = (await res.json()) as MicrolinkResponse
    // Microlink 外层成功不代表原网站可访问；403 也可能返回编号等占位标题。
    if (json.statusCode === 401 || json.statusCode === 403) return fail('原网站拒绝了预览服务的访问，暂时无法自动获取标题和简介。')
    if (json.statusCode && json.statusCode >= 400) return fail(`原网页暂时无法获取（HTTP ${json.statusCode}）。`)
    if (json.status !== 'success' || !json.data?.title?.trim()) return fail('预览服务未获取到网页标题。')
    return {
      title: json.data.title ?? undefined,
      description: json.data.description ?? undefined,
      image: json.data.image?.url ?? null,
      logo: json.data.logo?.url ?? null,
      siteName: json.data.publisher ?? null,
    }
  } catch {
    return fail(ctrl.signal.aborted ? '获取预览超时，请稍后重试。' : '无法连接预览服务，请检查网络后重试。')
  } finally {
    clearTimeout(timer)
  }
}
