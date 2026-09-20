import { useEffect, useMemo, useState } from 'react'
import { Star } from 'lucide-react'
import SiteNav from '@/components/SiteNav'
import { CATEGORY_META, SHELF, type ShelfCategory, type ShelfFilter } from '@/data/shelf'

const ACCENT = '#c2410c'
const BORDER = '#e8e4dc'

const GRADIENTS: Record<ShelfCategory, string> = {
  movie: 'from-[#1f2937] to-[#0f172a]',
  book: 'from-[#d6a85c] to-[#a97b3f]',
  music: 'from-[#8b7bd8] to-[#5b4fb8]',
}

export default function ShelfPage() {
  const [filter, setFilter] = useState<ShelfFilter>('all')

  useEffect(() => {
    document.title = '作品分享 · 羊宇宙漫游指南'
  }, [])

  const items = useMemo(
    () => (filter === 'all' ? SHELF : SHELF.filter((i) => i.category === filter)),
    [filter],
  )

  return (
    <div className="min-h-screen bg-[#faf9f6] text-[#26221c]">
      <header className="max-w-5xl mx-auto px-6 pt-6 flex items-center justify-between text-sm">
        <span className="font-serif font-bold text-lg">羊宇宙漫游指南</span>
        <SiteNav />
      </header>

      <main className="max-w-5xl mx-auto px-6 pb-16">
        <section className="pt-10 pb-6">
          <h1 className="font-serif text-2xl font-bold">作品分享</h1>
          <p className="text-sm text-[#6b655c] mt-2">我喜欢的电影、书和音乐——这个书架会慢慢填满。</p>
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
                  className={`overflow-hidden rounded-lg border bg-white shadow-sm transition-all group-hover:shadow-md group-hover:-translate-y-1 ${
                    item.category === 'music' ? 'aspect-square' : 'aspect-[2/3]'
                  }`}
                  style={{ borderColor: BORDER }}
                >
                  {item.cover ? (
                    <img src={item.cover} alt={item.title} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div
                      className={`w-full h-full bg-gradient-to-br ${GRADIENTS[item.category]} flex flex-col items-center justify-center text-white/90 p-3`}
                    >
                      <span className="font-serif text-3xl font-bold">{item.title.slice(0, 1)}</span>
                      <span className="mt-2 text-[11px] tracking-wide text-white/70 text-center leading-snug">
                        {item.title}
                      </span>
                    </div>
                  )}
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
    </div>
  )
}
