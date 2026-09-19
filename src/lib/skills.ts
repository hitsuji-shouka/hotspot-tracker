// 热门 Skills 数据层
// Skills 主要以含 SKILL.md 的 GitHub 仓库形式分发，用 GitHub 搜索按分类抓取

import { cacheGet, cacheSet, RateLimitError, type Repo, type TimeRange } from './github'

export { RateLimitError }

export interface SkillCategory {
  id: string
  label: string
  emoji: string
  /** 追加到基础查询后的关键词（匹配 name/description/readme），空串表示综合榜 */
  keyword: string
  hint: string
}

export const SKILL_CATEGORIES: SkillCategory[] = [
  { id: 'all', label: '综合热门', emoji: '🔥', keyword: '', hint: '全品类最热 Skill 仓库' },
  { id: 'coding', label: '编程开发', emoji: '💻', keyword: 'coding', hint: '代码生成、调试、重构、审查' },
  { id: 'design', label: '设计创意', emoji: '🎨', keyword: 'design', hint: 'UI 设计、海报、图片生成' },
  { id: 'writing', label: '写作内容', emoji: '✍️', keyword: 'writing', hint: '文案、润色、翻译、总结' },
  { id: 'data', label: '数据分析', emoji: '📊', keyword: 'data', hint: '数据处理、表格、可视化' },
  { id: 'media', label: '音视频', emoji: '🎬', keyword: 'video', hint: '视频、音频、字幕处理' },
  { id: 'automation', label: '效率自动化', emoji: '⚡', keyword: 'automation', hint: '工作流、定时任务、办公自动化' },
  { id: 'research', label: '科研学习', emoji: '🔬', keyword: 'research', hint: '论文、文献、学习助手' },
  { id: 'business', label: '营销商业', emoji: '📈', keyword: 'marketing', hint: '营销、SEO、商业分析' },
  { id: 'devops', label: '运维部署', emoji: '🛠️', keyword: 'devops', hint: 'CI/CD、云服务、监控运维' },
]

export type SkillRange = 'new-week' | 'new-month' | 'all-time'

export const SKILL_RANGE_LABEL: Record<SkillRange, string> = {
  'new-week': '本周新星',
  'new-month': '本月新星',
  'all-time': '总榜',
}

function dateDaysAgo(days: number): string {
  return new Date(Date.now() - days * 24 * 3600 * 1000).toISOString().slice(0, 10)
}

async function ghSearch(url: string) {
  const res = await fetch(url, { headers: { Accept: 'application/vnd.github+json' } })
  if (res.status === 403 || res.status === 429) {
    const reset = res.headers.get('x-ratelimit-reset')
    throw new RateLimitError(reset ? new Date(Number(reset) * 1000) : null)
  }
  if (!res.ok) throw new Error(`GitHub API 请求失败 (${res.status})`)
  return res.json() as Promise<{ total_count: number; items: Repo[] }>
}

/** 抓取热门 Skill 仓库 */
export async function fetchHotSkills(
  category: SkillCategory,
  range: SkillRange,
  force = false,
): Promise<Repo[]> {
  const cacheKey = `skills:${category.id}:${range}`
  if (!force) {
    const cached = cacheGet<Repo[]>(cacheKey)
    if (cached) return cached
  }

  const parts = ['skill in:name,description', 'topic:claude-skills']
  if (category.keyword) parts.push(`${category.keyword} in:name,description,readme`)
  if (range === 'new-week') parts.push(`created:>${dateDaysAgo(7)}`, 'stars:>2')
  else if (range === 'new-month') parts.push(`created:>${dateDaysAgo(30)}`, 'stars:>2')

  const q = encodeURIComponent(parts.join(' '))
  const data = await ghSearch(
    `https://api.github.com/search/repositories?q=${q}&sort=stars&order=desc&per_page=30`,
  )
  cacheSet(cacheKey, data.items)
  return data.items
}

export type { TimeRange }
