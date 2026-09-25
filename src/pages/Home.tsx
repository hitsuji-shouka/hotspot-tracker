import AdminControl from '@/components/AdminControl'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import RepoCard from '@/components/RepoCard'
import Skills from '@/sections/Skills'
import Finance from '@/sections/Finance'
import Papers from '@/sections/Papers'
import AINews from '@/sections/AINews'
import Favorites from '@/sections/Favorites'
import { useFavorites } from '@/hooks/use-favorites'
import {
  cacheGet,
  cacheSet,
  fetchHotRepos,
  LANGUAGES,
  RateLimitError,
  TOPICS,
  rangeLabel,
  type Category,
  type Repo,
  type TimeRange,
} from '@/lib/github'
import { AlertTriangle, Flame, Github, RefreshCw, Search, Sparkles } from 'lucide-react'
import '@/components/site-header.css'
import './hotspot-header.css'

type CategoryMode = 'language' | 'topic'
type View = 'hot' | 'skills' | 'papers' | 'ai' | 'finance' | 'fav'

const NAV: { id: View; label: string; emoji: string }[] = [
  { id: 'hot', label: 'GitHub 热点', emoji: '🔥' },
  { id: 'skills', label: 'Skills', emoji: '🧩' },
  { id: 'papers', label: '论文热点', emoji: '📄' },
  { id: 'ai', label: 'AI 新闻', emoji: '🤖' },
  { id: 'finance', label: '财经看点', emoji: '💹' },
  { id: 'fav', label: '收藏', emoji: '⭐' },
]

export default function Home() {
  const [mode, setMode] = useState<CategoryMode>('language')
  const [catId, setCatId] = useState('all')
  const [range, setRange] = useState<TimeRange>('weekly')
  const [repos, setRepos] = useState<Repo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null)
  const [keyword, setKeyword] = useState('')
  const [params, setParams] = useSearchParams()
  const view = NAV.find(item => item.id === params.get('view'))?.id ?? 'hot'
  const setView = (next: View) => setParams(previous => {
    const updated = new URLSearchParams(previous)
    updated.set('view', next)
    return updated
  })
  const { toggle, isFavorite } = useFavorites()
  const navRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const revealActive = () => {
      const nav = navRef.current
      const active = nav?.querySelector('[aria-current="page"]')
      if (!nav || !active) return
      const outer = nav.getBoundingClientRect()
      const inner = active.getBoundingClientRect()
      nav.scrollLeft += Math.max(0, inner.right - outer.right) + Math.min(0, inner.left - outer.left)
    }
    revealActive()
    window.addEventListener('resize', revealActive)
    return () => window.removeEventListener('resize', revealActive)
  }, [view])

  const categories = mode === 'language' ? LANGUAGES : TOPICS
  const category: Category = useMemo(
    () => categories.find((c) => c.id === catId) ?? categories[0],
    [categories, catId],
  )

  const load = useCallback(
    async (force = false) => {
      const key = `repos:${category.id}:${range}`
      if (!force) {
        const cached = cacheGet<{ items: Repo[] }>(key)
        if (cached) {
          setRepos(cached.items)
          setError(null)
          setLoading(false)
          setUpdatedAt(new Date())
          return
        }
      }
      setLoading(true)
      setError(null)
      try {
        const data = await fetchHotRepos(category, range)
        setRepos(data.items)
        cacheSet(key, { items: data.items })
        setUpdatedAt(new Date())
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
    document.title = '热点追踪 · 羊宇宙漫游指南'
  }, [])

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

  const totalStars = useMemo(
    () => repos.reduce((s, r) => s + r.stargazers_count, 0),
    [repos],
  )

  return (
    <div className="min-h-screen bg-[#0d1117] text-[#c9d1d9]">
      {/* Header */}
      <header className="border-b border-[#30363d] bg-[#0d1117]/90 backdrop-blur sm:sticky sm:top-0 sm:z-10">
        <div className="site-header hotspot-header-inner flex-wrap sm:flex-nowrap">
          <div className="w-full min-w-0 sm:flex-1">
            <a href="/" className="group flex min-w-0 items-center gap-2.5" title="返回我的博客" aria-label="返回我的博客">
              <img
                src="/sheep-planet.png"
                alt="羊宇宙漫游指南"
                className="w-8 h-8 sm:w-9 sm:h-9 object-contain transition-transform group-hover:-rotate-12"
              />
              <div className="min-w-0">
                <h1 className="text-base sm:text-lg font-bold text-white leading-tight transition-colors group-hover:text-[#a371f7]">羊宇宙漫游指南</h1>
                <p className="truncate text-[11px] sm:text-xs text-[#8b949e]">热点追踪 · GitHub 项目 · Agent Skills · 热点论文 · AI 新闻 · 财经看点，每日热点一站掌握</p>
              </div>
            </a>
          </div>

          <div className="relative min-w-0 flex-1 sm:flex-none">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8b949e]" />
            <Input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="在当前结果中搜索…"
              className="h-10 w-full pl-9 bg-[#161b22] border-[#30363d] text-sm sm:h-9 sm:w-56"
            />
          </div>

          {view === 'hot' && (
          <Button
            onClick={() => load(true)}
            disabled={loading}
            aria-label="刷新热点"
            title="刷新热点"
            className="size-10 px-0 bg-[#238636] hover:bg-[#2ea043] text-white sm:h-9 sm:w-auto sm:px-4"
          >
            <RefreshCw className={`w-4 h-4 sm:mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">刷新热点</span>
          </Button>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-3 py-4 space-y-4 sm:px-4 sm:py-6 sm:space-y-6">
        {/* 主导航 */}
        <nav ref={navRef} aria-label="热点导航" className="-mx-3 flex items-center gap-2 overflow-x-auto border-b border-[#30363d] px-3 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:flex-wrap sm:px-0 sm:pb-4">
          {NAV.map((n) => (
            <button
              key={n.id}
              onClick={() => setView(n.id)}
              aria-current={view === n.id ? 'page' : undefined}
              className={`shrink-0 px-3 py-2 sm:px-4 rounded-lg text-sm font-medium border transition-colors ${
                view === n.id
                  ? 'bg-[#58a6ff]/15 text-[#58a6ff] border-[#58a6ff]/60'
                  : 'bg-[#161b22] text-[#8b949e] border-[#30363d] hover:border-[#8b949e] hover:text-[#c9d1d9]'
              }`}
            >
              {n.emoji} {n.label}
            </button>
          ))}
        </nav>

        {/* 时间范围（仅 GitHub 热点视图） */}
        {view === 'hot' && (
        <div>
          <Tabs value={range} onValueChange={(v) => setRange(v as TimeRange)} className="w-full sm:w-auto">
            <TabsList className="w-full bg-[#161b22] border border-[#30363d] sm:w-fit">
              <TabsTrigger value="daily">今日热点</TabsTrigger>
              <TabsTrigger value="weekly">本周热点</TabsTrigger>
              <TabsTrigger value="monthly">本月热点</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        )}

        {/* 统计条（仅热点视图显示） */}
        {view === 'hot' && (
        <div className="grid grid-cols-4 gap-1.5 sm:gap-3">
          <StatCard icon={<Sparkles className="w-4 h-4 text-[#f78166]" />} label="热门新项目" value={loading ? '…' : String(repos.length)} />
          <StatCard icon={<Github className="w-4 h-4 text-[#a371f7]" />} label="累计 Star" value={loading ? '…' : totalStars.toLocaleString()} />
          <StatCard icon={<Flame className="w-4 h-4 text-[#e3b341]" />} label="时间范围" value={rangeLabel(range)} />
          <StatCard
            icon={<RefreshCw className="w-4 h-4 text-[#58a6ff]" />}
            label="上次更新"
            value={updatedAt ? updatedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
          />
        </div>
        )}

        {/* 分类：语言 / 主题（收藏视图下隐藏） */}
        {view === 'hot' && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
            <Button
              variant={mode === 'language' ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setMode('language')
                setCatId('all')
              }}
              className={`w-full sm:w-auto ${mode === 'language' ? 'bg-[#1f6feb] hover:bg-[#388bfd] text-white' : 'border-[#30363d] text-[#c9d1d9]'}`}
            >
              按语言分类
            </Button>
            <Button
              variant={mode === 'topic' ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setMode('topic')
                setCatId('ai')
              }}
              className={`w-full sm:w-auto ${mode === 'topic' ? 'bg-[#1f6feb] hover:bg-[#388bfd] text-white' : 'border-[#30363d] text-[#c9d1d9]'}`}
            >
              按主题分类
            </Button>
          </div>

          <div className="-mx-3 flex gap-2 overflow-x-auto px-3 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:flex-wrap sm:px-0">
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setCatId(c.id)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-sm border transition-colors ${
                  catId === c.id
                    ? 'bg-[#58a6ff]/15 text-[#58a6ff] border-[#58a6ff]/60'
                    : 'bg-[#161b22] text-[#8b949e] border-[#30363d] hover:border-[#8b949e]'
                }`}
              >
                {c.emoji} {c.label}
              </button>
            ))}
          </div>
        </div>
        )}

        {/* 错误提示 */}
        {error && view === 'hot' && (
          <div className="flex items-start gap-2 rounded-lg border border-[#e3b341]/40 bg-[#e3b341]/10 px-4 py-3 text-sm text-[#e3b341]">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* 仓库列表 / Skills / 论文 / AI 新闻 / 财经 / 收藏 */}
        {view === 'skills' ? (
          <Skills keyword={keyword} isFavorite={isFavorite} onToggleFavorite={toggle} />
        ) : view === 'papers' ? (
          <Papers keyword={keyword} />
        ) : view === 'ai' ? (
          <AINews keyword={keyword} />
        ) : view === 'finance' ? (
          <Finance keyword={keyword} />
        ) : view === 'fav' ? (
          <Favorites keyword={keyword} />
        ) : loading && view === 'hot' ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-[150px] bg-[#161b22]" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-[#8b949e]">
            <p className="text-4xl mb-3">🛸</p>
            <p>
              {keyword
                ? '没有匹配的仓库，换个关键词试试'
                : '该分类下暂时没有热点项目，换个时间范围试试'}
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {filtered.map((repo, i) => (
              <RepoCard
                key={repo.id}
                repo={repo}
                rank={i + 1}
                favorite={isFavorite(repo.id)}
                onToggleFavorite={toggle}
              />
            ))}
          </div>
        )}

        <footer className="text-center text-xs text-[#8b949e] pt-4 pb-8 border-t border-[#30363d]">
          数据来自 GitHub Search API · skills.sh · Hugging Face Papers · 量子位 · Hacker News · 新浪财经 · 热点每 10 分钟缓存 · 榜单每日早间自动更新
          <div className="mt-3"><AdminControl dark /></div>
        </footer>
      </main>
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="min-w-0 rounded-lg border border-[#30363d] bg-[#161b22] px-2 py-2.5 sm:px-4 sm:py-3">
      <div className="flex items-center gap-1.5 text-[10px] leading-tight text-[#8b949e] sm:text-xs">
        <span className="hidden sm:inline-flex">{icon}</span>
        <span className="truncate">{label}</span>
      </div>
      <div className="mt-1 truncate text-base font-bold text-white sm:text-xl">{value}</div>
    </div>
  )
}
