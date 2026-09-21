import { useEffect, useMemo, useRef, useState } from 'react'
import { renderMarkdownWithToc } from '@/lib/posts'

export default function ArticleBody({ content }: { content: string }) {
  const { html, toc } = useMemo(() => renderMarkdownWithToc(content), [content])
  const markup = useMemo(() => ({ __html: html }), [html])
  const [activeId, setActiveId] = useState('')
  const articleRef = useRef<HTMLElement>(null)
  const mobileRef = useRef<HTMLDetailsElement>(null)

  useEffect(() => {
    const article = articleRef.current
    if (!article || !toc.length) return
    const headings = Array.from(article.querySelectorAll<HTMLElement>('h2, h3'))
    let frame = 0
    const update = () => {
      frame = 0
      let current = headings[0]
      for (const heading of headings) {
        if (heading.getBoundingClientRect().top > 100) break
        current = heading
      }
      // 最后一个章节较短时，到达文末也应高亮它。
      if (window.scrollY > 0 && window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) {
        current = headings[headings.length - 1]
      }
      setActiveId(current.id)
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    const scrollToHash = () => {
      let id: string
      try { id = decodeURIComponent(window.location.hash.slice(1)) } catch { return }
      headings.find((heading) => heading.id === id)?.scrollIntoView()
    }
    scrollToHash()
    schedule()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    window.addEventListener('hashchange', scrollToHash)
    const observer = new ResizeObserver(schedule)
    observer.observe(article)
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      window.removeEventListener('hashchange', scrollToHash)
    }
  }, [toc])

  const links = (
    <ul className="article-toc-list">
      {toc.map(({ id, text, level }) => (
        <li key={id}>
          <a
            href={`#${encodeURIComponent(id)}`}
            className={level === 3 ? 'article-toc-subheading' : undefined}
            aria-current={activeId === id ? 'location' : undefined}
            onClick={() => {
              if (mobileRef.current) mobileRef.current.open = false
            }}
          >
            {text}
          </a>
        </li>
      ))}
    </ul>
  )

  return (
    <div className="article-body-layout mt-8">
      {toc.length > 0 && (
        <>
          <aside className="article-toc-desktop">
            <nav aria-label="文章目录">
              <p className="article-toc-title">目录</p>
              {links}
            </nav>
          </aside>
          <details ref={mobileRef} className="article-toc-mobile">
            <summary>目录</summary>
            <nav aria-label="文章目录">{links}</nav>
          </details>
        </>
      )}
      <article ref={articleRef} className="md-body" dangerouslySetInnerHTML={markup} />
    </div>
  )
}
