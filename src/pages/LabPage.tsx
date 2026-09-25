import { useEffect, useRef, useState, type CSSProperties, type PointerEvent, type TouchEvent } from 'react'
import { Link, useSearchParams } from 'react-router'
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react'
import SiteHeader from '@/components/SiteHeader'
import { CONCEPTS, EXPERIMENTS, LAB_CATEGORIES, filterExperiments, selectCategory, type Experiment } from '@/data/lab'
import { arcPosition, carouselLayout, clampPosition, swipeDestination } from '@/lib/lab-motion'
import './lab.css'

export function LabHeader() {
  return <SiteHeader className="lab-header" />
}

export function Backdrop() {
  return <div className="lab-backdrop" aria-hidden="true"><i /><i /><i /></div>
}

function EmptyCard({ onReset }: { onReset: () => void }) {
  return <div className="lab-empty-stage">
    <article className="lab-card lab-empty-card">
      <div className="lab-cover lab-empty-cover">
        <img src="/lab/empty.svg" alt="烧瓶里装着一颗小行星" width="360" height="320" />
      </div>
      <div className="lab-card-copy">
        <h2>实验正在酝酿</h2>
        <p>这个分类暂时还没有实验。<br />先去其他地方逛逛吧。</p>
        <button className="lab-action" onClick={onReset}>查看全部</button>
      </div>
    </article>
  </div>
}

function ExperimentCard({ experiment, active, style }: { experiment: Experiment; active: boolean; style: CSSProperties }) {
  const status = experiment.status === 'concept' ? '构想中' : experiment.status === 'preparing' ? '筹备中' : ''
  return <article className="lab-card lab-orbit-card" style={style} aria-label={experiment.title}>
    <div className={`lab-cover lab-cover-${experiment.cover}`} role="img" aria-label={`${experiment.title}封面`} />
    <div className="lab-card-copy">
      <div className="lab-card-heading"><h2>{experiment.title}</h2>{status && <span>{status}</span>}</div>
      <p>{experiment.description}</p>
      {experiment.path
        ? <Link className="lab-try" to={experiment.path} tabIndex={active ? 0 : -1}>Try It Now <ArrowRight size={14} strokeWidth={1.5} aria-hidden="true" /></Link>
        : <span className="lab-coming">还在构想中</span>}
    </div>
  </article>
}

function ExperimentCarousel({ items, layout }: { items: Experiment[]; layout: ReturnType<typeof carouselLayout> }) {
  const initial = Math.max(0, items.findIndex(item => item.id === 'sheep-room'))
  const [position, setPosition] = useState(initial)
  const [selected, setSelected] = useState(initial)
  const current = useRef(initial)
  const destination = useRef(initial)
  const frame = useRef(0)
  const drag = useRef<{ id: number; x: number; y: number; start: number; horizontal: boolean } | null>(null)
  const touch = useRef<{ x: number; y: number } | null>(null)
  const suppressClick = useRef(false)
  const multiple = items.length > 1

  useEffect(() => () => cancelAnimationFrame(frame.current), [])

  function moveTo(value: number) {
    cancelAnimationFrame(frame.current)
    const target = clampPosition(value, items.length)
    destination.current = target
    setSelected(target)
    const from = current.current
    const start = performance.now()
    function animate(now: number) {
      const progress = Math.min(1, (now - start) / 550)
      const eased = 1 - (1 - progress) ** 3
      current.current = from + (target - from) * eased
      setPosition(current.current)
      if (progress < 1) frame.current = requestAnimationFrame(animate)
    }
    frame.current = requestAnimationFrame(animate)
  }

  function startDrag(event: PointerEvent<HTMLDivElement>) {
    suppressClick.current = false
    if (!multiple || event.pointerType === 'touch' || !event.isPrimary || event.button !== 0) return
    drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, start: current.current, horizontal: false }
  }

  function moveDrag(event: PointerEvent<HTMLDivElement>) {
    const gesture = drag.current
    if (!gesture || gesture.id !== event.pointerId) return
    const dx = event.clientX - gesture.x
    const dy = event.clientY - gesture.y
    if (!gesture.horizontal) {
      if (Math.abs(dy) > 14 && Math.abs(dy) > Math.abs(dx) * 1.5) { drag.current = null; return }
      if (Math.abs(dx) < 6 || Math.abs(dx) < Math.abs(dy)) return
      gesture.horizontal = true
      cancelAnimationFrame(frame.current)
      event.currentTarget.setPointerCapture(event.pointerId)
      suppressClick.current = true
    }
    current.current = clampPosition(gesture.start - dx / (layout.width + layout.gap), items.length)
    setPosition(current.current)
  }

  function endDrag(event: PointerEvent<HTMLDivElement>, cancelled = false) {
    const gesture = drag.current
    if (!gesture || gesture.id !== event.pointerId) return
    drag.current = null
    if (gesture.horizontal) {
      moveTo(cancelled ? Math.round(current.current) : swipeDestination(gesture.start, current.current, event.clientX - gesture.x, items.length))
      if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  function endTouch(event: TouchEvent<HTMLDivElement>) {
    const start = touch.current
    touch.current = null
    if (!start) return
    const dx = event.changedTouches[0].clientX - start.x
    const dy = event.changedTouches[0].clientY - start.y
    if (Math.abs(dx) < 28 || Math.abs(dx) <= Math.abs(dy)) return
    suppressClick.current = true
    moveTo(swipeDestination(destination.current, destination.current, dx, items.length))
  }

  return <section className="lab-gallery" aria-label="浏览实验">
    <div className={`lab-carousel ${multiple ? 'lab-carousel-multiple' : ''}`}
      tabIndex={multiple ? 0 : -1} role="region" aria-roledescription="轮播" aria-label="实验卡片，使用左右方向键切换"
      onKeyDown={event => {
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
          event.preventDefault()
          moveTo(destination.current + (event.key === 'ArrowLeft' ? -1 : 1))
        }
      }}
      onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={endDrag}
      onPointerCancel={event => endDrag(event, true)}
      onLostPointerCapture={event => endDrag(event, true)}
      onTouchStart={event => { if (multiple && event.touches.length === 1) touch.current = { x: event.touches[0].clientX, y: event.touches[0].clientY } }}
      onTouchEnd={endTouch} onTouchCancel={() => { touch.current = null }}
      onClickCapture={event => { if (suppressClick.current && event.detail > 0) { event.preventDefault(); event.stopPropagation() } }}>
      {items.map((item, index) => {
        const offset = index - position
        const point = arcPosition(offset, layout.width, layout.gap, layout.step)
        return <ExperimentCard key={item.id} experiment={item} active={index === selected} style={{
          transform: `translate3d(${point.x}px, ${point.y}px, 0) rotate(${point.rotation}deg)`,
          visibility: Math.abs(offset) > 3.5 ? 'hidden' : 'visible',
        }} />
      })}
    </div>
    {multiple && <>
      <div className="lab-arrows">
        <button aria-label="上一个实验" onClick={() => moveTo(destination.current - 1)} disabled={selected === 0}><ChevronLeft size={20} /></button>
        <button aria-label="下一个实验" onClick={() => moveTo(destination.current + 1)} disabled={selected === items.length - 1}><ChevronRight size={20} /></button>
      </div>
      <div className="lab-dots" aria-label="选择实验">
        {items.map((item, index) => <button key={item.id} aria-label={`查看${item.title}`} aria-pressed={selected === index} onClick={() => moveTo(index)}><span /></button>)}
      </div>
      <p className="sr-only" aria-live="polite">第 {selected + 1} 个，共 {items.length} 个：{items[selected].title}</p>
    </>}
  </section>
}

export default function LabPage() {
  const [params, setParams] = useSearchParams()
  const stage = useRef<HTMLDivElement>(null)
  const [viewport, setViewport] = useState(() => window.innerWidth)
  const layout = carouselLayout(viewport)
  const category = selectCategory(params.get('category'))
  const preview = import.meta.env.DEV && params.get('preview') === '1'
  const entries = preview ? [CONCEPTS[0], CONCEPTS[1], ...EXPERIMENTS, CONCEPTS[2], CONCEPTS[3]] : EXPERIMENTS
  const items = filterExperiments(entries, category)
  const categoryName = LAB_CATEGORIES.find(item => item.id === category)!.label

  useEffect(() => { document.title = '实验 · 羊宇宙漫游指南' }, [])
  useEffect(() => {
    for (const src of ['/lab/room-card.webp', '/lab/central-perk/cover-card.webp']) {
      const image = new Image()
      image.src = src
      void image.decode().catch(() => {})
    }
  }, [])
  useEffect(() => {
    if (!stage.current) return
    const observer = new ResizeObserver(([entry]) => setViewport(entry.contentRect.width))
    observer.observe(stage.current)
    return () => observer.disconnect()
  }, [])

  function changeCategory(value: string) {
    setParams(previous => {
      const next = new URLSearchParams(previous)
      if (value === 'all') next.delete('category')
      else next.set('category', value)
      return next
    }, { preventScrollReset: true })
  }

  return <div className="lab-page" data-category={category}>
    <Backdrop />
    <LabHeader />
    <main className="lab-main">
      <div className="lab-intro">
        <h1>一些奇奇怪怪的<span>小折腾。</span></h1>
        <p>想到什么，就做出来玩玩。<span>偶尔有用，多半有趣。</span></p>
      </div>
      <div ref={stage} id="lab-experiments" aria-label={`${categoryName}实验`}
        style={{ '--card-width': `${layout.width}px` } as CSSProperties}>
        {items.length
          ? <ExperimentCarousel key={items.map(item => item.id).join(',')} items={items} layout={layout} />
          : <EmptyCard onReset={() => changeCategory('all')} />}
      </div>
      <nav className="lab-categories" aria-label="实验分类">
        {LAB_CATEGORIES.map(item => <button key={item.id} aria-pressed={category === item.id} aria-controls="lab-experiments" onClick={() => changeCategory(item.id)}>{item.label}</button>)}
      </nav>
      {preview && <p className="lab-preview-note">设计预览 · 构想卡仅用于展示布局</p>}
    </main>
  </div>
}
