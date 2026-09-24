import * as T from 'three'
import { createPorsche } from './central-perk-porsche'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'

export type CafeView = 'outside' | 'inside' | 'top'
export type CafeTime = 'day' | 'dusk' | 'night'
export type CafeSeason = 'spring' | 'summer' | 'autumn' | 'winter'

// Real geometry with UV textures; the concept image is not a projected room backdrop.
function painted(draw: (c: CanvasRenderingContext2D, w: number, h: number) => void, w = 512, h = 512) {
  const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h
  draw(canvas.getContext('2d')!, w, h)
  const texture = new T.CanvasTexture<HTMLCanvasElement | HTMLImageElement>(canvas); texture.colorSpace = T.SRGBColorSpace
  texture.anisotropy = 4
  return texture
}
function random(seed = 37) { return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 } }

export function makeCafe(onAssetError: (message: string) => void) {
  let disposed = false
  const root = new T.Group()
  const shell = new T.Group(); root.add(shell)
  const roof = new T.Group(); shell.add(roof)
  const front = new T.Group(); shell.add(front)
  const windowLights: T.MeshStandardMaterial[] = []
  const lights: T.PointLight[] = []
  const bulbs: T.MeshStandardMaterial[] = []
  const clicks: T.Object3D[] = []
  const leaves: T.Mesh[] = []
  const snowCaps = new T.Group(); root.add(snowCaps)
  const textures: T.Texture[] = []
  const geometries = new Set<T.BufferGeometry>()
  const materials = new Set<T.Material>()
  const rng = random()
  const tex = (draw: Parameters<typeof painted>[0], w = 512, h = 512) => { const t = painted(draw, w, h); textures.push(t); return t }
  const material = (color: string, extra: T.MeshStandardMaterialParameters = {}) => { const m = new T.MeshStandardMaterial({ color, roughness: .78, ...extra }); materials.add(m); return m }
  const woodMap = tex((c, w, h) => {
    c.fillStyle = '#967453'; c.fillRect(0, 0, w, h)
    for (let i = 0; i < 1800; i++) { c.strokeStyle = `rgba(${rng() > .4 ? '48,24,8' : '243,212,161'},${rng() * .15})`; const y = rng() * h; c.beginPath(); c.moveTo(0, y); c.bezierCurveTo(w * .3, y + rng() * 18, w * .7, y - rng() * 12, w, y); c.stroke() }
  })
  const greenPaintMap = tex((c, w, h) => {
    c.fillStyle = '#526438'; c.fillRect(0, 0, w, h)
    for (let i = 0; i < 260; i++) {
      c.fillStyle = i % 3 ? '#697548' : '#a68c50'
      const y = i % 4 ? rng() * h : rng() * 28
      c.fillRect(rng() * w, y, 3 + rng() * 35, 1 + rng() * 6)
    }
  })
  const fabricMap = tex((c, w, h) => {
    c.fillStyle = '#c7bbb0'; c.fillRect(0, 0, w, h)
    for (let i = 0; i < 16000; i++) { c.fillStyle = `rgba(${rng() > .5 ? '255,255,255' : '0,0,0'},.08)`; c.fillRect(rng() * w, rng() * h, 1, 3) }
  })
  const floralMap = tex((c, w, h) => {
    c.fillStyle = '#29251b'; c.fillRect(0, 0, w, h); c.strokeStyle = '#b9a574'; c.fillStyle = '#c2b081'; c.lineWidth = 3
    for (let y = 0; y < h; y += 96) for (let x = 0; x < w; x += 96) {
      c.save(); c.translate(x + (y % 192 ? 48 : 0), y)
      c.beginPath(); c.moveTo(0, -45); c.bezierCurveTo(-38, -20, 38, 20, 0, 45); c.stroke()
      for (let j = 0; j < 5; j++) { c.save(); c.translate(Math.sin(j * 2) * 19, j * 17 - 36); c.rotate(j * 1.5); c.beginPath(); c.ellipse(0, 0, 6, 16, .5, 0, Math.PI * 2); c.fill(); c.restore() }
      c.restore()
    }
  })
  const rugMap = tex((c, w, h) => {
    c.fillStyle = '#6d3027'; c.fillRect(0, 0, w, h)
    const bands = ['#a67a55', '#233936', '#9e5a41', '#ccab78', '#243933']
    bands.forEach((color, i) => { c.strokeStyle = color; c.lineWidth = 8; c.strokeRect(10 + i * 12, 10 + i * 12, w - 20 - i * 24, h - 20 - i * 24) })
    for (let y = 75; y < h - 55; y += 48) for (let x = 75; x < w - 55; x += 45) {
      c.save(); c.translate(x, y); c.rotate(Math.PI / 4); c.fillStyle = '#b78b61'; c.fillRect(-12, -12, 24, 24); c.fillStyle = '#213c3a'; c.fillRect(-8, -8, 16, 16); c.fillStyle = '#9e4935'; c.fillRect(-3, -3, 6, 6); c.restore()
    }
    for (let i = 0; i < 13000; i++) { c.fillStyle = `rgba(218,181,132,${rng() * .16})`; c.fillRect(rng() * w, rng() * h, 2, 1) }
  }, 1024, 768)
  const floorMap = tex((c, w, h) => {
    c.fillStyle = '#9b714c'; c.fillRect(0, 0, w, h)
    for (let row = 0; row < 12; row++) {
      const y = row * h / 12
      c.fillStyle = `hsl(29 32% ${39 + rng() * 16}%)`; c.fillRect(0, y, w, h / 12 - 2)
      for (let j = 0; j < 48; j++) { c.fillStyle = `rgba(46,22,9,${rng() * .17})`; c.fillRect(rng() * w, y + rng() * h / 12, rng() * 300, 1) }
      for (let x = (row % 3) * 85; x < w; x += 256) { c.fillStyle = '#574132'; c.fillRect(x, y, 1.5, h / 12) }
    }
  }, 1024, 1024)
  const brickMap = tex((c, w, h) => {
    c.fillStyle = '#9a8770'; c.fillRect(0, 0, w, h)
    for (let row = 0; row < 12; row++) for (let col = -1; col < 6; col++) {
      c.fillStyle = `hsl(${15 + rng() * 10} ${25 + rng() * 16}% ${27 + rng() * 13}%)`
      const x = col * 104 + row % 2 * 52, y = row * 43
      c.fillRect(x + 2, y + 2, 99, 38)
      for (let i = 0; i < 25; i++) { c.fillStyle = `rgba(232,187,137,${rng() * .18})`; c.fillRect(x + rng() * 98, y + rng() * 35, 10, 2) }
    }
  })
  brickMap.wrapS = brickMap.wrapT = T.RepeatWrapping; brickMap.repeat.set(3, 1.6)
  const walnut = material('#563626', { map: woodMap }); const oak = material('#c3a477', { map: woodMap })
  const green = material('#233e32'); const brick = material('#d3b8a0', { map: brickMap, bumpMap: brickMap, bumpScale: .035 })
  const brass = material('#ac874a', { metalness: .72, roughness: .3 }); const metal = material('#aab5b3', { metalness: .8, roughness: .25 })
  const black = material('#242321'); const cream = material('#e9d9ba'); const orange = material('#b65d2f', { map: fabricMap, bumpMap: fabricMap, bumpScale: .015 })
  const floral = material('#ede2c6', { map: floralMap }); const olive = material('#706b4d', { map: fabricMap })
  const stone = material('#a69b89', { roughness: .92 })
  const counterGreen = material('#56735e', { roughness: .62 })
  const glass = material('#c2d2c9', { transparent: true, opacity: .075, roughness: .15, depthWrite: false, emissive: '#ffb766', emissiveIntensity: 0 })
  windowLights.push(glass)
  const geoCache = new Map<string, T.BufferGeometry>()
  function box(parent: T.Object3D, x: number, y: number, z: number, w: number, h: number, d: number, mat: T.Material, radius = 0) {
    const key = `${w},${h},${d},${radius}`
    let geo = geoCache.get(key)
    if (!geo) { geo = radius ? new RoundedBoxGeometry(w, h, d, 3, radius) : new T.BoxGeometry(w, h, d); geoCache.set(key, geo); geometries.add(geo) }
    const mesh = new T.Mesh(geo, mat); mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh
  }
  function cylinder(parent: T.Object3D, x: number, y: number, z: number, top: number, bottom: number, height: number, mat: T.Material, segments = 24) {
    const geo = new T.CylinderGeometry(top, bottom, height, segments); geometries.add(geo)
    const mesh = new T.Mesh(geo, mat); mesh.position.set(x, y, z); mesh.castShadow = mesh.receiveShadow = true; parent.add(mesh); return mesh
  }
  function sphere(parent: T.Object3D, x: number, y: number, z: number, sx: number, sy: number, sz: number, mat: T.Material) {
    let geo = geoCache.get('sphere'); if (!geo) { geo = new T.SphereGeometry(1, 20, 14); geoCache.set('sphere', geo); geometries.add(geo) }
    const mesh = new T.Mesh(geo, mat); mesh.position.set(x, y, z); mesh.scale.set(sx, sy, sz); mesh.castShadow = true; parent.add(mesh); return mesh
  }
  function pipe(parent: T.Object3D, points: number[][], radius: number, mat: T.Material) {
    const curve = new T.CatmullRomCurve3(points.map(p => new T.Vector3(...p as [number, number, number])))
    const geo = new T.TubeGeometry(curve, 20, radius, 8, false); geometries.add(geo)
    const mesh = new T.Mesh(geo, mat); mesh.castShadow = true; parent.add(mesh); return mesh
  }
  function panel(parent: T.Object3D, x: number, y: number, z: number, w: number, h: number, texture: T.Texture, color = '#ffffff') {
    const mat = material(color, { map: texture, roughness: .85, side: T.DoubleSide }); return box(parent, x, y, z, w, h, .025, mat)
  }
  function polygon(parent: T.Object3D, points: number[][], y: number, depth: number, mat: T.Material) {
    const shape = new T.Shape(points.map(([x, z]) => new T.Vector2(x, -z)))
    const geo = new T.ExtrudeGeometry(shape, { depth, bevelEnabled: false }); geometries.add(geo)
    const uv = geo.attributes.uv, position = geo.attributes.position
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (position.getX(i) + 7) / 14, (position.getY(i) + 5) / 11)
    const mesh = new T.Mesh(geo, mat); mesh.rotation.x = -Math.PI / 2; mesh.position.y = y
    mesh.castShadow = mesh.receiveShadow = true; parent.add(mesh); return mesh
  }
  function lettering(text: string, bg: string, fg: string, size = 56) {
    return tex((c, w, h) => { c.fillStyle = bg; c.fillRect(0, 0, w, h); c.fillStyle = fg; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = `600 ${size}px Georgia`; text.split('\n').forEach((s, i, a) => c.fillText(s, w / 2, h / 2 + (i - (a.length - 1) / 2) * (size + 12), w - 24)) }, 512, 256)
  }
  function framed(parent: T.Object3D, x: number, y: number, z: number, w: number, h: number, texture: T.Texture) {
    box(parent, x, y, z, w + .1, h + .1, .09, walnut)
    return panel(parent, x, y, z + .055, w, h, texture)
  }
  function cup(parent: T.Object3D, x: number, y: number, z: number, color = '#e4c68d') {
    const group = new T.Group(); group.position.set(x, y, z); parent.add(group)
    const ceramic = material(color, { roughness: .32 })
    cylinder(group, 0, .018, 0, .135, .12, .035, ceramic)
    cylinder(group, 0, .12, 0, .095, .07, .19, ceramic)
    cylinder(group, 0, .219, 0, .079, .079, .006, material('#342117'))
    const geo = new T.TorusGeometry(.06, .018, 8, 18); geometries.add(geo)
    const handle = new T.Mesh(geo, ceramic); handle.position.set(.105, .13, 0); group.add(handle)
    return group
  }
  function flowers(parent: T.Object3D, x: number, y: number, z: number) {
    box(parent, x, y + .12, z, .42, .23, .28, walnut, .02)
    const petal = [material('#cd8434'), material('#af4c2d'), material('#e6bd66')], foliage = material('#526043')
    for (let i = 0; i < 9; i++) {
      const a = i * 2.4, r = Math.sqrt(i) * .072, fx = x + Math.cos(a) * r, fz = z + Math.sin(a) * r, fy = y + .34 + rng() * .11
      pipe(parent, [[x, y + .18, z], [fx, fy, fz]], .008, foliage)
      for (let j = 0; j < 6; j++) {
        const angle = j * Math.PI / 3
        const p = sphere(parent, fx + Math.cos(angle) * .053, fy, fz + Math.sin(angle) * .053, .058, .025, .034, petal[i % 3]); p.rotation.y = -angle
      }
      sphere(parent, fx, fy + .019, fz, .026, .021, .026, petal[(i + 1) % 3])
    }
  }
  function table(parent: T.Object3D, x: number, z: number, y = 0) {
    cylinder(parent, x, y + .78, z, .49, .49, .08, walnut)
    cylinder(parent, x, y + .38, z, .065, .14, .73, black)
    cylinder(parent, x, y + .05, z, .28, .34, .07, black)
    cup(parent, x + .12, y + .83, z)
  }
  function leg(parent: T.Object3D, x: number, z: number, height: number, mat = walnut) {
    cylinder(parent, x, height / 2, z, .07, .05, height, mat)
    sphere(parent, x, height * .72, z, .1, .1, .1, mat)
    cylinder(parent, x, .06, z, .08, .085, .1, mat)
  }
  function armchair(x: number, z: number, rotation: number, mat: T.Material, fringe = false, y = 0) {
    const g = new T.Group(); g.position.set(x, y, z); g.rotation.y = rotation; root.add(g)
    for (const lx of [-.43, .43]) for (const lz of [-.36, .36]) leg(g, lx, lz, .36)
    box(g, 0, .39, 0, 1.06, .18, .97, walnut, .045)
    box(g, 0, .56, .02, .91, .25, .86, mat, .11)
    const back = box(g, 0, 1.04, -.37, .95, .93, .21, mat, .13); back.rotation.x = -.1
    for (const side of [-1, 1]) {
      pipe(g, [[side * .5, .57, .42], [side * .56, .86, .36], [side * .57, .84, -.16], [side * .5, 1.39, -.41]], .055, walnut)
      if (fringe) box(g, side * .47, .71, .02, .14, .32, .73, mat, .07)
    }
    if (fringe) for (let i = 0; i < 32; i++) cylinder(g, -.5 + i / 31, .26, .47, .012, .012, .22, olive, 5)
    return g
  }

  // The shop is a cutaway set: its street facade is on the right, with a chamfered entrance.
  const roomOutline = [[-6.4, -4.3], [3.25, -4.3], [6.35, -2.25], [6.35, 4.7], [-6.4, 4.7]]
  const baseOutline = [[-6.8, -7.1], [5.4, -7.1], [8.1, -4.1], [8.1, 5.6], [-6.8, 5.6]]
  polygon(root, baseOutline, -.43, .4, material('#b8b1a4'))
  polygon(root, roomOutline, -.025, .1, material('#ffffff', { map: floorMap }))
  box(root, 7.13, .005, 1.5, 1.42, .08, 6.9, material('#d5cbb9'))
  for (let z = -1.8; z < 5; z += .68) box(root, 7.13, .051, z, 1.43, .004, .014, stone)
  const rug = box(root, .4, .088, 1.8, 7.8, .027, 4.85, material('#ffffff', { map: rugMap })); rug.receiveShadow = true
  box(root, -1.6, 2.35, -4.3, 9.6, 4.7, .22, material('#c7b490'))
  box(root, -4.65, 2.35, -4.15, 3.5, 4.7, .055, brick)
  box(root, -6.4, 2.35, .20, .24, 4.7, 9.24, brick)
  box(root, -1.6, .62, -4.12, 9.6, 1.2, .1, walnut)
  for (let x = -6.1; x < 3.2; x += .65) box(root, x, .62, -4.04, .035, 1.08, .035, oak)
  box(root, -1.6, 4.45, -4.1, 9.6, .34, .32, green)
  // Staff door at the far end of the bar, set into the rear brick wall.
  const staffDoor = new T.Group(); staffDoor.name = 'Staff door behind the bar'; staffDoor.position.set(-5.42, 0, -4.055); root.add(staffDoor)
  box(staffDoor, 0, 1.51, 0, 1.20, 3.02, .10, material('#291d17'))
  box(staffDoor, 0, 1.48, .07, 1.04, 2.84, .065, material('#57382a', { map: woodMap }))
  box(staffDoor, 0, 2.56, .113, .79, .40, .018, material('#9b9f88', { roughness: .42 }))
  box(staffDoor, 0, 1.21, .113, .78, 1.43, .019, walnut)
  box(staffDoor, .38, 1.50, .135, .07, .11, .05, brass, .02)
  for (const x of [-.63, .63]) box(staffDoor, x, 1.58, .075, .075, 3.17, .13, walnut)
  box(staffDoor, 0, 3.14, .075, 1.36, .10, .16, walnut)
  box(root, 5.04, .19, .9, 2.48, .34, 5.6, green)
  box(root, 5.04, .38, .9, 2.38, .035, 5.5, material('#eee2d0', { map: rugMap }))
  const logo = tex((c, w, h) => {
    c.clearRect(0, 0, w, h); c.lineJoin = 'round'; c.lineCap = 'round'
    // Two gold cups and their curling steam flank the original arched wordmark.
    for (const side of [1, -1]) {
      c.save(); if (side < 0) { c.translate(w, 0); c.scale(-1, 1) }
      c.strokeStyle = '#231c1b'; c.lineWidth = 39; c.beginPath(); c.ellipse(85, 279, 39, 52, -.35, 0, Math.PI * 2); c.stroke()
      c.strokeStyle = '#d9b06d'; c.lineWidth = 24; c.stroke()
      const cupFill = c.createLinearGradient(100, 218, 260, 362); cupFill.addColorStop(0, '#fff0cc'); cupFill.addColorStop(.55, '#ead0a0'); cupFill.addColorStop(1, '#b77d37')
      c.beginPath(); c.moveTo(93, 225); c.bezierCurveTo(105, 350, 150, 374, 267, 365); c.bezierCurveTo(340, 352, 357, 298, 369, 225); c.closePath(); c.fillStyle = cupFill; c.fill(); c.strokeStyle = '#302322'; c.lineWidth = 7; c.stroke()
      c.fillStyle = '#292421'; c.beginPath(); c.ellipse(231, 224, 138, 23, 0, 0, Math.PI * 2); c.fill()
      c.strokeStyle = '#c1924e'; c.lineWidth = 8; c.beginPath(); c.ellipse(230, 366, 98, 8, 0, 0, Math.PI); c.stroke()
      for (let i = 0; i < 4; i++) { const x = 135 + i * 48; c.beginPath(); c.moveTo(x, 207); c.bezierCurveTo(x + 35, 166, x - 30, 140, x + 5, 106 - i % 2 * 24); c.strokeStyle = '#392934'; c.lineWidth = 9; c.stroke(); c.strokeStyle = '#f5e9f3'; c.lineWidth = 5; c.stroke() }
      c.restore()
    }
    c.beginPath(); c.moveTo(284, 175); c.lineTo(245, 263); c.lineTo(322, 254); c.lineTo(702, 254); c.lineTo(779, 263); c.lineTo(740, 175); c.closePath(); c.fillStyle = '#f6ebda'; c.fill(); c.strokeStyle = '#261c20'; c.lineWidth = 9; c.stroke()
    c.beginPath(); c.moveTo(264, 151); c.quadraticCurveTo(512, -29, 760, 151); c.lineTo(704, 269); c.quadraticCurveTo(512, 157, 320, 269); c.closePath(); c.fillStyle = '#f8edde'; c.fill(); c.stroke()
    c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = '100px Impact, sans-serif'
    ;[...'CENTRAL'].forEach((letter, i) => { const t = i - 3; c.save(); c.translate(512 + t * 56, 127 + t * t * 7); c.rotate(t * .15); c.strokeStyle = '#56221d'; c.lineWidth = 4; c.strokeText(letter, 0, 0); c.fillStyle = '#ac3026'; c.fillText(letter, 0, 0); c.restore() })
    const plaque = c.createLinearGradient(0, 242, 0, 433); plaque.addColorStop(0, '#408862'); plaque.addColorStop(.35, '#1c593e'); plaque.addColorStop(1, '#103525')
    c.beginPath(); c.roundRect(306, 246, 412, 194, 85); c.fillStyle = plaque; c.fill(); c.strokeStyle = '#191d18'; c.lineWidth = 11; c.stroke()
    c.font = 'bold 139px Georgia'; c.textBaseline = 'alphabetic'; c.strokeStyle = '#111810'; c.lineWidth = 10; c.strokeText('PERK', 514, 396, 354)
    const letters = c.createLinearGradient(0, 286, 0, 397); letters.addColorStop(0, '#fffdf5'); letters.addColorStop(1, '#b9b5d7'); c.fillStyle = letters; c.fillText('PERK', 510, 392, 354)
    for (const x of [330, 694]) { c.beginPath(); c.ellipse(x, 348, 7, 10, -.3, 0, Math.PI * 2); c.fill() }
    c.font = 'italic 27px cursive'; c.fillStyle = '#faf4e6'; c.fillText('F R I E N D S', 512, 485)
    for (let i = 0; i < 6; i++) { c.beginPath(); c.arc(415 + i * 39, 476, 3, 0, Math.PI * 2); c.fillStyle = ['#bd3a35', '#4699b9', '#e9bd55'][i % 3]; c.fill() }
  }, 1024, 512)
  const logoMaterial = material('#ffffff', { map: logo, transparent: true, alphaTest: .05, depthWrite: false, emissive: '#ffffff', emissiveMap: logo, emissiveIntensity: .12 })
  const logoGeo = new T.PlaneGeometry(3.9, 1.95); geometries.add(logoGeo)
  // Large green shop window and the angled brown double door share the same wall line.
  const facade = new T.Group(); facade.position.set(6.35, 0, 1.225); facade.rotation.y = Math.PI / 2; root.add(facade)
  const doorway = new T.Group(); doorway.position.set(4.8, 0, -3.275); doorway.rotation.y = Math.atan2(2.05, -3.1); root.add(doorway)
  const awnings = new T.Group(); root.add(awnings)
  function awning(x: number, z: number, rotation: number, width: number) {
    const group = new T.Group(); group.position.set(x, 4.38, z); group.rotation.y = rotation; awnings.add(group)
    const red = material('#a4312c'), white = material('#f2ead9')
    const count = Math.round(width / .36)
    for (let i = 0; i < count; i++) {
      const stripe = box(group, -width / 2 + (i + .5) * width / count, -.09, .43, width / count + .008, .11, .94, i % 2 ? white : red, .035)
      stripe.rotation.x = .18
      box(group, -width / 2 + (i + .5) * width / count, -.21, .9, width / count + .008, .18, .10, i % 2 ? white : red, .045)
    }
  }
  awning(6.35, 1.225, Math.PI / 2, 7.10); awning(4.8, -3.275, doorway.rotation.y, 3.76)
  for (const wall of [facade, doorway]) {
    const width = wall === facade ? 6.95 : 3.72
    box(wall, 0, 4.10, 0, width, .60, .22, green)
    box(wall, 0, 4.47, 0, width + .08, .16, .34, green, .025)
    for (const x of [-width / 2, width / 2]) {
      box(wall, x, 2.20, 0, .22, 4.4, .25, green)
      box(wall, x, .20, .045, .29, .36, .31, green, .025)
    }
  }
  box(facade, 0, .6, 0, 6.94, 1.16, .20, green)
  for (let x = -3.2; x < 3.4; x += .55) box(facade, x, .59, .12, .035, 1.01, .024, material('#365344'))
  for (const x of [-2.3, 2.3]) box(facade, x, 2.51, 0, .12, 2.78, .23, green)
  box(facade, 0, 1.19, .06, 6.95, .12, .3, green)
  box(facade, 0, 3.70, 0, 6.95, .10, .22, green)
  const pane = box(facade, 0, 2.44, 0, 6.78, 2.37, .025, glass); pane.castShadow = false
  const windowLogo = new T.Mesh(logoGeo, logoMaterial); windowLogo.position.set(0, 2.56, .06); facade.add(windowLogo)
  const insideLogo = new T.Mesh(logoGeo, logoMaterial); insideLogo.position.set(0, 2.56, -.06); insideLogo.rotation.y = Math.PI; facade.add(insideLogo)
  for (let i = -3; i < 4; i++) box(facade, i * .94, 3.94, .13, .76, .2, .02, material(i % 2 ? '#466b4f' : '#304b38', { roughness: .35 }))
  for (const x of [-.86, .86]) {
    // Actual openings let the room show through, instead of glass laid over a wooden slab.
    box(doorway, x, .80, .025, 1.62, 1.50, .16, walnut, .025)
    for (const edge of [-.73, .73]) box(doorway, x + edge, 2.69, .025, .16, 2.31, .16, walnut, .02)
    for (const y of [1.60, 2.73, 3.80]) box(doorway, x, y, .025, 1.62, .16, .16, walnut, .02)
    for (const [y, h] of [[2.16, .97], [3.26, .91]]) { const doorGlass = box(doorway, x, y, .025, 1.28, h, .025, glass); doorGlass.castShadow = false }
    box(doorway, x, .80, .13, 1.20, 1.09, .04, material('#69472f', { map: woodMap }), .02)
    pipe(doorway, [[x * .25, 1.36, .24], [x * .25, 1.68, .24]], .032, brass)
  }
  box(doorway, 0, 1.96, .14, .09, 3.9, .18, green)
  panel(doorway, -.85, 2.25, .16, .62, .24, lettering('OPEN', '#203c31', '#ecdabb', 65))
  box(doorway, 0, .025, .37, 3.6, .07, .75, stone)

  // Low orange sofa: one seat, shallow tufts, continuous rounded back and rolled arms.
  const sofa = new T.Group(); sofa.position.set(.1, .09, .90); sofa.scale.set(1.45, 1.2, 1.18); root.add(sofa); sofa.userData.action = 'sofa'; clicks.push(sofa)
  for (const x of [-1.45, 1.45]) for (const z of [-.42, .42]) leg(sofa, x, z, .27)
  box(sofa, 0, .36, 0, 3.15, .32, 1.18, orange, .12)
  box(sofa, 0, .58, .11, 2.86, .24, 1.02, orange, .11)
  const back = box(sofa, 0, 1.14, -.45, 3.12, 1.1, .31, orange, .15); back.rotation.x = -.12
  pipe(sofa, [[-1.63, 1.67, -.43], [-.8, 1.73, -.53], [0, 1.74, -.54], [.8, 1.73, -.53], [1.63, 1.67, -.43]], .10, orange)
  for (const s of [-1, 1]) {
    box(sofa, s * 1.58, .64, .04, .35, .52, 1.16, orange, .16)
    pipe(sofa, [[s * 1.58, .92, .55], [s * 1.61, 1.04, .48], [s * 1.62, 1.10, -.05], [s * 1.60, 1.55, -.46]], .16, orange)
    const seam = material('#915031')
    for (let j = 0; j < 2; j++) { const spiral = new T.TorusGeometry(.10 - j * .035, .01, 6, 24); geometries.add(spiral); const m = new T.Mesh(spiral, seam); m.position.set(s * 1.58, .97, .65); sofa.add(m) }
  }
  for (let i = 0; i < 9; i++) {
    const x = -1.3 + i * .325
    sphere(sofa, x, 1.17, -.273, .021, .021, .01, material('#915031'))
    pipe(sofa, [[x - .12, 1.55, -.275], [x, 1.17, -.26], [x + .09, .91, -.245]], .006, material('#ab603d'))
  }
  armchair(-3.70, 2.55, .45, floral).scale.setScalar(1.22)
  armchair(2.80, 2.40, -.62, olive, true, .102).scale.setScalar(1.22)
  table(root, -4.0, 3.0); flowers(root, -4.02, .83, 3.02)
  // Large green apron coffee table with turned legs, tissue box, flowers and magazines.
  const coffeeTable = new T.Group(); coffeeTable.position.set(.1, .11, 3.05); coffeeTable.scale.set(1.27, 1.05, 1.05); root.add(coffeeTable)
  const turnedLeg = new T.LatheGeometry([[.07, 0], [.10, .04], [.075, .09], [.07, .24], [.12, .34], [.13, .40], [.09, .46], [.12, .52], [.12, .62]].map(([r, y]) => new T.Vector2(r, y)), 24)
  geometries.add(turnedLeg)
  for (const x of [-1.5, 1.5]) for (const z of [-.54, .54]) {
    const foot = new T.Mesh(turnedLeg, oak); foot.position.set(x, 0, z); foot.castShadow = true; coffeeTable.add(foot)
  }
  box(coffeeTable, 0, .57, 0, 3.35, .24, 1.4, material('#ffffff', { map: greenPaintMap }), .025)
  box(coffeeTable, 0, .73, 0, 3.48, .11, 1.5, oak, .035)
  box(coffeeTable, -.97, .9, .04, .3, .25, .24, metal, .02)
  box(coffeeTable, -.97, 1.04, .04, .15, .07, .13, cream, .01)
  const magazine = box(coffeeTable, -.44, .806, -.08, .48, .023, .38, material('#772d23')); magazine.rotation.y = .23
  const cover = panel(coffeeTable, -.44, .821, -.08, .39, .32, lettering('NEW YORK', '#e0d0af', '#302a25', 53)); cover.rotation.x = -Math.PI / 2
  const reserved = panel(coffeeTable, .14, .91, .34, .43, .22, lettering('RESERVED', '#292a24', '#eee3c2', 50)); reserved.rotation.x = -.1
  flowers(coffeeTable, 1.05, .79, -.06)
  const hotCup = cup(coffeeTable, -.2, .80, -.43, '#75816b'); hotCup.userData.action = 'cup'; clicks.push(hotCup)

  // Independent customer counter: the return turns toward Rachel's end.
  // The wall worktop stays separate, with a clear staff aisle and an open end.
  const bar = new T.Group(); bar.name = 'Angled service counter'; bar.position.set(-3.78, .09, -.80); bar.rotation.y = Math.PI / 2; bar.scale.y = .84; root.add(bar)
  const counterOutline = [[-1.93,-.25],[-1.40,-.90],[-.70,-.43],[1.72,-.43],[1.72,.45],[-1.03,.45]]
  polygon(bar, counterOutline, .02, 1.25, walnut)
  polygon(bar, counterOutline.map(([x,z]) => [x * 1.035,z * 1.13]), 1.27, .14, counterGreen)
  polygon(bar, counterOutline.map(([x,z]) => [x * 1.01,z * 1.03]), .06, .12, walnut)
  const counterTurn = new T.Group(); counterTurn.position.set(-1.48, 0, .10); counterTurn.rotation.y = -Math.atan2(.70,.90); bar.add(counterTurn)
  box(counterTurn, 0, .66, .025, 1.08, 1.05, .035, oak)
  box(counterTurn, 0, .66, .05, .94, .88, .04, walnut)
  for (const x of [-.40,.40]) box(counterTurn,x,.66,.075,.026,.92,.026,oak)
  box(bar, .38, .69, .46, 2.23, 1.12, .08, black)
  for (let row = 0; row < 3; row++) {
    box(bar, .38, .26 + row * .35, .55, 2.24, .045, .24, oak)
    for (let col = 0; col < 7; col++) {
      const colors = ['#c4af79', '#a33228', '#bdc7b1', '#4c6668', '#dfb24a']
      const x = -.40 + col * .26, y = .42 + row * .35
      box(bar, x, y, .54, .2, .27, .17, material(colors[(row + col) % 5]), .01)
      panel(bar, x, y, .631, .13, .17, lettering(col % 2 ? 'PERK' : 'COFFEE', '#e4d8b9', '#523629', 58))
    }
  }
  for (const x of [-.78,1.56]) box(bar, x, .68, .48, .07, 1.18, .07, oak)
  cup(bar, .65, 1.42, .10, '#b46e36')
  box(bar, -1.32, 1.49, -.22, .37, .15, .32, black, .025)
  const barTill = panel(bar,-1.32,1.66,-.32,.33,.22,lettering('PERK', '#223a32', '#d1bc91', 64)); barTill.rotation.x = -.25
  cylinder(bar, .15, 1.47, -.10, .23, .23, .04, metal)
  sphere(bar, .15, 1.64, -.1, .23, .19, .23, material('#b4c7bc', { transparent: true, opacity: .27, roughness: .1 }))
  // Back worktop, dispensers and espresso machine.
  const serviceStart = root.children.length
  box(root, -4.1, .62, -3.53, 3.9, 1.2, .96, walnut)
  box(root, -4.1, 1.3, -3.53, 4.05, .13, 1.02, counterGreen, .03)
  for (const x of [-5.65, -5.12]) {
    cylinder(root, x, 2.13, -3.67, .19, .22, 1.20, brass)
    sphere(root, x, 2.78, -3.67, .21, .17, .21, brass)
    cylinder(root, x, 1.49, -3.67, .26, .26, .12, brass)
    pipe(root, [[x, 1.68, -3.45], [x, 1.68, -3.28], [x, 1.56, -3.28]], .035, brass)
  }
  const machine = new T.Group(); machine.position.set(-3.65, 1.38, -3.36); root.add(machine); machine.userData.action = 'machine'; clicks.push(machine)
  box(machine, 0, .31, -.05, 1.25, .58, .55, metal, .06)
  box(machine, 0, .08, .29, 1.35, .10, .50, black, .02)
  box(machine, 0, .44, .26, 1.3, .08, .08, brass, .02)
  for (const x of [-.35, .35]) { cylinder(machine, x, .23, .30, .06, .06, .17, metal); cup(machine, x, .135, .38); cup(machine, x, .62, 0, '#ddd1b7') }
  for (let x = -.45; x < .5; x += .15) sphere(machine, x, .44, .3, .025, .025, .02, black)
  for (let row = 0; row < 3; row++) {
    box(root, -3.56, 2.24 + row * .56, -3.98, 2.9, .07, .40, walnut)
    for (let col = 0; col < 8; col++) cup(root, -4.75 + col * .33, 2.28 + row * .56, -3.96, col % 3 ? '#d5c4a6' : '#6e7557')
  }
  const serviceObjects = root.children.slice(serviceStart)
  const backBar = new T.Group(); backBar.name = 'Separate wall worktop'; backBar.position.set(-5.72, 0, -1.40); backBar.rotation.y = Math.PI / 2; backBar.scale.y = .94; root.add(backBar)
  for (const object of serviceObjects) { object.position.x += 4.1; object.position.z += 3.53; backBar.add(object) }
  // Photo-specific rear artwork and SERVICE arrow.
  const liberty = tex((c, w, h) => {
    c.fillStyle = '#a52e26'; c.fillRect(0, 0, w, h); c.strokeStyle = '#202a25'; c.lineWidth = 12
    for (let i = 0; i < 19; i++) { const a = i * .35; c.beginPath(); c.moveTo(w * .48, h * .50); c.lineTo(w * .48 + Math.cos(a) * 700, h * .50 + Math.sin(a) * 700); c.stroke() }
    c.fillStyle = '#5f9b82'; c.beginPath(); c.moveTo(170, 450); c.lineTo(155, 250); c.lineTo(205, 175); c.lineTo(284, 180); c.lineTo(320, 260); c.lineTo(302, 356); c.lineTo(383, 480); c.lineTo(430, 512); c.lineTo(100, 512); c.closePath(); c.fill()
    for (let i = 0; i < 7; i++) { const x = 161 + i * 23; c.beginPath(); c.moveTo(x, 222); c.lineTo(x - 35 + i * 10, 72 + Math.abs(i - 3) * 13); c.lineTo(x + 24, 215); c.fill() }
    c.strokeStyle = '#193d32'; c.lineWidth = 8; c.beginPath(); c.moveTo(185, 274); c.lineTo(224, 270); c.moveTo(254, 270); c.lineTo(286, 276); c.moveTo(247, 278); c.lineTo(229, 326); c.lineTo(250, 333); c.moveTo(207, 359); c.lineTo(264, 359); c.stroke()
  })
  framed(root, .1, 2.83, -4.12, 1.67, 1.77, liberty)
  const service = tex((c) => { c.fillStyle = '#a53425'; c.beginPath(); c.moveTo(12, 128); c.lineTo(116, 44); c.lineTo(116, 81); c.lineTo(491, 81); c.lineTo(491, 181); c.lineTo(116, 181); c.lineTo(116, 216); c.closePath(); c.fill(); c.strokeStyle = '#d1a674'; c.lineWidth = 6; c.stroke(); c.fillStyle = '#f5cd63'; c.font = 'bold 63px sans-serif'; c.fillText('SERVICE', 145, 152) }, 512, 256)
  panel(root, .1, 4.0, -4.07, 1.8, .66, service)
  const redPoster = lettering('Central\nCoffee', '#a74237', '#252d22', 70)
  framed(root, -1.77, 2.65, -4.10, .85, 2.22, redPoster)
  box(root, -1.77, 3.95, -4.06, 1.0, .12, .10, green)
  // Rear banquette under the artwork and the small till beside the passage.
  const benchFabric = material('#773d27', { map: fabricMap })
  box(root, .0, .51, -3.38, 2.20, .36, .75, benchFabric, .10)
  box(root, .0, .97, -3.72, 2.24, .78, .19, benchFabric, .09)
  table(root, .05, -2.61)
  box(root, 1.77, .65, -3.2, .83, 1.28, .7, walnut, .04)
  box(root, 1.77, 1.35, -3.2, 1.05, .1, .84, oak, .05)
  box(root, 1.77, 1.53, -3.2, .4, .3, .3, cream, .035)
  const till = panel(root, 1.77, 1.6, -3.01, .31, .21, lettering('CENTRAL PERK', '#223a32', '#d1bc91', 32)); till.rotation.x = -.18
  const menuGroup = new T.Group(); menuGroup.position.set(-6.24, 0, 2.5); menuGroup.rotation.y = Math.PI / 2; root.add(menuGroup)
  framed(menuGroup, 0, 2.50, 0, 1.45, 1.86, lettering('COFFEE\nEspresso   2.95\nCappuccino   3.25\nLatte   3.75\nGood coffee.\nGood company.', '#27352d', '#d6c4a3', 37))
  framed(menuGroup, -1.67, 2.72, 0, .63, .83, redPoster)
  framed(menuGroup, 1.35, 2.96, 0, .59, .73, lettering('NEW\nYORK', '#aa8a64', '#403528', 70))
  // Feet start at the platform rug; the frame carries both cushions and arm posts.
  const nook = new T.Group(); nook.position.set(5.63, .3975, 1.20); nook.rotation.y = -Math.PI / 2; root.add(nook)
  for (const x of [-1.0, 1.0]) for (const z of [-.29, .29]) leg(nook, x, z, .23)
  box(nook, 0, .27, 0, 2.23, .16, .84, walnut, .035)
  for (const x of [-.53, .53]) box(nook, x, .45, .025, 1.04, .24, .77, floral, .08)
  const nookBack = box(nook, 0, .98, -.32, 2.12, .96, .22, floral, .09); nookBack.rotation.x = -.08
  for (const s of [-1, 1]) {
    box(nook, s * 1.08, .49, .30, .10, .40, .11, walnut, .025)
    box(nook, s * 1.08, .79, -.35, .10, 1.0, .11, walnut, .025)
    pipe(nook, [[s * 1.08, .68, .36], [s * 1.10, .77, .27], [s * 1.10, .80, -.15], [s * 1.08, .84, -.35]], .055, walnut)
  }
  table(root, 4.52, 1.45, .36); flowers(root, 4.52, 1.2, 1.45)
  for (const x of [-1.6, 2.7]) {
    cylinder(root, x, 2.28, -.8, .063, .084, 4.55, green)
    cylinder(root, x, .22, -.8, .11, .14, .40, green)
    cylinder(root, x, 4.32, -.8, .14, .09, .15, green)
  }
  box(root, .5, 4.48, -.8, 5.0, .22, .22, green)
  // The record player belongs to the window-side performance corner.
  const recordCabinet = new T.Group(); recordCabinet.position.set(4.64, .43, -1.28); root.add(recordCabinet)
  box(recordCabinet, 0, .40, 0, 1.45, .8, .82, walnut, .055)
  for (let i = 0; i < 12; i++) box(recordCabinet, -.5 + i * .09, .4, .43, .025, .55, .025, oak)
  const turntable = new T.Group(); turntable.position.set(0, .86, 0); recordCabinet.add(turntable)
  turntable.userData.action = 'record'; clicks.push(turntable)
  box(turntable, 0, .045, 0, 1.37, .11, .81, material('#b78448', { map: woodMap }), .045)
  box(turntable, 0, .107, 0, 1.27, .024, .72, black, .02)
  const record = new T.Group(); record.position.set(-.14, .132, .0); turntable.add(record)
  cylinder(record, 0, 0, 0, .30, .30, .025, material('#101218', { roughness: .22, metalness: .25 }), 64)
  cylinder(record, 0, .016, 0, .094, .094, .008, material('#a94935'), 40)
  cylinder(record, 0, .022, 0, .018, .018, .018, metal, 12)
  for (const radius of [.15, .20, .25, .28]) {
    const geo = new T.TorusGeometry(radius, .002, 4, 64); geometries.add(geo)
    const groove = new T.Mesh(geo, material('#3e424b', { metalness: .45, roughness: .26 })); groove.rotation.x = Math.PI / 2; groove.position.y = .014; record.add(groove)
  }
  const recordLabel = panel(record, .045, .023, 0, .038, .08, lettering('U2', '#c69666', '#211b19', 92)); recordLabel.rotation.x = -Math.PI / 2
  const arm = new T.Group(); arm.position.set(.43, .14, -.23); turntable.add(arm)
  cylinder(arm, 0, 0, 0, .046, .056, .08, metal, 16)
  pipe(arm, [[0, .05, 0], [-.045, .07, .21], [-.08, .06, .43]], .015, metal)
  box(arm, -.08, .045, .44, .06, .04, .095, cream, .012)
  const playLed = material('#9c7140', { emissive: '#eeb365', emissiveIntensity: .25 })
  sphere(turntable, .45, .13, .26, .023, .01, .023, playLed)
  for (const x of [-.72, .73]) {
    box(recordCabinet, x, .98, -.08, .23, .36, .25, walnut, .025)
    sphere(recordCabinet, x, .98, .049, .075, .09, .009, black)
  }
  // Acoustic guitar, slim mic stand and a stool rather than a second oversized sofa.
  const guitar = new T.Group(); guitar.position.set(5.72, .45, -1.20); guitar.rotation.z = -.16; guitar.rotation.y = -.4; root.add(guitar)
  const guitarWood = material('#ce9a50', { roughness: .43 })
  sphere(guitar, 0, .43, 0, .24, .30, .078, guitarWood)
  sphere(guitar, 0, .72, 0, .19, .22, .07, guitarWood)
  box(guitar, 0, 1.12, 0, .09, .81, .055, walnut, .018)
  box(guitar, 0, 1.56, 0, .14, .21, .06, oak, .025)
  sphere(guitar, 0, .65, .072, .075, .075, .009, black)
  box(guitar, 0, .39, .076, .14, .033, .014, walnut)
  for (let i = 0; i < 6; i++) pipe(guitar, [[-.025 + i * .01, .39, .083], [-.025 + i * .01, 1.58, .039]], .0016, metal)
  cylinder(root, 3.82, .48, -.12, .18, .22, .09, black)
  cylinder(root, 3.82, 1.25, -.12, .018, .021, 1.49, black, 10)
  pipe(root, [[3.82, 1.98, -.12], [3.53, 2.08, .03]], .016, black)
  sphere(root, 3.5, 2.1, .04, .075, .032, .035, metal)
  // Minifigure proportions: tapered shoulders, molded hair, C-grip hands and printed outfits.
  const toySkin = material('#f1d3a6', { roughness: .32 })
  type FriendName = 'Gunther' | 'Rachel' | 'Monica' | 'Phoebe' | 'Joey' | 'Chandler' | 'Ross'
  const outfits: Record<FriendName, [string,string,string]> = {
    Gunther: ['#b6d934','#17191a','#fff2d6'], Rachel: ['#92bbd5','#20212b','#b97933'],
    Monica: ['#f0ece0','#ab814e','#17191d'], Phoebe: ['#bb7ca5','#684172','#e9bd53'],
    Joey: ['#c82b27','#191d23','#15171a'], Chandler: ['#8ebad5','#bba172','#553828'], Ross: ['#86634a','#4c4540','#262020'],
  }
  function outfitMap(name: FriendName, color: string) {
    return tex(c => {
      c.fillStyle = color; c.fillRect(0,0,512,512); c.strokeStyle = '#303039'; c.lineWidth = 7; c.lineJoin = 'round'; c.lineCap = 'round'
      const shape = (p: number[][], fill: string) => { c.beginPath(); p.forEach(([x,y],i) => i ? c.lineTo(x,y) : c.moveTo(x,y)); c.closePath(); c.fillStyle = fill; c.fill(); c.stroke() }
      const line = (p: number[][]) => { c.beginPath(); p.forEach(([x,y],i) => i ? c.lineTo(x,y) : c.moveTo(x,y)); c.stroke() }
      if (name === 'Monica') {
        c.strokeStyle='#68635b'; c.beginPath(); c.ellipse(256,8,91,37,0,0,Math.PI); c.stroke()
        for (const x of [118,366]) { c.fillStyle='#754832'; c.fillRect(x,0,25,390); c.strokeRect(x,0,25,390); c.fillStyle='#c8ac87'; c.fillRect(x-6,235,37,24); c.strokeRect(x-6,235,37,24) }
        shape([[20,425],[170,402],[342,402],[492,425],[512,512],[0,512]],'#b69055')
        c.fillStyle='#49352c'; c.beginPath(); c.arc(256,445,11,0,Math.PI*2); c.fill(); line([[196,184],[233,178],[295,185]]); line([[195,206],[248,214]])
      } else if (name === 'Phoebe') {
        shape([[128,0],[204,62],[235,512],[14,512]],'#b28952'); shape([[384,0],[308,62],[277,512],[498,512]],'#b28952')
        c.strokeStyle='#e4c77c'; c.lineWidth=5
        for (const x of [105,161,351,407]) for (let y=108;y<488;y+=62) { c.beginPath(); c.ellipse(x,y,11,22,.35,0,Math.PI*2); c.stroke(); c.beginPath(); c.arc(x+17,y+26,3,0,Math.PI*2); c.fillStyle='#e4c77c'; c.fill() }
        c.strokeStyle='#55384d'; line([[256,74],[256,502]])
      } else {
        const isTie = name === 'Gunther' || name === 'Ross'
        const inner = name === 'Chandler' ? '#9ac4da' : '#eee9dc'
        if (name !== 'Gunther') shape([[177,0],[335,0],[310,512],[202,512]],inner)
        if (name === 'Chandler') {
          shape([[80,0],[167,0],[254,245],[233,512],[0,512]],'#24334b'); shape([[432,0],[345,0],[258,245],[277,512],[512,512]],'#24334b')
          line([[256,260],[256,500]])
        }
        shape([[112,0],[240,35],[174,115],[118,73]],color); shape([[400,0],[272,35],[338,115],[394,73]],color)
        if (isTie) {
          shape([[231,51],[281,51],[294,91],[268,115],[244,115],[218,91]],name === 'Gunther' ? '#f7edce' : '#944c3c')
          shape([[244,115],[269,115],[298,425],[255,481],[214,425]],name === 'Gunther' ? '#fff1d1' : '#773c31')
          for (let y=176;y<430;y+=78) { c.fillStyle = name === 'Gunther' ? (y % 3 ? '#d96132' : '#609346') : '#d8ae76'; c.beginPath(); c.arc(256,y,name === 'Gunther' ? 15 : 7,0,Math.PI*2); c.fill() }
        } else { line([[207,124],[204,498]]); line([[304,124],[307,498]]) }
        if (name === 'Rachel' || name === 'Joey' || name === 'Gunther') for (const x of name === 'Gunther' ? [351] : [86,346]) {
          shape([[x,193],[x+82,193],[x+77,273],[x+39,289],[x+5,271]],color)
          line([[x,209],[x+41,234],[x+82,209]])
        }
        if (name === 'Rachel') { c.strokeStyle='#d0e1e8'; c.lineWidth=3; for (const x of [45,183,324,467]) line([[x,291],[x-12,480]]) }
        if (name === 'Joey') for (let y=160;y<500;y+=66) { c.fillStyle='#fff4e5'; c.beginPath(); c.arc(191,y,5,0,Math.PI*2); c.fill() }
      }
    })
  }
  function friend(name: FriendName, x: number, y: number, z: number, rotation: number, seated = false) {
    const g = new T.Group(); g.name = name; g.position.set(x, y, z); g.rotation.y = rotation; root.add(g)
    const [shirtColor,pantsColor,hairColor] = outfits[name]
    const shirt = material(shirtColor, { roughness: .34 }), pants = material(pantsColor,{roughness:.35}), hair = material(hairColor, { roughness: .3 })
    const torsoGeo = new RoundedBoxGeometry(.58,.55,.32,3,.018); geometries.add(torsoGeo)
    const pos = torsoGeo.attributes.position
    for (let i = 0; i < pos.count; i++) pos.setX(i,pos.getX(i) * (1 - (pos.getY(i) + .275) / .55 * .23))
    torsoGeo.computeVertexNormals()
    const torso = new T.Mesh(torsoGeo, shirt); torso.position.y = 1.025; torso.castShadow = true; g.add(torso)
    // Match the trapezoidal chest rather than laying a rectangular label across it.
    const printGeo = new T.PlaneGeometry(.55,.52); geometries.add(printGeo)
    const printPos = printGeo.attributes.position
    for (let i=0;i<printPos.count;i++) if (printPos.getY(i)>0) printPos.setX(i,printPos.getX(i)*.78)
    const chest = new T.Mesh(printGeo, material('#ffffff',{map:outfitMap(name,shirtColor),roughness:.4})); chest.position.set(0,1.025,.162); g.add(chest)
    box(g, 0, .72, 0, .53, .13, .31, pants, .015)
    for (const side of [-1, 1]) {
      if (seated) { box(g, side * .14, .60, .22, .26, .25, .62, pants, .025); box(g, side * .14, .33, .48, .26, .39, .27, pants, .018); box(g, side * .14, .10, .55, .27, .15, .39, pants, .018) }
      else { box(g, side * .14, .38, 0, .26, .57, .29, name === 'Rachel' ? toySkin : pants, .018); box(g, side * .14, .075, .065, .27, .15, .42, pants, .018) }
      const sleeve = name === 'Rachel' ? material('#eee7d8',{roughness:.36}) : shirt
      const limb = new T.Group(); limb.name = side === 1 ? 'strumming-arm' : 'left-arm'; limb.position.set(side * .27, 1.20, 0); limb.rotation.z = side * .20; g.add(limb)
      sphere(limb, 0, -.05, 0, .105, .12, .12, sleeve)
      pipe(limb, [[0, -.03, 0], [side * .065, -.19, .015], [side * .07, -.31, .07]], .086, sleeve)
      cylinder(limb,side*.07,-.345,.075,.055,.055,.11,toySkin,16)
      const handGeo = new T.TorusGeometry(.076, .030, 10, 24, Math.PI * 1.55); geometries.add(handGeo)
      const hand = new T.Mesh(handGeo, toySkin); hand.position.set(side * .07, -.405, .095); hand.rotation.z = -.275*Math.PI; limb.add(hand)
    }
    if (name === 'Phoebe' || name === 'Rachel') {
      const skirt = box(g,0,name === 'Phoebe' ? .38 : .61,0,name === 'Phoebe' ? .57 : .54,name === 'Phoebe' ? .66 : .25,.34,pants,.025)
      if (name === 'Phoebe') { const p=skirt.geometry.clone(); geometries.add(p); skirt.geometry=p; const a=p.attributes.position; for(let i=0;i<a.count;i++) if(a.getY(i)<0) a.setX(i,a.getX(i)*1.17); p.computeVertexNormals() }
    }
    cylinder(g, 0, 1.34, 0, .10, .10, .10, toySkin)
    cylinder(g, 0, 1.56, 0, .222, .222, .35, toySkin, 40)
    sphere(g,0,1.398,0,.222,.046,.222,toySkin); sphere(g,0,1.723,0,.222,.04,.222,toySkin)
    cylinder(g, 0, 1.77, 0, .093, .093, .09, toySkin, 24)
    const female = ['Rachel','Monica','Phoebe'].includes(name)
    const faceMap = tex((c,w,h) => {
      c.clearRect(0,0,w,h); c.lineCap='round'; c.strokeStyle='#382a25'; c.lineWidth=5
      for (const x of [w*.29,w*.71]) {
        c.fillStyle='#241d1a'; c.beginPath(); c.ellipse(x,h*.40,10,14,0,0,Math.PI*2); c.fill()
        c.fillStyle='#fff9e8'; c.beginPath(); c.arc(x-3,h*.40-5,3.5,0,Math.PI*2); c.fill()
        c.beginPath(); c.moveTo(x-15,h*.23+4); c.quadraticCurveTo(x,h*.23-6,x+15,h*.23); c.stroke()
        if(female) { c.beginPath(); c.moveTo(x-8,h*.37); c.lineTo(x-16,h*.32); c.stroke() }
      }
      c.beginPath(); c.moveTo(w*.36,h*.73); c.quadraticCurveTo(w*.5,h*(name==='Gunther' ? .70 : .85),w*.65,h*(name==='Joey' ? .66 : .73)); c.stroke()
      if(name==='Monica') { c.fillStyle='#fff8e9'; c.fillRect(w*.42,h*.75,41,5) }
    },256,192)
    const printedFace = material('#ffffff', { map: faceMap, transparent: true, depthWrite: false, roughness:.35 })
    const faceGeo = new T.CylinderGeometry(.224,.224,.28,32,1,true,-.92,1.84); geometries.add(faceGeo)
    const face = new T.Mesh(faceGeo, printedFace); face.position.y=1.55; g.add(face)
    const capGeo = new T.SphereGeometry(1,32,16,0,Math.PI*2,0,Math.PI*.55); geometries.add(capGeo)
    const cap = new T.Mesh(capGeo,hair); cap.position.set(0,1.70,-.025); cap.scale.set(.242,.155,.235); cap.castShadow=true; g.add(cap)
    if (female) {
      const bottom = name==='Phoebe' ? 1.15 : 1.28
      sphere(g,0,(1.73+bottom)/2,-.16,.23,(1.73-bottom)/2,.11,hair)
      for (const side of [-1,1]) for(let i=0;i<3;i++) {
        const z=.10-i*.075
        pipe(g,[[side*.025,1.82,-.005],[side*.18,1.77,z],[side*.235,1.56,z+.02],[side*(name==='Monica' ? .21 : .24),1.40,z+.035],[side*.19,bottom,z+.055]],.047,hair)
      }
    } else {
      // Sweep separate molded locks back from the hairline; each character has a different part.
      for(let i=0;i<7;i++) {
        const x=-.19+i*.061, height=name==='Ross' ? .07 : name==='Chandler' ? .045 : .015
        pipe(g,[[x,1.71+height*.2,.145],[x+(name==='Joey' ? .035 : -.015),1.82+height,.07],[x*.85,1.83+height,-.075],[x*.8,1.74,-.19]],.046,hair)
      }
      for(const side of [-1,1]) pipe(g,[[side*.19,1.73,.015],[side*.223,1.65,-.025],[side*.21,1.58,-.04]],.047,hair)
    }
    return g
  }
  const ross = friend('Ross', -1.25, .44, 1.18, 0, true)
  const keyboard = new T.Group(); keyboard.position.set(0,.85,.51); keyboard.rotation.x=.10; ross.add(keyboard)
  box(keyboard,0,0,0,1.04,.09,.38,black,.025)
  for(let i=0;i<18;i++) box(keyboard,-.46+i*.053,.054,.065,.049,.018,.20,cream,.002)
  for(let i=0;i<17;i++) if(![2,6].includes(i%7)) box(keyboard,-.434+i*.053,.072,.015,.028,.024,.105,black,.002)
  for(let i=0;i<5;i++) box(keyboard,-.39+i*.10,.055,-.12,.048,.018,.033,i===0 ? material('#b2473b') : metal)
  const chandler = friend('Chandler', .05, .44, 1.18, -.06, true)
  const laptop = new T.Group(); laptop.position.set(0,.86,.46); chandler.add(laptop)
  box(laptop,0,0,.08,.67,.055,.43,black,.018)
  for(let row=0;row<3;row++) for(let col=0;col<9;col++) box(laptop,-.26+col*.065,.031,-.03+row*.065,.046,.008,.041,metal,.002)
  const laptopLid = new T.Group(); laptopLid.position.set(0,.025,-.125); laptopLid.rotation.x=-.2; laptop.add(laptopLid)
  box(laptopLid,0,.23,0,.68,.46,.045,black,.02)
  panel(laptopLid,0,.24,.027,.57,.34,lettering('DATA\n> _','#263b37','#a7bb95',42))
  const joey = friend('Joey', 1.32, .44, 1.18, -.12, true)
  const pizzaBox = new T.Group(); pizzaBox.position.set(0,.85,.49); joey.add(pizzaBox)
  box(pizzaBox,0,0,0,.72,.06,.62,cream,.008)
  const pizzaLid = new T.Group(); pizzaLid.position.set(0,.02,-.29); pizzaLid.rotation.x=-.75; pizzaBox.add(pizzaLid)
  box(pizzaLid,0,.27,0,.72,.55,.025,cream)
  panel(pizzaLid,0,.27,.019,.59,.40,lettering('JOEY’S\nPIZZA','#eee3cc','#b22e25',57))
  cylinder(pizzaBox,0,.06,0,.265,.265,.045,material('#bd7a35'),40)
  cylinder(pizzaBox,0,.086,0,.24,.24,.016,material('#eac675'),40)
  const pepperoni=material('#a63527')
  for(let i=0;i<9;i++) { const a=i*2.4,r=i===0 ? 0:.15; cylinder(pizzaBox,Math.sin(a)*r,.098,Math.cos(a)*r,.028,.028,.008,pepperoni,12) }
  const slice=new T.Group(); slice.position.set(.40,.94,.27); slice.rotation.x=-.25; joey.add(slice)
  polygon(slice,[[-.11,-.15],[.11,-.15],[0,.14]],0,.035,material('#e4b967')); cylinder(slice,0,.04,-.045,.032,.032,.008,pepperoni,12)
  const rachel = friend('Rachel', -3.28, .08, 1.22, .28)
  cylinder(rachel,.42,.97,.29,.29,.29,.034,metal,40); cup(rachel,.46,.99,.27,'#fff1d9').scale.setScalar(.72)
  const monica = friend('Monica', 2.80, .362, 2.37, -.62, true)
  cylinder(monica,.37,.99,.29,.15,.15,.022,cream,24)
  cylinder(monica,.37,1.075,.29,.079,.060,.14,material('#ad8050'),16)
  sphere(monica,.37,1.17,.29,.105,.078,.105,material('#c99854'))
  for(let i=0;i<6;i++) sphere(monica,.37+Math.sin(i*2.4)*.065,1.22,.29+Math.cos(i*2.4)*.065,.015,.013,.015,black)
  const gunther = friend('Gunther', -4.77, .08, -.50, Math.PI / 2)
  const coffeePot = new T.Group(); coffeePot.position.set(.40,1.01,.28); gunther.add(coffeePot)
  sphere(coffeePot,0,0,0,.14,.15,.13,material('#725139',{roughness:.18,transparent:true,opacity:.83}))
  cylinder(coffeePot,0,.13,0,.095,.12,.045,black,24)
  pipe(coffeePot,[[.09,.10,0],[.22,.08,0],[.23,-.08,0],[.10,-.10,0]],.025,black)
  pipe(coffeePot,[[-.09,.04,0],[-.19,.12,0],[-.20,.15,0]],.037,metal)
  cup(gunther,-.39,.95,.27,'#fcf0d2').scale.setScalar(.72)
  for (const person of [ross,chandler,joey,rachel,monica,gunther]) for(const name of ['left-arm','strumming-arm']) person.getObjectByName(name)!.rotation.x=-.55
  const phoebe = friend('Phoebe', 6.18, .04, -4.58, 2.20)
  const streetGuitar = guitar.clone(); streetGuitar.position.set(.52, .64, .31); streetGuitar.scale.setScalar(.70); streetGuitar.rotation.set(.10, 0, 1.0); phoebe.add(streetGuitar)
  const strumArm = phoebe.getObjectByName('strumming-arm')!; strumArm.rotation.set(-.65,0,-.20)
  phoebe.getObjectByName('left-arm')!.rotation.x = -1.0
  phoebe.userData.action = 'phoebe'; clicks.push(phoebe)
  const singMic = new T.Group(); singMic.position.set(6.88, .05, -4.96); root.add(singMic)
  cylinder(singMic, 0, .02, 0, .16, .19, .04, black)
  cylinder(singMic, 0, .67, 0, .016, .021, 1.33, black, 10)
  sphere(singMic, 0, 1.34, 0, .04, .06, .04, metal)

  // Curb and asphalt continue along the actual glazed street frontage.
  box(root, 10.50, -.39, -.75, 4.80, .22, 14.2, material('#343c42'), .08)
  box(root, 8.12, -.12, -.75, .13, .33, 14.2, material('#b9b6ab'))
  for (let z = -6.8; z < 6; z += 1.35) box(root, 11.50, -.269, z, .085, .007, .67, material('#e7dec4'))
  for (const z of [-5.0, 4.7]) { box(root, 8.52, -.264, z, .46, .012, .68, black); for (let i = 0; i < 6; i++) box(root, 8.52, -.253, z - .26 + i * .10, .39, .008, .025, metal) }
  // Sculpted sports-car shell: smooth cross-sections, curved glazing, clear coat and alloy wheels.
  const porsche = createPorsche(onAssetError)
  const car = porsche.root; car.position.set(9.54, -.275, .10); root.add(car); clicks.push(car)

  // Two Vegas souvenirs on the return wall; a click spins the decorative reels, with no bets or payouts.
  const slotReels: T.Texture[][] = [], slotLevers: T.Group[] = []
  let slotsUntil = 0
  for (let machineIndex = 0; machineIndex < 2; machineIndex++) {
    const slot = new T.Group(); slot.position.set(.35 + machineIndex * 1.55, .02, -5.03); slot.rotation.y = Math.PI; root.add(slot)
    slot.userData.action = 'slots'; clicks.push(slot)
    const cabinetColor = machineIndex ? '#553139' : '#234c48', cabinet = material(cabinetColor,{metalness:.38,roughness:.35})
    box(slot,0,1.07,0,1.06,2.1,.65,cabinet,.075)
    box(slot,0,2.20,.03,1.15,.37,.73,cabinet,.06)
    const marquee=panel(slot,0,2.21,.41,.96,.23,lettering(machineIndex ? 'LUCKY FRIENDS' : 'VEGAS 99','#282221','#f6d58f',45))
    ;(marquee.material as T.MeshStandardMaterial).emissive.set('#cca550');(marquee.material as T.MeshStandardMaterial).emissiveMap=(marquee.material as T.MeshStandardMaterial).map;(marquee.material as T.MeshStandardMaterial).emissiveIntensity=.65
    box(slot,0,1.52,.36,.91,.66,.08,black,.025)
    const reelMaps: T.Texture[] = []
    for(let i=0;i<3;i++) {
      const reel=tex((c,w,h)=>{c.fillStyle='#eee3c7';c.fillRect(0,0,w,h);c.textAlign='center';c.textBaseline='middle';c.font='bold 82px Georgia';['7','★','7','♣','BAR','7'].forEach((v,j)=>{c.fillStyle=j%2?'#2d694c':'#a53a31';c.fillText(v,w/2,(j+.5)*h/6,w-18)})},128,768)
      reel.wrapT=T.RepeatWrapping;reel.repeat.y=1/6;reel.offset.y=i/6;reelMaps.push(reel)
      panel(slot,-.28+i*.28,1.54,.415,.235,.44,reel)
    }
    slotReels.push(reelMaps)
    const trim=material(machineIndex?'#e2a55d':'#b5d6bf',{emissive:machineIndex?'#e6a447':'#77c8aa',emissiveIntensity:.6});bulbs.push(trim)
    for(const side of [-1,1]) {box(slot,side*.505,1.27,.37,.025,1.8,.026,trim);for(let i=0;i<6;i++)sphere(slot,side*.50,2.10+i*.044,.39,.023,.023,.015,trim)}
    const console = box(slot,0,1.03,.46,.96,.13,.42,cabinet,.045);console.rotation.x=.15
    for(const x of [-.25,.0,.25])cylinder(slot,x,1.14,.52,.055,.055,.025, x===0?trim:brass,20)
    box(slot,0,.60,.342,.38,.26,.025,black,.025);box(slot,0,.66,.365,.23,.02,.025,brass)
    const lever=new T.Group();lever.position.set(.60,1.12,0);slot.add(lever);slotLevers.push(lever)
    cylinder(lever,0,.28,0,.025,.025,.56,metal,12);sphere(lever,0,.58,0,.095,.095,.095,material('#a93c32'))
  }

  // A quiet, emissive still on the return wall; the soundtrack keeps its own controls.
  const screen = new T.Group(); screen.position.set(-3.15, 2.48, -4.56); screen.rotation.y = Math.PI; root.add(screen)
  screen.userData.action = 'screen'; clicks.push(screen)
  box(screen, 0, 0, 0, 4.92, 2.84, .15, material('#181d1c',{metalness:.5,roughness:.33}), .055)
  const screenMat = new T.MeshBasicMaterial({color:'#ffffff',toneMapped:false});materials.add(screenMat)
  const screenGeo = new T.PlaneGeometry(4.68, 2.63);geometries.add(screenGeo)
  const display = new T.Mesh(screenGeo, screenMat); display.position.z = .082; screen.add(display)
  const still = new T.TextureLoader().load('/lab/central-perk/friends-cafe.jpg', loaded => {
    if (disposed) return
    const image = loaded.image as HTMLImageElement
    const fitted = tex((c,w,h)=>{c.fillStyle='#090b0c';c.fillRect(0,0,w,h);const scale=Math.min(w/image.width,h/image.height);const iw=image.width*scale,ih=image.height*scale;c.drawImage(image,(w-iw)/2,(h-ih)/2,iw,ih)},1280,720)
    screenMat.map = fitted; screenMat.needsUpdate = true
  }, undefined, () => { if (!disposed) onAssetError('The photo could not load. Please reload the scene.') });textures.push(still)
  const screenGlow = new T.PointLight('#efc799', .9, 4, 2); screenGlow.position.set(0, -.8, .7); screen.add(screenGlow)
  sphere(screen, 2.30, -1.36, .08, .018, .018, .01, material('#82ae97',{emissive:'#82ae97',emissiveIntensity:.4}))

  // Warm pools below pendants; the window spill is separate from the room's ambient fill.
  for (const [x, z, height] of [[-4, -1, 3.45], [-.4, 1.2, 3.75], [4.2, .2, 3.7]] as const) {
    cylinder(root, x, (height + 4.45) / 2, z, .015, .015, 4.45 - height, black, 8)
    cylinder(root, x, height, z, .13, .37, .22, brass)
    const bulb = material('#fff0c1', { emissive: '#ffd086', emissiveIntensity: .45 }); bulbs.push(bulb)
    sphere(root, x, height - .13, z, .17, .09, .17, bulb)
    const light = new T.PointLight('#ffd199', 7, 9, 2); light.position.set(x, height - .24, z); lights.push(light); root.add(light)
  }
  const spill = new T.SpotLight('#ffc486', 0, 13, .91, .95, 1.6)
  spill.position.set(5.50, 3.3, .9); spill.target.position.set(8.4, .04, .8)
  spill.castShadow = true; spill.shadow.mapSize.set(1024, 1024); spill.shadow.normalBias = .04; spill.shadow.bias = -.0004
  root.add(spill, spill.target)
  const doorwayLight = new T.PointLight('#ffc17d', 0, 5, 1.8); doorwayLight.position.set(4.5, 3.55, -2.6); root.add(doorwayLight)
  const neon = material('#f4c742', { emissive: '#ffc337', emissiveIntensity: 1.4 }); bulbs.push(neon)
  pipe(root, [[2.08, 3.16, -4.01], [2.14, 2.92, -4.01], [2.65, 2.92, -4.01], [2.74, 3.16, -4.01], [2.08, 3.16, -4.01]], .025, neon)
  pipe(root, [[2.3, 3.2, -4.01], [2.2, 3.38, -4.01], [2.37, 3.53, -4.01]], .018, neon)
  for (const x of [-1.02, .93]) {
    pipe(root, [[x, 3.48, -4], [x, 3.48, -3.75]], .025, brass)
    sphere(root, x, 3.45, -3.72, .15, .09, .14, cream)
  }
  // Close only the cutaway side outdoors; no invented central front entrance.
  box(front, -.025, 2.31, 4.70, 13.0, 4.62, .24, brick)
  box(front, -.025, 4.48, 4.70, 13.10, .22, .34, green)
  // The return wall is permanent; only the roof and viewing-side cutaway close outdoors.
  box(root, -1.60, 2.31, -4.43, 9.80, 4.62, .10, brick)
  box(root, -1.65, .26, -4.50, 9.68, .44, .14, green)
  box(root, -1.65, 4.28, -4.50, 9.68, .20, .17, green)
  for (const x of [-6.32, 3.08]) box(root, x, 2.19, -4.51, .16, 4.17, .18, green)
  polygon(roof, roomOutline.map(([x, z]) => [x * 1.025, z * 1.035]), 4.53, .22, green)
  polygon(roof, roomOutline.map(([x, z]) => [x * .974, z * .974]), 4.75, .055, material('#73776c'))
  for (let z = -3.8; z < 4.5; z += .66) box(roof, -1.60, 4.814, z, 9.1, .012, .018, material('#a7aaa1'))
  for (const x of [-4.3, -2.5]) { box(roof, x, 4.96, -2.2, 1.14, .26, .87, material('#aaa99a'), .03); for (let i = 0; i < 7; i++) box(roof, x - .45 + i * .15, 5.10, -2.2, .035, .014, .7, black) }
  polygon(snowCaps, roomOutline, 4.82, .10, material('#edf1ee'))
  // Two seasonal street trees, with weather extending across the whole miniature below.
  for (const [x, z] of [[7.30, 4.50], [4.0, -5.20]]) {
    cylinder(root, x, 0, z, .57, .52, .32, stone)
    cylinder(root, x, 1.35, z, .07, .14, 2.5, walnut)
    for (let i = 0; i < 10; i++) {
      const a = i * 2.4, r = .5 + rng() * .22, y = 1.9 + rng() * 1.1
      pipe(root, [[x, 1.6, z], [x + Math.cos(a) * r, y, z + Math.sin(a) * r]], .027, walnut)
      const foliage = material('#69815a')
      for (let j = 0; j < 12; j++) {
        const spread = j * 2.4, reach = Math.sqrt(j) * .15
        const leaf = sphere(root, x + Math.cos(a) * r + Math.cos(spread) * reach, y + rng() * .4, z + Math.sin(a) * r + Math.sin(spread) * reach, .13, .035, .24, foliage)
        leaf.rotation.set(rng() * .8, spread, rng() * .6); leaves.push(leaf)
      }
    }
  }
  // Instanced, solid silhouettes keep seasonal detail inexpensive at miniature scale.
  const maple = new T.Shape()
  const outline = [[0,.55],[.10,.27],[.24,.34],[.21,.12],[.43,.20],[.35,-.02],[.48,-.10],[.15,-.24],[.035,-.20],[.035,-.43],[-.035,-.43],[-.035,-.20],[-.15,-.24],[-.48,-.10],[-.35,-.02],[-.43,.20],[-.21,.12],[-.24,.34],[-.10,.27]]
  outline.forEach(([x,y],i)=>i?maple.lineTo(x,y):maple.moveTo(x,y));maple.closePath()
  const mapleGeo = new T.ExtrudeGeometry(maple,{depth:.014,bevelEnabled:false});geometries.add(mapleGeo)
  const flakeShapes:T.Shape[]=[]
  function crystalBranch(ax:number,ay:number,bx:number,by:number,width:number){
    const dx=bx-ax,dy=by-ay,len=Math.hypot(dx,dy),nx=-dy/len*width,ny=dx/len*width
    const shape=new T.Shape();shape.moveTo(ax+nx,ay+ny);shape.lineTo(bx+nx,by+ny);shape.lineTo(bx-nx,by-ny);shape.lineTo(ax-nx,ay-ny);shape.closePath();flakeShapes.push(shape)
  }
  for(let i=0;i<6;i++){
    const a=i*Math.PI/3,dx=Math.cos(a),dy=Math.sin(a)
    crystalBranch(0,0,dx*.5,dy*.5,.015)
    for(const r of [.25,.39])for(const side of [-1,1])crystalBranch(dx*r,dy*r,dx*(r-.11)-dy*side*.12,dy*(r-.11)+dx*side*.12,.012)
  }
  const flakeGeo=new T.ExtrudeGeometry(flakeShapes,{depth:.012,bevelEnabled:false});geometries.add(flakeGeo)
  const autumn = new T.InstancedMesh(mapleGeo,material('#ffffff',{roughness:.8,side:T.DoubleSide}),420)
  const winter = new T.InstancedMesh(flakeGeo,material('#e9f4ff',{roughness:.3,emissive:'#9fbcd0',emissiveIntensity:.25}),1000)
  const fallen = new T.InstancedMesh(mapleGeo,autumn.material,230)
  const seasonalMeshes=[autumn,winter,fallen];seasonalMeshes.forEach(m=>{m.frustumCulled=false;root.add(m)})
  const dummy = new T.Object3D(), autumnColors=['#b84723','#db7532','#e1a341','#933b28']
  const underRoof = (x: number, z: number) => x >= -6.4 && x <= 6.35 && z >= -4.3 && z <= 4.7 && (x <= 3.25 || z >= -4.3 + (x - 3.25) * 2.05 / 3.1)
  // Stratified positions cover the cafe, its roof, all four sides and the road evenly.
  const flakes=Array.from({length:winter.count},(_,i)=>({x:-7.5+(i%10+rng())*2.1,y:rng()*9.5,z:-7.8+(Math.floor(i/10)%10+rng())*1.44,phase:rng()*Math.PI*2,scale:.12+rng()*.18}))
  for(let i=0;i<autumn.count;i++)autumn.setColorAt(i,new T.Color(autumnColors[i%4]))
  for(let i=0;i<fallen.count;i++){
    let x: number, z: number
    do { x=-7.3+rng()*20.4;z=-7.5+rng()*13.8 } while(underRoof(x,z))
    const onBase = x>=-6.8 && x<=8.1 && z>=-7.1 && z<=5.6 && (x<=5.4 || z>=-7.1+(x-5.4)*3/2.7)
    dummy.position.set(x,x>=8.1 && x<=12.9 && z>=-7.8 && z<=6.3 ? -.255 : onBase ? .015 : -.49,z)
    dummy.rotation.set(-Math.PI/2,rng()*.18,rng()*6.28);dummy.scale.setScalar(.18+rng()*.22);dummy.updateMatrix();fallen.setMatrixAt(i,dummy.matrix);fallen.setColorAt(i,new T.Color(autumnColors[i%4]))
  }
  const streetSnow=new T.Group();root.add(streetSnow)
  for(let i=0;i<22;i++){const z=-6.5+i*.55;sphere(streetSnow,8.25,-.18,z,.27,.10,.38,material('#e7ecea'))}
  for(const [x,z] of [[7.3,4.5],[4,-5.2]])cylinder(streetSnow,x,.18,z,.52,.52,.05,material('#eef1eb'))
  const steam = new T.Group(); hotCup.add(steam)
  const steamMat = material('#eee8d7', { transparent: true, opacity: .30, depthWrite: false })
  for (let i = 0; i < 7; i++) sphere(steam, 0, .30 + i * .09, 0, .035 + i * .012, .06, .035 + i * .012, steamMat)
  steam.visible = false
  let steamUntil = 0, brewUntil = 0
  const coffeeStream = cylinder(machine, -.35, .20, .32, .008, .008, .20, material('#4b2715')); coffeeStream.visible = false
  let currentSeason: CafeSeason = 'summer', currentTime: CafeTime = 'day', currentView: CafeView = 'outside'
  const atlas = new T.TextureLoader().load('/lab/central-perk/material-atlas.png', loaded => {
    if (disposed) return
    // Atlas quadrants are sampled through UV transforms (no duplicated bitmap assets).
    for (const [texture, x, y] of [[liberty, 0, .5], [redPoster, .5, .5], [rugMap, 0, 0], [floralMap, .5, 0]] as const) {
      // Immutable GPU texture storage must be recreated when swapping to a differently sized image.
      texture.dispose()
      texture.source.data = loaded.image; texture.repeat.set(.498, .498); texture.offset.set(x + .001, y + .001); texture.needsUpdate = true
    }
  }, undefined, () => { /* Procedural textures keep the room usable if the atlas cannot load. */ })
  textures.push(atlas)
  function setEnvironment(time: CafeTime, season: CafeSeason, view: CafeView) {
    currentSeason = season; currentTime = time; currentView = view
    shell.visible = view === 'outside'; snowCaps.visible = season === 'winter' && view === 'outside'
    awnings.visible = view === 'outside'
    leaves.forEach((leaf, i) => {
      leaf.visible = season !== 'winter' && (season !== 'autumn' || i % 3 !== 0)
      leaf.scale.set(season === 'summer' ? .19 : .13, .045, season === 'summer' ? .34 : .24)
      // Each branch shares one material across twelve leaves.
      const branch = Math.floor(i / 12)
      ;(leaf.material as T.MeshStandardMaterial).color.set(season === 'spring' ? (branch % 3 ? '#8fbb61' : '#b1ce78') : season === 'autumn' ? (branch % 2 ? '#b56d36' : '#c3a24e') : (branch % 2 ? '#427949' : '#67963f'))
    })
    autumn.visible = fallen.visible = season === 'autumn'
    winter.visible = streetSnow.visible = season === 'winter'
  }
  return {
    root, clicks, setEnvironment,
    trigger(action: string, now: number) { if (action === 'slots') slotsUntil = now + 3.2; if (action === 'cup') steamUntil = now + 5; if (action === 'machine') { brewUntil = now + 4; steamUntil = now + 6 } },
    update(now: number, dt: number, playing = false) {
      const warmth = currentTime === 'day' ? 0 : currentTime === 'dusk' ? .65 : 1
      lights.forEach(l => { l.intensity = T.MathUtils.damp(l.intensity, 5 + warmth * 29, 3, dt) })
      bulbs.forEach(m => { m.emissiveIntensity = T.MathUtils.damp(m.emissiveIntensity, .5 + warmth * 3.3, 3, dt) })
      windowLights.forEach(m => { m.emissiveIntensity = T.MathUtils.damp(m.emissiveIntensity, warmth * .5, 3, dt) })
      spill.intensity = T.MathUtils.damp(spill.intensity, warmth * 34, 3, dt)
      doorwayLight.intensity = T.MathUtils.damp(doorwayLight.intensity, warmth * 14, 3, dt)
      if (playing) record.rotation.y -= dt * 3.49
      arm.rotation.y = T.MathUtils.damp(arm.rotation.y, playing ? -.43 : .09, 4, dt)
      arm.rotation.x = T.MathUtils.damp(arm.rotation.x, playing ? 0 : -.15, 4, dt)
      playLed.emissiveIntensity = playing ? 2.2 : .15
      steam.visible = now < steamUntil
      steam.children.forEach((m, i) => { m.position.x = Math.sin(now * 2 + i * .7) * .045; m.position.y = .28 + ((now * .16 + i * .09) % .7) })
      coffeeStream.visible = now < brewUntil
      strumArm.rotation.x = -.65 + Math.sin(now * 7) * .13
      phoebe.rotation.z = Math.sin(now * 1.8) * .017
      slotLevers.forEach(lever=>{lever.rotation.x=T.MathUtils.damp(lever.rotation.x,slotsUntil-now>2.5?.9:0,8,dt)})
      slotReels.forEach(reels=>reels.forEach((map,i)=>{
        if(now<slotsUntil-i*.25)map.offset.y=(map.offset.y+dt*(1.8+i*.35))%1
        else map.offset.y=T.MathUtils.damp(map.offset.y,Math.round(map.offset.y*6)/6,12,dt)
      }))
      if(autumn.visible||winter.visible){
        const mesh=currentSeason==='winter'?winter:autumn
        for(let i=0;i<mesh.count;i++){
          const f=flakes[i],x=f.x+Math.sin(now*.6+f.phase)*.38,z=f.z+Math.sin(now*.3+f.phase)*.44
          // Outside, flakes land at the visible roof; the open cutaway shows the full weather volume.
          const floor = underRoof(x,z) ? (currentView==='outside' ? 4.94 : .12) : -.24
          f.y-=dt*(currentSeason==='winter'?.48:.83);if(f.y<floor)f.y=9.5+rng()*.4
          dummy.position.set(x,f.y,z)
          dummy.rotation.set(now*.7+f.phase,now*.4+f.phase,now*.5+f.phase);dummy.scale.setScalar(currentSeason==='winter'?f.scale:f.scale*1.4);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix)
        }
        mesh.instanceMatrix.needsUpdate=true
      }
    },
    dispose() { disposed = true; porsche.dispose(); seasonalMeshes.forEach(m=>m.dispose()); spill.shadow.dispose(); geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); textures.forEach(t => t.dispose()) },
  }
}
