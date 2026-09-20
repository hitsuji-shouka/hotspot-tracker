import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertTriangle, ArrowUpRight, Flame, RefreshCw } from 'lucide-react'

interface AINewsItem {
  source: string
  time: string
  title: string
  text: string | null
  url: string
  points: number | null
}

interface AINewsSnapshot {
  updatedAt: string
  source: string
  count: number
  items: AINewsItem[]
}

type SourceFilter = 'all' | '量子位' | 'Hacker News'

export default function AINews({ keyword }: { keyword: string }) {
  const [data, setData] = useState<AINewsSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [src, setSrc] = useState<SourceFilter>('all')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`./data/ai_news.json?t=${Date.now()}`)
      if (!res.ok) throw new Error(`AI 新闻快照加载失败 (${res.status})`)
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
    return data.items.filter((n) => {
      if (src !== 'all' && n.source !== src) return false
      if (k && !`${n.title} ${n.text ?? ''}`.toLowerCase().includes(k)) return false
      return true
    })
  }, [data, src, keyword])

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <p className="text-xs text-[#8b949e] mr-auto">
          {data ? `来源：${data.source} · 更新于 ${new Date(data.updatedAt).toLocaleString()}` : '加载中…'}
        </p>
        <Button size="sm" variant="outline" onClick={load} disabled={loading} className="border-[#30363d] text-[#c9d1d9]">
          <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
          重新加载
        </Button>
      </div>

      {/* 来源筛选 */}
      <div className="flex flex-wrap gap-2">
        {(['all', '量子位', 'Hacker News'] as SourceFilter[]).map((s) => (
          <button
            key={s}
            onClick={() => setSrc(s)}
            className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
              src === s
                ? 'bg-[#f78166]/15 text-[#f78166] border-[#f78166]/60'
                : 'bg-[#161b22] text-[#8b949e] border-[#30363d] hover:border-[#8b949e]'
            }`}
          >
            {s === 'all' ? '🌐 全部' : s === '量子位' ? '🇨🇳 量子位' : '🟧 Hacker News'}
          </button>
        ))}
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-[#e3b341]/40 bg-[#e3b341]/10 px-4 py-3 text-sm text-[#e3b341]">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}（新闻由每日早间定时任务生成，可稍后再试）</span>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-[72px] bg-[#161b22]" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-[#8b949e]">
          <p className="text-4xl mb-3">🤖</p>
          <p>{keyword ? '没有匹配的新闻，换个关键词试试' : '暂无新闻，等待每日早间快照更新'}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((n, i) => (
            <a
              key={`${n.source}-${n.url}-${i}`}
              href={n.url}
              target="_blank"
              rel="noreferrer"
              className="block rounded-lg border border-[#30363d] bg-[#161b22] px-4 py-3 hover:border-[#f78166]/50 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-[#c9d1d9] leading-snug hover:text-white">{n.title}</div>
                  {n.text && <p className="text-sm text-[#8b949e] mt-1.5 leading-relaxed">{n.text}</p>}
                  <div className="text-xs text-[#8b949e] mt-2 flex items-center gap-2 flex-wrap">
                    <span
                      className={`px-1.5 py-0.5 rounded ${
                        n.source === '量子位' ? 'bg-[#f78166]/10 text-[#f78166]' : 'bg-[#e3b341]/10 text-[#e3b341]'
                      }`}
                    >
                      {n.source}
                    </span>
                    {n.time && <span>{n.time}</span>}
                    {n.points != null && (
                      <span className="flex items-center gap-1 text-[#e3b341]">
                        <Flame className="w-3 h-3" />
                        {n.points} 热度
                      </span>
                    )}
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-[#8b949e] shrink-0 mt-1" />
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
