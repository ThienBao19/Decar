import * as THREE from 'three'
import type { SlotMap } from '@decar/shared'
import { bodyMat, glassMat, trimMat, chromeMat, plasticMat, buildHeadlightRect, addWheels } from './shared'

const WB = 1.50

export function buildBody(color = 0x1a1a2e): THREE.Group {
  const car = new THREE.Group()
  const mat = bodyMat(color)
  // Smooth lower body (no engine bump)
  car.add(mesh(new THREE.BoxGeometry(1.84, 0.42, 4.82), mat, 0, 0.48, 0))
  car.add(mesh(new THREE.BoxGeometry(1.80, 0.20, 4.65), mat, 0, 0.74, 0))
  // Low flat hood (no engine)
  car.add(mesh(new THREE.BoxGeometry(1.78, 0.18, 1.30), mat, 0, 0.72, 1.78))
  // Cabin (5-door hatch, tall-ish)
  car.add(mesh(new THREE.BoxGeometry(1.66, 0.66, 2.40), mat, 0, 1.06, -0.10))
  // Fastback roof sweeping to hatch
  car.add(mesh(new THREE.BoxGeometry(1.58, 0.10, 2.20), mat, 0, 1.40, -0.12))
  // Fastback rear slope
  const slope = mesh(new THREE.BoxGeometry(1.58, 0.40, 0.55), mat, 0, 1.22, -1.38)
  slope.rotation.x = 0.55; car.add(slope)
  // Windshield (very raked)
  const ws = mesh(new THREE.BoxGeometry(1.54, 0.62, 0.07), glassMat, 0, 1.08, 0.92)
  ws.rotation.x = 0.55; car.add(ws)
  // Hatch glass
  const hg = mesh(new THREE.BoxGeometry(1.48, 0.54, 0.06), glassMat, 0, 1.16, -1.38)
  hg.rotation.x = -0.55; car.add(hg)
  // Side windows
  for (const sx of [-0.83, 0.83] as const) {
    car.add(mesh(new THREE.BoxGeometry(0.06, 0.44, 1.05), glassMat, sx, 1.08, 0.18))
    car.add(mesh(new THREE.BoxGeometry(0.06, 0.40, 0.70), glassMat, sx, 1.04, -0.78))
  }
  // Panoramic glass roof
  const panMat = new THREE.MeshStandardMaterial({ color: 0x0a1520, transparent: true, opacity: 0.78 })
  car.add(mesh(new THREE.BoxGeometry(1.30, 0.04, 1.72), panMat, 0, 1.46, -0.04))
  // Aero front (no grille needed - EV)
  car.add(mesh(new THREE.BoxGeometry(1.84, 0.24, 0.14), plasticMat, 0, 0.36, 2.48))
  // Frunk lid panel
  car.add(mesh(new THREE.BoxGeometry(1.60, 0.04, 0.10), chromeMat, 0, 0.82, 2.48))
  // Thin LED headlights
  for (const sx of [-0.62, 0.62] as const) {
    const hl = buildHeadlightRect(0.50, 0.07, 0xaaddff); hl.position.set(sx, 0.74, 2.46); car.add(hl)
  }
  // Rear bumper
  car.add(mesh(new THREE.BoxGeometry(1.84, 0.26, 0.14), plasticMat, 0, 0.36, -2.48))
  // Full-width LED bar (EV style)
  const ledMat = new THREE.MeshStandardMaterial({ color: 0xee2222, emissive: 0xee2222, emissiveIntensity: 0.70 })
  car.add(mesh(new THREE.BoxGeometry(1.80, 0.055, 0.04), ledMat, 0, 0.96, -2.45))
  // No exhaust (EV) — charge port instead
  const portMat = new THREE.MeshStandardMaterial({ color: 0x00aaff, emissive: 0x005599, emissiveIntensity: 0.55 })
  const port = mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.04, 12), portMat, -0.93, 0.74, 1.85)
  port.rotation.z = Math.PI / 2; car.add(port)
  // Aero side skirts (flush)
  for (const sx of [-0.93, 0.93] as const) car.add(mesh(new THREE.BoxGeometry(0.06, 0.10, 3.72), trimMat, sx, 0.24, 0))
  for (const sx of [-0.98, 0.98] as const) car.add(mesh(new THREE.BoxGeometry(0.082, 0.072, 0.16), mat, sx, 0.94, 0.76))
  addWheels(car,[{x:-0.93,y:0.34,z:WB},{x:0.93,y:0.34,z:WB},{x:-0.93,y:0.34,z:-WB},{x:0.93,y:0.34,z:-WB}],0.34,0.20)
  car.userData.bodyMaterial = mat
  return car
}

export function getSlotPositions(): SlotMap {
  return {
    wheel_FL:{x:-0.93,y:0.34,z:WB}, wheel_FR:{x:0.93,y:0.34,z:WB},
    wheel_RL:{x:-0.93,y:0.34,z:-WB}, wheel_RR:{x:0.93,y:0.34,z:-WB},
    front_bumper:{x:0,y:0.36,z:2.54}, rear_bumper:{x:0,y:0.36,z:-2.54},
    spoiler:{x:0,y:1.08,z:-2.10}, side_skirt_L:{x:-0.93,y:0.24,z:0}, side_skirt_R:{x:0.93,y:0.24,z:0},
    hood:{x:0,y:0.82,z:1.78}, exhaust_L:{x:-0.20,y:0.26,z:-2.50}, exhaust_R:{x:0.20,y:0.26,z:-2.50},
    headlight_L:{x:-0.62,y:0.74,z:2.48}, headlight_R:{x:0.62,y:0.74,z:2.48},
  }
}

function mesh(geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number): THREE.Mesh {
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); return m
}
