import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import RepoCard from '@/components/RepoCard'
import {
  fetchHotSkills,
  RateLimitError,
  SKILL_CATEGORIES,
  SKILL_RANGE_LABEL,
  type SkillCategory,
  type SkillRange,
} from '@/lib/skills'
import { formatNumber, type Repo } from '@/lib/github'
import { useCollection } from '@/hooks/use-collection'
import { AlertTriangle, Download, Github, Heart, RefreshCw } from 'lucide-react'

interface Props {
  keyword: string
  isFavorite: (id: number) => boolean
  onToggleFavorite: (repo: Repo) => void
}

export interface SkillShItem {
  rank: number | null
  name: string
  source: string
  installs: number
  url: string
  github: string
  favoriteCategory?: string
}

export const skillShId = (s: SkillShItem) => s.url

interface SkillShSnapshot {
  updatedAt: string
  source: string
  count: number
  items: SkillShItem[]
}

/** 按名称/来源关键词把 skill 归类（用于 skills.sh 榜单筛选） */
const CATEGORY_MATCH: Record<string, RegExp> = {
  coding: /code|coding|program|debug|refactor|review|test|lint|commit|frontend|react|api|cli/i,
  design: /design|ui|ux|poster|image|logo|art|canvas|slide|theme|font/i,
  writing: /writ|copy|translat|summar|blog|content|doc|note/i,
  data: /data|analy|excel|sheet|chart|sql|pandas|csv|database/i,
  media: /video|audio|music|subtitle|media|gif|image-gen|remotion/i,
  automation: /automat|workflow|productiv|schedule|bot|agent|triage/i,
  research: /research|paper|learn|study|academic|search|find/i,
  business: /market|seo|sales|business|ads|growth|gtm|linkedin/i,
  devops: /devops|deploy|\bci\b|docker|k8s|monitor|cloud|aws|azure|vercel|supabase|kubernetes/i,
}

export default function Skills({ keyword, isFavorite, onToggleFavorite }: Props) {
  const [source, setSource] = useState<'skillssh' | 'github'>('skillssh')

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* 来源切换 */}
      <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
        <Button
          variant={source === 'skillssh' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSource('skillssh')}
          className={`w-full sm:w-auto ${source === 'skillssh' ? 'bg-[#a371f7] hover:bg-[#a371f7]/85 text-white' : 'border-[#30363d] text-[#c9d1d9]'}`}
        >
          🏆 skills.sh 热榜
        </Button>
        <Button
          variant={source === 'github' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSource('github')}
          className={`w-full sm:w-auto ${source === 'github' ? 'bg-[#a371f7] hover:bg-[#a371f7]/85 text-white' : 'border-[#30363d] text-[#c9d1d9]'}`}
        >
          🌱 GitHub 新星
        </Button>
        <span className="col-span-2 text-center text-[11px] text-[#8b949e] sm:ml-1 sm:text-left sm:text-xs">
          {source === 'skillssh' ? 'Vercel 官方安装量排行榜，每日早间更新' : 'GitHub 上新创建的技能仓库，实时拉取'}
        </span>
      </div>

      {source === 'skillssh' ? (
        <SkillShBoard keyword={keyword} />
      ) : (
        <GithubSkills keyword={keyword} isFavorite={isFavorite} onToggleFavorite={onToggleFavorite} />
      )}
    </div>
  )
}

/* ─── skills.sh 热榜（每日快照） ─── */
function SkillShBoard({ keyword }: { keyword: string }) {
  const [data, setData] = useState<SkillShSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [catId, setCatId] = useState('all')
  const { toggle: toggleFav, has: isFav, canEdit } = useCollection<SkillShItem>('fav_skills', skillShId)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/data/skills.json?t=${Date.now()}`)
      if (!res.ok) throw new Error(`榜单快照加载失败 (${res.status})`)
      setData(await res.json())
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const filtered = useMemo(() => {
    if (!data) return []
    const k = keyword.trim().toLowerCase()
    return data.items.filter((s) => {
      if (catId !== 'all') {
        const re = CATEGORY_MATCH[catId]
        if (re && !re.test(`${s.name} ${s.source}`)) return false
      }
      if (k && !`${s.name} ${s.source}`.toLowerCase().includes(k)) return false
      return true
    })
  }, [data, catId, keyword])

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2">
        <p className="min-w-0 flex-1 text-xs text-[#8b949e]">
          {data ? `共 ${data.count} 个技能 · 更新于 ${new Date(data.updatedAt).toLocaleString()}` : '加载中…'}
        </p>
        <Button size="sm" variant="outline" onClick={load} disabled={loading} aria-label="重新加载" title="重新加载" className="size-8 px-0 border-[#30363d] text-[#c9d1d9] sm:w-auto sm:px-3">
          <RefreshCw className={`w-4 h-4 sm:mr-1 ${loading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">重新加载</span>
        </Button>
      </div>

      <div className="-mx-3 flex gap-2 overflow-x-auto px-3 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:flex-wrap sm:px-0">
        {SKILL_CATEGORIES.map((c) => (
          <button
            key={c.id}
            onClick={() => setCatId(c.id)}
            title={c.hint}
            className={`shrink-0 px-3 py-1.5 rounded-full text-sm border transition-colors ${
              catId === c.id
                ? 'bg-[#a371f7]/15 text-[#d2a8ff] border-[#a371f7]/60'
                : 'bg-[#161b22] text-[#8b949e] border-[#30363d] hover:border-[#8b949e]'
            }`}
          >
            {c.emoji} {c.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-[#e3b341]/40 bg-[#e3b341]/10 px-4 py-3 text-sm text-[#e3b341]">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-[64px] bg-[#161b22]" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-[#8b949e]">
          <p className="text-4xl mb-3">🧩</p>
          <p>该分类下暂无上榜技能</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((s) => (
            <div
              key={s.url}
              className="flex items-center gap-2.5 rounded-lg border border-[#30363d] bg-[#161b22] px-3 py-3 hover:border-[#a371f7]/50 transition-colors sm:gap-3 sm:px-4"
            >
              <span className="w-5 text-center font-mono text-xs text-[#8b949e] shrink-0 sm:w-8 sm:text-sm">
                {s.rank ?? '—'}
              </span>
              <div className="min-w-0 flex-1">
                <a href={s.url} target="_blank" rel="noreferrer" className="block truncate font-semibold text-[#d2a8ff] hover:underline">
                  {s.name}
                </a>
                <div className="text-xs text-[#8b949e] truncate">{s.source}</div>
              </div>
              <span className="flex items-center gap-1 text-xs text-[#3fb950] shrink-0">
                <Download className="w-3.5 h-3.5" />
                {formatNumber(s.installs)} 安装
              </span>
              {canEdit && <button
                onClick={() => toggleFav(s)}
                title={isFav(s.url) ? '取消收藏' : '收藏这个 Skill'}
                className={`p-2 rounded-md transition-colors shrink-0 ${
                  isFav(s.url) ? 'text-[#f85149]' : 'text-[#8b949e] hover:text-[#f85149] hover:bg-[#30363d]'
                }`}
              >
                <Heart className="w-4 h-4" fill={isFav(s.url) ? 'currentColor' : 'none'} />
              </button>}
              <a
                href={s.github}
                target="_blank"
                rel="noreferrer"
                title="查看 GitHub 仓库"
                className="p-2 rounded-md text-[#8b949e] hover:text-white hover:bg-[#30363d] shrink-0"
              >
                <Github className="w-4 h-4" />
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ─── GitHub 新星（实时搜索，原逻辑） ─── */
function GithubSkills({ keyword, isFavorite, onToggleFavorite }: Props) {
  const [catId, setCatId] = useState('all')
  const [range, setRange] = useState<SkillRange>('new-month')
  const [repos, setRepos] = useState<Repo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const category: SkillCategory = SKILL_CATEGORIES.find((c) => c.id === catId) ?? SKILL_CATEGORIES[0]

  const load = useCallback(
    async (force = false) => {
      setLoading(true)
      setError(null)
      try {
        setRepos(await fetchHotSkills(category, range, force))
      } catch (e) {
        if (e instanceof RateLimitError) {
          setError(
            `GitHub API 限流了${e.resetAt ? `，约 ${e.resetAt.toLocaleTimeString()} 恢复` : ''}。已展示的数据来自缓存，稍后再刷新试试。`,
          )
        } else {
          setError(e instanceof Error ? e.message : '加载失败，请检查网络')
        }
      } finally {
        setLoading(false)
      }
    },
    [category, range],
  )

  useEffect(() => {
    load()
  }, [load])

  const filtered = useMemo(() => {
    const k = keyword.trim().toLowerCase()
    if (!k) return repos
    return repos.filter(
      (r) =>
        r.full_name.toLowerCase().includes(k) ||
        (r.description ?? '').toLowerCase().includes(k) ||
        r.topics.some((t) => t.includes(k)),
    )
  }, [repos, keyword])

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Tabs value={range} onValueChange={(v) => setRange(v as SkillRange)} className="min-w-0 flex-1 sm:flex-none">
          <TabsList className="w-full bg-[#161b22] border border-[#30363d] sm:w-fit">
            {(Object.keys(SKILL_RANGE_LABEL) as SkillRange[]).map((r) => (
              <TabsTrigger key={r} value={r}>
                {SKILL_RANGE_LABEL[r]}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <Button
          size="sm"
          variant="outline"
          onClick={() => load(true)}
          disabled={loading}
          aria-label="刷新"
          title="刷新"
          className="size-8 px-0 ml-auto border-[#30363d] text-[#c9d1d9] sm:w-auto sm:px-3"
        >
          <RefreshCw className={`w-4 h-4 sm:mr-1 ${loading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">刷新</span>
        </Button>
      </div>

      <div className="-mx-3 flex gap-2 overflow-x-auto px-3 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:flex-wrap sm:px-0">
        {SKILL_CATEGORIES.map((c) => (
          <button
            key={c.id}
            onClick={() => setCatId(c.id)}
            title={c.hint}
            className={`shrink-0 px-3 py-1.5 rounded-full text-sm border transition-colors ${
              catId === c.id
                ? 'bg-[#a371f7]/15 text-[#d2a8ff] border-[#a371f7]/60'
                : 'bg-[#161b22] text-[#8b949e] border-[#30363d] hover:border-[#8b949e]'
            }`}
          >
            {c.emoji} {c.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-[#e3b341]/40 bg-[#e3b341]/10 px-4 py-3 text-sm text-[#e3b341]">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-[150px] bg-[#161b22]" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-[#8b949e]">
          <p className="text-4xl mb-3">🧩</p>
          <p>{keyword ? '没有匹配的 Skill，换个关键词试试' : '该分类暂无新星 Skill，切换到「总榜」看看经典款'}</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((repo, i) => (
            <RepoCard
              key={repo.id}
              repo={repo}
              rank={i + 1}
              favorite={isFavorite(repo.id)}
              onToggleFavorite={onToggleFavorite}
            />
          ))}
        </div>
      )}
    </div>
  )
}
