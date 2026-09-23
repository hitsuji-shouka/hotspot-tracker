import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { ArrowLeft, Coffee, Disc3, Flower2, House, Layers3, Leaf, Moon, Pause, Play, RotateCcw, Settings2, Snowflake, Sun, Sunset, Volume2, X } from 'lucide-react'
import AdminControl from '@/components/AdminControl'
import { useAdmin } from '@/lib/admin'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import CentralPerkScene from './CentralPerkScene'
import type { CafeSeason, CafeTime, CafeView } from '@/lib/central-perk-model'
import './central-perk.css'

type Music = { title: string; artist: string; url: string; volume: number; loop: boolean }
const defaultMusic: Music = { title: 'With or Without You', artist: 'U2', url: '/lab/central-perk/with-or-without-you.mp3', volume: .35, loop: true }
const views = [{ id: 'outside', label: 'Outside', icon: House }, { id: 'inside', label: 'Inside', icon: Coffee }, { id: 'top', label: 'Top View', icon: Layers3 }] as const
const times = [{ id: 'day', label: 'Day', icon: Sun }, { id: 'dusk', label: 'Dusk', icon: Sunset }, { id: 'night', label: 'Night', icon: Moon }] as const
const seasons = [{ id: 'spring', label: 'Spring', icon: Flower2 }, { id: 'summer', label: 'Summer', icon: Sun }, { id: 'autumn', label: 'Autumn', icon: Leaf }, { id: 'winter', label: 'Winter', icon: Snowflake }] as const

function MusicEditor({ music, onSave, onClose }: { music: Music; onSave: (music: Music) => void; onClose: () => void }) {
  const [draft, setDraft] = useState(music)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    const url = file ? URL.createObjectURL(file) : draft.url
    setPreview(url)
    return () => { if (file) URL.revokeObjectURL(url) }
  }, [file, draft.url])
  async function save(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError('')
    try {
      let url = draft.url
      if (file) {
        if (file.size > 20 * 1024 * 1024) throw new Error('Audio must be 20 MB or smaller.')
        const response = await fetch('/api/cafe/upload', { method: 'POST', headers: { 'Content-Type': 'audio/mpeg' }, body: file })
        const data = await response.json(); if (!response.ok) throw new Error(data.error)
        url = data.url
        // Retain a successful upload if saving metadata fails, so retry doesn't upload it twice.
        setDraft(d => ({ ...d, url })); setFile(null)
      }
      const response = await fetch('/api/cafe/music', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...draft, url }) })
      const data = await response.json(); if (!response.ok) throw new Error(data.error)
      onSave(data); onClose()
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not save. Please try again.') }
    finally { setBusy(false) }
  }
  return <Dialog open onOpenChange={value => { if (!value && !busy) onClose() }}><DialogContent className="perk-editor">
    <DialogTitle>The Soundtrack</DialogTitle><DialogDescription>Preview your track, then save it for the next visit.</DialogDescription>
    <form onSubmit={save}>
      <fieldset disabled={busy}>
        <label>Track title<input required maxLength={100} value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} /></label>
        <label>Artist<input maxLength={100} value={draft.artist} onChange={e => setDraft({ ...draft, artist: e.target.value })} /></label>
        <label>Upload MP3 · Up to 20 MB<input type="file" accept="audio/mpeg,.mp3" onChange={e => { setFile(e.target.files?.[0] || null); setError('') }} /></label>
        <label>Or use a direct audio URL<input disabled={!!file} value={draft.url} onChange={e => setDraft({ ...draft, url: e.target.value })} placeholder="https://…/music.mp3" /></label>
        <label>Default volume · {Math.round(draft.volume * 100)}%<input type="range" min="0" max="1" step=".01" value={draft.volume} onChange={e => setDraft({ ...draft, volume: +e.target.value })} /></label>
        <label className="perk-checkbox"><input type="checkbox" checked={draft.loop} onChange={e => setDraft({ ...draft, loop: e.target.checked })} />Loop playback</label>
        <audio key={preview} controls src={preview} preload="none" onError={() => setError('Unable to play this audio. Check the file or URL.')} aria-label="Preview soundtrack" />
      </fieldset>
      {error && <p role="alert" className="perk-error">{error}</p>}
      <button className="perk-save" disabled={busy}>{busy ? 'Saving…' : 'Save soundtrack'}</button>
    </form>
  </DialogContent></Dialog>
}

export default function CentralPerkPage() {
  const [view, setView] = useState<CafeView>('outside')
  const [time, setTime] = useState<CafeTime>('day')
  const [season, setSeason] = useState<CafeSeason>('summer')
  const [action, setAction] = useState('')
  const [reset, setReset] = useState(0)
  const [ready, setReady] = useState(false)
  const [settings, setSettings] = useState(false)
  const [editor, setEditor] = useState(false)
  const [music, setMusic] = useState(defaultMusic)
  const [playing, setPlaying] = useState(false)
  const [volume, setVolume] = useState(defaultMusic.volume)
  const [audioError, setAudioError] = useState('')
  const [notice, setNotice] = useState('')
  const [pending, setPending] = useState(false)
  const audio = useRef<HTMLAudioElement>(null)
  const panel = useRef<HTMLElement>(null)
  const settingsButton = useRef<HTMLButtonElement>(null)
  const { canEdit } = useAdmin()
  useEffect(() => {
    const previous = document.title
    document.title = 'Central Perk · 羊宇宙漫游指南'
    return () => { document.title = previous }
  }, [])
  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/cafe/music', { signal: controller.signal }).then(async r => { if (!r.ok) throw new Error(); return r.json() }).then((m: Music) => { setMusic(m); setVolume(m.volume) }).catch(e => { if (e.name !== 'AbortError') setAudioError('Using the default track. Music settings could not be loaded.') })
    return () => { controller.abort() }
  }, [])
  useEffect(() => { if (audio.current) { audio.current.volume = volume; audio.current.loop = music.loop } }, [volume, music.loop])
  useEffect(() => {
    const player = audio.current!
    return () => { player.pause() }
  }, [])
  useEffect(() => {
    if (!settings) return
    panel.current?.querySelector<HTMLButtonElement>('button')?.focus()
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') { setSettings(false); settingsButton.current?.focus() } }
    window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key)
  }, [settings])
  useEffect(() => { if (!notice) return; const id = setTimeout(() => setNotice(''), 3500); return () => clearTimeout(id) }, [notice])
  function changeView(value: CafeView) { setView(value); setAction('') }
  function interact(value: string) {
    setView(['car', 'slots', 'phoebe', 'screen'].includes(value) ? 'outside' : 'inside'); setAction(`${value}:${Date.now()}`)
    if (value === 'record') { void toggleMusic(); return }
    setNotice(value === 'screen' ? 'The One at Central Perk.' : value === 'slots' ? 'The One in Vegas.' : value === 'phoebe' ? 'Live outside Central Perk.' : value === 'car' ? 'How you doin’?' : value === 'cup' ? 'Your coffee is still warm.' : value === 'machine' ? 'There is always time for coffee.' : 'Your usual seat is waiting.')
  }
  async function toggleMusic() {
    const player = audio.current!
    if (!player.paused) { player.pause(); return }
    setPending(true); setAudioError('')
    try { await player.play() } catch { setAudioError('Unable to play. Try again.') }
    finally { setPending(false) }
  }
  function saved(m: Music) { audio.current?.pause(); setPlaying(false); setMusic(m); setVolume(m.volume); setAudioError(''); setNotice('Soundtrack saved.') }
  const ClockIcon = times.find(t => t.id === time)!.icon
  return <main lang="en" className={`perk-page perk-${time}`}>
    <CentralPerkScene view={view} time={time} season={season} action={action} reset={reset} playing={playing} onReady={() => setReady(true)} onAction={interact} />
    <header className="perk-heading"><h1>CENTRAL PERK</h1><p>AND I JUST WANT A MILLION DOLLARS</p></header>
    <Link to="/lab?category=create" className="perk-back"><ArrowLeft size={15} />Back to Lab</Link>
    {!ready && <div className="perk-loading" role="status">Opening Central Perk…</div>}
    {notice && <p className="perk-notice" role="status">{notice}</p>}
    <div className="perk-bottom">
      <nav className="perk-toolbar" aria-label="Café views">
        <div className="perk-segments">{views.map(({ id, label, icon: Icon }) => <button key={id} aria-label={label} aria-pressed={view === id} onClick={() => changeView(id)}><Icon size={15} /><span>{label}</span></button>)}</div>
        <span className="perk-divider" />
        <button onClick={() => setTime(time === 'day' ? 'dusk' : time === 'dusk' ? 'night' : 'day')} aria-label={`${times.find(t => t.id === time)!.label}. Change time of day`}><ClockIcon size={17} /><span>{times.find(t => t.id === time)!.label}</span></button>
        <button aria-label="Explore the turntable" aria-pressed={action.startsWith('record')} onClick={() => { setSettings(false); setView('inside'); setAction(`record:${Date.now()}`) }}><Disc3 size={17} className={playing ? 'perk-disc-spinning' : ''} /><span>Vinyl</span></button>
        <button ref={settingsButton} aria-label="Scene Settings" onClick={() => setSettings(!settings)} aria-expanded={settings} aria-controls="perk-settings"><Settings2 size={16} /><span>Scene Settings</span></button>
      </nav>
    </div>
    {action.startsWith('record') && !settings && <section className="perk-player" aria-label="Turntable">
        <div className={`perk-record-icon ${playing ? 'perk-disc-spinning' : ''}`}><span /></div>
        <div className="perk-track"><small>ON THE TURNTABLE</small><strong>{music.title}</strong><span>{music.artist}</span></div>
        <button className="perk-player-close" aria-label="Close track details" onClick={() => setAction('')}><X size={15} /></button>
        <div className="perk-playback">
        <button className="perk-play" aria-label={playing ? 'Pause music' : 'Play music'} disabled={pending || editor} onClick={toggleMusic}>{playing ? <Pause size={19} /> : <Play size={19} />}</button>
        <label className="perk-volume"><Volume2 size={15} /><span className="sr-only">Music volume</span><input type="range" min="0" max="1" step=".01" value={volume} onChange={e => setVolume(+e.target.value)} /></label>
        </div>
    </section>}
    <audio ref={audio} src={music.url} preload="none" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} onError={() => { setPlaying(false); setAudioError('Unable to play. Try again.') }} />
    {audioError && <p className="perk-audio-error" role="status">{audioError}</p>}
    {settings && <aside id="perk-settings" className="perk-settings" ref={panel} aria-label="Scene Settings">
      <div className="perk-panel-heading"><h2><Settings2 size={15} />Scene Settings</h2><button aria-label="Close scene settings" onClick={() => { setSettings(false); settingsButton.current?.focus() }}><X size={16} /></button></div>
      <h3>Outside Seasons<span>SEASON</span></h3><div className="perk-options perk-seasons">{seasons.map(({ id, label, icon: Icon }) => <button key={id} aria-pressed={season === id} onClick={() => setSeason(id)}><Icon size={18} /><small>{label}</small></button>)}</div>
      <h3>Time of Day</h3><div className="perk-options">{times.map(({ id, label, icon: Icon }) => <button key={id} aria-pressed={time === id} onClick={() => setTime(id)}><Icon size={17} />{label}</button>)}</div>
      <h3>Take a Seat</h3><div className="perk-spots"><button onClick={() => { interact('sofa'); setSettings(false) }}>The Orange Couch<span>↗</span></button><button onClick={() => { interact('cup'); setSettings(false) }}>A Cup of Coffee<span>↗</span></button><button onClick={() => { interact('machine'); setSettings(false) }}>At the Counter<span>↗</span></button></div>
      <h3>Around the Corner</h3><div className="perk-spots">{[['phoebe', 'Phoebe Unplugged'], ['car', 'The Porsche'], ['slots', 'The One in Vegas'], ['screen', 'The Big Screen']].map(([id, label]) => <button key={id} onClick={() => { interact(id); setSettings(false) }}>{label}<span>↗</span></button>)}</div>
      <button className="perk-reset" onClick={() => { setAction(''); setReset(v => v + 1) }}><RotateCcw size={14} />Reset View</button>
      <div className="perk-management">{canEdit && <button onClick={() => { audio.current?.pause(); setEditor(true) }}>Change Soundtrack</button>}<AdminControl locale="en" /></div>
    </aside>}
    {editor && canEdit && <MusicEditor music={music} onSave={saved} onClose={() => setEditor(false)} />}
  </main>
}
