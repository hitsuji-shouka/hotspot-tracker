import * as T from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

// Cayman geometry from the user's Dyad reference, reduced offline for this scene.
export function createPorsche(onError: (message: string) => void) {
  const root = new T.Group(); root.name = 'Porsche 718 Cayman'; root.userData.action = 'car'
  const materials = new Set<T.Material>(), geometries = new Set<T.BufferGeometry>()
  let disposed = false
  const standard = (color: string, roughness: number, metalness = 0) => {
    const m = new T.MeshStandardMaterial({ color, roughness, metalness }); materials.add(m); return m
  }
  const paint = new T.MeshPhysicalMaterial({ color: '#b8bac1', metalness: .48, roughness: .24, clearcoat: 1, clearcoatRoughness: .16 }); materials.add(paint)
  const glass = new T.MeshPhysicalMaterial({ color: '#b6cbd2', metalness: .05, roughness: .09, clearcoat: 1, transparent: true, opacity: .28, depthWrite: false }); materials.add(glass)
  const lampGlass = glass.clone(); lampGlass.opacity = .16; lampGlass.color.set('#f2f4f4'); materials.add(lampGlass)
  const chrome = standard('#b9c2c9', .23, 1), alloy = standard('#c6cbd0', .3, .95), dark = standard('#171c20', .68), rubber = standard('#17191b', .86), interior = standard('#34332f', .85), brakes = standard('#b32222', .38, .3), red = standard('#8b1722', .25, .2), gold = standard('#bc9650', .4, .7)
  red.emissive.set('#7c090a'); red.emissiveIntensity = .25
  new GLTFLoader().load('/lab/central-perk/porsche/cayman.glb', gltf => {
    const originalMaterials = new Set<T.Material>()
    gltf.scene.traverse(object => {
      if (!(object instanceof T.Mesh)) return
      geometries.add(object.geometry)
      for (const m of Array.isArray(object.material) ? object.material : [object.material]) originalMaterials.add(m)
      const name = object.name.toLowerCase()
      object.material = /e_paint/.test(name) ? paint
        : /window_side|glass_clear/.test(name) ? glass
        : /lights_rear_red|lights_rear_inner/.test(name) ? red
        : /e_car_glass/.test(name) ? lampGlass
        : /caliper/.test(name) ? brakes
        : /tyres|rubber|wipers|gum/.test(name) ? rubber
        : /alloy_inner|plastic|black|carbon|blocker|body$/.test(name) ? dark
        : /alloy/.test(name) ? alloy
        : /porsche_badge/.test(name) ? gold
        : /chrome|metal|silver|mirror|brake_disc|bolts|xeon/.test(name) ? chrome
        : interior
      object.castShadow = !/glass|window|^i_/.test(name)
      object.receiveShadow = true
    })
    originalMaterials.forEach(m => m.dispose())
    if (disposed) { geometries.forEach(g => g.dispose()); return }
    gltf.scene.rotation.y = Math.PI // Source nose points +Z; park facing the corner.
    gltf.scene.updateMatrixWorld(true)
    const bounds = new T.Box3().setFromObject(gltf.scene), size = bounds.getSize(new T.Vector3()), center = bounds.getCenter(new T.Vector3())
    const scale = 4.5 / size.z
    gltf.scene.scale.multiplyScalar(scale)
    gltf.scene.position.set(-center.x * scale, -bounds.min.y * scale, -center.z * scale)
    root.add(gltf.scene)
  }, undefined, () => { if (!disposed) onError('The Porsche could not load. Please reload the scene.') })
  return { root, dispose() { disposed = true; geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()) } }
}
