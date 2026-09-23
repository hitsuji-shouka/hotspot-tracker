import { useEffect, useRef, useState } from 'react'
import * as T from 'three'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import { makeCafe, type CafeSeason, type CafeTime, type CafeView } from '@/lib/central-perk-model'

type Props = { view: CafeView; time: CafeTime; season: CafeSeason; action: string; reset: number; playing: boolean; onReady: () => void; onAction: (action: string) => void }
export default function CentralPerkScene(props: Props) {
  const host = useRef<HTMLDivElement>(null)
  const current = useRef(props)
  const [error, setError] = useState(false)
  const [assetError, setAssetError] = useState('')
  useEffect(() => { current.current = props }, [props])
  useEffect(() => {
    const container = host.current!
    let renderer: T.WebGLRenderer
    try { renderer = new T.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' }) }
    // WebGL availability is known only after initializing the external renderer on the mounted canvas.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    catch { setError(true); current.current.onReady(); return }
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75)); renderer.shadowMap.enabled = true
    renderer.shadowMap.type = T.VSMShadowMap; renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05
    container.appendChild(renderer.domElement)
    renderer.domElement.setAttribute('aria-label', 'Central Perk 3D scene. Drag to orbit, scroll to zoom, double-click or press Home to reset.')
    renderer.domElement.tabIndex = 0
    const scene = new T.Scene()
    const environmentRoom = new RoomEnvironment(), pmrem = new T.PMREMGenerator(renderer)
    const environmentMap = pmrem.fromScene(environmentRoom, .04); scene.environment = environmentMap.texture; scene.environmentIntensity = .35
    environmentRoom.dispose(); pmrem.dispose()
    scene.background = new T.Color('#eee7db')
    scene.fog = new T.Fog('#eee7db', 32, 85)
    const camera = new T.PerspectiveCamera(36, 1, .1, 100)
    camera.position.set(25, 11, -8)
    const renderTarget = new T.WebGLRenderTarget(1, 1, { type: T.HalfFloatType, samples: Math.min(4, renderer.capabilities.maxSamples) })
    const composer = new EffectComposer(renderer, renderTarget)
    const bloom = new UnrealBloomPass(new T.Vector2(1, 1), .22, .5, 1.2)
    const renderPass = new RenderPass(scene, camera), outputPass = new OutputPass()
    composer.addPass(renderPass); composer.addPass(bloom); composer.addPass(outputPass)
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.target.set(0, 1.8, .4); controls.enableDamping = true; controls.dampingFactor = .085
    controls.minDistance = 5; controls.maxDistance = 85; controls.maxPolarAngle = Math.PI / 2 - .045; controls.minPolarAngle = .04
    controls.enablePan = true; controls.maxTargetRadius = 18; controls.cursor.set(0, 1.5, .5)
    controls.rotateSpeed = .6; controls.zoomSpeed = .8; controls.listenToKeyEvents(renderer.domElement)
    const cafe = makeCafe(setAssetError); scene.add(cafe.root)
    const ambient = new T.HemisphereLight('#fff2d8', '#596153', 2.15); scene.add(ambient)
    const sun = new T.DirectionalLight('#ffe8c4', 3.1); sun.position.set(9, 14, 9); sun.castShadow = true
    sun.shadow.mapSize.set(2048, 2048); sun.shadow.camera.left = -12; sun.shadow.camera.right = 12; sun.shadow.camera.top = 12; sun.shadow.camera.bottom = -12
    sun.shadow.radius = 5; sun.shadow.blurSamples = 8; sun.shadow.normalBias = .035; sun.shadow.bias = -.0003; scene.add(sun)
    const fill = new T.DirectionalLight('#c5dbdf', .7); fill.position.set(-8, 6, -5); scene.add(fill)
    const groundGeometry = new T.PlaneGeometry(200, 200)
    const groundMaterial = new T.MeshStandardMaterial({ color: '#ded3c1', roughness: 1 })
    const ground = new T.Mesh(groundGeometry, groundMaterial); ground.rotation.x = -Math.PI / 2; ground.position.y = -.51; ground.receiveShadow = true; scene.add(ground)
    let animation = 0, previous = performance.now(), elapsed = 0
    let previousView = '', previousEnv = '', previousAction = '', previousReset = -1
    let transition: { from: T.Vector3; to: T.Vector3; targetFrom: T.Vector3; targetTo: T.Vector3; start: number } | null = null
    let width = 1, height = 1
    const pose = (defaultView = false) => {
      const p = current.current
      const zoom = Math.max(1, (p.view === 'inside' ? 1.4 : 1.12) / (width / height))
      const positions = { outside: [29, 16, -20], inside: [7.8, 10.5, 20], top: [2.7, 33, .01] }
      let target = p.view === 'inside' ? new T.Vector3(0, 1.8, .5) : new T.Vector3(2.5, 1, -.5), position = new T.Vector3(...positions[p.view] as [number, number, number]).multiplyScalar(zoom)
      if (!defaultView && p.action.startsWith('sofa')) { target = new T.Vector3(.1, 1.12, 1.4); position = new T.Vector3(3.7, 4.9, 9.3).multiplyScalar(zoom) }
      if (!defaultView && p.action.startsWith('machine')) { target = new T.Vector3(-4.7, 1.6, -1.3); position = new T.Vector3(1, 4.8, 5).multiplyScalar(zoom) }
      if (!defaultView && p.action.startsWith('cup')) { target = new T.Vector3(.1, 1.0, 2.8); position = new T.Vector3(3.1, 3.6, 7.2).multiplyScalar(zoom) }
      if (!defaultView && p.action.startsWith('record')) { target = new T.Vector3(4.64, 1.55, -1.28); position = new T.Vector3(1.6, 4.2, 4.1).multiplyScalar(zoom) }
      if (!defaultView && p.action.startsWith('car')) { target = new T.Vector3(9.5, .6, 0); position = new T.Vector3(16, 4.7, -7).multiplyScalar(zoom) }
      if (!defaultView && p.action.startsWith('phoebe')) { target = new T.Vector3(6.2, 1.1, -4.6); position = new T.Vector3(12, 4.1, -11).multiplyScalar(zoom) }
      if (!defaultView && p.action.startsWith('slots')) { target = new T.Vector3(1.1, 1.3, -5.1); position = new T.Vector3(5, 3.9, -12).multiplyScalar(zoom) }
      if (!defaultView && p.action.startsWith('screen')) { target = new T.Vector3(-3.15, 2.48, -4.56); position = new T.Vector3(-2.5, 3.1, -13).multiplyScalar(zoom) }
      return { position, target }
    }
    const move = (defaultView = false) => { const p = pose(defaultView); transition = { from: camera.position.clone(), to: p.position, targetFrom: controls.target.clone(), targetTo: p.target, start: elapsed } }
    const resize = () => {
      width = container.clientWidth; height = container.clientHeight
      if (!width || !height) return
      camera.aspect = width / height; camera.updateProjectionMatrix(); renderer.setSize(width, height); composer.setSize(width, height)
      move()
    }
    const resizeObserver = new ResizeObserver(resize); resizeObserver.observe(container); resize()
    const interactionStart = () => { transition = null }
    controls.addEventListener('start', interactionStart)
    const reset = () => { controls.reset(); move(true) }
    const key = (event: KeyboardEvent) => { if (event.key === 'Home') { event.preventDefault(); move(true) } }
    const ray = new T.Raycaster(), pointer = new T.Vector2()
    let down: { id: number; x: number; y: number; moved: boolean } | null = null
    const pointers = new Set<number>()
    function pick(event: PointerEvent) {
      const rect = renderer.domElement.getBoundingClientRect()
      pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1)
      ray.setFromCamera(pointer, camera)
      const hit = ray.intersectObjects(cafe.clicks.filter(o => current.current.view === 'outside' ? ['car', 'slots', 'phoebe', 'screen'].includes(o.userData.action) : true), true)[0]
      let object: T.Object3D | null = hit?.object || null
      while (object && !object.userData.action) object = object.parent
      return object?.userData.action as string | undefined
    }
    const pointerDown = (event: PointerEvent) => {
      pointers.add(event.pointerId)
      down = pointers.size === 1 && event.button === 0 ? { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false } : null
      renderer.domElement.style.cursor = 'grabbing'
    }
    const pointerMove = (event: PointerEvent) => {
      if (down && down.id === event.pointerId && Math.hypot(event.clientX - down.x, event.clientY - down.y) >= 6) down.moved = true
      if (!pointers.size) renderer.domElement.style.cursor = pick(event) ? 'pointer' : 'grab'
    }
    const pointerUp = (event: PointerEvent) => {
      if (down && down.id === event.pointerId && !down.moved && Math.hypot(event.clientX - down.x, event.clientY - down.y) < 6) {
        const action = pick(event); if (action) current.current.onAction(action)
      }
      pointers.delete(event.pointerId)
      down = null; renderer.domElement.style.cursor = 'grab'
    }
    const cancel = () => { pointers.clear(); down = null; renderer.domElement.style.cursor = 'grab' }
    const lost = (event: Event) => { event.preventDefault(); setError(true) }
    const canvas = renderer.domElement
    canvas.addEventListener('pointerdown', pointerDown); canvas.addEventListener('pointermove', pointerMove); canvas.addEventListener('pointerup', pointerUp)
    canvas.addEventListener('pointercancel', cancel); canvas.addEventListener('dblclick', reset); canvas.addEventListener('keydown', key); canvas.addEventListener('webglcontextlost', lost)
    function render(now: number) {
      const dt = Math.min((now - previous) / 1000, .06); previous = now; elapsed += dt
      const p = current.current
      const environment = `${p.time}-${p.season}-${p.view}`
      if (environment !== previousEnv) { cafe.setEnvironment(p.time, p.season, p.view); previousEnv = environment }
      if (p.view !== previousView || p.reset !== previousReset || p.action !== previousAction) {
        if (p.action !== previousAction && p.action) cafe.trigger(p.action.split(':')[0], elapsed)
        previousView = p.view; previousReset = p.reset; previousAction = p.action; move()
      }
      const intensity = p.time === 'day' ? 1.8 : p.time === 'dusk' ? .8 : .32
      ambient.intensity = T.MathUtils.damp(ambient.intensity, intensity, 4, dt)
      ambient.color.lerp(new T.Color(p.time === 'night' ? '#b1bfdc' : '#fff2d8'), dt * 3)
      sun.intensity = T.MathUtils.damp(sun.intensity, p.time === 'day' ? 3.1 : p.time === 'dusk' ? 2.1 : .23, 4, dt)
      sun.color.lerp(new T.Color(p.time === 'day' ? '#ffe8c4' : p.time === 'dusk' ? '#f5b17c' : '#9cbbe1'), dt * 3)
      sun.position.lerp(new T.Vector3(...(p.time === 'dusk' ? [10, 5, -8] : [9, 14, 9]) as [number, number, number]), dt * 2)
      fill.intensity = T.MathUtils.damp(fill.intensity, p.time === 'night' ? .3 : .55, 4, dt)
      const background = new T.Color(p.time === 'day' ? '#eee7db' : p.time === 'dusk' ? '#c0a393' : '#171b29')
      ;(scene.background as T.Color).lerp(background, dt * 3)
      ;(scene.fog as T.Fog).color.copy(scene.background as T.Color)
      groundMaterial.color.lerp(new T.Color(p.time === 'day' ? '#ded3c1' : p.time === 'dusk' ? '#bca18d' : '#26283a'), dt * 3)
      bloom.strength = T.MathUtils.damp(bloom.strength, p.time === 'night' ? .3 : .16, 3, dt)
      if (transition) {
        const t = Math.min(1, (elapsed - transition.start) / 1.25), ease = t * t * (3 - 2 * t)
        camera.position.lerpVectors(transition.from, transition.to, ease); controls.target.lerpVectors(transition.targetFrom, transition.targetTo, ease)
        if (t === 1) transition = null
      }
      controls.update()
      const distance = camera.position.distanceTo(controls.target)
      ;(scene.fog as T.Fog).near = distance + 16; (scene.fog as T.Fog).far = distance + 75
      cafe.update(elapsed, dt, p.playing); composer.render()
      animation = requestAnimationFrame(render)
    }
    animation = requestAnimationFrame(render); current.current.onReady()
    return () => {
      cancelAnimationFrame(animation); resizeObserver.disconnect(); controls.dispose(); cafe.dispose()
      environmentMap.dispose(); groundGeometry.dispose(); groundMaterial.dispose(); sun.shadow.dispose(); bloom.dispose(); outputPass.dispose(); composer.dispose(); renderer.dispose()
      canvas.removeEventListener('pointerdown', pointerDown); canvas.removeEventListener('pointermove', pointerMove); canvas.removeEventListener('pointerup', pointerUp)
      canvas.removeEventListener('pointercancel', cancel); canvas.removeEventListener('dblclick', reset); canvas.removeEventListener('keydown', key); canvas.removeEventListener('webglcontextlost', lost)
      container.removeChild(canvas)
    }
  }, [])
  return <div ref={host} className="perk-canvas">{assetError && <p role="status" className="perk-audio-error">{assetError}</p>}{error && <div className="perk-render-error" role="alert">This browser cannot display the 3D scene. Enable hardware acceleration or try a browser that supports WebGL.<button onClick={() => location.reload()}>Reload</button></div>}</div>
}

