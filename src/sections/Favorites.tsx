import { useState } from 'react'
import RepoCard from '@/components/RepoCard'
import Bookmarks from '@/sections/Bookmarks'
import { useFavorites } from '@/hooks/use-favorites'
import { useCollection } from '@/hooks/use-collection'
import { paperId, type PaperItem } from '@/sections/Papers'
import { skillShId, type SkillShItem } from '@/sections/Skills'
import { fetchRepo, formatNumber } from '@/lib/github'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { ArrowUpRight, Download, FileText, Heart, Link2, Loader2, Plus, ThumbsUp } from 'lucide-react'

type SubTab = 'links' | 'repos' | 'skills' | 'papers'

const SUB_TABS: { id: SubTab; label: string; emoji: string }[] = [
  { id: 'links', label: '网址', emoji: '🔖' },
  { id: 'repos', label: '仓库', emoji: '❤️' },
  { id: 'skills', label: 'Skill', emoji: '🧩' },
  { id: 'papers', label: '论文', emoji: '📄' },
]

export default function Favorites({ keyword }: { keyword: string }) {
  const [tab, setTab] = useState<SubTab>('links')

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* 子分类 */}
      <div className="grid grid-cols-4 gap-1 rounded-xl border border-[#30363d] bg-[#161b22] p-1">
        {SUB_TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            aria-pressed={tab === t.id}
            className={`min-w-0 rounded-lg px-1 py-2 text-xs font-medium transition-colors sm:px-4 sm:text-sm ${
              tab === t.id
                ? 'bg-[#e3b341]/15 text-[#e3b341] shadow-[inset_0_0_0_1px_rgba(227,179,65,0.45)]'
                : 'text-[#8b949e] hover:bg-[#21262d] hover:text-[#c9d1d9]'
            }`}
          >
            <span className="mr-1">{t.emoji}</span>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'links' ? (
        <Bookmarks keyword={keyword} />
      ) : tab === 'repos' ? (
        <RepoFavs keyword={keyword} />
      ) : tab === 'skills' ? (
        <SkillFavs keyword={keyword} />
      ) : (
        <PaperFavs keyword={keyword} />
      )}
    </div>
  )
}

/* ─── 仓库收藏 ─── */
function RepoFavs({ keyword }: { keyword: string }) {
  const { favorites, toggle, isFavorite } = useFavorites()
  const k = keyword.trim().toLowerCase()
  const filtered = k
    ? favorites.filter(
        (r) =>
          r.full_name.toLowerCase().includes(k) ||
          (r.description ?? '').toLowerCase().includes(k) ||
          r.topics.some((t) => t.includes(k)),
      )
    : favorites

  const importRepo = async (url: string) => {
    const fullName = githubRepoFromUrl(url)
    if (!fullName) throw new Error('请输入 GitHub 仓库链接，如 github.com/owner/repo')
    const repo = await fetchRepo(fullName)
    if (isFavorite(repo.id)) throw new Error('这个仓库已经收藏过了')
    toggle(repo)
  }

  return (
    <div className="space-y-4">
      <FavoriteHeader emoji="❤️" title="仓库收藏" count={favorites.length} kind="repo" onImport={importRepo} />
      {filtered.length === 0 ? (
        <Empty emoji="❤️" text={k ? '没有匹配的收藏仓库' : '还没有收藏仓库，可以从热点收藏或导入 GitHub 链接'} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((repo, i) => (
            <RepoCard key={repo.id} repo={repo} rank={i + 1} favorite={isFavorite(repo.id)} onToggleFavorite={toggle} />
          ))}
        </div>
      )}
    </div>
  )
}

/* ─── Skill 收藏 ─── */
function SkillFavs({ keyword }: { keyword: string }) {
  const { items, toggle, has } = useCollection<SkillShItem>('fav_skills', skillShId)
  const k = keyword.trim().toLowerCase()
  const filtered = k ? items.filter((s) => `${s.name} ${s.source}`.toLowerCase().includes(k)) : items

  const importSkill = async (url: string, name: string) => {
    const item = skillFromUrl(url, name)
    if (has(item.url)) throw new Error('这个 Skill 已经收藏过了')
    toggle(item)
  }

  return (
    <div className="space-y-2">
      <FavoriteHeader emoji="🧩" title="Skill 收藏" count={items.length} kind="skill" onImport={importSkill} />
      {filtered.length === 0 ? (
        <Empty emoji="🧩" text={k ? '没有匹配的收藏 Skill' : '还没有收藏 Skill，可以从榜单收藏或导入链接'} />
      ) : (
        filtered.map((s) => (
          <div
            key={s.url}
            className="flex items-center gap-2.5 rounded-lg border border-[#30363d] bg-[#161b22] px-3 py-3 hover:border-[#a371f7]/50 transition-colors sm:gap-3 sm:px-4"
          >
            <div className="min-w-0 flex-1">
              <a href={s.url} target="_blank" rel="noreferrer" className="block truncate font-semibold text-[#d2a8ff] hover:underline">
                {s.name}
              </a>
              <div className="text-xs text-[#8b949e] truncate">{s.source}</div>
            </div>
            <span className="flex items-center gap-1 text-xs text-[#3fb950] shrink-0">
              {s.installs > 0 ? <Download className="w-3.5 h-3.5" /> : <Link2 className="w-3.5 h-3.5" />}
              {s.installs > 0 ? <>{formatNumber(s.installs)}<span className="hidden sm:inline"> 安装</span></> : '手动导入'}
            </span>
            <button
              onClick={() => toggle(s)}
              title={has(s.url) ? '取消收藏' : '收藏'}
              className={`p-2 rounded-md transition-colors shrink-0 ${
                has(s.url) ? 'text-[#f85149]' : 'text-[#8b949e] hover:text-[#f85149] hover:bg-[#30363d]'
              }`}
            >
              <Heart className="w-4 h-4" fill={has(s.url) ? 'currentColor' : 'none'} />
            </button>
          </div>
        ))
      )}
    </div>
  )
}

/* ─── 论文收藏 ─── */
function PaperFavs({ keyword }: { keyword: string }) {
  const { items, toggle, has } = useCollection<PaperItem>('fav_papers', paperId)
  const k = keyword.trim().toLowerCase()
  const filtered = k
    ? items.filter((p) => `${p.title} ${p.abstract ?? ''} ${p.authors.join(' ')}`.toLowerCase().includes(k))
    : items

  const importPaper = async (url: string, title: string) => {
    const item = paperFromUrl(url, title)
    if (has(item.id)) throw new Error('这篇论文已经收藏过了')
    toggle(item)
  }

  return (
    <div className="space-y-3">
      <FavoriteHeader emoji="📄" title="论文收藏" count={items.length} kind="paper" onImport={importPaper} />
      {filtered.length === 0 ? (
        <Empty emoji="📄" text={k ? '没有匹配的收藏论文' : '还没有收藏论文，可以从榜单收藏或导入链接'} />
      ) : (
        filtered.map((p) => (
          <div
            key={p.id}
            className="rounded-lg border border-[#30363d] bg-[#161b22] px-3 py-3 hover:border-[#58a6ff]/50 transition-colors sm:px-4"
          >
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <a href={p.url} target="_blank" rel="noreferrer" className="font-semibold text-[#58a6ff] hover:underline leading-snug">
                  {p.title}
                </a>
                <div className="text-xs text-[#8b949e] mt-1 flex items-center gap-2 flex-wrap">
                  {p.upvotes > 0 && (
                    <span className="flex items-center gap-1 text-[#e3b341]">
                      <ThumbsUp className="w-3 h-3" />
                      {p.upvotes}
                    </span>
                  )}
                  {p.publishedAt && <span>· {p.publishedAt}</span>}
                  {p.authors.length > 0 && (
                    <span className="truncate">· {p.authors.slice(0, 3).join(', ')}{p.authors.length > 3 ? ' 等' : ''}</span>
                  )}
                </div>
                {p.abstract && <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-[#8b949e] sm:line-clamp-none">{p.abstract}</p>}
              </div>
              <div className="flex flex-col items-center gap-1 shrink-0">
                <button
                  onClick={() => toggle(p)}
                  title={has(p.id) ? '取消收藏' : '收藏'}
                  className={`p-2 rounded-md transition-colors ${
                    has(p.id) ? 'text-[#f85149]' : 'text-[#8b949e] hover:text-[#f85149] hover:bg-[#30363d]'
                  }`}
                >
                  <Heart className="w-4 h-4" fill={has(p.id) ? 'currentColor' : 'none'} />
                </button>
                <a
                  href={p.arxiv}
                  target="_blank"
                  rel="noreferrer"
                  title="查看 arXiv 原文"
                  className="flex items-center gap-1 rounded-md p-2 text-xs text-[#8b949e] hover:text-white hover:bg-[#30363d] sm:px-2 sm:py-1"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">arXiv</span>
                  <ArrowUpRight className="hidden w-3 h-3 sm:block" />
                </a>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  )
}

type ImportKind = 'repo' | 'skill' | 'paper'

const IMPORT_COPY: Record<ImportKind, { title: string; placeholder: string; namePlaceholder?: string }> = {
  repo: { title: '导入 GitHub 仓库', placeholder: 'https://github.com/owner/repo' },
  skill: { title: '导入 Skill', placeholder: 'skills.sh 或 GitHub 链接', namePlaceholder: '显示名称（可选）' },
  paper: { title: '导入论文', placeholder: 'arXiv 或 Hugging Face Papers 链接', namePlaceholder: '论文标题（可选）' },
}

function FavoriteHeader({
  emoji,
  title,
  count,
  kind,
  onImport,
}: {
  emoji: string
  title: string
  count: number
  kind: ImportKind
  onImport: (url: string, name: string) => Promise<void>
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="mr-auto min-w-0">
        <h2 className="font-bold text-white">{emoji} {title}</h2>
        <p className="mt-0.5 text-xs text-[#8b949e]">共 {count} 个</p>
      </div>
      <ImportLinkDialog kind={kind} onImport={onImport} />
    </div>
  )
}

function ImportLinkDialog({ kind, onImport }: { kind: ImportKind; onImport: (url: string, name: string) => Promise<void> }) {
  const copy = IMPORT_COPY[kind]
  const [open, setOpen] = useState(false)
  const [url, setUrl] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const submit = async () => {
    if (!url.trim()) return
    setLoading(true)
    setError('')
    try {
      await onImport(url.trim(), name.trim())
      setOpen(false)
      setUrl('')
      setName('')
    } catch (e) {
      setError(e instanceof Error ? e.message : '导入失败，请检查链接')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="shrink-0 bg-[#238636] text-white hover:bg-[#2ea043]">
          <Plus className="mr-1.5 h-4 w-4" />
          导入链接
        </Button>
      </DialogTrigger>
      <DialogContent className="border-[#30363d] bg-[#161b22] text-[#c9d1d9]">
        <DialogHeader>
          <DialogTitle className="text-white">{copy.title}</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4 pt-2"
          onSubmit={(event) => {
            event.preventDefault()
            void submit()
          }}
        >
          <Input
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder={copy.placeholder}
            className="border-[#30363d] bg-[#0d1117]"
            autoFocus
          />
          {copy.namePlaceholder && (
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={copy.namePlaceholder}
              className="border-[#30363d] bg-[#0d1117]"
            />
          )}
          {error && <p className="text-sm text-[#f85149]">{error}</p>}
          <Button type="submit" disabled={loading || !url.trim()} className="w-full bg-[#238636] text-white hover:bg-[#2ea043]">
            {loading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Link2 className="mr-1.5 h-4 w-4" />}
            {loading ? '正在导入…' : '导入收藏'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function normalizedUrl(value: string): URL {
  const input = /^https?:\/\//i.test(value) ? value : `https://${value}`
  let url: URL
  try {
    url = new URL(input)
  } catch {
    throw new Error('链接格式不正确')
  }
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('只支持 http 或 https 链接')
  url.hash = ''
  url.pathname = url.pathname.replace(/\/$/, '') || '/'
  return url
}

function githubRepoFromUrl(value: string): string | null {
  const url = normalizedUrl(value)
  if (url.hostname.toLowerCase() !== 'github.com') return null
  const [owner, rawRepo] = url.pathname.split('/').filter(Boolean)
  const repo = rawRepo?.replace(/\.git$/i, '')
  return owner && repo ? `${owner}/${repo}` : null
}

function skillFromUrl(value: string, customName: string): SkillShItem {
  const url = normalizedUrl(value)
  const parts = url.pathname.split('/').filter(Boolean)
  if (url.hostname.toLowerCase() === 'skills.sh' && parts.length >= 3) {
    const [owner, repo] = parts
    return {
      rank: null,
      name: customName || parts.at(-1)!,
      source: `${owner}/${repo}`,
      installs: 0,
      url: url.href,
      github: `https://github.com/${owner}/${repo}`,
    }
  }
  const fullName = githubRepoFromUrl(url.href)
  if (!fullName) throw new Error('请输入 skills.sh 或 GitHub 仓库链接')
  return {
    rank: null,
    name: customName || fullName.split('/')[1],
    source: fullName,
    installs: 0,
    url: url.href,
    github: `https://github.com/${fullName}`,
  }
}

function paperFromUrl(value: string, customTitle: string): PaperItem {
  const url = normalizedUrl(value)
  const host = url.hostname.toLowerCase()
  let id = ''
  if (host === 'arxiv.org') {
    id = url.pathname.replace(/^\/(?:abs|pdf)\//, '').replace(/\.pdf$/i, '').replace(/v\d+$/i, '')
  } else if (host === 'huggingface.co' && url.pathname.startsWith('/papers/')) {
    id = url.pathname.slice('/papers/'.length).split('/')[0].replace(/v\d+$/i, '')
  }
  if (!id || !/^(?:\d{4}\.\d{4,5}|[a-z-]+(?:\.[A-Z]{2})?\/\d{7})$/i.test(id)) {
    throw new Error('请输入 arXiv 或 Hugging Face Papers 论文链接')
  }
  return {
    id,
    title: customTitle || `论文 ${id}`,
    url: url.href,
    arxiv: `https://arxiv.org/abs/${id}`,
    upvotes: 0,
    publishedAt: '',
    authors: [],
    abstract: null,
  }
}

function Empty({ emoji, text }: { emoji: string; text: string }) {
  return (
    <div className="text-center py-20 text-[#8b949e]">
      <p className="text-4xl mb-3">{emoji}</p>
      <p>{text}</p>
    </div>
  )
}
