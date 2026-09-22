import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { Hash } from 'lucide-react'
import SiteNav from '@/components/SiteNav'
import { studyPosts } from '@/lib/posts'

const ACCENT = '#c2410c'
const BORDER = '#e8e4dc'

export default function TechPage() {
  const [tag, setTag] = useState<string>('all')

  useEffect(() => {
    document.title = '学习 · 羊宇宙漫游指南'
  }, [])

  const tags = useMemo(() => {
    const set = new Set<string>()
    studyPosts.forEach((p) => p.tags.forEach((t) => set.add(t)))
    return ['all', ...Array.from(set)]
  }, [])

  const items = useMemo(
    () => (tag === 'all' ? studyPosts : studyPosts.filter((p) => p.tags.includes(tag))),
    [tag],
  )

  return (
    <div className="min-h-screen bg-[#faf9f6] text-[#26221c]">
      <header className="max-w-3xl mx-auto px-6 pt-6 flex items-center justify-between text-sm">
        <Link to="/" className="flex items-center gap-2 font-serif font-bold text-lg hover:text-[#c2410c] transition-colors">
          <img src="/sheep-planet.png" alt="返回首页" className="w-6 h-6 object-contain" />
          羊宇宙漫游指南
        </Link>
        <SiteNav />
      </header>

      <main className="max-w-3xl mx-auto px-6 pb-16">
        <section className="pt-6 pb-6 sm:pt-8">
          <h1 className="font-serif text-2xl font-bold">学习</h1>
          <p className="text-sm text-[#6b655c] mt-2">
            技术、语言、经济——学会一样东西的最好方式，是把它讲清楚。
          </p>
        </section>

        {tags.length > 1 && (
          <div className="flex gap-2 mb-8 flex-wrap">
            {tags.map((t) => (
              <button
                key={t}
                onClick={() => setTag(t)}
                className={`flex items-center gap-0.5 px-3 py-1.5 rounded-full text-xs font-mono border transition-colors ${
                  tag === t
                    ? 'text-white border-transparent'
                    : 'text-[#6b655c] bg-white hover:border-[#a39e93]'
                }`}
                style={tag === t ? { background: ACCENT } : { borderColor: BORDER }}
              >
                {t === 'all' ? (
                  '全部'
                ) : (
                  <>
                    <Hash className="w-3 h-3" />
                    {t}
                  </>
                )}
              </button>
            ))}
          </div>
        )}

        {items.length === 0 ? (
          <p className="text-sm text-[#a39e93] py-16 text-center">
            这个主题还空着，去 src/study/ 写一篇吧。
          </p>
        ) : (
          <div className="space-y-1">
            {items.map((p) => (
              <Link
                key={p.slug}
                to={`/study/${p.slug}`}
                className="group flex items-baseline gap-4 py-3 border-b last:border-0 hover:bg-white/60 -mx-3 px-3 rounded-lg transition-colors"
                style={{ borderColor: BORDER }}
              >
                <span className="text-xs text-[#a39e93] font-mono shrink-0 w-20">{p.date}</span>
                <div className="min-w-0">
                  <span
                    className="font-medium text-[15px] group-hover:underline underline-offset-4"
                    style={{ textDecorationColor: ACCENT }}
                  >
                    {p.title}
                  </span>
                  {p.summary && (
                    <span className="block text-sm text-[#6b655c] mt-0.5 line-clamp-1">{p.summary}</span>
                  )}
                  {p.tags.length > 0 && (
                    <span className="flex gap-1.5 mt-1.5 flex-wrap">
                      {p.tags.map((t) => (
                        <span
                          key={t}
                          className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[11px] font-mono bg-[#efece5] text-[#6b655c]"
                        >
                          <Hash className="w-2.5 h-2.5" />
                          {t}
                        </span>
                      ))}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
