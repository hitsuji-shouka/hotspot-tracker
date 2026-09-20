import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import RepoCard from '@/components/RepoCard'
import MyGithub from '@/sections/MyGithub'
import Skills from '@/sections/Skills'
import Finance from '@/sections/Finance'
import Bookmarks from '@/sections/Bookmarks'
import Papers from '@/sections/Papers'
import AINews from '@/sections/AINews'
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
import { Flame, Github, RefreshCw, Search, Sparkles, AlertTriangle } from 'lucide-react'

type CategoryMode = 'language' | 'topic'
type View = 'hot' | 'skills' | 'papers' | 'ai' | 'finance' | 'fav' | 'mine' | 'links'

const NAV: { id: View; label: string; emoji: string }[] = [
  { id: 'hot', label: 'GitHub 热点', emoji: '🔥' },
  { id: 'skills', label: 'Skills', emoji: '🧩' },
  { id: 'papers', label: '论文热点', emoji: '📄' },
  { id: 'ai', label: 'AI 新闻', emoji: '🤖' },
  { id: 'finance', label: '财经看点', emoji: '💹' },
  { id: 'links', label: '网址收藏', emoji: '🔖' },
  { id: 'fav', label: '仓库收藏', emoji: '❤️' },
  { id: 'mine', label: '我的 GitHub', emoji: '👤' },
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
  const [view, setView] = useState<View>('hot')
  const { favorites, toggle, isFavorite } = useFavorites()

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
    load()
  }, [load])

  const filtered = useMemo(() => {
    const source = view === 'fav' ? favorites : repos
    const k = keyword.trim().toLowerCase()
    if (!k) return source
    return source.filter(
      (r) =>
        r.full_name.toLowerCase().includes(k) ||
        (r.description ?? '').toLowerCase().includes(k) ||
        r.topics.some((t) => t.includes(k)),
    )
  }, [repos, favorites, view, keyword])

  const totalStars = useMemo(
    () => repos.reduce((s, r) => s + r.stargazers_count, 0),
    [repos],
  )

  return (
    <div className="min-h-screen bg-[#0d1117] text-[#c9d1d9]">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-[#30363d] bg-[#0d1117]/90 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 mr-auto">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#f78166] to-[#a371f7] flex items-center justify-center">
              <Flame className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white leading-tight">热点追踪站</h1>
              <p className="text-xs text-[#8b949e]">GitHub 项目 · Agent Skills · 热点论文 · AI 新闻 · 财经看点，每日热点一站掌握</p>
            </div>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8b949e]" />
            <Input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="在当前结果中搜索…"
              className="pl-9 w-56 bg-[#161b22] border-[#30363d] text-sm"
            />
          </div>

          {view === 'hot' && (
          <Button
            onClick={() => load(true)}
            disabled={loading}
            className="bg-[#238636] hover:bg-[#2ea043] text-white"
          >
            <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            刷新热点
          </Button>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* 统计条（仅热点/收藏视图显示） */}
        {(view === 'hot' || view === 'fav') && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard icon={<Sparkles className="w-4 h-4 text-[#f78166]" />} label="热门新项目" value={loading ? '…' : String(repos.length)} />
          <StatCard icon={<Github className="w-4 h-4 text-[#a371f7]" />} label="累计 Star" value={loading ? '…' : totalStars.toLocaleString()} />
          <StatCard icon={<Flame className="w-4 h-4 text-[#e3b341]" />} label="时间范围" value={rangeLabel(range)} />
          <StatCard
            icon={<RefreshCw className="w-4 h-4 text-[#58a6ff]" />}
            label="上次更新"
            value={updatedAt ? updatedAt.toLocaleTimeString() : '—'}
          />
        </div>
        )}

        {/* 主导航 */}
        <nav className="flex items-center gap-2 flex-wrap border-b border-[#30363d] pb-4">
          {NAV.map((n) => (
            <button
              key={n.id}
              onClick={() => setView(n.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                view === n.id
                  ? 'bg-[#58a6ff]/15 text-[#58a6ff] border-[#58a6ff]/60'
                  : 'bg-[#161b22] text-[#8b949e] border-[#30363d] hover:border-[#8b949e] hover:text-[#c9d1d9]'
              }`}
            >
              {n.emoji} {n.label}
              {n.id === 'fav' && favorites.length > 0 ? ` (${favorites.length})` : ''}
            </button>
          ))}
        </nav>

        {/* 时间范围（仅 GitHub 热点视图） */}
        {view === 'hot' && (
        <div className="flex items-center gap-3 flex-wrap">
          <Tabs value={range} onValueChange={(v) => setRange(v as TimeRange)}>
            <TabsList className="bg-[#161b22] border border-[#30363d]">
              <TabsTrigger value="daily">今日热点</TabsTrigger>
              <TabsTrigger value="weekly">本周热点</TabsTrigger>
              <TabsTrigger value="monthly">本月热点</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        )}

        {/* 分类：语言 / 主题（收藏视图下隐藏） */}
        {view === 'hot' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Button
              variant={mode === 'language' ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setMode('language')
                setCatId('all')
              }}
              className={mode === 'language' ? 'bg-[#1f6feb] hover:bg-[#388bfd] text-white' : 'border-[#30363d] text-[#c9d1d9]'}
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
              className={mode === 'topic' ? 'bg-[#1f6feb] hover:bg-[#388bfd] text-white' : 'border-[#30363d] text-[#c9d1d9]'}
            >
              按主题分类
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setCatId(c.id)}
                className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
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

        {/* 仓库列表 / Skills / 财经 / 我的 GitHub */}
        {view === 'mine' ? (
          <MyGithub keyword={keyword} isFavorite={isFavorite} onToggleFavorite={toggle} />
        ) : view === 'skills' ? (
          <Skills keyword={keyword} isFavorite={isFavorite} onToggleFavorite={toggle} />
        ) : view === 'papers' ? (
          <Papers keyword={keyword} />
        ) : view === 'ai' ? (
          <AINews keyword={keyword} />
        ) : view === 'finance' ? (
          <Finance keyword={keyword} />
        ) : view === 'links' ? (
          <Bookmarks keyword={keyword} />
        ) : loading && view === 'hot' ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-[150px] bg-[#161b22]" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-[#8b949e]">
            <p className="text-4xl mb-3">{view === 'fav' ? '💖' : '🛸'}</p>
            <p>
              {view === 'fav'
                ? '还没有收藏任何仓库，点击卡片右上角的 ♡ 即可收藏'
                : keyword
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
    <div className="rounded-lg border border-[#30363d] bg-[#161b22] px-4 py-3">
      <div className="flex items-center gap-1.5 text-xs text-[#8b949e]">
        {icon}
        {label}
      </div>
      <div className="text-xl font-bold text-white mt-1">{value}</div>
    </div>
  )
}
