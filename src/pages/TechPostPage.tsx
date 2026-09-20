import { Link, useParams } from 'react-router'
import { getTechPost, renderMarkdown } from '@/lib/posts'
import { ArrowLeft, Calendar, Hash } from 'lucide-react'

const BORDER = '#e8e4dc'
const ACCENT = '#c2410c'

export default function TechPostPage() {
  const { slug } = useParams()
  const post = slug ? getTechPost(slug) : undefined

  if (!post) {
    return (
      <div className="min-h-screen bg-[#faf9f6] text-[#26221c] flex items-center justify-center">
        <div className="text-center">
          <p className="text-4xl mb-3">🫥</p>
          <p className="text-[#6b655c]">文章不存在</p>
          <Link to="/tech" className="hover:underline text-sm mt-2 inline-block" style={{ color: ACCENT }}>
            返回技术
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#faf9f6] text-[#26221c]">
      <main className="max-w-3xl mx-auto px-6 py-10">
        <Link to="/tech" className="inline-flex items-center gap-1.5 text-sm text-[#a39e93] hover:text-[#26221c] transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" />
          返回技术
        </Link>

        <h1 className="font-serif text-3xl font-bold text-[#1d1a15] leading-tight">{post.title}</h1>
        <div className="flex items-center gap-3 mt-4 text-xs text-[#a39e93] flex-wrap">
          {post.date && (
            <span className="flex items-center gap-1 font-mono">
              <Calendar className="w-3 h-3" />
              {post.date}
            </span>
          )}
          {post.tags.map((t) => (
            <span
              key={t}
              className="flex items-center gap-0.5 px-2 py-0.5 rounded font-mono bg-[#efece5]"
              style={{ color: ACCENT }}
            >
              <Hash className="w-2.5 h-2.5" />
              {t}
            </span>
          ))}
        </div>

        <article
          className="md-body mt-8"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(post.content) }}
        />
      </main>
    </div>
  )
}
