import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertTriangle, RefreshCw, TrendingUp } from 'lucide-react'

interface FinanceItem {
  time: string
  text: string
  tags: string[]
}

interface FinanceSnapshot {
  updatedAt: string
  source: string
  count: number
  items: FinanceItem[]
}

export default function Finance({ keyword }: { keyword: string }) {
  const [data, setData] = useState<FinanceSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/data/finance.json?t=${Date.now()}`)
      if (!res.ok) throw new Error(`快照加载失败 (${res.status})`)
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
    return data.items.filter((i) => i.text.toLowerCase().includes(k))
  }, [data, keyword])

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 mr-auto">
          <TrendingUp className="w-5 h-5 text-[#3fb950]" />
          <div>
            <h2 className="text-base font-bold text-white">今日财经重大看点</h2>
            <p className="text-xs text-[#8b949e]">
              来源：{data?.source ?? '—'} · 每日早间自动更新
              {data ? `（${new Date(data.updatedAt).toLocaleString()}）` : ''}
            </p>
          </div>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={load}
          disabled={loading}
          className="border-[#30363d] text-[#c9d1d9]"
        >
          <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
          重新加载
        </Button>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-[#e3b341]/40 bg-[#e3b341]/10 px-4 py-3 text-sm text-[#e3b341]">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-[72px] bg-[#161b22]" />
          ))}
        </div>
      ) : !data || filtered.length === 0 ? (
        <div className="text-center py-20 text-[#8b949e]">
          <p className="text-4xl mb-3">📈</p>
          <p>{keyword ? '没有匹配的快讯' : '暂无财经数据，请等待每日快照更新'}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((item, i) => (
            <div
              key={i}
              className="rounded-lg border border-[#30363d] bg-[#161b22] px-4 py-3 hover:border-[#3fb950]/50 transition-colors"
            >
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className="text-xs font-mono text-[#3fb950]">{item.time.slice(5, 16)}</span>
                {item.tags.map((t) => (
                  <Badge
                    key={t}
                    variant="secondary"
                    className="text-[10px] px-1.5 py-0 bg-[#3fb950]/10 text-[#3fb950] border border-[#3fb950]/30"
                  >
                    {t}
                  </Badge>
                ))}
              </div>
              <FinanceText text={item.text} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/** 高亮【】内的标题 */
function FinanceText({ text }: { text: string }) {
  const m = text.match(/^【(.+?)】([\s\S]*)$/)
  if (!m) return <p className="text-sm text-[#c9d1d9]/90 leading-relaxed">{text}</p>
  return (
    <p className="text-sm leading-relaxed">
      <span className="font-semibold text-white">【{m[1]}】</span>
      <span className="text-[#c9d1d9]/90">{m[2]}</span>
    </p>
  )
}
