// Build the local miniature asset from the user-referenced Dyad Cayman geometry.
// Inputs and original manifest are retained under state/central-perk-reference.
import fs from 'node:fs'
import { createRequire } from 'node:module'
import { MeshoptSimplifier } from 'meshoptimizer'
const require = createRequire(import.meta.url)
const draco = await require('../state/central-perk-reference/draco_decoder.cjs')()
await MeshoptSimplifier.ready
const source = JSON.parse(fs.readFileSync('state/central-perk-reference/porsche_full.gltf'))
const binary = fs.readFileSync('state/central-perk-reference/porsche_full.bin')
const result = { asset: { version: '2.0', generator: 'Central Perk miniature preparation', extras: { source: 'https://dyadstudios.com/renderapp/porsche/' } }, scene: 0, scenes: [{ nodes: [] }], nodes: [], meshes: [], accessors: [], bufferViews: [], buffers: [] }
const chunks = []; let length = 0, original = 0, reduced = 0
function accessor(array, type, target, bounds) {
  const bytes = Buffer.from(array.buffer, array.byteOffset, array.byteLength)
  const view = result.bufferViews.length
  result.bufferViews.push({ buffer: 0, byteOffset: length, byteLength: bytes.length, target })
  chunks.push(bytes); length += bytes.length
  const id = result.accessors.length
  result.accessors.push({ bufferView: view, componentType: array instanceof Float32Array ? 5126 : 5125, count: array.length / (type === 'VEC3' ? 3 : 1), type, ...bounds })
  return id
}
for (const node of source.nodes) {
  if (node.mesh === undefined || /studio|window_darken/.test(node.name)) continue
  const primitive = source.meshes[node.mesh].primitives[0], compression = primitive.extensions.KHR_draco_mesh_compression
  const view = source.bufferViews[compression.bufferView], buffer = new draco.DecoderBuffer(), decoder = new draco.Decoder(), mesh = new draco.Mesh()
  const data = binary.subarray(view.byteOffset, view.byteOffset + view.byteLength)
  buffer.Init(data, data.length)
  const status = decoder.DecodeBufferToMesh(buffer, mesh)
  if (!status.ok()) throw new Error(`${node.name}: ${status.error_msg()}`)
  function attribute(name) {
    const values = new draco.DracoFloat32Array(), attribute = decoder.GetAttributeByUniqueId(mesh, compression.attributes[name])
    decoder.GetAttributeFloatForAllPoints(mesh, attribute, values)
    const array = Float32Array.from({ length: values.size() }, (_, i) => values.GetValue(i)); draco.destroy(values); return array
  }
  const positions = attribute('POSITION'), normals = attribute('NORMAL'), faces = new draco.DracoInt32Array(), indices = new Uint32Array(mesh.num_faces() * 3)
  for (let i = 0; i < mesh.num_faces(); i++) { decoder.GetFaceFromMesh(mesh, i, faces); for (let j = 0; j < 3; j++) indices[i * 3 + j] = faces.GetValue(j) }
  original += indices.length / 3
  const ratio = /e_paint|window_side/.test(node.name) ? .25 : .12
  const target = Math.min(indices.length, Math.max(90, Math.floor(indices.length * ratio / 3) * 3))
  const [simplified] = MeshoptSimplifier.simplifyWithAttributes(indices, positions, 3, normals, 3, [.2, .2, .2], null, target, .003)
  reduced += simplified.length / 3
  const [remap, count] = MeshoptSimplifier.compactMesh(simplified)
  const p = new Float32Array(count * 3), n = new Float32Array(count * 3)
  for (let i = 0; i < remap.length; i++) if (remap[i] !== 0xffffffff) { p.set(positions.subarray(i * 3, i * 3 + 3), remap[i] * 3); n.set(normals.subarray(i * 3, i * 3 + 3), remap[i] * 3) }
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity]
  for (let i = 0; i < p.length; i++) { min[i % 3] = Math.min(min[i % 3], p[i]); max[i % 3] = Math.max(max[i % 3], p[i]) }
  result.scenes[0].nodes.push(result.nodes.length)
  result.nodes.push({ ...node, mesh: result.meshes.length })
  result.meshes.push({ name: node.name, primitives: [{ attributes: { POSITION: accessor(p, 'VEC3', 34962, { min, max }), NORMAL: accessor(n, 'VEC3', 34962) }, indices: accessor(simplified, 'SCALAR', 34963) }] })
  draco.destroy(faces); draco.destroy(mesh); draco.destroy(decoder); draco.destroy(buffer)
}
result.buffers.push({ byteLength: length })
let json = Buffer.from(JSON.stringify(result)); json = Buffer.concat([json, Buffer.alloc((4 - json.length % 4) % 4, 32)])
const header = Buffer.alloc(20); header.writeUInt32LE(0x46546c67, 0); header.writeUInt32LE(2, 4); header.writeUInt32LE(28 + json.length + length, 8); header.writeUInt32LE(json.length, 12); header.writeUInt32LE(0x4e4f534a, 16)
const binHeader = Buffer.alloc(8); binHeader.writeUInt32LE(length); binHeader.writeUInt32LE(0x004e4942, 4)
fs.writeFileSync('public/lab/central-perk/porsche/cayman.glb', Buffer.concat([header, json, binHeader, ...chunks]))
console.log({ originalTriangles: original, reducedTriangles: reduced, bytes: 28 + json.length + length })
