import { useEffect, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router'
import SiteHeader from '@/components/SiteHeader'
import { posts, type Post } from '@/lib/posts'
import './blog.css'

const topics = Array.from(new Set(posts.flatMap((post) => post.tags)))
  .sort((a, b) => {
    const count = (tag: string) => posts.filter((post) => post.tags.includes(tag)).length
    return count(b) - count(a) || a.localeCompare(b, 'zh-CN')
  })

function PostCard({ post, featured = false }: { post: Post; featured?: boolean }) {
  return <Link to={`/post/${encodeURIComponent(post.slug)}`} className={`garden-post ${featured ? 'garden-featured' : ''}`}>
    {featured && post.cover ? <img className="garden-cover" src={post.cover} alt="" loading="lazy" /> : <span className="garden-post-mark" aria-hidden="true" />}
    <div className="garden-post-copy">
      <h2>{post.title}</h2>
      {post.summary && <p>{post.summary}</p>}
      <div className="garden-post-meta"><span>{post.tags[0] ?? '笔记'}</span><span aria-hidden="true">·</span><time dateTime={post.date}>{post.date}</time></div>
    </div>
  </Link>
}

export default function BlogPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedTopic = searchParams.get('topic')
  const topic = requestedTopic && topics.includes(requestedTopic) ? requestedTopic : ''
  const filtered = useMemo(() => topic ? posts.filter((post) => post.tags.includes(topic)) : posts, [topic])
  const featured = filtered.find((post) => post.cover)
  const displayed = featured ? [featured, ...filtered.filter((post) => post.slug !== featured.slug)] : filtered

  useEffect(() => { document.title = '博客 · 羊宇宙漫游指南' }, [])

  function selectTopic(next: string) {
    setSearchParams(next ? { topic: next } : {}, { replace: true })
  }

  return <div className="garden-page">
    <SiteHeader />
    <main className="garden-main">
      <header className="garden-intro">
        <div className="garden-heading"><span className="garden-count">{String(filtered.length).padStart(2, '0')}</span><h1>博客</h1></div>
        <p>技术笔记、学习记录和偶尔冒出的想法。<br />一座还在生长的文字花园。</p>
      </header>
      <nav className="garden-topics" aria-label="按主题筛选文章">
        <span className="garden-topics-label">TOPICS <span aria-hidden="true">│</span></span>
        <div className="garden-topic-list">
          <button type="button" className={!topic ? 'is-active' : ''} aria-pressed={!topic} onClick={() => selectTopic('')}>全部</button>
          {topics.map((item) => <button type="button" key={item} className={topic === item ? 'is-active' : ''} aria-pressed={topic === item} onClick={() => selectTopic(item)}>{item}</button>)}
        </div>
      </nav>
      <section className="garden-grid" aria-label={topic ? `${topic}文章` : '全部文章'}>
        {displayed.map((post, index) => <PostCard key={post.slug} post={post} featured={index === 0 && !!post.cover} />)}
      </section>
    </main>
  </div>
}
