import { useAdmin } from '@/lib/admin'
import { useEffect, useRef, useState } from 'react'
import { Edit3, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { pullKey, pushSync } from '@/lib/sync'
import { articleIdentity, articleSource, articleTagLabel, articleTags, articleTopics, articleUrl, INITIAL_READING, isReadingList, normalizeArticles, READING_KEY, READING_TOPICS, restoreArticle, type ReadingArticle } from '@/lib/reading'

const fieldClass = 'w-full rounded-md border border-[#30363d] bg-[#0d1117] px-3 py-2 text-base sm:text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#58a6ff]'
const chipClass = 'max-w-full break-words rounded-full border px-3 py-1.5 text-sm transition-colors '
const activeChip = 'border-[#e3b341]/60 bg-[#e3b341]/15 text-[#e3b341]'
const idleChip = 'border-[#30363d] bg-[#161b22] text-[#8b949e] hover:border-[#8b949e]'

function localArticles() {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(`ghhot:${READING_KEY}`) ?? 'null')
    return isReadingList(value) ? normalizeArticles(value) : INITIAL_READING
  } catch { return INITIAL_READING }
}

function ArticleEditor({ article, topics, ready, syncError, onSave, onClose }: {
  article: ReadingArticle | null
  topics: string[]
  ready: boolean
  syncError: string
  onSave: (article: ReadingArticle) => Promise<string | null>
  onClose: () => void
}) {
  const [input, setInput] = useState(article?.url ?? '')
  const [title, setTitle] = useState(article?.title ?? '')
  const [description, setDescription] = useState(article?.description ?? '')
  const [tags, setTags] = useState(article?.tags.join('、') ?? '')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const [createdAt] = useState(Date.now)
  const selectedTags = articleTags(tags)
  const suggestions = articleTags([...topics, ...READING_TOPICS].join('、'))

  async function save(event: React.FormEvent) {
    event.preventDefault()
    let url: string
    try { url = articleUrl(input) } catch { setMessage('未识别到有效链接，请检查地址'); return }
    if (!title.trim()) { setMessage('请填写文章标题'); return }
    if (saving) return
    setSaving(true)
    const error = await onSave({
      id: article?.id ?? crypto.randomUUID(), url,
      title: title.trim(),
      description: description.trim(), image: article?.image ?? null, tags: selectedTags,
      addedAt: article?.addedAt ?? createdAt,
    })
    setSaving(false)
    if (error) setMessage(error)
    else onClose()
  }

  return (
    <DialogContent className="max-h-[88dvh] overflow-y-auto border-[#30363d] bg-[#161b22] text-[#c9d1d9]">
      <DialogHeader>
        <DialogTitle className="text-white">{article ? '编辑文章收藏' : '导入文章'}</DialogTitle>
        <DialogDescription className="text-[#8b949e]">填写链接和标题即可收藏，简介和标签选填。</DialogDescription>
      </DialogHeader>
      <form onSubmit={save} className="space-y-4 pt-2">
        {!ready && <p className="text-sm text-[#8b949e]" role={syncError ? 'alert' : 'status'}>{syncError || '正在同步已有收藏，你可以先填写文章信息。'}</p>}
        <div className="space-y-2 text-sm"><label htmlFor="article-url" className="block">文章链接或分享文案</label><textarea id="article-url" required rows={2} className={fieldClass} value={input} onChange={event => { setInput(event.target.value); setMessage('') }} placeholder="知乎、公众号、小红书、X 或其他文章链接" /></div>
        {message && <p className="text-sm text-[#8b949e]" role="status">{message}</p>}
        <div className="space-y-4">
          <div className="space-y-2 text-sm"><label htmlFor="article-title" className="block">标题</label><Input id="article-title" required className={fieldClass} value={title} onChange={event => setTitle(event.target.value)} placeholder="复制原标题，或写一个方便自己查找的标题" maxLength={300} /></div>
          <div className="space-y-2 text-sm"><label htmlFor="article-description" className="block">简介（选填）</label><textarea id="article-description" className={fieldClass} rows={2} value={description} onChange={event => setDescription(event.target.value)} placeholder="一句话记下这篇文章值得看什么" maxLength={2000} /></div>
          <div className="space-y-2">
            <label htmlFor="article-tags" className="block text-sm">主题标签（选填）</label><Input id="article-tags" className={fieldClass} value={tags} onChange={event => setTags(event.target.value)} placeholder="例如：上下文工程、Runtime" maxLength={200} aria-describedby="article-tag-help" />
            <p id="article-tag-help" className="text-xs text-[#8b949e]">建议每篇 1～3 个，用逗号分隔；新标签可自带图标，如「🔒 安全」。留空为未分类。</p>
            <details>
              <summary className="cursor-pointer py-1 text-xs text-[#58a6ff]">选择已有或推荐标签</summary>
              <div className="mt-2 flex max-h-36 flex-wrap gap-2 overflow-y-auto" aria-label="可选主题标签">
                {suggestions.map(tag => {
                  const selected = selectedTags.some(item => item.toLowerCase() === tag.toLowerCase())
                  return <button key={tag} type="button" aria-pressed={selected} className={chipClass + (selected ? activeChip : idleChip)} onClick={() => setTags((selected ? selectedTags.filter(item => item.toLowerCase() !== tag.toLowerCase()) : [...selectedTags, tag]).join('、'))}>{articleTagLabel(tag)}</button>
                })}
              </div>
            </details>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>取消</Button>
          <Button type="submit" disabled={saving || !ready || !input.trim() || !title.trim()} className="bg-[#238636] text-white hover:bg-[#2ea043]">保存收藏</Button>
        </div>
      </form>
    </DialogContent>
  )
}

export default function Articles({ keyword }: { keyword: string }) {
  const { canEdit } = useAdmin()
  const busy = useRef(false)
  const [articles, setArticles] = useState<ReadingArticle[]>(localArticles)
  const [ready, setReady] = useState(false)
  // null 为全部，空字符串为未分类，避免与用户输入的标签重名。
  const [topic, setTopic] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [editor, setEditor] = useState<{ article: ReadingArticle | null } | null>(null)
  const [removed, setRemoved] = useState<ReadingArticle | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    pullKey<unknown>(READING_KEY).then(value => {
      if (cancelled) return
      if (isReadingList(value)) setArticles(normalizeArticles(value))
      else if (value != null) setError('收藏数据格式异常，暂时无法编辑，请稍后重试。')
      setReady(value == null || isReadingList(value))
    }).catch(() => { if (!cancelled) { setReady(true); setError('暂时无法同步，正在展示本机收藏。') } })
    return () => { cancelled = true }
  }, [])

  async function persist(next: ReadingArticle[]) {
    if (!canEdit || !ready || busy.current) return false
    busy.current = true
    try {
      if (!await pushSync(READING_KEY, next)) return false
      setArticles(next)
      setError('')
      return true
    } finally { busy.current = false }
  }

  const topics = articleTopics(articles)
  const untagged = articles.filter(article => !article.tags.length).length
  const activeTopic = topic === '' ? (untagged ? '' : null) : topics.find(item => item.tag.toLowerCase() === topic?.toLowerCase())?.tag ?? null
  const query = keyword.trim().toLowerCase()
  const visible = articles.filter(article => {
    if (activeTopic === '' && article.tags.length) return false
    if (activeTopic && !article.tags.some(tag => tag.toLowerCase() === activeTopic.toLowerCase())) return false
    return `${article.title} ${article.description} ${article.tags.join(' ')} ${articleSource(article.url)}`.toLowerCase().includes(query)
  })

  return (
    <Dialog open={!!editor && canEdit} onOpenChange={open => { if (!open) setEditor(null) }}>
      <section className="space-y-3" aria-label="文章收藏">
        <div className="flex items-center gap-3">
          <div className="mr-auto min-w-0"><h2 className="font-bold text-white">📝 文章收藏</h2><p className="mt-0.5 text-xs text-[#8b949e]">共 {articles.length} 篇</p></div>
          {canEdit && <DialogTrigger asChild><Button className="shrink-0 bg-[#238636] text-white hover:bg-[#2ea043]" onClick={() => setEditor({ article: null })}><Plus className="mr-1.5 h-4 w-4" />导入链接</Button></DialogTrigger>}
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [&>button]:shrink-0 [&>button]:max-w-none [&>button]:whitespace-nowrap sm:flex-wrap sm:overflow-visible sm:pb-0 sm:[&>button]:max-w-full sm:[&>button]:whitespace-normal" aria-label="文章主题筛选">
          <button className={chipClass + (activeTopic === null ? activeChip : idleChip)} aria-pressed={activeTopic === null} onClick={() => setTopic(null)}>📚 全部 ({articles.length})</button>
          {topics.map(({ tag, count }, index) => <button key={tag} className={chipClass + (activeTopic === tag ? activeChip : idleChip) + (!expanded && index >= 6 && activeTopic !== tag ? ' sm:hidden' : '')} aria-pressed={activeTopic === tag} onClick={() => setTopic(tag)}>{articleTagLabel(tag)} ({count})</button>)}
          {untagged > 0 && <button className={chipClass + (activeTopic === '' ? activeChip : idleChip)} aria-pressed={activeTopic === ''} onClick={() => setTopic('')}>📦 未分类 ({untagged})</button>}
          {topics.length > 6 && <button className={chipClass + idleChip + ' hidden sm:inline-flex'} aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>{expanded ? '收起' : '更多'}</button>}
        </div>
        {error && <p className="text-sm text-[#f85149]" role="alert">{error}</p>}
        {canEdit && removed && <div className="flex items-center justify-between gap-3 rounded-lg border border-[#30363d] px-3 py-2 text-sm text-[#8b949e]" role="status"><span className="min-w-0 truncate">已取消收藏《{removed.title}》</span><button className="shrink-0 text-[#58a6ff] hover:underline" disabled={!ready} onClick={async () => { if (await persist(restoreArticle(articles, removed))) setRemoved(null) }}>撤销</button></div>}
        {visible.length ? visible.map(article => (
          <article key={article.id} className="rounded-lg border border-[#30363d] bg-[#161b22] px-3 py-3 transition-colors hover:border-[#58a6ff]/50 sm:px-4">
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <a href={article.url} target="_blank" rel="noreferrer" className="break-words font-semibold leading-snug text-[#58a6ff] hover:underline">{article.title}</a>
                <p className="mt-1 text-xs text-[#8b949e]">{articleSource(article.url)}</p>
                {article.description && <p className="mt-2 line-clamp-3 break-words text-sm leading-relaxed text-[#8b949e]">{article.description}</p>}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {article.tags.length ? article.tags.map(tag => <button key={tag} onClick={() => setTopic(tag)} className="max-w-full break-words rounded-full border border-[#e3b341]/35 bg-[#e3b341]/10 px-2 py-0.5 text-[11px] text-[#e3b341] hover:border-[#e3b341]" aria-label={`筛选标签：${tag}`}>{articleTagLabel(tag)}</button>) : <span className="text-xs text-[#8b949e]">📦 未分类</span>}
                </div>
              </div>
              {canEdit && <div className="flex shrink-0 flex-col items-center gap-1">
                <button disabled={!ready} onClick={() => setEditor({ article })} title="编辑" aria-label={`编辑：${article.title}`} className="rounded-md p-2 text-[#8b949e] hover:bg-[#30363d] hover:text-white disabled:opacity-50"><Edit3 className="h-4 w-4" /></button>
                <button disabled={!ready} onClick={async () => { if (await persist(articles.filter(item => item.id !== article.id))) setRemoved(article) }} title="删除收藏" aria-label={`删除收藏：${article.title}`} className="rounded-md p-2 text-[#8b949e] hover:bg-[#30363d] hover:text-[#f85149] disabled:opacity-50"><Trash2 className="h-4 w-4" /></button>
              </div>}
            </div>
          </article>
        )) : <div className="py-20 text-center text-[#8b949e]"><p className="mb-3 text-4xl">📝</p><p>{query || activeTopic !== null ? '没有匹配的收藏文章，试试其他标签或关键词' : '还没有收藏文章，可以导入链接'}</p></div>}
      </section>
      {editor && <ArticleEditor article={editor.article} topics={topics.map(item => item.tag)} ready={ready} syncError={error} onClose={() => setEditor(null)} onSave={async article => {
        if (!ready) return error || '正在同步已有收藏，请稍后保存。'
        if (articles.some(item => item.id !== article.id && articleIdentity(item.url) === articleIdentity(article.url))) return '这篇文章已经在收藏里了。'
        const next = articles.some(item => item.id === article.id) ? articles.map(item => item.id === article.id ? article : item) : [article, ...articles]
        if (!await persist(next)) return '保存失败，请检查网络或编辑权限后重试。'
        setTopic(null)
        return null
      }} />}
    </Dialog>
  )
}
