import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { Music, Play, Star, X } from 'lucide-react'
import SiteHeader from '@/components/SiteHeader'
import { CATEGORY_META, MOVIE_SUBGROUP_META, SHELF, type MovieSubgroup, type ShelfCategory, type ShelfItem } from '@/data/shelf'
import './shelf.css'

const ACCENT = '#e6b976'
const CATEGORIES: ShelfCategory[] = ['movie', 'book', 'music']
const MOVIE_SUBGROUPS: MovieSubgroup[] = ['anime', 'series', 'film']
const DESCRIPTIONS: Record<ShelfCategory, string> = {
  movie: '借一段光影，走进另一种人生。',
  book: '在书页之间，慢慢认识更辽阔的世界。',
  music: '有些心情说不清楚，就交给旋律。',
}

const GRADIENTS: Record<ShelfCategory, string> = {
  movie: 'from-[#1f2937] to-[#0f172a]',
  book: 'from-[#d6a85c] to-[#a97b3f]',
  music: 'from-[#8b7bd8] to-[#5b4fb8]',
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
  const preserveWholeCover = item.category === 'music' && !item.videoUrl

  const inner = item.cover ? (
    <img
      src={item.cover}
      alt={item.title}
      className={`h-full w-full ${preserveWholeCover ? 'object-contain' : 'object-cover'}`}
      loading="lazy"
    />
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

function ShelfCard({ item, onPlay, featured = false }: { item: ShelfItem; onPlay: (item: ShelfItem) => void; featured?: boolean }) {
  const isVideo = !!item.videoUrl
  const coverAspect = featured ? 'shelf-cover-featured' : item.category === 'music'
    ? isVideo
      ? 'aspect-video'
      : 'aspect-square'
    : 'aspect-[2/3]'

  return (
    <article className={`group min-w-0 ${featured ? 'shelf-card-featured' : isVideo ? 'col-span-2 sm:col-span-1' : ''}`}>
      <div className={`overflow-hidden rounded-lg border border-[#504b44] bg-[#2b2926] shadow-sm transition duration-300 group-hover:-translate-y-1 group-hover:shadow-xl ${coverAspect}`}>
        <CoverBox item={item} onPlay={onPlay} />
      </div>
      <div className="mt-3">
        <div className="line-clamp-2 font-serif text-[15px] font-semibold leading-snug text-[#eee9e0] sm:text-base">
          {item.title}
        </div>
        <div className="mt-1 truncate text-xs text-[#aaa39a]">{item.creator}</div>
        {item.note && (
          <div className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-[#aaa39a]">{item.note}</div>
        )}
        {item.rating != null && (
          <div className="mt-2 flex gap-0.5">
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
    </article>
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
  const [searchParams, setSearchParams] = useSearchParams()
  const filter = CATEGORIES.find(category => category === searchParams.get('category')) ?? 'movie'
  const subgroup: MovieSubgroup = MOVIE_SUBGROUPS.find(g => g === searchParams.get('sub')) ?? 'anime'
  const [playing, setPlaying] = useState<ShelfItem | null>(null)

  useEffect(() => {
    document.title = '漫游 · 羊宇宙漫游指南'
  }, [])

  const items = useMemo(() => {
    let filtered = SHELF.filter((item) => item.category === filter)
    if (filter === 'movie') filtered = filtered.filter((item) => (item.subgroup ?? 'film') === subgroup)
    if (filter !== 'music') return filtered
    const firstVideo = filtered.find(item => item.videoUrl)
    const albums = filtered.filter(item => !item.videoUrl).slice(0, 2)
    const firstRow = [firstVideo, ...albums].filter((item): item is ShelfItem => !!item)
    return [...firstRow, ...filtered.filter(item => !firstRow.includes(item))]
  }, [filter, subgroup])

  return (
    <div className="shelf-page min-h-screen">
      <SiteHeader />

      <main className="shelf-main">
        <h1 className="sr-only">漫游</h1>
        <section className="shelf-intro" aria-label="作品分类">
          <div className="shelf-switcher">
            <span className="shelf-count" aria-label={`${items.length} 件作品`}>{String(items.length).padStart(2, '0')}</span>
            <nav className="shelf-tabs" aria-label="作品分类">
              {CATEGORIES.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setSearchParams(previous => {
                const next = new URLSearchParams(previous)
                next.set('category', k)
                return next
              }, { preventScrollReset: true })}
              aria-pressed={filter === k}
              aria-label={CATEGORY_META[k].label}
              className={`shelf-tab ${filter === k ? 'is-active' : ''}`}
            >
              <span className="shelf-tab-small" aria-hidden="true">{CATEGORY_META[k].label}</span>
              <span className="shelf-tab-large" aria-hidden="true">{CATEGORY_META[k].label}</span>
            </button>
              ))}
            </nav>
          </div>
          <p className="shelf-description" aria-live="polite">{DESCRIPTIONS[filter]}</p>
          {filter === 'movie' && (
            <nav className="shelf-subtopics" aria-label="影视分组">
              {MOVIE_SUBGROUPS.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setSearchParams(previous => {
                    const next = new URLSearchParams(previous)
                    next.set('sub', g)
                    return next
                  }, { preventScrollReset: true })}
                  aria-pressed={subgroup === g}
                  className={subgroup === g ? 'is-active' : ''}
                >
                  {MOVIE_SUBGROUP_META[g].label}
                </button>
              ))}
            </nav>
          )}
        </section>

        {items.length === 0 ? (
          <p className="text-sm text-[#aaa39a] py-16 text-center">
            这一类还空着，去 src/data/shelf.ts 添一件喜欢的作品吧。
          </p>
        ) : (
          <div className={`shelf-grid ${filter === 'music' ? 'shelf-grid-music' : ''} ${filter === 'movie' ? 'shelf-grid-compact' : ''}`}>
            {items.map((item, index) => <ShelfCard key={item.id} item={item} onPlay={setPlaying} featured={filter === 'music' && index === 0 && !!item.videoUrl} />)}
          </div>
        )}
      </main>

      {playing && <MediaModal item={playing} onClose={() => setPlaying(null)} />}
    </div>
  )
}
