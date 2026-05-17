import * as THREE from 'three'
import type { PartDef } from './parts'
const mat = (c: number, m = 0.5, r = 0.5) => new THREE.MeshStandardMaterial({ color: c, metalness: m, roughness: r })
export function buildCarBody(col = 0x1a2a4a): THREE.Group {
  const g = new THREE.Group()
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.5, 4.5), mat(col, 0.6, 0.3))
  chassis.position.set(0, 0.25, 0)
  g.add(chassis)
  const cab = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.45, 2.3), mat(col, 0.6, 0.3))
  cab.position.set(0, 0.78, -0.15)
  g.add(cab)
  const glass = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.38, 2.1), mat(0x88aabb, 0.1, 0.05))
  glass.position.set(0, 0.78, -0.15)
  g.add(glass)
  return g
}
export function buildWheel(def: PartDef): THREE.Group {
  const { r = 0.38, spokes = 8 } = def.params
  const g = new THREE.Group()
  const tire = new THREE.Mesh(new THREE.TorusGeometry(r, r * 0.3, 8, 24), mat(0x111111, 0, 0.95))
  tire.rotation.set(0, 0, Math.PI / 2)
  g.add(tire)
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.7, r * 0.7, 0.18, 24), mat(def.color, 0.85, 0.15))
  g.add(rim)
  const n = Math.round(spokes)
  for (let i = 0; i < n; i++) {
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(r * 0.08, r * 0.72, 0.14), mat(def.color, 0.8, 0.2))
    spoke.rotation.set(0, 0, (i / n) * Math.PI * 2)
    g.add(spoke)
  }
  return g
}
export function buildSpoiler(def: PartDef): THREE.Group {
  const g = new THREE.Group()
  const { h = 0, w = 1.4 } = def.params
  if (!h) return g
  const wing = new THREE.Mesh(new THREE.BoxGeometry(w, h * 0.13, h * 0.42), mat(def.color, 0.4, 0.6))
  wing.position.set(0, h, 0)
  g.add(wing)
  ;[-w * 0.42, w * 0.42].forEach((x) => {
    const s = new THREE.Mesh(new THREE.BoxGeometry(0.06, h, 0.08), mat(def.color, 0.4, 0.6))
    s.position.set(x, h * 0.5, 0)
    g.add(s)
  })
  return g
}
export function buildPart(d: PartDef): THREE.Group {
  return d['type'] === 'wheel' ? buildWheel(d) : buildSpoiler(d)
}
