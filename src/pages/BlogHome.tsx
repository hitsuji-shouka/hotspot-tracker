import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { ArrowDown, ArrowRight, ArrowUpRight, Github, Mail } from 'lucide-react'
import SiteHeader from '@/components/SiteHeader'
import { SHELF, type ShelfItem } from '@/data/shelf'
import { EXPERIMENTS } from '@/data/lab'
import { posts, type Post } from '@/lib/posts'
import HomeSpace from './HomeSpace'
import './home.css'

const shelfPicks = ['movie-interstellar', 'book-qianshuiting', 'music-wanqing']
  .map(id => SHELF.find(item => item.id === id))
  .filter((item): item is ShelfItem => !!item)

const blogPicks = ['hotspot-tracker-story', 'domain-deploy-story', 'hello-blog']
  .map(slug => posts.find(post => post.slug === slug))
  .filter((post): post is Post => !!post)

const contacts = [
  { label: '个人网站', href: 'https://hitsuji-shouka.com/', mark: '羊' },
  { label: 'GitHub', href: 'https://github.com/hitsuji-shouka', mark: 'github' },
  { label: '知乎', href: 'https://www.zhihu.com/people/richardy-62', mark: '知' },
  { label: '小红书', href: 'https://www.xiaohongshu.com/user/profile/65bcd985000000000e027267', mark: '红' },
  { label: 'B站', href: 'https://space.bilibili.com/3546877089811185?spm_id_from=333.1007.0.0', mark: 'B' },
  { label: 'X', href: 'https://x.com/richard29861802', mark: '𝕏' },
]
const email = '2483346490@qq.com'

export default function BlogHome() {
  const [emailCopied, setEmailCopied] = useState(false)
  useEffect(() => { document.title = '羊宇宙漫游指南' }, [])

  return <div className="home-page">
    <section className="home-hero" aria-label="关于我">
      <HomeSpace />
      <div className="home-hero-vignette" aria-hidden="true" />
      <SiteHeader className="home-header" />
      <div className="home-intro">
        <h1>喜欢探究技术，<br />也喜欢感受故事。</h1>
        <div className="home-intro-copy">
          <p>你好，我是羊宇宙。</p>
          <p>这里记录 AI Agent、后端开发，<span className="home-intro-interests">以及文学、电影和音乐。</span></p>
        </div>
      </div>
      <a className="home-scroll-cue" href="#home-wander">继续探索 <ArrowDown size={16} aria-hidden="true" /></a>
    </section>

    <main className="home-sections">
      <section className="home-section" id="home-wander" aria-labelledby="home-wander-title">
        <div className="home-section-heading">
          <div>
            <span className="home-section-index">01 / WANDER</span>
            <h2 id="home-wander-title">漫游</h2>
            <p>电影、书页和旋律，收集那些让我停下来的瞬间。</p>
          </div>
          <Link className="home-section-link" to="/shelf">走进漫游 <ArrowUpRight size={18} aria-hidden="true" /></Link>
        </div>
        <div className="home-shelf-grid">
          {shelfPicks.map(item => <Link key={item.id} className={`home-shelf-pick home-shelf-pick--${item.category}`} to={`/shelf?category=${item.category}`}>
            <div className={`home-shelf-visual home-shelf-visual--${item.category}`}>{item.cover && <img src={item.cover} alt="" loading="lazy" />}</div>
            <span className="home-pick-type">{{ movie: '影视', book: '图书', music: '音乐' }[item.category]}</span>
            <div className="home-pick-title"><h3>{item.title}</h3><ArrowUpRight size={19} aria-hidden="true" /></div>
            <p>{item.creator}</p>
          </Link>)}
        </div>
      </section>

      <section className="home-section" aria-labelledby="home-blog-title">
        <div className="home-section-heading">
          <div>
            <span className="home-section-index">02 / WRITING</span>
            <h2 id="home-blog-title">博客</h2>
            <p>把做过的事、走过的弯路和正在想的问题写下来。</p>
          </div>
          <Link className="home-section-link" to="/blog">阅读全部文章 <ArrowUpRight size={18} aria-hidden="true" /></Link>
        </div>
        <div className="home-blog-grid">
          {blogPicks[0] && <Link className="home-blog-feature" to={`/post/${blogPicks[0].slug}`}>
            <span className="home-pick-type">精选文章 · {blogPicks[0].date}</span>
            <h3>{blogPicks[0].title}</h3>
            <p>{blogPicks[0].summary}</p>
            <span className="home-read-more">阅读文章 <ArrowRight size={17} aria-hidden="true" /></span>
          </Link>}
          <div className="home-blog-list">
            {blogPicks.slice(1).map(post => <Link key={post.slug} to={`/post/${post.slug}`}>
              <span className="home-pick-type">{post.tags[0] ?? '文章'} · {post.date}</span>
              <div className="home-pick-title"><h3>{post.title}</h3><ArrowUpRight size={19} aria-hidden="true" /></div>
              <p>{post.summary}</p>
            </Link>)}
          </div>
        </div>
      </section>

      <section className="home-section" aria-labelledby="home-lab-title">
        <div className="home-section-heading">
          <div>
            <span className="home-section-index">03 / LABS</span>
            <h2 id="home-lab-title">实验</h2>
            <p>一些奇奇怪怪的小折腾。想到什么，就做出来玩玩。</p>
          </div>
          <Link className="home-section-link" to="/lab">进入实验 <ArrowUpRight size={18} aria-hidden="true" /></Link>
        </div>
        <div className="home-lab-grid">
          {EXPERIMENTS.filter(item => item.path).map(item => <Link key={item.id} className="home-lab-pick" to={item.path!}>
            <div className="home-lab-visual"><img src={item.cover === 'room' ? '/lab/room-card.webp' : '/lab/central-perk/cover-card.webp'} alt="" loading="lazy" /></div>
            <div className="home-lab-copy">
              <span className="home-pick-type">{item.status === 'ready' ? '可以体验' : '筹备中'}</span>
              <div className="home-pick-title"><h3>{item.title}</h3><ArrowUpRight size={19} aria-hidden="true" /></div>
              <p>{item.description}</p>
            </div>
          </Link>)}
        </div>
      </section>
    </main>

    <footer className="home-footer">
      <div className="home-footer-inner">
        <p>保持联系</p>
        <nav className="home-contact-links" aria-label="联系链接">
          {contacts.map(contact => <a key={contact.label} href={contact.href} target="_blank" rel="noopener noreferrer" aria-label={contact.label} title={contact.label}>
            <span className="home-contact-mark" aria-hidden="true">{contact.mark === 'github' ? <Github /> : contact.mark}</span>
            <span>{contact.label}</span>
          </a>)}
        </nav>
        <small>© {new Date().getFullYear()} 羊宇宙 · <button type="button" className="home-email-copy" title={emailCopied ? '已复制' : '点击复制邮箱地址'} onClick={async () => {
          try { await navigator.clipboard.writeText(email); setEmailCopied(true) }
          catch { setEmailCopied(false) }
        }} onMouseLeave={() => setEmailCopied(false)} onBlur={() => setEmailCopied(false)}>
          <Mail size={16} aria-hidden="true" />{email}<span className="home-email-copy-status" role="status">{emailCopied ? '已复制' : ''}</span>
        </button></small>
      </div>
    </footer>
  </div>
}
