// GitHub 热点仓库数据层
// 使用 GitHub Search API（支持浏览器跨域，未登录 60 次/小时）

export interface Repo {
  id: number
  full_name: string
  html_url: string
  description: string | null
  language: string | null
  stargazers_count: number
  forks_count: number
  open_issues_count: number
  created_at: string
  pushed_at: string
  topics: string[]
  owner: {
    login: string
    avatar_url: string
  }
}

export interface SearchResult {
  total_count: number
  items: Repo[]
}

export type TimeRange = 'daily' | 'weekly' | 'monthly'

export interface Category {
  id: string
  label: string
  /** GitHub search qualifier, e.g. "language:python" 或 "topic:llm" */
  qualifier: string
  emoji: string
}

export const LANGUAGES: Category[] = [
  { id: 'all', label: '全部语言', qualifier: '', emoji: '🔥' },
  { id: 'typescript', label: 'TypeScript', qualifier: 'language:typescript', emoji: '🔷' },
  { id: 'javascript', label: 'JavaScript', qualifier: 'language:javascript', emoji: '🟨' },
  { id: 'python', label: 'Python', qualifier: 'language:python', emoji: '🐍' },
  { id: 'go', label: 'Go', qualifier: 'language:go', emoji: '🐹' },
  { id: 'rust', label: 'Rust', qualifier: 'language:rust', emoji: '🦀' },
  { id: 'java', label: 'Java', qualifier: 'language:java', emoji: '☕' },
  { id: 'cpp', label: 'C++', qualifier: 'language:c++', emoji: '⚙️' },
  { id: 'swift', label: 'Swift', qualifier: 'language:swift', emoji: '🕊️' },
  { id: 'vue', label: 'Vue', qualifier: 'language:vue', emoji: '💚' },
]

export const TOPICS: Category[] = [
  { id: 'ai', label: 'AI / 大模型', qualifier: 'topic:llm', emoji: '🤖' },
  { id: 'web', label: 'Web 前端', qualifier: 'topic:frontend', emoji: '🌐' },
  { id: 'devops', label: '开发工具', qualifier: 'topic:devtools', emoji: '🛠️' },
  { id: 'docker', label: '云原生', qualifier: 'topic:docker', emoji: '🐳' },
  { id: 'blockchain', label: '区块链', qualifier: 'topic:blockchain', emoji: '⛓️' },
]

function dateDaysAgo(days: number): string {
  const d = new Date(Date.now() - days * 24 * 3600 * 1000)
  return d.toISOString().slice(0, 10)
}

const RANGE_DAYS: Record<TimeRange, number> = {
  daily: 1,
  weekly: 7,
  monthly: 30,
}

const RANGE_LABEL: Record<TimeRange, string> = {
  daily: '今日',
  weekly: '本周',
  monthly: '本月',
}

export function rangeLabel(r: TimeRange) {
  return RANGE_LABEL[r]
}

export class RateLimitError extends Error {
  resetAt: Date | null
  constructor(resetAt: Date | null) {
    super('GitHub API 请求次数已达上限')
    this.resetAt = resetAt
  }
}

async function ghFetch(url: string): Promise<SearchResult> {
  const res = await fetch(url, {
    headers: { Accept: 'application/vnd.github+json' },
  })
  if (res.status === 403 || res.status === 429) {
    const reset = res.headers.get('x-ratelimit-reset')
    throw new RateLimitError(reset ? new Date(Number(reset) * 1000) : null)
  }
  if (!res.ok) throw new Error(`GitHub API 请求失败 (${res.status})`)
  return res.json()
}

/** 拉取热点仓库：按创建时间 + star 排序，模拟 trending */
export async function fetchHotRepos(
  category: Category,
  range: TimeRange,
): Promise<SearchResult> {
  const since = dateDaysAgo(RANGE_DAYS[range])
  const parts = [`created:>${since}`, 'stars:>5']
  if (category.qualifier) parts.push(category.qualifier)
  const q = encodeURIComponent(parts.join(' '))
  const url = `https://api.github.com/search/repositories?q=${q}&sort=stars&order=desc&per_page=30`
  return ghFetch(url)
}

export interface GithubUser {
  login: string
  avatar_url: string
  name: string | null
  public_repos: number
  followers: number
  following?: number
  bio?: string | null
  location?: string | null
}

async function ghFetchRaw<T>(url: string, token?: string): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/vnd.github+json' }
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(url, { headers })
  if (res.status === 403 || res.status === 429) {
    const reset = res.headers.get('x-ratelimit-reset')
    throw new RateLimitError(reset ? new Date(Number(reset) * 1000) : null)
  }
  if (res.status === 401) throw new Error('Token 无效或已过期，请检查后重试')
  if (res.status === 404) throw new Error('用户不存在，请检查 GitHub 用户名')
  if (!res.ok) throw new Error(`GitHub API 请求失败 (${res.status})`)
  return res.json()
}

/** 验证用户名 / token。带 token 时走 /user（含私有身份），否则查公开资料 */
export async function fetchUser(username: string, token?: string): Promise<GithubUser> {
  if (token) return ghFetchRaw<GithubUser>('https://api.github.com/user', token)
  return ghFetchRaw<GithubUser>(`https://api.github.com/users/${encodeURIComponent(username)}`)
}

/** 我的仓库（按最近更新排序）。带 token 时可包含私有仓库 */
export async function fetchUserRepos(username: string, token?: string): Promise<Repo[]> {
  const url = token
    ? 'https://api.github.com/user/repos?sort=pushed&per_page=50&affiliation=owner'
    : `https://api.github.com/users/${encodeURIComponent(username)}/repos?sort=pushed&per_page=50&type=owner`
  return ghFetchRaw<Repo[]>(url, token)
}

/** 我 Star 的仓库（按收藏时间倒序） */
export async function fetchUserStarred(username: string, token?: string): Promise<Repo[]> {
  const url = token
    ? 'https://api.github.com/user/starred?per_page=50'
    : `https://api.github.com/users/${encodeURIComponent(username)}/starred?per_page=50`
  return ghFetchRaw<Repo[]>(url, token)
}

/** 根据 owner/repo 获取单个公开仓库，用于手动导入收藏。 */
export async function fetchRepo(fullName: string): Promise<Repo> {
  const path = fullName.split('/').map(encodeURIComponent).join('/')
  const res = await fetch(`https://api.github.com/repos/${path}`, {
    headers: { Accept: 'application/vnd.github+json' },
  })
  if (res.status === 403 || res.status === 429) {
    const reset = res.headers.get('x-ratelimit-reset')
    throw new RateLimitError(reset ? new Date(Number(reset) * 1000) : null)
  }
  if (res.status === 404) throw new Error('仓库不存在或不是公开仓库')
  if (!res.ok) throw new Error(`GitHub API 请求失败 (${res.status})`)
  return res.json()
}

/** 拉取各语言热度概览（用于首页统计条） */
export async function fetchOverview(range: TimeRange) {
  const since = dateDaysAgo(RANGE_DAYS[range])
  const langs = ['typescript', 'python', 'go', 'rust', 'javascript', 'java']
  const results = await Promise.all(
    langs.map(async (lang) => {
      const q = encodeURIComponent(`created:>${since} stars:>5 language:${lang}`)
      const data = await ghFetch(
        `https://api.github.com/search/repositories?q=${q}&sort=stars&order=desc&per_page=1`,
      )
      return { lang, count: data.total_count, top: data.items[0] ?? null }
    }),
  )
  return results
}

/** localStorage 缓存（10 分钟有效），减少 API 限流风险 */
const CACHE_TTL = 10 * 60 * 1000

export function cacheGet<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem('ghhot:' + key)
    if (!raw) return null
    const { at, data } = JSON.parse(raw)
    if (Date.now() - at > CACHE_TTL) return null
    return data as T
  } catch {
    return null
  }
}

export function cacheSet(key: string, data: unknown) {
  try {
    localStorage.setItem('ghhot:' + key, JSON.stringify({ at: Date.now(), data }))
  } catch {
    /* ignore */
  }
}

export function formatNumber(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k'
  return String(n)
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const h = Math.floor(diff / 3600000)
  if (h < 1) return '刚刚'
  if (h < 24) return `${h} 小时前`
  const d = Math.floor(h / 24)
  return `${d} 天前`
}
