import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useCollection } from '@/hooks/use-collection'
import { AlertTriangle, ArrowUpRight, FileText, Heart, RefreshCw, ThumbsUp } from 'lucide-react'

export interface PaperItem {
  id: string
  title: string
  url: string
  arxiv: string
  upvotes: number
  publishedAt: string
  authors: string[]
  abstract: string | null
  thumbnail?: string | null
}

interface PapersSnapshot {
  updatedAt: string
  source: string
  count: number
  items: PaperItem[]
}

export const paperId = (p: PaperItem) => p.id

export default function Papers({ keyword }: { keyword: string }) {
  const [data, setData] = useState<PapersSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { toggle: toggleFav, has: isFav } = useCollection<PaperItem>('fav_papers', paperId)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`./data/papers.json?t=${Date.now()}`)
      if (!res.ok) throw new Error(`论文榜单快照加载失败 (${res.status})`)
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
    if (!k) return data.items
    return data.items.filter(
      (p) =>
        p.title.toLowerCase().includes(k) ||
        (p.abstract ?? '').toLowerCase().includes(k) ||
        p.authors.some((a) => a.toLowerCase().includes(k)),
    )
  }, [data, keyword])

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <p className="text-xs text-[#8b949e] mr-auto">
          {data
            ? `来自 ${data.source} 每日榜 · 按社区投票排序 · 更新于 ${new Date(data.updatedAt).toLocaleString()}`
            : '加载中…'}
        </p>
        <Button size="sm" variant="outline" onClick={load} disabled={loading} className="border-[#30363d] text-[#c9d1d9]">
          <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
          重新加载
        </Button>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-[#e3b341]/40 bg-[#e3b341]/10 px-4 py-3 text-sm text-[#e3b341]">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}（榜单由每日早间定时任务生成，可稍后再试）</span>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[110px] bg-[#161b22]" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-[#8b949e]">
          <p className="text-4xl mb-3">📄</p>
          <p>{keyword ? '没有匹配的论文，换个关键词试试' : '暂无论文数据，等待每日早间快照更新'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((p, i) => (
            <div
              key={p.id}
              className="rounded-lg border border-[#30363d] bg-[#161b22] px-4 py-3 hover:border-[#58a6ff]/50 transition-colors"
            >
              <div className="flex items-start gap-3">
                <span className="w-7 text-center font-mono text-sm text-[#8b949e] shrink-0 pt-0.5">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <a
                    href={p.url}
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold text-[#58a6ff] hover:underline leading-snug"
                  >
                    {p.title}
                  </a>
                  <div className="text-xs text-[#8b949e] mt-1 flex items-center gap-2 flex-wrap">
                    <span className="flex items-center gap-1 text-[#e3b341]">
                      <ThumbsUp className="w-3 h-3" />
                      {p.upvotes}
                    </span>
                    {p.publishedAt && <span>· {p.publishedAt}</span>}
                    {p.authors.length > 0 && (
                      <span className="truncate">
                        · {p.authors.slice(0, 3).join(', ')}
                        {p.authors.length > 3 ? ' 等' : ''}
                      </span>
                    )}
                  </div>
                  {p.abstract && <p className="text-sm text-[#8b949e] mt-2 leading-relaxed">{p.abstract}</p>}
                </div>
                <div className="flex flex-col items-center gap-1 shrink-0">
                  <button
                    onClick={() => toggleFav(p)}
                    title={isFav(p.id) ? '取消收藏' : '收藏这篇论文'}
                    className={`p-1.5 rounded-md transition-colors ${
                      isFav(p.id) ? 'text-[#f85149]' : 'text-[#8b949e] hover:text-[#f85149] hover:bg-[#30363d]'
                    }`}
                  >
                    <Heart className="w-4 h-4" fill={isFav(p.id) ? 'currentColor' : 'none'} />
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
      )}
    </div>
  )
}
