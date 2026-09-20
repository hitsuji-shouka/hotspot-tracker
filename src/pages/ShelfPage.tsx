import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { Play, Star, X } from 'lucide-react'
import SiteNav from '@/components/SiteNav'
import { CATEGORY_META, SHELF, type ShelfCategory, type ShelfFilter, type ShelfItem } from '@/data/shelf'

const ACCENT = '#c2410c'
const BORDER = '#e8e4dc'

const GRADIENTS: Record<ShelfCategory, string> = {
  movie: 'from-[#1f2937] to-[#0f172a]',
  book: 'from-[#d6a85c] to-[#a97b3f]',
  music: 'from-[#8b7bd8] to-[#5b4fb8]',
  video: 'from-[#0e7490] to-[#164e63]',
}

const ASPECT: Record<ShelfCategory, string> = {
  movie: 'aspect-[2/3]',
  book: 'aspect-[2/3]',
  music: 'aspect-square',
  video: 'aspect-video',
}

/** 从 B 站链接里提取 BV 号，非 B 站链接返回 null */
function bilibiliBvid(url: string): string | null {
  const m = url.match(/bilibili\.com\/video\/(BV[\w]+)/) ?? url.match(/^(BV[\w]+)$/)
  return m ? m[1] : null
}

/** 卡片封面区：普通作品是一张封面；视频作品带播放按钮，点击弹窗播放 */
function CoverBox({ item, onPlay }: { item: ShelfItem; onPlay: (item: ShelfItem) => void }) {
  const isVideo = item.category === 'video' && !!item.videoUrl

  const inner = item.cover ? (
    <img src={item.cover} alt={item.title} className="w-full h-full object-cover" loading="lazy" />
  ) : isVideo ? (
    // 直链视频：截首帧当封面（#t=0.1 让浏览器定位到第一帧附近的画面）
    <video
      src={`${item.videoUrl}#t=0.1`}
      preload="metadata"
      muted
      playsInline
      className="w-full h-full object-cover bg-black"
    />
  ) : (
    <div
      className={`w-full h-full bg-gradient-to-br ${GRADIENTS[item.category]} flex flex-col items-center justify-center text-white/90 p-3`}
    >
      <span className="font-serif text-3xl font-bold">{item.title.slice(0, 1)}</span>
      <span className="mt-2 text-[11px] tracking-wide text-white/70 text-center leading-snug">
        {item.title}
      </span>
    </div>
  )

  if (!isVideo) return <>{inner}</>

  return (
    <button type="button" onClick={() => onPlay(item)} className="relative w-full h-full block text-left">
      {inner}
      <span className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/25">
        <span className="w-11 h-11 rounded-full bg-black/55 backdrop-blur-sm flex items-center justify-center text-white shadow-lg transition-transform group-hover:scale-110">
          <Play className="w-5 h-5 ml-0.5" fill="currentColor" />
        </span>
      </span>
    </button>
  )
}

/** 页面内弹窗播放器：直链用 <video>，B 站用内嵌 iframe */
function VideoModal({ item, onClose }: { item: ShelfItem; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  const bvid = item.videoUrl ? bilibiliBvid(item.videoUrl) : null

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="w-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3 text-white">
          <div className="font-medium truncate pr-4">{item.title}</div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-white/15 transition-colors" aria-label="关闭">
            <X className="w-5 h-5" />
          </button>
        </div>
        {bvid ? (
          <iframe
            src={`https://player.bilibili.com/player.html?bvid=${bvid}&autoplay=1&high_quality=1`}
            className="w-full aspect-video rounded-lg bg-black"
            allowFullScreen
            scrolling="no"
            frameBorder="0"
          />
        ) : (
          <video src={item.videoUrl} controls autoPlay playsInline className="w-full max-h-[75vh] rounded-lg bg-black" />
        )}
      </div>
    </div>
  )
}

export default function ShelfPage() {
  const [filter, setFilter] = useState<ShelfFilter>('all')
  const [playing, setPlaying] = useState<ShelfItem | null>(null)

  useEffect(() => {
    document.title = '漫游 · 羊宇宙漫游指南'
  }, [])

  const items = useMemo(
    () => (filter === 'all' ? SHELF : SHELF.filter((i) => i.category === filter)),
    [filter],
  )

  return (
    <div className="min-h-screen bg-[#faf9f6] text-[#26221c]">
      <header className="max-w-5xl mx-auto px-6 pt-6 flex items-center justify-between text-sm">
        <Link to="/" className="flex items-center gap-2 font-serif font-bold text-lg hover:text-[#c2410c] transition-colors">
          <img src="/sheep-planet.png" alt="返回首页" className="w-6 h-6 object-contain" />
          羊宇宙漫游指南
        </Link>
        <SiteNav />
      </header>

      <main className="max-w-5xl mx-auto px-6 pb-16">
        <section className="pt-10 pb-6">
          <h1 className="font-serif text-2xl font-bold">漫游</h1>
          <p className="text-sm text-[#6b655c] mt-2">在文学、电影、音乐和视频里漫游——这个书架会慢慢填满。</p>
        </section>

        <div className="flex gap-2 mb-8 flex-wrap">
          {(Object.keys(CATEGORY_META) as ShelfFilter[]).map((k) => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className={`px-3.5 py-1.5 rounded-full text-sm border transition-colors ${
                filter === k
                  ? 'text-white border-transparent'
                  : 'text-[#6b655c] bg-white hover:border-[#a39e93]'
              }`}
              style={filter === k ? { background: ACCENT } : { borderColor: BORDER }}
            >
              {CATEGORY_META[k].emoji} {CATEGORY_META[k].label}
            </button>
          ))}
        </div>

        {items.length === 0 ? (
          <p className="text-sm text-[#a39e93] py-16 text-center">
            这一类还空着，去 src/data/shelf.ts 添一件喜欢的作品吧。
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-5 gap-y-8">
            {items.map((item) => (
              <div key={item.id} className="group">
                <div
                  className={`overflow-hidden rounded-lg border bg-white shadow-sm transition-all group-hover:shadow-md group-hover:-translate-y-1 ${ASPECT[item.category]}`}
                  style={{ borderColor: BORDER }}
                >
                  <CoverBox item={item} onPlay={setPlaying} />
                </div>
                {/* 木隔板 */}
                <div className="h-1.5 mt-1 rounded-sm bg-gradient-to-b from-[#c9a06b] to-[#9c7748] shadow-[0_2px_3px_rgba(0,0,0,0.12)]" />
                <div className="mt-2.5">
                  <div className="font-medium text-[15px] truncate">{item.title}</div>
                  <div className="text-xs text-[#a39e93] mt-0.5 truncate">{item.creator}</div>
                  {item.note && (
                    <div className="text-xs text-[#6b655c] mt-1 line-clamp-2 leading-relaxed">{item.note}</div>
                  )}
                  {item.rating != null && (
                    <div className="flex gap-0.5 mt-1.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className="w-3 h-3"
                          fill={i < (item.rating ?? 0) ? ACCENT : 'none'}
                          stroke={ACCENT}
                          strokeOpacity={i < (item.rating ?? 0) ? 1 : 0.3}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {playing && <VideoModal item={playing} onClose={() => setPlaying(null)} />}
    </div>
  )
}
