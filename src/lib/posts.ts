// 博客文章：Markdown 文件存在 src/posts/，构建时打包进站点
import { marked } from 'marked'

export interface Post {
  slug: string
  title: string
  date: string
  tags: string[]
  summary: string
  content: string
}

interface Frontmatter {
  title?: string
  date?: string
  tags?: string[]
  summary?: string
}

function parseFrontmatter(raw: string): { meta: Frontmatter; body: string } {
  const m = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
  if (!m) return { meta: {}, body: raw }
  const meta: Frontmatter = {}
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^(\w+):\s*(.*)$/)
    if (!kv) continue
    const [, key, value] = kv
    if (key === 'tags') {
      meta.tags = value
        .replace(/^\[|\]$/g, '')
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
    } else {
      ;(meta as Record<string, unknown>)[key] = value.trim()
    }
  }
  return { meta, body: m[2] }
}

const modules = import.meta.glob('../posts/*.md', { query: '?raw', import: 'default', eager: true })
const studyModules = import.meta.glob('../study/*.md', { query: '?raw', import: 'default', eager: true })

function toPosts(mods: Record<string, unknown>): Post[] {
  return Object.entries(mods)
    .map(([path, raw]) => {
      const slug = path.split('/').pop()!.replace(/\.md$/, '')
      const { meta, body } = parseFrontmatter(raw as string)
      return {
        slug,
        title: meta.title ?? slug,
        date: meta.date ?? '',
        tags: meta.tags ?? [],
        summary: meta.summary ?? '',
        content: body,
      }
    })
    .sort((a, b) => b.date.localeCompare(a.date))
}

export const posts: Post[] = toPosts(modules)

/** 学习专栏文章：Markdown 文件存在 src/study/ */
export const studyPosts: Post[] = toPosts(studyModules)

export function getPost(slug: string): Post | undefined {
  return posts.find((p) => p.slug === slug)
}

export function getStudyPost(slug: string): Post | undefined {
  return studyPosts.find((p) => p.slug === slug)
}

/**
 * 把正文里单独一行的视频链接转成内嵌播放器（v2）：
 *   · B 站链接（https://www.bilibili.com/video/BV...）→ B 站内嵌播放器
 *   · YouTube 链接 → YouTube 内嵌播放器
 *   · 直链视频（.mp4/.webm 结尾）→ <video> 标签
 * 其他行原样保留。
 */
function embedMedia(md: string): string {
  return md
    .split('\n')
    .map((line) => {
      const t = line.trim()
      const bv = t.match(/^https?:\/\/(?:www\.)?bilibili\.com\/video\/(BV[\w]+)/)
      if (bv) {
        return `<div class="video-embed"><iframe src="https://player.bilibili.com/player.html?bvid=${bv[1]}&high_quality=1" allowfullscreen scrolling="no" frameborder="0"></iframe></div>`
      }
      const yt = t.match(/^https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/)
      if (yt) {
        return `<div class="video-embed"><iframe src="https://www.youtube-nocookie.com/embed/${yt[1]}" allowfullscreen frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"></iframe></div>`
      }
      if (/^https?:\/\/\S+\.(mp4|webm)(\?\S*)?$/i.test(t)) {
        return `<video class="video-embed" src="${t}" controls playsinline preload="metadata"></video>`
      }
      return line
    })
    .join('\n')
}

export function renderMarkdown(md: string): string {
  const html = marked.parse(embedMedia(md), { async: false }) as string
  // 有 alt 文字的图片转成 figure + figcaption，注释显示在图片下方
  return html.replace(/<img([^>]*?)>/g, (tag, attrs: string) => {
    const alt = attrs.match(/alt="([^"]*)"/)?.[1]
    if (!alt) return tag
    return `<figure><img${attrs}><figcaption>${alt}</figcaption></figure>`
  })
}
