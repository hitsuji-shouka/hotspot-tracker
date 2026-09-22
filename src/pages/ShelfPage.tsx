import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { Music, Play, Star, X } from 'lucide-react'
import SiteNav from '@/components/SiteNav'
import { CATEGORY_META, SHELF, type ShelfCategory, type ShelfFilter, type ShelfItem } from '@/data/shelf'

const ACCENT = '#c2410c'

const GRADIENTS: Record<ShelfCategory, string> = {
  movie: 'from-[#1f2937] to-[#0f172a]',
  book: 'from-[#d6a85c] to-[#a97b3f]',
  music: 'from-[#8b7bd8] to-[#5b4fb8]',
}

const SHELF_ORDER: ShelfCategory[] = ['book', 'movie', 'music']

const SECTION_COPY: Record<ShelfCategory, { title: string; description: string }> = {
  book: { title: '书页', description: '在文字里抵达更远的地方' },
  movie: { title: '银幕', description: '一些值得反复回看的故事' },
  music: { title: '声场', description: '最近循环播放的声音与现场' },
}

const GRID_CLASS: Record<ShelfCategory, string> = {
  book: 'grid-cols-2 gap-4 sm:mx-auto sm:w-full sm:max-w-2xl sm:gap-6',
  movie: 'grid-cols-2 gap-4 sm:mx-auto sm:w-full sm:max-w-4xl sm:grid-cols-3 sm:gap-6',
  music: 'grid-cols-2 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3',
}

/** 从 B 站链接里提取 BV 号，非 B 站链接返回 null */
function bilibiliBvid(url: string): string | null {
  const m = url.match(/bilibili\.com\/video\/(BV[\w]+)/) ?? url.match(/^(BV[\w]+)$/)
  return m ? m[1] : null
}

/** 从网易云链接里提取歌曲 ID，非网易云链接返回 null */
function neteaseSongId(url: string): string | null {
  const m = url.match(/music\.163\.com\/(?:#\/)?(?:song|m\/song)\/?\?.*?[?&]id=(\d+)/) ?? url.match(/music\.163\.com\/.*?[?&]id=(\d+)/)
  return m ? m[1] : null
}

/** 从 Spotify 链接里提取类型和 ID，支持 track / album / playlist，非 Spotify 链接返回 null */
function spotifyEmbed(url: string): { kind: string; id: string } | null {
  const m = url.match(/open\.spotify\.com\/(?:intl-[a-z-]+\/)?(track|album|playlist)\/([A-Za-z0-9]+)/)
  return m ? { kind: m[1], id: m[2] } : null
}

/** 卡片封面区：普通作品是一张封面；配了 videoUrl / musicUrl 的作品带播放标签，点击弹窗播放 */
function CoverBox({ item, onPlay }: { item: ShelfItem; onPlay: (item: ShelfItem) => void }) {
  const media: 'video' | 'music' | null = item.videoUrl ? 'video' : item.musicUrl ? 'music' : null

  const inner = item.cover ? (
    <img src={item.cover} alt={item.title} className="w-full h-full object-cover" loading="lazy" />
  ) : media === 'video' ? (
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

  if (!media) return <>{inner}</>

  return (
    <button type="button" onClick={() => onPlay(item)} className="relative w-full h-full block text-left">
      {inner}
      <span className="absolute top-2 left-2 flex items-center gap-1 rounded-full bg-black/55 backdrop-blur-sm px-2 py-0.5 text-[11px] text-white">
        {media === 'video' ? <Play className="w-3 h-3" fill="currentColor" /> : <Music className="w-3 h-3" />}
        {media === 'video' ? '视频' : '试听'}
      </span>
      <span className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/25">
        <span className="w-11 h-11 rounded-full bg-black/55 backdrop-blur-sm flex items-center justify-center text-white shadow-lg transition-transform group-hover:scale-110">
          <Play className="w-5 h-5 ml-0.5" fill="currentColor" />
        </span>
      </span>
    </button>
  )
}

function ShelfCard({ item, onPlay }: { item: ShelfItem; onPlay: (item: ShelfItem) => void }) {
  const isVideo = !!item.videoUrl
  const coverAspect = item.category === 'music'
    ? isVideo
      ? 'aspect-video sm:aspect-[4/3]'
      : 'aspect-square sm:aspect-[4/3]'
    : 'aspect-[2/3]'

  return (
    <article className={`group min-w-0 ${isVideo ? 'col-span-2 sm:col-span-1' : ''}`}>
      <div className="h-full overflow-hidden rounded-xl border border-[#e8e4dc] bg-white/80 shadow-[0_2px_10px_rgba(80,64,40,0.05)] transition duration-300 group-hover:-translate-y-1 group-hover:border-[#d7cfc1] group-hover:shadow-[0_14px_34px_rgba(80,64,40,0.12)]">
        <div className={`overflow-hidden bg-[#eeeae2] ${coverAspect}`}>
          <CoverBox item={item} onPlay={onPlay} />
        </div>
        <div className="flex min-h-[118px] flex-col p-3.5 sm:min-h-[132px] sm:p-4">
          <div className="line-clamp-2 font-serif text-[15px] font-semibold leading-snug text-[#26221c] sm:min-h-[2.75rem] sm:text-[17px]">
            {item.title}
          </div>
          <div className="mt-1 truncate text-xs text-[#9b9388] sm:text-[13px]">{item.creator}</div>
          {item.note && (
            <div className="mt-2 line-clamp-2 text-xs leading-relaxed text-[#6b655c] sm:text-[13px]">{item.note}</div>
          )}
          {item.rating != null && (
            <div className="mt-auto flex gap-0.5 pt-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className="h-3 w-3"
                  fill={i < (item.rating ?? 0) ? ACCENT : 'none'}
                  stroke={ACCENT}
                  strokeOpacity={i < (item.rating ?? 0) ? 1 : 0.3}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </article>
  )
}

function ShelfSection({ category, items, onPlay }: { category: ShelfCategory; items: ShelfItem[]; onPlay: (item: ShelfItem) => void }) {
  const copy = SECTION_COPY[category]
  const meta = CATEGORY_META[category]

  return (
    <section>
      <div className="mb-4 flex items-end gap-3 border-b border-[#e8e4dc] pb-3 sm:mb-6">
        <div className="min-w-0 flex-1">
          <h2 className="font-serif text-xl font-bold text-[#26221c]">
            <span className="mr-2 text-base" aria-hidden="true">{meta.emoji}</span>
            {copy.title}
          </h2>
          <p className="mt-1 text-xs text-[#8f877c] sm:text-sm">{copy.description}</p>
        </div>
        <span className="shrink-0 rounded-full bg-[#eee9df] px-2.5 py-1 text-xs text-[#756d62]">{items.length} 件</span>
      </div>
      <div className={`grid ${GRID_CLASS[category]}`}>
        {items.map((item) => <ShelfCard key={item.id} item={item} onPlay={onPlay} />)}
      </div>
    </section>
  )
}

/** 页面内弹窗播放器：直链视频用 <video>，B 站内嵌 iframe，网易云用外链播放器 */
function MediaModal({ item, onClose }: { item: ShelfItem; onClose: () => void }) {
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
  const sp = !bvid && item.musicUrl ? spotifyEmbed(item.musicUrl) : null
  const nid = !bvid && !sp && item.musicUrl ? neteaseSongId(item.musicUrl) : null
  const isMusic = !!nid || !!sp

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className={`w-full ${isMusic ? 'max-w-md' : 'max-w-3xl'}`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3 text-white">
          <div className="font-medium truncate pr-4">{item.title}</div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-white/15 transition-colors" aria-label="关闭">
            <X className="w-5 h-5" />
          </button>
        </div>
        {bvid ? (
          <iframe
            src={`https://player.bilibili.com/player.html?bvid=${bvid}&autoplay=1&high_quality=1&danmaku=0`}
            className="w-full aspect-video rounded-lg bg-black"
            allowFullScreen
            scrolling="no"
            frameBorder="0"
          />
        ) : sp ? (
          <iframe
            src={`https://open.spotify.com/embed/${sp.kind}/${sp.id}?utm_source=generator&theme=0`}
            className="w-full rounded-xl"
            height={sp.kind === 'track' ? 152 : 352}
            frameBorder="0"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
          />
        ) : nid ? (
          <div className="rounded-xl overflow-hidden bg-[#faf9f6] shadow-2xl">
            {item.cover && <img src={item.cover} alt={item.title} className="w-full aspect-square object-cover" />}
            <div className="p-4">
              <div className="font-medium text-[15px] text-[#26221c] truncate">{item.title}</div>
              <div className="text-xs text-[#a39e93] mt-0.5 truncate">{item.creator}</div>
              <iframe
                src={`https://music.163.com/outchain/player?type=2&id=${nid}&auto=1&height=66`}
                className="w-full mt-3"
                height={86}
                frameBorder="0"
              />
            </div>
          </div>
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

  const sections = useMemo(
    () => SHELF_ORDER
      .filter((category) => filter === 'all' || category === filter)
      .map((category) => ({ category, items: SHELF.filter((item) => item.category === category) }))
      .filter((section) => section.items.length > 0),
    [filter],
  )

  const visibleCount = sections.reduce((count, section) => count + section.items.length, 0)

  return (
    <div className="min-h-screen bg-[#faf9f6] text-[#26221c]">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 pt-6 text-sm sm:px-6">
        <Link to="/" className="flex items-center gap-2 font-serif font-bold text-lg hover:text-[#c2410c] transition-colors">
          <img src="/sheep-planet.png" alt="返回首页" className="w-6 h-6 object-contain" />
          羊宇宙漫游指南
        </Link>
        <SiteNav />
      </header>

      <main className="mx-auto max-w-6xl px-5 pb-20 sm:px-6">
        <section className="pb-7 pt-10 sm:pb-8 sm:pt-14">
          <p className="mb-2 text-xs font-medium uppercase tracking-[0.22em] text-[#c2410c]">Wandering Shelf</p>
          <h1 className="font-serif text-3xl font-bold tracking-tight sm:text-4xl">漫游</h1>
          <p className="mt-3 max-w-xl text-sm leading-7 text-[#6b655c] sm:text-base">在文学、电影和音乐里漫游。这里不追求完整，只留下值得再次遇见的作品。</p>
        </section>

        <div className="mb-10 flex w-full gap-1.5 overflow-x-auto rounded-2xl border border-[#e8e4dc] bg-white/60 p-2 shadow-[0_2px_12px_rgba(80,64,40,0.04)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mb-12 sm:w-fit sm:gap-2">
          {(Object.keys(CATEGORY_META) as ShelfFilter[]).map((k) => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className={`shrink-0 rounded-xl border px-3 py-2 text-sm transition-colors sm:px-3.5 ${
                filter === k
                  ? 'border-transparent text-white shadow-sm'
                  : 'border-transparent bg-transparent text-[#6b655c] hover:border-[#ddd6ca] hover:bg-white'
              }`}
              style={filter === k ? { background: ACCENT } : undefined}
            >
              {CATEGORY_META[k].emoji} {CATEGORY_META[k].label}
            </button>
          ))}
        </div>

        {visibleCount === 0 ? (
          <p className="text-sm text-[#a39e93] py-16 text-center">
            这一类还空着，去 src/data/shelf.ts 添一件喜欢的作品吧。
          </p>
        ) : (
          <div className="space-y-12 sm:space-y-16">
            {sections.map((section) => (
              <ShelfSection key={section.category} category={section.category} items={section.items} onPlay={setPlaying} />
            ))}
          </div>
        )}
      </main>

      {playing && <MediaModal item={playing} onClose={() => setPlaying(null)} />}
    </div>
  )
}
