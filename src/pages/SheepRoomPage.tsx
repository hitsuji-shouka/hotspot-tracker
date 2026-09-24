import { lazy, Suspense, useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { ChevronLeft, ChevronRight, X, ShoppingBag, Download, RefreshCw } from 'lucide-react'
import { LabHeader } from './LabPage'
import './lab.css'
import './sheep-room.css'

type Brief = { room: string; style: string; needs: string; budget: number; duration: number }
type Product = { id: string; name: string; description: string; image: string; quantity: number; currency: string; reason: string; price: number; url: string; store: string }
type Plan = { runId: string; brief: Brief; products: Product[]; elapsed: number; timedOut?: boolean; stopReason?: string }
type ShopEvent = { type: 'session' | 'frame' | 'step' | 'bag' | 'done' | 'error'; runId?: string; duration?: number; startedAt?: number; message?: string; image?: string; elapsed?: number; products?: Product[]; added?: Product; result?: Plan }
const SheepRoomScene = lazy(() => import('./SheepRoomScene'))
const ROOMS = [{ name: '客厅', note: '窝进沙发，慢慢过周末。' }, { name: '卧室', note: '留一盏灯，好好睡一觉。' }, { name: '书房', note: '读几页书，发一会儿呆。' }, { name: '餐厅', note: '把日子，摆上餐桌。' }]
const money = (value: number) => `¥${value.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
function Photo({ product }: { product: Product }) {
  const [failed, setFailed] = useState(false)
  return <div className="room-product-photo">{failed || !product.image ? <span>照片暂时没加载出来</span> : <img src={product.image} referrerPolicy="no-referrer" alt={product.name} onError={() => setFailed(true)} />}</div>
}

export default function SheepRoomPage() {
  const requestRef = useRef<AbortController | null>(null)
  const bagRef = useRef<Product[]>([])
  const dialogRef = useRef<HTMLDialogElement>(null)
  const swipeRef = useRef<{ x: number; y: number } | null>(null)
  const [mobile, setMobile] = useState(() => window.matchMedia('(max-width: 640px)').matches)
  const [available, setAvailable] = useState<boolean | null>(null)
  const [statusFailed, setStatusFailed] = useState(false)
  const [renderAvailable, setRenderAvailable] = useState(false)
  // Keep the existing API shape; the combined ideas are passed intact in needs.
  const [brief, setBrief] = useState<Brief>({ room: '客厅', style: '以布置想法为准', needs: '原木、舒服，有一点绿。能窝着休息，也留一点收纳空间。', budget: 8000, duration: 150 })
  const [phase, setPhase] = useState<'room' | 'zoom' | 'shopping' | 'done'>('room')
  const [view, setView] = useState<'room' | 'desk'>('room')
  const [modal, setModal] = useState<'setup' | 'haul' | 'receipt' | 'image' | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [runId, setRunId] = useState('')
  const [complete, setComplete] = useState(false)
  const [image, setImage] = useState('')
  const [rendering, setRendering] = useState(false)
  const [renderAttempted, setRenderAttempted] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [frame, setFrame] = useState('')
  const [message, setMessage] = useState('从一间小屋开始')
  const [elapsed, setElapsed] = useState(0)
  const [shoppingClock, setShoppingClock] = useState<{ startedAt: number; duration: number } | null>(null)
  const [activeItem, setActiveItem] = useState(0)
  const [added, setAdded] = useState<Product | null>(null)

  useEffect(() => {
    const query = window.matchMedia('(max-width: 640px)')
    const update = () => setMobile(query.matches)
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])

  const refreshAvailability = useCallback(async () => {
    setAvailable(null)
    setStatusFailed(false)
    try {
      const response = await fetch('/api/room/status', { cache: 'no-store' })
      if (!response.ok) throw new Error(`Room status ${response.status}`)
      const data = await response.json()
      setAvailable(data.available === true)
      setRenderAvailable(data.renderAvailable === true)
    } catch {
      setAvailable(false)
      setStatusFailed(true)
    }
  }, [])

  useEffect(() => {
    document.title = '羊的小屋 · 羊宇宙漫游指南'
    void refreshAvailability()
    return () => requestRef.current?.abort()
  }, [refreshAvailability])
  useEffect(() => {
    if (modal && !dialogRef.current?.open) dialogRef.current?.showModal()
    if (!modal && dialogRef.current?.open) dialogRef.current.close()
    const previousOverflow = document.body.style.overflow
    if (modal) {
      document.body.style.overflow = 'hidden'
      dialogRef.current?.scrollTo({ top: 0 })
      dialogRef.current?.querySelector<HTMLButtonElement>('.room-close')?.focus({ preventScroll: true })
    }
    return () => { document.body.style.overflow = previousOverflow }
  }, [modal])
  useEffect(() => {
    if (phase !== 'shopping' || !shoppingClock) return
    const tick = () => setElapsed(Math.min(shoppingClock.duration, Math.max(0, Math.floor((Date.now() - shoppingClock.startedAt) / 1000))))
    const timer = window.setInterval(tick, 250)
    return () => window.clearInterval(timer)
  }, [phase, shoppingClock])
  useEffect(() => {
    if (!added) return
    const timer = window.setTimeout(() => setAdded(null), 3500)
    return () => window.clearTimeout(timer)
  }, [added])

  const total = products.reduce((sum, item) => sum + Math.round(item.price * 100) * item.quantity, 0) / 100
  const product = products[Math.min(activeItem, products.length - 1)]
  const busy = phase === 'shopping' || phase === 'zoom'

  function openSetup() { setView('room'); setModal('setup'); setError(''); void refreshAvailability() }
  function start(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    setModal(null); setPhase('zoom'); setView('desk'); setProducts([]); bagRef.current = []
    setFrame(''); setImage(''); setRunId(''); setComplete(false); setRenderAttempted(false)
    setError(''); setCopied(false); setAdded(null); setElapsed(0); setShoppingClock(null); setMessage('靠近一点，准备出发')
  }
  async function shop() {
    if (requestRef.current || phase !== 'zoom') return
    const controller = new AbortController()
    requestRef.current = controller
    setPhase('shopping'); setMessage('正在打开宜家')
    let finished = false
    let started = false
    try {
      const response = await fetch('/api/room/play', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(brief), signal: controller.signal })
      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { error?: string } | null
        throw new Error(payload?.error || '逛店服务暂时不可用')
      }
      if (!response.body) throw new Error('逛店连接未建立，请重试')
      const reader = response.body.getReader(), decoder = new TextDecoder()
      let buffer = ''
      for (;;) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const chunks = buffer.split('\n\n'); buffer = chunks.pop() || ''
        for (const chunk of chunks) {
          const line = chunk.split('\n').find(part => part.startsWith('data: '))
          if (!line) continue
          const update = JSON.parse(line.slice(6)) as ShopEvent
          if (update.type === 'session') {
            started = true
            setRunId(update.runId || '')
            setShoppingClock({ startedAt: update.startedAt ?? Date.now(), duration: update.duration ?? brief.duration })
          }
          if (update.type === 'frame' && update.image) setFrame(update.image)
          if (update.type === 'step') setMessage(update.message || '')
          if (update.type === 'bag' && update.products) {
            bagRef.current = update.products; setProducts(update.products); setAdded(update.added || null)
          }
          if (update.type === 'error') throw new Error(update.message || '这次逛店中断了')
          if (update.type === 'done' && update.result) {
            finished = true; bagRef.current = update.result.products; setProducts(update.result.products)
            setRunId(update.result.runId); setComplete(true); setElapsed(update.result.elapsed)
            setMessage(update.result.timedOut ? '时间到了，已选商品都留下了'
              : update.result.stopReason === 'model_timeout' ? '响应太慢，这轮先停在这里'
              : update.result.stopReason === 'budget_limit' ? '预算已用完，已选商品都留下了'
              : update.result.stopReason === 'step_limit' ? '这轮尝试次数用完了，已选商品都留下了'
              : update.result.products.length < 3 ? `这轮先挑到 ${update.result.products.length} 件，看看合不合心意`
              : '逛完了，看看带回来了什么')
          }
        }
      }
      if (!finished) throw new Error('连接中断了，已经选好的商品还在')
    } catch (cause) {
      if (controller.signal.aborted) setMessage('已停止，留下已经挑好的商品')
      else {
        const detail = cause instanceof Error ? cause.message : '逛店暂时失败'
        setError(detail)
        setMessage(started ? '这轮没有完整结束' : detail)
      }
    } finally {
      requestRef.current = null; setPhase(started ? 'done' : 'room'); setAdded(null); setActiveItem(0)
      if (!started) { setView('room'); setModal('setup') }
      else if (bagRef.current.length) setModal(current => current === 'receipt' ? current : 'haul')
    }
  }
  function receiptText() {
    return ['羊的小屋 · 小屋购物袋', `${brief.room} · ${brief.needs}`, ...products.map(item => `${item.name}\n${item.description}\n${money(item.price)} × ${item.quantity} = ${money(item.price * item.quantity)}\n${item.url}`), `商品合计 ${money(total)}`, '独立选品清单，未在商家下单。价格为逛店时参考价。'].join('\n\n')
  }
  async function copyList() {
    try { await navigator.clipboard.writeText(receiptText()); setCopied(true) }
    catch { setError('复制失败，可以用“保存清单”下载。') }
  }
  function saveList() {
    const url = URL.createObjectURL(new Blob([receiptText()], { type: 'text/plain;charset=utf-8' }))
    const a = document.createElement('a'); a.href = url; a.download = '羊的小屋-购物清单.txt'; a.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  async function render() {
    if (!renderAvailable || !runId || !complete || rendering || renderAttempted || !products.length) return
    setRendering(true); setRenderAttempted(true); setError('')
    try {
      const response = await fetch('/api/room/render', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ runId }) })
      const result = await response.json()
      if (!response.ok) {
        if (result.retryable === true) setRenderAttempted(false)
        throw new Error(result.error || '效果图暂时没生成，购物清单已经保留')
      }
      setImage(result.image); setModal('image')
    } catch (cause) { setError(cause instanceof Error ? cause instanceof TypeError ? '生图连接中断，结果尚未确认，请先核对服务商记录，清单仍然保留' : cause.message : '效果图生成失败，清单仍然保留') }
    finally { setRendering(false) }
  }

  return <div className="lab-page sheep-room" data-category="all">
    <LabHeader />
    <main className="room-stage" data-view={view} data-phase={phase}>
      <Suspense fallback={<div className="room-loading">正在打开小屋…</div>}><SheepRoomScene screenImage={frame} view={view} products={products} message={message} onSettled={() => { if (phase === 'zoom') void shop() }} /></Suspense>
      <Link to="/lab" className="lab-action room-back"><ChevronLeft size={17} aria-hidden="true" />返回实验室</Link>
      {phase === 'room' && view === 'room' && <div className="room-welcome"><span>一个慢慢布置家的小实验</span><h1>羊的小屋</h1></div>}
      {phase !== 'room' && <div className="room-status" role="status"><span className={busy ? 'room-live-dot' : ''} /><span>{phase === 'shopping' && shoppingClock && elapsed >= shoppingClock.duration ? '时间到了，正在整理清单' : message}</span>{phase !== 'zoom' && <small>{phase === 'shopping' ? shoppingClock ? `剩余 ${Math.floor(Math.max(0, shoppingClock.duration - elapsed) / 60)} 分 ${Math.max(0, shoppingClock.duration - elapsed) % 60} 秒` : '准备中' : `${elapsed} 秒`} · {products.length} 件</small>}</div>}
      {error && !modal && <div className="room-error" role="alert">{error}</div>}
      {added && <div className="room-added" role="status"><Photo key={added.id} product={added} /><div><small>放进小屋购物袋了</small><strong>{added.name}</strong><span>{money(added.price)}</span></div></div>}
      <div className="room-controls">
        <div className="room-views" aria-label="观看视角"><button disabled={phase === 'zoom'} aria-pressed={view === 'room'} onClick={() => setView('room')}>远景</button><button disabled={phase === 'zoom'} aria-pressed={view === 'desk'} onClick={() => setView('desk')}>近景</button></div>
        {phase === 'room' ? <button className="lab-action" onClick={openSetup}>布置一间小屋</button> : <button className="lab-action" onClick={() => { setActiveItem(0); setModal('haul') }}><ShoppingBag size={17} aria-hidden="true" />小屋购物袋 · {products.length}</button>}
        {phase === 'shopping' && <button className="lab-action" onClick={() => requestRef.current?.abort()}>结束逛店</button>}
        {phase === 'done' && <button className="lab-action" onClick={openSetup}>再逛一次</button>}
      </div>
    </main>
    <dialog ref={dialogRef} className={`room-dialog room-dialog-${modal}`} onCancel={() => setModal(null)} aria-labelledby="room-dialog-title">
      <button className="room-close" aria-label="关闭面板" onClick={() => setModal(null)}><X size={23} /></button>
      {modal === 'setup' && <form onSubmit={start}>
        <span className="room-eyebrow">先给这趟逛店一个小目标</span><h2 id="room-dialog-title">想布置哪一间？</h2>
        <p className="room-dialog-intro">选好房间，在设定时间和总预算内尽量多挑合适的商品。照片、价格和心头好，都会带回来。</p>
        {error && <p className="room-dialog-error" role="alert">{error}</p>}
        <div className="room-choices">{ROOMS.map((item, index) => <button key={item.name} type="button" aria-pressed={brief.room === item.name} onClick={() => setBrief(previous => ({ ...previous, room: item.name }))}><span className={`room-choice-shape shape-${index}`} aria-hidden="true" /><strong>{item.name}</strong><small>{item.note}</small></button>)}</div>
        <div className="room-brief">
          <label className="room-ideas">说说你的布置想法<textarea required maxLength={500} rows={3} placeholder="喜欢什么风格、想怎么用这间房，都可以写在这里。" value={brief.needs} onChange={event => setBrief(previous => ({ ...previous, needs: event.target.value }))} /></label>
          <div className="room-limits">
            <label>总预算 · 元<input type="number" required min="1" max="1000000" value={brief.budget} onChange={event => setBrief(previous => ({ ...previous, budget: Number(event.target.value) }))} /></label>
            <label>购物时间 · 分钟<input type="number" required min="0.5" max="10" step="0.5" value={brief.duration / 60 || ''} placeholder="0.5–10" onChange={event => setBrief(previous => ({ ...previous, duration: Number(event.target.value) * 60 }))} /></label>
          </div>
        </div>
        <div className="room-dialog-footer"><button className="lab-action" disabled={available !== true || busy || error.includes('今天的实验次数')} type="submit">开始逛店</button></div>
        {available !== true && <p role="status">{available === null ? '正在连接逛店服务…' : statusFailed ? '连接逛店服务失败，请检查网络。' : '当前站点的逛店服务尚未配置完成。'}{available === false && <button className="room-status-retry" type="button" onClick={() => void refreshAvailability()}>重新检查</button>}</p>}
      </form>}
      {modal === 'haul' && <>
        <span className="room-eyebrow">小屋购物袋</span><h2 id="room-dialog-title">{busy ? '已经看中的几件' : '这趟的心头好。'}</h2>
        {product ? <><div className="room-haul-heading"><span>{String(activeItem + 1).padStart(2, '0')} / {products.length}</span><button className="lab-action" onClick={() => setModal('receipt')}>完整清单</button></div>
          <div className="room-haul-view" onTouchStart={event => { const touch = event.touches[0]; swipeRef.current = { x: touch.clientX, y: touch.clientY } }} onTouchEnd={event => {
            const start = swipeRef.current; swipeRef.current = null
            if (!start) return
            const touch = event.changedTouches[0], dx = touch.clientX - start.x, dy = touch.clientY - start.y
            if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) setActiveItem(index => Math.max(0, Math.min(products.length - 1, index + (dx < 0 ? 1 : -1))))
          }} onTouchCancel={() => { swipeRef.current = null }}><button className="room-gallery-arrow" aria-label="上一件商品" disabled={activeItem <= 0} onClick={() => setActiveItem(index => index - 1)}><ChevronLeft /></button><Photo key={product.id} product={product} /><button className="room-gallery-arrow" aria-label="下一件商品" disabled={activeItem >= products.length - 1} onClick={() => setActiveItem(index => index + 1)}><ChevronRight /></button></div>
          {mobile && products.length > 1 && <p className="room-swipe-hint">左右滑动看下一件</p>}
          <div className="room-haul-caption"><h3>{product.name}</h3><p>{product.description}</p><strong>{money(product.price)} × {product.quantity}</strong><p>{product.reason}</p><a href={product.url} target="_blank" rel="noreferrer">去宜家看这件</a></div>
          <div className="room-thumbnails">{products.map((item, index) => <button key={item.id} aria-label={`查看${item.name}`} aria-pressed={activeItem === index} onClick={() => setActiveItem(index)}><Photo product={item} /></button>)}</div>
        </> : <div className="room-bag-empty"><ShoppingBag size={42} /><p>{busy ? '还在逛，遇到喜欢的就放进来。' : '这次还没挑到合适的。'}</p><button className="lab-action" onClick={() => setModal(null)}>回到小屋</button></div>}
        {!complete && !busy && products.length > 0 && <p className="room-subtle">本轮提前结束，已选商品保留在这里。</p>}
      </>}
      {modal === 'receipt' && <>
        <div className="room-receipt"><span className="room-eyebrow">羊的小屋</span><h2 id="room-dialog-title">一张小小的购物单</h2><p>{brief.room} · {elapsed} 秒的闲逛</p><div className="room-receipt-total"><span>{products.length} 种心头好</span><strong>{money(total)}</strong></div>
          <ol>{products.map(item => <li key={item.id}><Photo product={item} /><div><strong>{item.name}</strong><small>{item.description}</small><span>{money(item.price)} × {item.quantity}</span></div><b>{money(item.price * item.quantity)}</b></li>)}</ol>
          <div className="room-receipt-total"><span>商品合计</span><strong>{money(total)}</strong></div><p className="room-subtle">这是小屋独立的选品清单，未在商家下单。价格以商品页为准。</p>
        </div>
        {renderAvailable ? <div className="room-render-action"><p>把这一袋心头好，布置在一起。</p><small>使用完整清单和商品参考图，生成一张搭配效果图。</small><button className="lab-action" disabled={!complete || rendering || renderAttempted || !products.length} onClick={render}>{rendering ? <><RefreshCw className="lab-spin" size={16} />正在布置…</> : renderAttempted ? image ? '效果图已生成' : '生成状态待确认' : '生成小屋效果图'}</button>{image && <button className="lab-action" onClick={() => setModal('image')}>查看效果图</button>}</div>
          : <div className="room-render-unavailable"><strong>选品已接通 · 效果图暂不可用</strong><p>当前未连接生图服务。已选商品可以正常查看、复制和保存。</p></div>}
        <div className="room-receipt-actions room-receipt-toolbar"><button className="lab-action room-save-primary" onClick={saveList}><Download size={16} />保存清单</button><button className="lab-action" onClick={copyList}>{copied ? '清单已复制' : '复制清单'}</button><button className="lab-action" onClick={() => setModal('haul')}>看商品图片</button></div>
      </>}
      {modal === 'image' && <><span className="room-eyebrow">这些心头好，有了家的样子</span><h2 id="room-dialog-title">小屋，布置好了。</h2><img className="room-final-image" src={image} alt={`${brief.room}的家具搭配概念图`} /><p className="room-subtle">由本轮清单和商品参考图生成；外观与尺寸仍以实物为准。</p><div className="room-receipt-actions"><a className="lab-action" href={image} download="羊的小屋-效果图.png"><Download size={16} />保存效果图</a><button className="lab-action" onClick={() => setModal('receipt')}>查看购物清单</button></div></>}
      {error && modal && modal !== 'setup' && <p className="room-dialog-error" role="alert">{error}</p>}
    </dialog>
  </div>
}
