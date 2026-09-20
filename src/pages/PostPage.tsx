import { Link, useParams } from 'react-router'
import { getPost, renderMarkdown } from '@/lib/posts'
import { ArrowLeft, Calendar, Tag } from 'lucide-react'

export default function PostPage() {
  const { slug } = useParams()
  const post = slug ? getPost(slug) : undefined

  if (!post) {
    return (
      <div className="min-h-screen bg-[#0d1117] text-[#c9d1d9] flex items-center justify-center">
        <div className="text-center">
          <p className="text-4xl mb-3">🫥</p>
          <p className="text-[#8b949e]">文章不存在</p>
          <Link to="/" className="text-[#58a6ff] hover:underline text-sm mt-2 inline-block">
            返回首页
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0d1117] text-[#c9d1d9]">
      <main className="max-w-3xl mx-auto px-4 py-10">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-[#8b949e] hover:text-white mb-6">
          <ArrowLeft className="w-4 h-4" />
          返回首页
        </Link>

        <h1 className="text-3xl font-bold text-white leading-tight">{post.title}</h1>
        <div className="flex items-center gap-3 mt-3 text-xs text-[#8b949e] flex-wrap">
          {post.date && (
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {post.date}
            </span>
          )}
          {post.tags.map((t) => (
            <span key={t} className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#58a6ff]/10 text-[#58a6ff]">
              <Tag className="w-2.5 h-2.5" />
              {t}
            </span>
          ))}
        </div>

        <article
          className="md-body mt-8"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(post.content) }}
        />

        <footer className="text-center text-xs text-[#8b949e] pt-8 pb-8 mt-10 border-t border-[#30363d]">
          <Link to="/" className="text-[#58a6ff] hover:underline">
            ← 回到博客首页
          </Link>
        </footer>
      </main>
    </div>
  )
}
