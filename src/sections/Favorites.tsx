import { useState } from 'react'
import RepoCard from '@/components/RepoCard'
import Bookmarks from '@/sections/Bookmarks'
import { useFavorites } from '@/hooks/use-favorites'
import { useCollection } from '@/hooks/use-collection'
import { paperId, type PaperItem } from '@/sections/Papers'
import { skillShId, type SkillShItem } from '@/sections/Skills'
import { formatNumber } from '@/lib/github'
import { ArrowUpRight, Download, FileText, Heart, ThumbsUp } from 'lucide-react'

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
    <div className="space-y-5">
      {/* 子分类 */}
      <div className="flex flex-wrap gap-2">
        {SUB_TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
              tab === t.id
                ? 'bg-[#e3b341]/15 text-[#e3b341] border-[#e3b341]/60'
                : 'bg-[#161b22] text-[#8b949e] border-[#30363d] hover:border-[#8b949e] hover:text-[#c9d1d9]'
            }`}
          >
            {t.emoji} {t.label}收藏
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

  if (filtered.length === 0) {
    return <Empty emoji="❤️" text={k ? '没有匹配的收藏仓库' : '还没有收藏仓库，去「GitHub 热点」点卡片上的 ♡ 收藏'} />
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {filtered.map((repo, i) => (
        <RepoCard key={repo.id} repo={repo} rank={i + 1} favorite={isFavorite(repo.id)} onToggleFavorite={toggle} />
      ))}
    </div>
  )
}

/* ─── Skill 收藏 ─── */
function SkillFavs({ keyword }: { keyword: string }) {
  const { items, toggle, has } = useCollection<SkillShItem>('fav_skills', skillShId)
  const k = keyword.trim().toLowerCase()
  const filtered = k ? items.filter((s) => `${s.name} ${s.source}`.toLowerCase().includes(k)) : items

  if (filtered.length === 0) {
    return <Empty emoji="🧩" text={k ? '没有匹配的收藏 Skill' : '还没有收藏 Skill，去「Skills」榜点 ♡ 收藏'} />
  }
  return (
    <div className="space-y-2">
      {filtered.map((s) => (
        <div
          key={s.url}
          className="flex items-center gap-3 rounded-lg border border-[#30363d] bg-[#161b22] px-4 py-3 hover:border-[#a371f7]/50 transition-colors"
        >
          <div className="min-w-0 flex-1">
            <a href={s.url} target="_blank" rel="noreferrer" className="font-semibold text-[#d2a8ff] hover:underline">
              {s.name}
            </a>
            <div className="text-xs text-[#8b949e] truncate">{s.source}</div>
          </div>
          <span className="flex items-center gap-1 text-xs text-[#3fb950] shrink-0">
            <Download className="w-3.5 h-3.5" />
            {formatNumber(s.installs)} 安装
          </span>
          <button
            onClick={() => toggle(s)}
            title={has(s.url) ? '取消收藏' : '收藏'}
            className={`p-1.5 rounded-md transition-colors shrink-0 ${
              has(s.url) ? 'text-[#f85149]' : 'text-[#8b949e] hover:text-[#f85149] hover:bg-[#30363d]'
            }`}
          >
            <Heart className="w-4 h-4" fill={has(s.url) ? 'currentColor' : 'none'} />
          </button>
        </div>
      ))}
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

  if (filtered.length === 0) {
    return <Empty emoji="📄" text={k ? '没有匹配的收藏论文' : '还没有收藏论文，去「论文热点」点 ♡ 收藏'} />
  }
  return (
    <div className="space-y-3">
      {filtered.map((p) => (
        <div
          key={p.id}
          className="rounded-lg border border-[#30363d] bg-[#161b22] px-4 py-3 hover:border-[#58a6ff]/50 transition-colors"
        >
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <a href={p.url} target="_blank" rel="noreferrer" className="font-semibold text-[#58a6ff] hover:underline leading-snug">
                {p.title}
              </a>
              <div className="text-xs text-[#8b949e] mt-1 flex items-center gap-2 flex-wrap">
                <span className="flex items-center gap-1 text-[#e3b341]">
                  <ThumbsUp className="w-3 h-3" />
                  {p.upvotes}
                </span>
                {p.publishedAt && <span>· {p.publishedAt}</span>}
                {p.authors.length > 0 && (
                  <span className="truncate">· {p.authors.slice(0, 3).join(', ')}{p.authors.length > 3 ? ' 等' : ''}</span>
                )}
              </div>
              {p.abstract && <p className="text-sm text-[#8b949e] mt-2 leading-relaxed">{p.abstract}</p>}
            </div>
            <div className="flex flex-col items-center gap-1 shrink-0">
              <button
                onClick={() => toggle(p)}
                title={has(p.id) ? '取消收藏' : '收藏'}
                className={`p-1.5 rounded-md transition-colors ${
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
                className="flex items-center gap-1 px-2 py-1 rounded-md text-xs text-[#8b949e] hover:text-white hover:bg-[#30363d]"
              >
                <FileText className="w-3.5 h-3.5" />
                arXiv
                <ArrowUpRight className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function Empty({ emoji, text }: { emoji: string; text: string }) {
  return (
    <div className="text-center py-20 text-[#8b949e]">
      <p className="text-4xl mb-3">{emoji}</p>
      <p>{text}</p>
    </div>
  )
}
