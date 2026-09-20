import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  BOOKMARK_CATEGORIES,
  domainOf,
  faviconUrl,
  fetchLinkPreview,
  loadBookmarks,
  normalizeUrl,
  saveBookmarks,
  type Bookmark,
} from '@/lib/bookmarks'
import { pullKey } from '@/lib/sync'
import { Bookmark as BookmarkIcon, ExternalLink, Loader2, Plus, Trash2 } from 'lucide-react'

export default function Bookmarks({ keyword }: { keyword: string }) {
  const [list, setList] = useState<Bookmark[]>(loadBookmarks)
  const [catId, setCatId] = useState('all')
  const [open, setOpen] = useState(false)
  const [url, setUrl] = useState('')
  const [category, setCategory] = useState('blog')
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  // 启动时从服务器拉取（其他设备的收藏会同步过来）
  useEffect(() => {
    pullKey<Bookmark[]>('bookmarks').then((v) => {
      if (v) setList(v)
    })
  }, [])

  const persist = (next: Bookmark[]) => {
    setList(next)
    saveBookmarks(next)
  }

  const add = async () => {
    setAddError(null)
    let normalized: string
    try {
      normalized = normalizeUrl(url)
    } catch {
      setAddError('网址格式不正确，请输入如 blog.example.com 或完整链接')
      return
    }
    if (list.some((b) => b.url === normalized)) {
      setAddError('这个网址已经收藏过了')
      return
    }
    setAdding(true)
    const preview = await fetchLinkPreview(normalized)
    const bm: Bookmark = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      url: normalized,
      title: preview?.title || domainOf(normalized),
      description: preview?.description || '',
      image: preview?.image ?? null,
      logo: preview?.logo ?? null,
      siteName: preview?.siteName ?? null,
      category,
      addedAt: Date.now(),
    }
    persist([bm, ...list])
    setAdding(false)
    setOpen(false)
    setUrl('')
  }

  const remove = (id: string) => persist(list.filter((b) => b.id !== id))

  const filtered = useMemo(() => {
    const k = keyword.trim().toLowerCase()
    return list.filter((b) => {
      if (catId !== 'all' && b.category !== catId) return false
      if (k && !`${b.title} ${b.description} ${b.url}`.toLowerCase().includes(k)) return false
      return true
    })
  }, [list, catId, keyword])

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 mr-auto">
          <BookmarkIcon className="w-5 h-5 text-[#e3b341]" />
          <div>
            <h2 className="text-base font-bold text-white">网址收藏</h2>
            <p className="text-xs text-[#8b949e]">收集好网站，自动生成网页预览卡片 · 共 {list.length} 个</p>
          </div>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#238636] hover:bg-[#2ea043] text-white">
              <Plus className="w-4 h-4 mr-1.5" />
              收藏网址
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#161b22] border-[#30363d] text-[#c9d1d9]">
            <DialogHeader>
              <DialogTitle className="text-white">收藏一个新网站</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="粘贴网址，如 overreacted.io"
                className="bg-[#0d1117] border-[#30363d]"
                onKeyDown={(e) => e.key === 'Enter' && !adding && add()}
                autoFocus
              />
              <div className="flex flex-wrap gap-2">
                {BOOKMARK_CATEGORIES.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setCategory(c.id)}
                    className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                      category === c.id
                        ? 'bg-[#e3b341]/15 text-[#e3b341] border-[#e3b341]/60'
                        : 'bg-[#0d1117] text-[#8b949e] border-[#30363d] hover:border-[#8b949e]'
                    }`}
                  >
                    {c.emoji} {c.label}
                  </button>
                ))}
              </div>
              {addError && <p className="text-sm text-[#f85149]">{addError}</p>}
              <Button
                onClick={add}
                disabled={adding || !url.trim()}
                className="w-full bg-[#238636] hover:bg-[#2ea043] text-white"
              >
                {adding ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                    正在抓取网页预览…
                  </>
                ) : (
                  '收藏'
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* 分类筛选 */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setCatId('all')}
          className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
            catId === 'all'
              ? 'bg-[#e3b341]/15 text-[#e3b341] border-[#e3b341]/60'
              : 'bg-[#161b22] text-[#8b949e] border-[#30363d] hover:border-[#8b949e]'
          }`}
        >
          🗂️ 全部 ({list.length})
        </button>
        {BOOKMARK_CATEGORIES.map((c) => {
          const n = list.filter((b) => b.category === c.id).length
          return (
            <button
              key={c.id}
              onClick={() => setCatId(c.id)}
              className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                catId === c.id
                  ? 'bg-[#e3b341]/15 text-[#e3b341] border-[#e3b341]/60'
                  : 'bg-[#161b22] text-[#8b949e] border-[#30363d] hover:border-[#8b949e]'
              }`}
            >
              {c.emoji} {c.label} ({n})
            </button>
          )
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 text-[#8b949e]">
          <p className="text-4xl mb-3">🔖</p>
          <p>{keyword || catId !== 'all' ? '没有匹配的收藏' : '还没有收藏任何网站，点右上角「收藏网址」开始'}</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((b) => (
            <BookmarkCard key={b.id} bookmark={b} onRemove={() => remove(b.id)} />
          ))}
        </div>
      )}
    </div>
  )
}

function BookmarkCard({ bookmark: b, onRemove }: { bookmark: Bookmark; onRemove: () => void }) {
  const cat = BOOKMARK_CATEGORIES.find((c) => c.id === b.category) ?? BOOKMARK_CATEGORIES[4]
  const [imgFailed, setImgFailed] = useState(false)
  const showImage = b.image && !imgFailed

  return (
    <div className="group relative rounded-xl border border-[#30363d] bg-[#161b22] overflow-hidden hover:border-[#58a6ff]/50 hover:-translate-y-0.5 transition-all">
      {/* 预览图 / 渐变兜底 */}
      <a href={b.url} target="_blank" rel="noreferrer" className="block">
        {showImage ? (
          <div className="h-36 overflow-hidden bg-[#0d1117]">
            <img
              src={b.image!}
              alt={b.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
              onError={() => setImgFailed(true)}
            />
          </div>
        ) : (
          <div
            className={`h-36 bg-gradient-to-br ${cat.gradient} flex items-center justify-center gap-3 opacity-90`}
          >
            <img src={b.logo || faviconUrl(b.url)} alt="" className="w-10 h-10 rounded-lg bg-white/90 p-1" />
            <span className="text-white/95 font-bold text-lg drop-shadow">{domainOf(b.url)}</span>
          </div>
        )}
      </a>

      {/* 删除按钮 */}
      <button
        onClick={onRemove}
        title="删除"
        className="absolute top-2 right-2 p-1.5 rounded-md bg-black/50 text-white/70 hover:text-white hover:bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>

      {/* 文本区 */}
      <div className="p-3.5">
        <div className="flex items-center gap-1.5 mb-1.5">
          <span className="text-xs px-1.5 py-0.5 rounded-full bg-white/5 border border-[#30363d]">
            {cat.emoji} {cat.label}
          </span>
          <span className="text-[10px] text-[#8b949e] flex items-center gap-1 truncate">
            <img src={faviconUrl(b.url)} alt="" className="w-3 h-3 rounded-sm" />
            {domainOf(b.url)}
          </span>
        </div>
        <a href={b.url} target="_blank" rel="noreferrer" className="block group/title">
          <h3 className="font-semibold text-white text-sm leading-snug line-clamp-2 group-hover/title:text-[#58a6ff]">
            {b.title}
            <ExternalLink className="w-3 h-3 inline ml-1 opacity-0 group-hover/title:opacity-60" />
          </h3>
        </a>
        {b.description && (
          <p className="text-xs text-[#8b949e] mt-1.5 line-clamp-2 leading-relaxed">{b.description}</p>
        )}
      </div>
    </div>
  )
}
