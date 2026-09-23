import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

type BagItem = { id: string; name: string; image: string; price: number; quantity: number }
type Props = { screenImage: string; view: 'room' | 'desk'; products: BagItem[]; message: string; paused?: boolean; onSettled: () => void }

export default function SheepRoomScene({ screenImage, view, products, message, paused = false, onSettled }: Props) {
  const mount = useRef<HTMLDivElement>(null)
  const screen = useRef<{ canvas: HTMLCanvasElement; texture: THREE.CanvasTexture } | null>(null)
  const board = useRef<{ canvas: HTMLCanvasElement; texture: THREE.CanvasTexture } | null>(null)
  const closeUp = useRef(view === 'desk')
  const settled = useRef(onSettled)
  const renderingPaused = useRef(paused)
  useEffect(() => { renderingPaused.current = paused }, [paused])
  const photos = useRef(new Map<string, HTMLImageElement>())
  const [fallback, setFallback] = useState(false)
  useEffect(() => { closeUp.current = view === 'desk'; settled.current = onSettled }, [view, onSettled])
  useEffect(() => { if (fallback && view === 'desk') settled.current() }, [fallback, view])
  useEffect(() => {
    const target = screen.current
    if (!target || paused) return
    if (!screenImage) {
      const c = target.canvas.getContext('2d')!
      c.fillStyle = '#173b2c'; c.fillRect(0, 0, 1180, 760)
      c.fillStyle = '#e9f1d7'; c.font = 'bold 62px sans-serif'; c.fillText('羊的小屋', 74, 205)
      c.font = '27px sans-serif'; c.fillText('从一间房间开始。', 76, 275)
      target.texture.needsUpdate = true
      return
    }
    let valid = true
    const image = new Image()
    image.onload = () => {
      if (!valid) return
      target.canvas.getContext('2d')!.drawImage(image, 0, 0, 1180, 760)
      target.texture.needsUpdate = true
    }
    image.src = screenImage
    return () => { valid = false }
  }, [screenImage, paused])
  useEffect(() => {
    const target = board.current
    if (!target || paused) return
    let valid = true
    const paint = () => {
      if (!valid) return
      const c = target.canvas.getContext('2d')!
      c.fillStyle = '#153c31'; c.fillRect(0, 0, 600, 900)
      c.fillStyle = '#cddbc2'; c.font = '24px sans-serif'; c.fillText('小屋购物袋', 38, 59)
      c.font = 'bold 50px sans-serif'; c.fillText(`${products.length} 件心头好`, 38, 129)
      c.strokeStyle = '#68816b'; c.beginPath(); c.moveTo(38, 162); c.lineTo(562, 162); c.stroke()
      products.slice(-6).forEach((item, index) => {
        const y = 192 + index * 89
        const image = photos.current.get(item.image)
        if (image?.complete && image.naturalWidth) {
          c.fillStyle = '#f7f5ea'; c.fillRect(38, y, 72, 72)
          const scale = Math.min(72 / image.naturalWidth, 72 / image.naturalHeight)
          c.drawImage(image, 38 + (72 - image.naturalWidth * scale) / 2, y + (72 - image.naturalHeight * scale) / 2, image.naturalWidth * scale, image.naturalHeight * scale)
        }
        c.fillStyle = '#eef0d7'; c.font = '24px sans-serif'; c.fillText(item.name.slice(0, 18), 126, y + 27)
        c.fillStyle = '#b3c5a9'; c.font = '22px sans-serif'; c.fillText(`¥${item.price.toFixed(2)}  × ${item.quantity}`, 126, y + 59)
      })
      if (!products.length) { c.font = '24px sans-serif'; c.fillStyle = '#a5bca4'; c.fillText('看中了，再带回家。', 38, 238) }
      const total = products.reduce((sum, item) => sum + Math.round(item.price * 100) * item.quantity, 0) / 100
      c.fillStyle = '#eef0d7'; c.font = 'bold 30px sans-serif'; c.fillText(`合计  ¥${total.toFixed(2)}`, 38, 778)
      c.fillStyle = '#a5bca4'; c.font = '21px sans-serif'; c.fillText(message.slice(0, 23) || '从一间小屋开始', 38, 837)
      c.font = '18px sans-serif'; c.fillText('独立选品清单 · 不会下单', 38, 875)
      target.texture.needsUpdate = true
    }
    for (const item of products) {
      let image = photos.current.get(item.image)
      if (!image) {
        image = new Image(); image.crossOrigin = 'anonymous'; image.referrerPolicy = 'no-referrer'
        photos.current.set(item.image, image); image.src = item.image
      }
      image.onload = paint
    }
    paint()
    return () => { valid = false }
  }, [products, message, paused])

  useEffect(() => {
    const host = mount.current
    if (!host) return
    let renderer: THREE.WebGLRenderer
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false }) }
    catch {
      const frame = requestAnimationFrame(() => setFallback(true))
      return () => cancelAnimationFrame(frame)
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.7))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFShadowMap
    renderer.outputColorSpace = THREE.SRGBColorSpace
    host.appendChild(renderer.domElement)
    renderer.domElement.setAttribute('role', 'img')
    renderer.domElement.setAttribute('aria-label', '低多边形小屋：书桌上有电脑、杯子，旁边放着植物和柜子')
    renderer.domElement.tabIndex = 0
    renderer.domElement.setAttribute('aria-describedby', 'room-drag-hint')

    const scene = new THREE.Scene()
    scene.background = new THREE.Color('#f6f3e9')
    const camera = new THREE.PerspectiveCamera(37, 1, 0.1, 100)
    const look = new THREE.Vector3(0, 1.3, 0)
    const wideLook = new THREE.Vector3(0, 1.3, 0)
    const wide = new THREE.Vector3(10, 8, 12)
    const near = new THREE.Vector3(.2, 2.98, 4.65)
    const nearLook = new THREE.Vector3(.2, 2.83, -.1)
    camera.position.copy(wide)
    camera.lookAt(look)
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.target.copy(wideLook)
    controls.enableDamping = true
    controls.dampingFactor = .09
    controls.rotateSpeed = .55
    controls.enablePan = false
    controls.enableZoom = false
    controls.minAzimuthAngle = .08
    controls.maxAzimuthAngle = 1.42
    controls.minPolarAngle = .72
    controls.maxPolarAngle = 1.3
    controls.listenToKeyEvents(renderer.domElement)
    const beginDrag = () => { host.dataset.dragging = 'true'; renderer.domElement.focus({ preventScroll: true }) }
    const endDrag = () => { delete host.dataset.dragging }
    const resetView = () => {
      if (!controls.enabled) return
      // Flush residual damping before restoring the original room angle.
      controls.enableDamping = false; controls.update(); controls.reset(); controls.enableDamping = true
    }
    const resetKey = (event: KeyboardEvent) => { if (event.key === 'Home') { event.preventDefault(); resetView() } }
    controls.addEventListener('start', beginDrag)
    controls.addEventListener('end', endDrag)
    renderer.domElement.addEventListener('dblclick', resetView)
    renderer.domElement.addEventListener('keydown', resetKey)

    scene.add(new THREE.HemisphereLight('#ffffff', '#526b59', 2.1))
    const sun = new THREE.DirectionalLight('#fff5d8', 3)
    sun.position.set(1, 10, 7)
    sun.castShadow = true
    sun.shadow.mapSize.set(1024, 1024)
    sun.shadow.camera.left = -10; sun.shadow.camera.right = 10
    sun.shadow.camera.top = 10; sun.shadow.camera.bottom = -10
    scene.add(sun)

    const material = (color: string) => new THREE.MeshStandardMaterial({ color, roughness: 0.88 })
    const cream = material('#e7e6d4'), wall = material('#c9d3b9'), wallLine = material('#b8c5a9')
    const green = material('#347c55'), dark = material('#19503a'), pale = material('#a2bca0')
    const white = material('#f1efe0'), black = material('#18382f')
    function box(w: number, h: number, d: number, mat: THREE.Material, x: number, y: number, z: number) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat)
      mesh.position.set(x, y, z)
      mesh.castShadow = true
      mesh.receiveShadow = true
      scene.add(mesh)
      return mesh
    }
    function cyl(radius: number, height: number, mat: THREE.Material, x: number, y: number, z: number, sides = 9) {
      const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, sides), mat)
      mesh.position.set(x, y, z)
      mesh.castShadow = true
      scene.add(mesh)
      return mesh
    }

    // A small open dollhouse; the floor grid makes the camera move legible.
    box(9, .24, 7, green, 0, -.12, 0)
    box(9, 5.6, .18, wall, 0, 2.8, -3.52)
    box(.18, 5.6, 7, wall, -4.52, 2.8, 0)
    for (let x = -4.3; x < 4.5; x += .62) box(.018, 5.56, .025, wallLine, x, 2.8, -3.4)
    for (let x = -4.5; x <= 4.5; x += .5) box(.012, .013, 7, dark, x, .01, 0)
    for (let z = -3.5; z <= 3.5; z += .5) box(9, .013, .012, dark, 0, .01, z)

    // Desk and office chair.
    box(4.7, .18, 2.35, white, -.65, 1.68, -.15)
    for (const x of [-2.75, 1.45]) for (const z of [-1.1, .8]) box(.11, 1.55, .11, dark, x, .82, z)
    box(.7, .9, 1.8, pale, 1.28, 1.11, -.16)
    box(.75, .14, .74, dark, -.9, .8, 2.05)
    box(.75, 1.0, .12, dark, -.9, 1.35, 2.4)
    cyl(.06, .75, dark, -.9, .4, 2.05)
    for (const angle of [0, 1.25, 2.5, 3.75, 5]) {
      const leg = box(.62, .08, .11, dark, -.9 + Math.sin(angle) * .27, .12, 2.05 + Math.cos(angle) * .27)
      leg.rotation.y = angle
    }

    // Beige CRT housing. The live browser screenshot is a texture on its screen.
    box(3.4, 2.34, 1.05, cream, -.95, 2.99, -.67)
    box(3.15, 2.10, .045, black, -.95, 3.01, -.12)
    const display = document.createElement('canvas')
    display.width = 1180; display.height = 760
    const displayContext = display.getContext('2d')!
    displayContext.fillStyle = '#173b2c'
    displayContext.fillRect(0, 0, 1180, 760)
    displayContext.fillStyle = '#e9f1d7'
    displayContext.font = 'bold 62px sans-serif'
    displayContext.fillText('羊的小屋', 74, 205)
    displayContext.font = '27px sans-serif'
    displayContext.fillText('从一间房间开始。', 76, 275)
    const texture = new THREE.CanvasTexture(display)
    texture.colorSpace = THREE.SRGBColorSpace
    screen.current = { canvas: display, texture }
    const screenMesh = new THREE.Mesh(new THREE.PlaneGeometry(3, 3 * 760 / 1180), new THREE.MeshBasicMaterial({ map: texture }))
    screenMesh.position.set(-.95, 3.01, -.09)
    scene.add(screenMesh)
    box(.48, .18, .38, cream, -.95, 1.83, -.55)
    box(1.28, .08, .42, cream, -.95, 1.82, .48)
    for (let row = 0; row < 3; row++) for (let col = 0; col < 11; col++) box(.08, .015, .06, white, -1.5 + col * .11, 1.87, .31 + row * .11)
    const mouse = new THREE.Mesh(new THREE.SphereGeometry(.13, 9, 6), white)
    mouse.scale.set(1, .45, 1.4); mouse.position.set(.28, 1.83, .47); scene.add(mouse)

    // Cup, drawers, wall note and a plant.
    cyl(.17, .38, material('#ab4838'), -2.42, 1.97, .45)
    const handle = new THREE.Mesh(new THREE.TorusGeometry(.12, .035, 5, 12), material('#ab4838'))
    handle.position.set(-2.19, 1.99, .45); handle.rotation.y = Math.PI / 2; scene.add(handle)
    box(1.04, 1.05, .88, green, 3.2, .53, -2.25)
    box(.75, .045, .035, cream, 3.2, .72, -1.78)
    box(.75, .045, .035, cream, 3.2, .35, -1.78)
    // Framed, live shopping board on the wall.
    box(2.3, 3.45, .09, pale, 2.52, 3.48, -3.38)
    const boardCanvas = document.createElement('canvas')
    boardCanvas.width = 600; boardCanvas.height = 900
    const bc = boardCanvas.getContext('2d')!
    bc.fillStyle = '#153c31'; bc.fillRect(0, 0, 600, 900)
    bc.fillStyle = '#e4ebce'; bc.font = '32px sans-serif'; bc.fillText('小屋购物袋', 40, 70)
    bc.font = '25px sans-serif'; bc.fillText('看中了，再带回家。', 40, 150)
    const boardTexture = new THREE.CanvasTexture(boardCanvas)
    boardTexture.colorSpace = THREE.SRGBColorSpace
    board.current = { canvas: boardCanvas, texture: boardTexture }
    const boardMesh = new THREE.Mesh(new THREE.PlaneGeometry(2.16, 3.24), new THREE.MeshBasicMaterial({ map: boardTexture }))
    boardMesh.position.set(2.52, 3.48, -3.31); scene.add(boardMesh)
    box(1.25, 3.1, .10, dark, -3.6, 1.55, -3.35)
    box(1.08, 2.94, .12, green, -3.6, 1.54, -3.27)
    cyl(.055, .06, cream, -3.2, 1.45, -3.17)
    // A small rubber plant: tapered ceramic pot, curved branches and thin folded leaves.
    const pot = material('#d9ccb6'), soil = material('#514334'), stem = material('#496343')
    const leafMaterials = ['#3f754b', '#568953', '#6a985b'].map(color => {
      const mat = material(color); mat.side = THREE.DoubleSide; return mat
    })
    const veinMaterial = material('#83a96b')
    cyl(.28, .045, pot, 3.2, 1.08, -2.25, 24)
    const planter = new THREE.Mesh(new THREE.CylinderGeometry(.255, .19, .34, 24), pot)
    planter.position.set(3.2, 1.27, -2.25); planter.castShadow = true; scene.add(planter)
    cyl(.226, .015, soil, 3.2, 1.433, -2.25, 24)
    const rim = new THREE.Mesh(new THREE.TorusGeometry(.242, .023, 8, 32), pot)
    rim.rotation.x = Math.PI / 2; rim.position.set(3.2, 1.445, -2.25); scene.add(rim)
    const branch = (points: THREE.Vector3[], radius: number) => {
      const mesh = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 12, radius, 6, false), stem)
      mesh.castShadow = true; scene.add(mesh)
    }
    branch([new THREE.Vector3(3.2, 1.43, -2.25), new THREE.Vector3(3.17, 1.84, -2.24), new THREE.Vector3(3.23, 2.2, -2.27)], .018)
    for (let i = 0; i < 8; i++) {
      const angle = i * 2.4 + .4
      const height = 1.56 + i * .077
      const base = new THREE.Vector3(3.2, height, -2.25)
      const joint = base.clone().add(new THREE.Vector3(Math.sin(angle) * .16, .1, Math.cos(angle) * .16))
      branch([base, base.clone().lerp(joint, .5).add(new THREE.Vector3(0, .035, 0)), joint], .009)
      const length = i < 5 ? .56 : .43
      const positions: number[] = [], indices: number[] = [], rib: THREE.Vector3[] = []
      for (let row = 0; row <= 12; row++) {
        const t = row / 12, width = Math.pow(Math.sin(Math.PI * t), .85) * (i < 5 ? .15 : .115)
        const bend = -.15 * t * t
        positions.push(-width, length * t, bend, 0, length * t, bend + .035 * Math.sin(Math.PI * t), width, length * t, bend)
        rib.push(new THREE.Vector3(0, length * t, bend + .035 * Math.sin(Math.PI * t) + .002))
        if (row < 12) for (let side = 0; side < 2; side++) {
          const n = row * 3 + side
          indices.push(n, n + 3, n + 1, n + 1, n + 3, n + 4)
        }
      }
      const geometry = new THREE.BufferGeometry()
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
      geometry.setIndex(indices); geometry.computeVertexNormals()
      const leaf = new THREE.Mesh(geometry, leafMaterials[i % leafMaterials.length])
      leaf.castShadow = true; leaf.receiveShadow = true
      const foliage = new THREE.Group()
      foliage.add(leaf, new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(rib), 12, .003, 4, false), veinMaterial))
      foliage.position.copy(joint)
      foliage.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(Math.sin(angle) * .85, i < 5 ? .32 : .85, Math.cos(angle) * .85).normalize())
      scene.add(foliage)
    }

    const resize = () => {
      const width = host.clientWidth, height = host.clientHeight
      if (!width || !height) return
      renderer.setSize(width, height, false)
      camera.aspect = width / height
      camera.fov = 37
      const portrait = width / height < 1
      const scale = portrait ? 1.65 : 1
      wide.set(10 * scale, 8 * scale, 12 * scale)
      controls.position0.copy(wide)
      controls.target0.copy(wideLook)
      if (!closeUp.current) { camera.position.copy(wide); controls.update() }
      near.set(portrait ? -.95 : .2, 2.98, portrait ? 3.8 / (2 * Math.tan(37 * Math.PI / 360) * camera.aspect) : 4.65)
      nearLook.x = portrait ? -.95 : .2
      camera.updateProjectionMatrix()
    }
    const observer = new ResizeObserver(resize)
    observer.observe(host)
    resize()
    let frame = 0
    let lastView = false
    let transitionStart = -1
    const fromPosition = camera.position.clone(), fromLook = look.clone()
    const animate = (now = performance.now()) => {
      frame = requestAnimationFrame(animate)
      if (lastView !== closeUp.current) {
        lastView = closeUp.current; transitionStart = now
        if (lastView) wide.copy(camera.position)
        controls.enabled = false
        endDrag()
        fromPosition.copy(camera.position); fromLook.copy(look)
      }
      if (transitionStart >= 0) {
        const t = Math.min(1, (now - transitionStart) / 1500)
        const eased = t * t * (3 - 2 * t)
        camera.position.lerpVectors(fromPosition, lastView ? near : wide, eased)
        look.lerpVectors(fromLook, lastView ? nearLook : wideLook, eased)
        if (t === 1) {
          transitionStart = -1
          controls.enabled = !lastView
          settled.current()
        }
      } else {
        if (lastView) { camera.position.copy(near); look.copy(nearLook) }
        else { controls.update(); look.copy(wideLook) }
      }
      host.dataset.draggable = String(controls.enabled)
      camera.lookAt(look)
      if (!renderingPaused.current) renderer.render(scene, camera)
    }
    animate()
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      controls.dispose()
      renderer.domElement.removeEventListener('dblclick', resetView)
      renderer.domElement.removeEventListener('keydown', resetKey)
      scene.traverse(object => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose()
          if (Array.isArray(object.material)) object.material.forEach(item => item.dispose())
          else object.material.dispose()
        }
      })
      texture.dispose()
      boardTexture.dispose()
      board.current = null
      screen.current = null
      renderer.dispose()
      host.removeChild(renderer.domElement)
    }
  }, [])

  return <div className="lab-room-scene" ref={mount}>{!fallback && <p id="room-drag-hint" className="sr-only">可拖动旋转，双击复位；聚焦场景后使用 Shift 加方向键旋转，Home 键复位。</p>}{fallback && <div className="room-flat-view"><p>这台设备暂不支持 3D，切换为平面逛店画面。</p><img src={screenImage || '/lab/room.png'} alt={screenImage ? 'Agent 正在浏览的宜家页面' : '小屋风格示意图'} /></div>}</div>
}
