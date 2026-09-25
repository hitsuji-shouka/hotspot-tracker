import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

const VOYAGE_MS = 24000
export default function HomeSpace() {
  const canvasHost = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const host = canvasHost.current
    if (!host) return
    let renderer: THREE.WebGLRenderer
    try { renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' }) }
    catch { return }
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5))
    renderer.setClearColor(0x000000, 0)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.35
    host.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(38, 1, .1, 100)
    camera.position.z = 12
    scene.add(new THREE.AmbientLight(0xb1c0d6, 1.15))
    const key = new THREE.DirectionalLight(0xffdfb4, 3.1)
    key.position.set(4, 6, 8)
    scene.add(key)
    const rim = new THREE.DirectionalLight(0x82b9ff, 1.8)
    rim.position.set(-5, -2, -4)
    scene.add(rim)

    const craft = new THREE.Group()
    scene.add(craft)
    let ship: THREE.Object3D | null = null
    let disposed = false
    new GLTFLoader().load('/space/journey-ring-ship.glb', gltf => {
      if (disposed) return
      ship = gltf.scene
      const box = new THREE.Box3().setFromObject(ship)
      ship.position.sub(box.getCenter(new THREE.Vector3()))
      craft.add(ship)
    })

    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches
    let elapsed = VOYAGE_MS * .5
    let last = performance.now()
    let frame = 0
    let onScreen = true
    let visible = !document.hidden
    const resize = () => {
      const width = host.clientWidth
      const height = host.clientHeight
      if (!width || !height) return
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.setSize(width, height)
    }
    const onVisibility = () => { visible = !document.hidden && onScreen; last = performance.now() }
    const observer = new IntersectionObserver(([entry]) => { onScreen = entry.isIntersecting; onVisibility() }, { rootMargin: '100px' })
    observer.observe(host)
    const animate = (now: number) => {
      frame = requestAnimationFrame(animate)
      const delta = Math.min(now - last, 80)
      last = now
      if (!visible) return
      if (!reducedMotion) elapsed += delta

      const progress = (elapsed % VOYAGE_MS) / VOYAGE_MS
      const travel = progress
      const mobile = host.clientWidth < 800
      const height = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z
      const width = height * camera.aspect
      const x = THREE.MathUtils.lerp(mobile ? .33 : .46, mobile ? .96 : .94, travel)
      const y = THREE.MathUtils.lerp(mobile ? .72 : .64, mobile ? .35 : .28, travel)
      craft.position.set((x - .5) * width, (.5 - y) * height, 0)
      craft.scale.setScalar((.12 + .36 * Math.sin(Math.PI * travel)) * (mobile ? .72 : 1))
      craft.rotation.set(.55, -.25 + travel * .18, -.18 + travel * .24)
      if (ship) ship.rotation.z = elapsed * .000055
      const fadeIn = THREE.MathUtils.smoothstep(progress, .02, .14)
      const fadeOut = 1 - THREE.MathUtils.smoothstep(progress, mobile ? .86 : .82, .995)
      renderer.domElement.style.opacity = String(fadeIn * fadeOut)
      renderer.render(scene, camera)
    }
    resize()
    frame = requestAnimationFrame(animate)
    window.addEventListener('resize', resize)
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      disposed = true
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', resize)
      document.removeEventListener('visibilitychange', onVisibility)
      observer.disconnect()
      scene.traverse(object => {
        if (!(object instanceof THREE.Mesh)) return
        object.geometry.dispose()
        const mats = Array.isArray(object.material) ? object.material : [object.material]
        mats.forEach(material => material.dispose())
      })
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [])

  return <div className="home-journey-backdrop" aria-hidden="true">
    <div className="home-space-art" />
    <div ref={canvasHost} className="home-journey-canvas" />
  </div>
}
