import { useEffect } from 'react'
import { Link, useParams } from 'react-router'
import { ArrowLeft } from 'lucide-react'
import SiteHeader from '@/components/SiteHeader'
import ArticleBody from '@/components/ArticleBody'
import { getPost } from '@/lib/posts'
import './blog.css'

export default function PostPage() {
  const { slug } = useParams()
  const post = slug ? getPost(slug) : undefined

  useEffect(() => { document.title = post ? `${post.title} · 羊宇宙漫游指南` : '文章不存在 · 羊宇宙漫游指南' }, [post])

  if (!post) return <div className="garden-page">
    <SiteHeader />
    <main className="garden-missing"><h1>这篇文章还没有出现。</h1><Link to="/blog">返回博客</Link></main>
  </div>

  return <div className={`garden-page garden-reading ${post.layout === 'essay' ? 'garden-essay' : ''}`}>
    <SiteHeader />
    <main className="garden-article-main">
      <Link to="/blog" className="garden-back"><ArrowLeft size={16} /> 返回博客</Link>
      <header className="garden-article-header">
        <div className="garden-article-eyebrow"><span>FIELD NOTES</span><span aria-hidden="true">/</span><span>{post.tags[0] ?? '笔记'}</span></div>
        <h1>{post.title}</h1>
        {post.summary && <p className="garden-article-summary">{post.summary}</p>}
        <div className="garden-article-meta">
          <div className="garden-article-tags">{post.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
          <div className="garden-article-dates">
            {post.date && <span>发布于 <time dateTime={post.date}>{post.date}</time></span>}
            {post.updated && <span>更新于 <time dateTime={post.updated}>{post.updated}</time></span>}
          </div>
        </div>
      </header>
      {post.audience && <aside className="garden-audience" aria-label="适合谁阅读"><strong>适合谁阅读</strong><p>{post.audience}</p></aside>}
      {post.content.trim() ? <ArticleBody key={post.slug} content={post.content} /> : <p className="garden-empty-article">这篇笔记的正文还在整理中。</p>}
    </main>
  </div>
}
