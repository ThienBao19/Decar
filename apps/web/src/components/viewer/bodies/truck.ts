import * as THREE from 'three'
import type { SlotMap } from '@decar/shared'
import { bodyMat, glassMat, trimMat, chromeMat, plasticMat, buildHeadlightRect, buildTaillightRect, addWheels } from './shared'

const WB = 1.58

export function buildBody(color = 0x2e4a2e): THREE.Group {
  const car = new THREE.Group()
  const mat = bodyMat(color)
  // Cab lower
  car.add(mesh(new THREE.BoxGeometry(1.98, 0.62, 2.60), mat, 0, 0.62, 0.92))
  // Cab upper
  car.add(mesh(new THREE.BoxGeometry(1.90, 0.80, 2.38), mat, 0, 1.18, 0.80))
  car.add(mesh(new THREE.BoxGeometry(1.82, 0.10, 2.18), mat, 0, 1.62, 0.78))
  // Bed
  car.add(mesh(new THREE.BoxGeometry(1.96, 0.42, 2.10), mat, 0, 0.58, -1.44))
  // Bed walls
  car.add(mesh(new THREE.BoxGeometry(0.08, 0.45, 2.05), mat, -0.94, 0.80, -1.44))
  car.add(mesh(new THREE.BoxGeometry(0.08, 0.45, 2.05), mat,  0.94, 0.80, -1.44))
  car.add(mesh(new THREE.BoxGeometry(1.98, 0.45, 0.08), mat, 0, 0.80, -2.50))
  // Tailgate
  car.add(mesh(new THREE.BoxGeometry(1.90, 0.42, 0.08), mat, 0, 0.58, -0.42))
  // Front hood (high clearance)
  car.add(mesh(new THREE.BoxGeometry(1.94, 0.32, 0.80), mat, 0, 0.96, 1.98))
  // Windshield
  const ws = mesh(new THREE.BoxGeometry(1.78, 0.64, 0.07), glassMat, 0, 1.32, 1.56)
  ws.rotation.x = 0.46; car.add(ws)
  // Rear cab glass
  const rg = mesh(new THREE.BoxGeometry(1.66, 0.48, 0.06), glassMat, 0, 1.28, 0.04)
  rg.rotation.x = -0.10; car.add(rg)
  // Side windows
  for (const sx of [-0.96, 0.96] as const) {
    car.add(mesh(new THREE.BoxGeometry(0.06, 0.48, 1.08), glassMat, sx, 1.28, 0.92))
    car.add(mesh(new THREE.BoxGeometry(0.06, 0.38, 0.55), glassMat, sx, 1.22, 0.08))
  }
  // Front bumper (heavy duty)
  car.add(mesh(new THREE.BoxGeometry(1.98, 0.34, 0.18), trimMat, 0, 0.46, 2.42))
  car.add(mesh(new THREE.BoxGeometry(1.92, 0.08, 0.20), chromeMat, 0, 0.30, 2.42))
  // Grille (large, wide)
  car.add(mesh(new THREE.BoxGeometry(1.30, 0.28, 0.10), trimMat, 0, 0.74, 2.42))
  for (let i = 0; i < 4; i++) car.add(mesh(new THREE.BoxGeometry(1.24, 0.028, 0.06), chromeMat, 0, 0.62+i*0.07, 2.44))
  for (const sx of [-0.68, 0.68] as const) {
    const hl = buildHeadlightRect(0.36, 0.22); hl.position.set(sx, 0.84, 2.42); car.add(hl)
  }
  // Rear
  car.add(mesh(new THREE.BoxGeometry(1.96, 0.30, 0.14), plasticMat, 0, 0.40, -2.52))
  for (const sx of [-0.62, 0.62] as const) {
    const tl = buildTaillightRect(0.36, 0.40); tl.position.set(sx, 0.72, -2.51); car.add(tl)
  }
  // Dual exhaust
  const tipMat = new THREE.MeshStandardMaterial({ color: 0x666666, metalness: 0.88, roughness: 0.18 })
  for (const sx of [-0.30, 0.30] as const) {
    const t = mesh(new THREE.CylinderGeometry(0.042, 0.050, 0.12, 12), tipMat, sx, 0.32, -2.56)
    t.rotation.x = Math.PI / 2; t.userData.isExhaust = true; car.add(t)
  }
  // Running boards
  for (const sx of [-0.99, 0.99] as const) car.add(mesh(new THREE.BoxGeometry(0.14, 0.06, 2.10), trimMat, sx, 0.32, 0.80))
  // Tow hitch
  car.add(mesh(new THREE.BoxGeometry(0.10, 0.10, 0.24), chromeMat, 0, 0.38, -2.56))
  // Mirrors (large)
  for (const sx of [-1.04, 1.04] as const) car.add(mesh(new THREE.BoxGeometry(0.10, 0.10, 0.22), mat, sx, 1.12, 1.70))
  addWheels(car,[{x:-0.99,y:0.40,z:WB},{x:0.99,y:0.40,z:WB},{x:-0.99,y:0.40,z:-WB},{x:0.99,y:0.40,z:-WB}],0.40,0.26)
  car.userData.bodyMaterial = mat
  return car
}

export function getSlotPositions(): SlotMap {
  return {
    wheel_FL:{x:-0.99,y:0.40,z:WB}, wheel_FR:{x:0.99,y:0.40,z:WB},
    wheel_RL:{x:-0.99,y:0.40,z:-WB}, wheel_RR:{x:0.99,y:0.40,z:-WB},
    front_bumper:{x:0,y:0.46,z:2.48}, rear_bumper:{x:0,y:0.40,z:-2.58},
    spoiler:{x:0,y:1.72,z:0.60}, side_skirt_L:{x:-0.99,y:0.32,z:0.80}, side_skirt_R:{x:0.99,y:0.32,z:0.80},
    hood:{x:0,y:1.06,z:1.98}, exhaust_L:{x:-0.30,y:0.32,z:-2.58}, exhaust_R:{x:0.30,y:0.32,z:-2.58},
    headlight_L:{x:-0.68,y:0.84,z:2.44}, headlight_R:{x:0.68,y:0.84,z:2.44},
  }
}

function mesh(geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number): THREE.Mesh {
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); return m
}
