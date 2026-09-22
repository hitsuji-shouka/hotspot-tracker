import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router'
import { ArrowDown, ArrowUpRight, BookOpen, Check, Edit3, Loader2, Plus, Search, Trash2 } from 'lucide-react'
import SiteNav from '@/components/SiteNav'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { fetchLinkPreview } from '@/lib/bookmarks'
import { pullKey, pushSync } from '@/lib/sync'
import { articleIdentity, articleSource, articleUrl, INITIAL_READING, isReadingList, previewImage, restoreArticle, READING_KEY, READING_TOPICS, type ReadingArticle } from '@/lib/reading'
import './reading.css'

function localArticles() {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(`ghhot:${READING_KEY}`) ?? 'null')
    return isReadingList(value) ? value : INITIAL_READING
  } catch { return INITIAL_READING }
}

function ArticleEditor({ article, onSave, onClose }: { article: ReadingArticle | null; onSave: (article: ReadingArticle) => string | null; onClose: () => void }) {
  const [input, setInput] = useState(article?.url ?? '')
  const [title, setTitle] = useState(article?.title ?? '')
  const [description, setDescription] = useState(article?.description ?? '')
  const [image, setImage] = useState(article?.image ?? '')
  const [note, setNote] = useState(article?.note ?? '')
  const [tags, setTags] = useState(article?.tags.join('、') ?? '')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const generation = useRef(0)
  useEffect(() => () => { generation.current++ }, [])

  async function preview() {
    let url: string
    try { url = articleUrl(input) } catch { setMessage('未识别到有效链接，请检查地址'); return }
    const request = ++generation.current
    setInput(url)
    setLoading(true)
    setMessage('')
    const data = await fetchLinkPreview(url)
    if (request !== generation.current) return
    if (data?.title) {
      setTitle(data.title)
      setDescription(data.description ?? '')
      setImage(previewImage(data.image) ?? '')
      setMessage('已获取预览，可以修改后保存。')
    } else {
      setMessage('暂未获取到预览。仍可保存链接，也可以手动填写标题和简介。')
    }
    setLoading(false)
  }

  function save(event: React.FormEvent) {
    event.preventDefault()
    let url: string
    try { url = articleUrl(input) } catch { setMessage('未识别到有效链接，请检查地址'); return }
    if (image.trim() && !previewImage(image.trim())) { setMessage('封面地址需要是有效的 http 或 https 图片链接'); return }
    const error = onSave({
      id: article?.id ?? crypto.randomUUID(), url,
      title: title.trim() || `${articleSource(url)} · 待读文章`,
      description: description.trim(), image: previewImage(image.trim()), note: note.trim(),
      tags: [...new Set(tags.split(/[,，、]/).map(tag => tag.trim()).filter(Boolean))],
      read: article?.read ?? false, addedAt: article?.addedAt || Date.now(),
    })
    if (error) setMessage(error)
    else onClose()
  }

  return (
    <DialogContent className="reading-editor">
      <DialogHeader>
        <DialogTitle>{article ? '整理这篇文章' : '收藏一篇好文章'}</DialogTitle>
        <DialogDescription>留下链接，也留下你想读它的理由。</DialogDescription>
      </DialogHeader>
      <form onSubmit={save} className="reading-form">
        <label>文章链接或分享文案<textarea required rows={2} value={input} onChange={event => { generation.current++; setLoading(false); setInput(event.target.value); setMessage('') }} placeholder="粘贴知乎、公众号、小红书、X 或其他文章链接" /></label>
        <button type="button" className="reading-button" disabled={!input.trim() || loading} onClick={preview}>{loading ? <Loader2 size={15} className="animate-spin" /> : <ArrowDown size={15} />} {loading ? '正在获取预览' : '获取标题和封面'}</button>
        <p className="reading-message" role="status">{message}</p>
        <fieldset disabled={loading}>
          <label>标题<input value={title} onChange={event => setTitle(event.target.value)} placeholder="未获取到时可以自己填写" maxLength={300} /></label>
          <label>简介<textarea rows={2} value={description} onChange={event => setDescription(event.target.value)} maxLength={2000} /></label>
          <label>封面图片地址（可选）<input type="url" value={image} onChange={event => setImage(event.target.value)} placeholder="https://…" /></label>
          <label>主题标签<input value={tags} onChange={event => setTags(event.target.value)} placeholder="Agent、大模型、后端（用逗号分隔）" maxLength={200} /></label>
          <label>我的推荐语（可选）<textarea rows={2} value={note} onChange={event => setNote(event.target.value)} placeholder="为什么想读这篇文章？" maxLength={1000} /></label>
        </fieldset>
        <div className="reading-form-actions"><button type="button" className="reading-button" onClick={onClose}>取消</button><button type="submit" className="reading-button reading-primary" disabled={loading || !input.trim()}>保存收藏</button></div>
      </form>
    </DialogContent>
  )
}

function ReadingCard({ article, onRead, onEdit, onRemove }: { article: ReadingArticle; onRead: () => void; onEdit: () => void; onRemove: () => void }) {
  const [failed, setFailed] = useState<string | null>(null)
  const [loaded, setLoaded] = useState<string | null>(null)
  const source = articleSource(article.url)
  const hasImage = article.image && failed !== article.image
  return (
    <article className="reading-card">
      <div className="reading-card-top"><span className="reading-accession">{source}</span><button className={`reading-status ${article.read ? 'is-read' : ''}`} onClick={onRead} aria-label={`${article.read ? '标记待读' : '标记已读'}：${article.title}`} aria-pressed={article.read}>{article.read ? <Check size={12} /> : <span className="reading-dot" />} {article.read ? '已读' : '待读'}</button></div>
      <a href={article.url} target="_blank" rel="noreferrer" className="reading-card-link" aria-label={`${article.title}（在新标签页打开原文）`}>
        <div className="reading-cover"><div className="reading-type-cover" aria-hidden="true"><BookOpen size={28} strokeWidth={1.25} /><span>{source}</span></div>{hasImage && <img className={loaded === article.image ? 'is-loaded' : ''} src={article.image!} alt="" loading="lazy" referrerPolicy="no-referrer" onLoad={() => setLoaded(article.image)} onError={() => setFailed(article.image)} />}</div>
        <h2>{article.title}<ArrowUpRight size={17} /></h2>
      </a>
      {article.description && <p className="reading-description">{article.description}</p>}
      {article.note && <p className="reading-note">{article.note}</p>}
      <div className="reading-card-bottom"><div className="reading-tags">{article.tags.map(tag => <span key={tag}>{tag}</span>)}</div><div className="reading-card-tools"><button onClick={onEdit} aria-label={`编辑：${article.title}`} title="编辑"><Edit3 size={15} /></button><button onClick={onRemove} aria-label={`移除：${article.title}`} title="移除"><Trash2 size={15} /></button></div></div>
    </article>
  )
}

export default function ReadingPage() {
  const [articles, setArticles] = useState<ReadingArticle[]>(localArticles)
  const [ready, setReady] = useState(false)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  const [topic, setTopic] = useState('全部主题')
  const [editor, setEditor] = useState<{ article: ReadingArticle | null } | null>(null)
  const [removed, setRemoved] = useState<ReadingArticle | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    document.title = '阅读 · 羊宇宙漫游指南'
    let cancelled = false
    pullKey<unknown>(READING_KEY).then(value => {
      if (cancelled) return
      if (isReadingList(value)) setArticles(value)
      else if (value != null) setError('收藏数据格式异常，暂时无法编辑，请稍后重试。')
      setReady(value == null || isReadingList(value))
    }).catch(() => { if (!cancelled) { setReady(true); setError('暂时无法同步，正在展示本机收藏。') } })
    return () => { cancelled = true }
  }, [])

  function persist(next: ReadingArticle[]) {
    try {
      localStorage.setItem(`ghhot:${READING_KEY}`, JSON.stringify(next))
    } catch { setError('浏览器未能保存收藏，请检查存储空间后重试。'); return false }
    setArticles(next)
    pushSync(READING_KEY, next)
    setError('')
    return true
  }

  const topics = [...new Set([...READING_TOPICS, ...articles.flatMap(article => article.tags)])]
  const visible = useMemo(() => articles.filter(article => {
    if (status === 'unread' && article.read || status === 'read' && !article.read) return false
    if (topic !== '全部主题' && !article.tags.includes(topic)) return false
    return `${article.title} ${article.description} ${article.note} ${article.tags.join(' ')} ${articleSource(article.url)}`.toLowerCase().includes(query.trim().toLowerCase())
  }), [articles, query, status, topic])
  const unread = articles.filter(article => !article.read).length

  return (
    <div className="reading-page">
      <header className="reading-header"><Link to="/" className="flex items-center gap-2 font-serif font-bold text-lg hover:text-[#c2410c] transition-colors"><img src="/sheep-planet.png" alt="返回首页" className="w-6 h-6 object-contain" />羊宇宙漫游指南</Link><SiteNav /></header>
      <main className="reading-main">
        <section className="reading-hero">
          <div className="reading-intro"><h1 className="font-serif text-2xl font-bold">阅读</h1><p className="reading-lead">把散落各处的好文章收起来，慢慢读，让知识彼此相连。</p></div>
          <button className="reading-button reading-primary" disabled={!ready} onClick={() => setEditor({ article: null })}><Plus size={16} /> 收藏文章</button>
        </section>
        <div className="reading-catalog-head"><div className="reading-status-tabs" aria-label="阅读状态">{[{ key: 'all', label: '全部收藏', count: articles.length }, { key: 'unread', label: '待读', count: unread }, { key: 'read', label: '已读', count: articles.length - unread }].map(item => <button key={item.key} onClick={() => setStatus(item.key)} aria-pressed={status === item.key}>{item.label}<span>{item.count}</span></button>)}</div><label className="reading-search"><Search size={16} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="在收藏中寻一篇文章" aria-label="搜索收藏文章" /></label></div>
        <div className="reading-topics" aria-label="主题筛选">{['全部主题', ...topics].map(item => <button key={item} onClick={() => setTopic(item)} aria-pressed={topic === item}>{item}</button>)}</div>
        <div className="reading-catalog-caption"><span aria-live="polite">共 {visible.length} 篇文章</span><span>点击标题阅读原文 ↗</span></div>
        {error && <p className="reading-error" role="alert">{error}</p>}
        {removed && <div className="reading-undo" role="status">已移除《{removed.title}》<button onClick={() => { if (persist(restoreArticle(articles, removed))) setRemoved(null) }}>撤销</button></div>}
        {visible.length ? <div className="reading-grid">{visible.map(article => <ReadingCard key={article.id} article={article} onRead={() => { if (ready) persist(articles.map(item => item.id === article.id ? { ...item, read: !item.read } : item)) }} onEdit={() => { if (ready) setEditor({ article }) }} onRemove={() => { if (ready && persist(articles.filter(item => item.id !== article.id))) setRemoved(article) }} />)}</div> : <div className="reading-empty"><BookOpen size={36} strokeWidth={1} /><h2>{articles.length ? '暂时没有匹配的文章' : '给下一次阅读，留一个位置。'}</h2><p>{articles.length ? '试试其他主题，或者换个关键词。' : '从一篇让你停下来的文章开始。'}</p>{articles.length > 0 && <button className="reading-button" onClick={() => { setQuery(''); setTopic('全部主题'); setStatus('all') }}>查看全部收藏</button>}</div>}
        <footer className="reading-footer"><span>羊宇宙 · 阅读收藏</span><span>一篇一篇，读出自己的世界。</span></footer>
      </main>
      <Dialog open={!!editor} onOpenChange={open => { if (!open) setEditor(null) }}>{editor && <ArticleEditor article={editor.article} onClose={() => setEditor(null)} onSave={article => {
        if (articles.some(item => item.id !== article.id && articleIdentity(item.url) === articleIdentity(article.url))) return '这篇文章已经在收藏里了。'
        const next = articles.some(item => item.id === article.id) ? articles.map(item => item.id === article.id ? article : item) : [article, ...articles]
        return persist(next) ? null : '保存失败，请检查浏览器存储空间后重试。'
      }} />}</Dialog>
    </div>
  )
}
