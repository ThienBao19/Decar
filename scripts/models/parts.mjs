// Naming contract for moving parts (docs/models.md, "Parts contract"). Sources often merge
// all four wheels into one mesh; this splits the matched primitives by corner into
// wheel_FL/FR/RL/RR (and brake_*) nodes at the scene root, each with its origin at the
// wheel centre and no rotation, so a viewer can spin a wheel about the car's lateral axis
// and steer the front corners about the vertical axis.
import { getBounds } from '@gltf-transform/core'

const UP = [0, 1, 0]
const FORWARD = { '+x': [1, 0, 0], '-x': [-1, 0, 0], '+z': [0, 0, 1], '-z': [0, 0, -1] }
export const CORNERS = ['FL', 'FR', 'RL', 'RR']

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]

// Facing forward with y up, the car's left is up x forward
export function axesFor(forward) {
  const f = FORWARD[forward]
  return { forward: f, left: cross(UP, f) }
}

export function cornerOf(point, center, axes) {
  const d = sub(point, center)
  return (dot(d, axes.forward) >= 0 ? 'F' : 'R') + (dot(d, axes.left) >= 0 ? 'L' : 'R')
}

function transformPoint(m, p) {
  return [
    m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12],
    m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13],
    m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14],
  ]
}

// Inverse-transpose of the upper 3x3, enough for normals and tangents
function normalMatrix(m) {
  const [a, b, c, d, e, f, g, h, i] = [m[0], m[1], m[2], m[4], m[5], m[6], m[8], m[9], m[10]]
  const det = a * (e * i - f * h) - d * (b * i - c * h) + g * (b * f - c * e)
  const inv = [
    (e * i - f * h) / det, (c * h - b * i) / det, (b * f - c * e) / det,
    (f * g - d * i) / det, (a * i - c * g) / det, (c * d - a * f) / det,
    (d * h - e * g) / det, (b * g - a * h) / det, (a * e - b * d) / det,
  ]
  return (v) => {
    const r = [
      inv[0] * v[0] + inv[1] * v[1] + inv[2] * v[2],
      inv[3] * v[0] + inv[4] * v[1] + inv[5] * v[2],
      inv[6] * v[0] + inv[7] * v[1] + inv[8] * v[2],
    ]
    const len = Math.hypot(...r) || 1
    return r.map((x) => x / len)
  }
}

const read = (accessor, i) => accessor.getElement(i, [])

function matchedPrimitives(doc, keys) {
  const out = []
  for (const node of doc.getRoot().listNodes()) {
    const mesh = node.getMesh()
    if (!mesh) continue
    for (const prim of mesh.listPrimitives()) {
      const name = prim.getMaterial()?.getName().toLowerCase() ?? ''
      if (keys.some((k) => name.includes(k.toLowerCase()))) out.push({ node, mesh, prim })
    }
  }
  return out
}

// Triangles of each matched primitive, grouped by the corner their centroid falls in
function groupByCorner(matches, center, axes) {
  const groups = Object.fromEntries(CORNERS.map((c) => [c, []]))
  for (const { node, prim } of matches) {
    if (prim.getMode() !== 4) throw new Error('parts: only triangle lists can be split')
    const m = node.getWorldMatrix()
    const pos = prim.getAttribute('POSITION')
    const world = Array.from({ length: pos.getCount() }, (_, i) => transformPoint(m, read(pos, i)))
    const indices = prim.getIndices()
    const count = indices ? indices.getCount() : pos.getCount()
    const index = (i) => (indices ? indices.getScalar(i) : i)
    const byCorner = Object.fromEntries(CORNERS.map((c) => [c, []]))
    for (let t = 0; t < count; t += 3) {
      const tri = [index(t), index(t + 1), index(t + 2)]
      const centroid = [0, 1, 2].map((k) => (world[tri[0]][k] + world[tri[1]][k] + world[tri[2]][k]) / 3)
      byCorner[cornerOf(centroid, center, axes)].push(...tri)
    }
    for (const c of CORNERS) if (byCorner[c].length) groups[c].push({ prim, world, matrix: m, tris: byCorner[c] })
  }
  return groups
}

function boundsCenter(pieces) {
  const min = [Infinity, Infinity, Infinity]
  const max = [-Infinity, -Infinity, -Infinity]
  for (const { world, tris } of pieces) {
    for (const i of tris) for (let k = 0; k < 3; k++) {
      min[k] = Math.min(min[k], world[i][k])
      max[k] = Math.max(max[k], world[i][k])
    }
  }
  return min.map((v, k) => (v + max[k]) / 2)
}

// A new primitive holding only these triangles, in world space relative to origin
function extract(doc, buffer, piece, origin) {
  const { prim, world, matrix, tris } = piece
  const remap = new Map()
  const order = []
  const indices = tris.map((i) => {
    if (!remap.has(i)) {
      remap.set(i, order.length)
      order.push(i)
    }
    return remap.get(i)
  })
  const toNormal = normalMatrix(matrix)
  const out = doc.createPrimitive().setMaterial(prim.getMaterial()).setMode(4)
  for (const semantic of prim.listSemantics()) {
    const src = prim.getAttribute(semantic)
    const size = src.getElementSize()
    const array = new Float32Array(order.length * size)
    order.forEach((i, n) => {
      let v = read(src, i)
      if (semantic === 'POSITION') v = sub(world[i], origin)
      else if (semantic === 'NORMAL') v = toNormal(v)
      else if (semantic === 'TANGENT') v = [...toNormal(v.slice(0, 3)), v[3]]
      array.set(v, n * size)
    })
    const accessor = doc.createAccessor().setType(src.getType()).setArray(array).setBuffer(buffer)
    out.setAttribute(semantic, accessor)
  }
  const IndexArray = order.length > 65535 ? Uint32Array : Uint16Array
  out.setIndices(doc.createAccessor().setType('SCALAR').setArray(new IndexArray(indices)).setBuffer(buffer))
  return out
}

function removeMatched(matches) {
  for (const { node, mesh, prim } of matches) {
    mesh.removePrimitive(prim)
    if (!mesh.listPrimitives().length) node.setMesh(null)
  }
}

export function splitParts(doc, manifest) {
  const parts = manifest.parts
  if (!parts) return
  const scene = doc.getRoot().getDefaultScene() ?? doc.getRoot().listScenes()[0]
  const bounds = getBounds(scene)
  const center = bounds.min.map((v, k) => (v + bounds.max[k]) / 2)
  const axes = axesFor(manifest.studio.forward)
  const buffer = doc.getRoot().listBuffers()[0]

  const wheels = matchedPrimitives(doc, parts.wheels)
  const wheelGroups = groupByCorner(wheels, center, axes)
  const wheelCenters = {}
  for (const c of CORNERS) {
    if (!wheelGroups[c].length) throw new Error(`${manifest.id}: parts.wheels has no geometry at corner ${c}`)
    wheelCenters[c] = boundsCenter(wheelGroups[c])
  }
  const brakes = parts.brakes ? matchedPrimitives(doc, parts.brakes) : []
  const brakeGroups = groupByCorner(brakes, center, axes)

  for (const [kind, groups] of [['wheel', wheelGroups], ['brake', brakeGroups]]) {
    for (const c of CORNERS) {
      if (!groups[c].length) continue
      // Brakes share the wheel's pivot so they steer with it
      const origin = wheelCenters[c]
      const mesh = doc.createMesh(`${kind}_${c}`)
      for (const piece of groups[c]) mesh.addPrimitive(extract(doc, buffer, piece, origin))
      scene.addChild(doc.createNode(`${kind}_${c}`).setMesh(mesh).setTranslation(origin))
    }
  }
  removeMatched([...wheels, ...brakes])
}