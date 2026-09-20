import { useEffect } from 'react'
import { Link } from 'react-router'
import SiteNav from '@/components/SiteNav'
import { posts } from '@/lib/posts'

const ACCENT = '#c2410c'
const BORDER = '#e8e4dc'

export default function BlogPage() {
  useEffect(() => {
    document.title = '博客 · 羊宇宙漫游指南'
  }, [])

  return (
    <div className="min-h-screen bg-[#faf9f6] text-[#26221c]">
      <header className="max-w-3xl mx-auto px-6 pt-6 flex items-center justify-between text-sm">
        <Link to="/" className="font-serif font-bold text-lg hover:text-[#c2410c] transition-colors">羊宇宙漫游指南</Link>
        <SiteNav />
      </header>

      <main className="max-w-3xl mx-auto px-6 pb-16">
        <section className="pt-10 pb-6">
          <h1 className="font-serif text-2xl font-bold">博客</h1>
          <p className="text-sm text-[#6b655c] mt-2">随手记录，慢慢来。</p>
        </section>

        <div className="space-y-1">
          {posts.map((p) => (
            <Link
              key={p.slug}
              to={`/post/${p.slug}`}
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
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  )
}
