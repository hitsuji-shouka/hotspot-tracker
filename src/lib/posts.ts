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
const techModules = import.meta.glob('../tech/*.md', { query: '?raw', import: 'default', eager: true })

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

/** 技术专栏文章：Markdown 文件存在 src/tech/ */
export const techPosts: Post[] = toPosts(techModules)

export function getPost(slug: string): Post | undefined {
  return posts.find((p) => p.slug === slug)
}

export function getTechPost(slug: string): Post | undefined {
  return techPosts.find((p) => p.slug === slug)
}

export function renderMarkdown(md: string): string {
  return marked.parse(md, { async: false }) as string
}
