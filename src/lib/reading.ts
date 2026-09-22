export interface ReadingArticle {
  id: string
  url: string
  title: string
  description: string
  image: string | null
  tags: string[]
  addedAt: number
}

export const READING_KEY = 'readingArticles'
const TOPIC_ICONS: Record<string, string> = {
  上下文工程: '🧭',
  记忆机制: '🧠',
  Runtime: '⚙️',
  工具调用: '🛠️',
  多智能体: '🤝',
  Agent评测: '🧪',
  数据库: '🗄️',
  缓存: '⚡',
  消息队列: '📨',
  并发: '🧵',
  分布式: '🌐',
  性能优化: '🚀',
  'AI 编程': '💻',
  测试: '✅',
  可观测性: '📊',
}
export const READING_TOPICS = Object.keys(TOPIC_ICONS)

/** 默认图标只用于显示；自定义标签（包括用户写入的 emoji）原样保留。 */
export function articleTagLabel(tag: string): string {
  const topic = READING_TOPICS.find(item => item.toLowerCase() === tag.toLowerCase())
  return topic ? `${TOPIC_ICONS[topic]} ${tag}` : tag
}

export function articleTags(input: string): string[] {
  const seen = new Set<string>()
  return input.split(/[,，、\n]/).map(tag => tag.trim())
    .map(tag => tag === '评测' ? 'Agent评测' : tag === '代码质量' ? 'AI 编程' : tag)
    .filter(tag => {
      const key = tag.toLowerCase()
      if (!key || seen.has(key)) return false
      seen.add(key)
      return true
    })
}

/** 只迁移旧阅读页格式的默认标签；新编辑器保存的标签不再重复迁移。 */
export function normalizeArticles(articles: ReadingArticle[]): ReadingArticle[] {
  const oldTags: Record<string, string[]> = {
    'reading-x-memory': ['Agent', '大模型'],
    'reading-xhs-experience': ['AI 编程', '工程实践'],
    'reading-zhihu': ['Agent', '大模型'],
    'reading-wechat': ['Agent', '工程实践'],
  }
  return articles.map(article => {
    const seed = INITIAL_READING.find(item => item.id === article.id && articleIdentity(item.url) === articleIdentity(article.url))
    const previous = oldTags[article.id]
    const legacy = 'read' in article || 'note' in article
    const tags = legacy && seed && previous && previous.length === article.tags.length && previous.every(tag => article.tags.includes(tag))
      ? seed.tags : articleTags(article.tags.join('、'))
    return { ...article, tags }
  })
}

export function articleTopics(articles: ReadingArticle[]): { tag: string; count: number }[] {
  const counts = new Map<string, { tag: string; count: number }>()
  for (const article of articles) {
    for (const tag of articleTags(article.tags.join('、'))) {
      const key = tag.toLowerCase()
      const previous = counts.get(key)
      counts.set(key, { tag: previous?.tag ?? tag, count: (previous?.count ?? 0) + 1 })
    }
  }
  return [...counts.values()].sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag, 'zh-CN'))
}

/** 分享文案中只取第一个 http(s) 链接；保留平台分享所需的签名参数。 */
export function articleUrl(input: string): string {
  const raw = input.trim()
  const match = raw.match(/https?:\/\/[^\s<>"\u3000]+/i)?.[0]
  let candidate = (match ?? raw).replace(/[，。！？、；：）》】」』.,!?;:]+$/u, '')
  while (candidate.endsWith(')') && (candidate.match(/\)/g)?.length ?? 0) > (candidate.match(/\(/g)?.length ?? 0)) candidate = candidate.slice(0, -1)
  const url = new URL(/^https?:\/\//i.test(candidate) ? candidate : `https://${candidate}`)
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || !url.hostname.includes('.') || /\s/.test(candidate)) {
    throw new Error('请粘贴完整文章链接，或包含链接的分享文案')
  }
  return url.href
}

export function articleIdentity(input: string): string {
  const url = new URL(input)
  const source = articleSource(input)
  for (const key of [...url.searchParams.keys()]) {
    if (/^utm_/i.test(key) || source === '知乎' && key === 'share_code' || source === '微信公众号' && key === 'scene' || source === 'X' && key === 's') url.searchParams.delete(key)
  }
  url.searchParams.sort()
  return `${url.hostname.toLowerCase().replace(/^www\./, '')}${url.pathname.replace(/\/$/, '')}${url.search}`
}

/** 撤销删除时保留已经重新收藏的版本，避免重复条目或覆盖新修改。 */
export function restoreArticle(articles: ReadingArticle[], removed: ReadingArticle): ReadingArticle[] {
  return articles.some(article => articleIdentity(article.url) === articleIdentity(removed.url)) ? articles : [removed, ...articles]
}

export function articleSource(input: string): string {
  const host = new URL(input).hostname.replace(/^www\./, '')
  if (host === 'zhihu.com' || host.endsWith('.zhihu.com')) return '知乎'
  if (host === 'mp.weixin.qq.com') return '微信公众号'
  if (['x.com', 'twitter.com'].includes(host)) return 'X'
  if (['xiaohongshu.com', 'xhslink.cn', 'xhslink.com'].some(domain => host === domain || host.endsWith(`.${domain}`))) return '小红书'
  return host
}

export function previewImage(input: string | null | undefined): string | null {
  if (!input) return null
  try {
    const url = new URL(input)
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password ? url.href : null
  } catch { return null }
}

// 用户提供的四篇文章；标题、简介来自本次读取结果，不把平台默认分享图当文章封面。
export const INITIAL_READING: ReadingArticle[] = [
  { id: 'reading-x-memory', url: 'https://x.com/wquguru/status/2069641926752780384', title: 'Agent Memory 架构全景：从规则文件、会话检索到反思与技能沉淀', description: '从规则记忆、历史召回到证据链、反思与技能沉淀，梳理 Agent 的记忆架构。', image: 'https://pbs.twimg.com/media/HLjXjA9aYAA70hh?format=webp&name=large', tags: ['记忆机制'] },
  { id: 'reading-xhs-experience', url: 'https://xhslink.cn/o/1Imk7wI8ik6', title: 'AI 写完的代码，如何变成你的经验', description: '每次挑一个没搞懂的地方，先猜它会怎么运行，再让 AI 帮我搭实验。', image: null, tags: ['AI 编程'] },
  { id: 'reading-zhihu', url: 'https://zhuanlan.zhihu.com/p/2077441274156790849?share_code=kmuL5xW0WfHd&utm_psn=2085833936484164542', title: '万字长文谈 pi agent context 管理', description: '从 Skill 是 Prompt 还是 Context 的讨论出发，梳理 Agent 上下文管理。', image: null, tags: ['上下文工程'] },
  { id: 'reading-wechat', url: 'https://mp.weixin.qq.com/s/hBSIPQnsBeWwX9UZLjWYFA?scene=334', title: '《Agent 评测白皮书》系列01：Agent 评测全览', description: '《Agent评测白皮书》系列博客，体系化地为大家讲解评测的落地指南', image: 'https://mmecoa.qpic.cn/sz_mmecoa_jpg/V95GN2mm0DzhZM9HqNJgicfAJQvUuzr3XIEDy2ZUIicgicNiaM7xM8rUstZFWeKlKF9ItIhzB5TjEn3PTRUans2hFFJ4H6KgmyqabLkFQ7JfkZw/0?wx_fmt=jpeg', tags: ['Agent评测'] },
].map(article => ({ ...article, addedAt: 0 }))

export function isReadingList(value: unknown): value is ReadingArticle[] {
  return Array.isArray(value) && value.every(item => {
    if (!item || typeof item !== 'object') return false
    const a = item as ReadingArticle
    try {
      return typeof a.id === 'string' && typeof a.url === 'string' && /^https?:\/\//i.test(a.url) && articleUrl(a.url) === new URL(a.url).href
        && typeof a.title === 'string' && typeof a.description === 'string'
        && (a.image === null || (typeof a.image === 'string' && previewImage(a.image) !== null))
        && Array.isArray(a.tags) && a.tags.every(tag => typeof tag === 'string')
        && Number.isFinite(a.addedAt)
    } catch { return false }
  })
}
