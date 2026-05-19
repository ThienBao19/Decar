import * as THREE from 'three'
import type { SlotMap } from '@decar/shared'
import { bodyMat, glassMat, trimMat, chromeMat, plasticMat, buildHeadlightRect, buildTaillightRect, addWheels } from './shared'

const WB = 1.52

export function buildBody(color = 0x8b1a1a): THREE.Group {
  const car = new THREE.Group()
  const mat = bodyMat(color)
  car.add(mesh(new THREE.BoxGeometry(1.94, 0.44, 4.88), mat, 0, 0.48, 0))
  car.add(mesh(new THREE.BoxGeometry(1.90, 0.18, 4.65), mat, 0, 0.74, 0))
  // Long hood
  car.add(mesh(new THREE.BoxGeometry(1.88, 0.24, 1.68), mat, 0, 0.80, 1.68))
  // Hood scoop
  car.add(mesh(new THREE.BoxGeometry(0.34, 0.06, 0.80), trimMat, 0, 0.94, 1.60))
  // Short trunk deck
  car.add(mesh(new THREE.BoxGeometry(1.86, 0.22, 0.82), mat, 0, 0.76, -1.98))
  // Low fastback cabin
  car.add(mesh(new THREE.BoxGeometry(1.62, 0.56, 1.85), mat, 0, 1.00, -0.22))
  car.add(mesh(new THREE.BoxGeometry(1.54, 0.09, 1.62), mat, 0, 1.32, -0.26))
  const ws = mesh(new THREE.BoxGeometry(1.50, 0.52, 0.07), glassMat, 0, 1.02, 0.72)
  ws.rotation.x = 0.58; car.add(ws)
  const rg = mesh(new THREE.BoxGeometry(1.44, 0.46, 0.06), glassMat, 0, 0.99, -1.14)
  rg.rotation.x = -0.50; car.add(rg)
  for (const sx of [-0.82, 0.82] as const) car.add(mesh(new THREE.BoxGeometry(0.06, 0.38, 1.44), glassMat, sx, 1.00, -0.10))
  // Wide fenders
  for (const [sx, sz] of [[-1.00,1.52],[1.00,1.52],[-1.02,-1.52],[1.02,-1.52]] as const) {
    car.add(mesh(new THREE.BoxGeometry(0.14, 0.36, 1.10), mat, sx, 0.52, sz))
  }
  // Front bumper
  car.add(mesh(new THREE.BoxGeometry(1.94, 0.30, 0.14), plasticMat, 0, 0.36, 2.52))
  // Grille
  car.add(mesh(new THREE.BoxGeometry(0.88, 0.22, 0.10), trimMat, 0, 0.50, 2.52))
  for (const sx of [-0.56, 0.56] as const) {
    const hl = buildHeadlightRect(0.40, 0.18); hl.position.set(sx, 0.60, 2.50); car.add(hl)
  }
  car.add(mesh(new THREE.BoxGeometry(1.94, 0.30, 0.14), plasticMat, 0, 0.34, -2.52))
  for (const sx of [-0.56, 0.56] as const) {
    const tl = buildTaillightRect(0.44, 0.20); tl.position.set(sx, 0.58, -2.51); car.add(tl)
  }
  // Quad exhaust
  const tipMat = new THREE.MeshStandardMaterial({ color: 0x666666, metalness: 0.88, roughness: 0.18 })
  for (const sx of [-0.38, -0.18, 0.18, 0.38] as const) {
    const t = mesh(new THREE.CylinderGeometry(0.038, 0.046, 0.12, 12), tipMat, sx, 0.26, -2.54)
    t.rotation.x = Math.PI / 2; t.userData.isExhaust = true; car.add(t)
  }
  // Side skirts
  for (const sx of [-0.97, 0.97] as const) car.add(mesh(new THREE.BoxGeometry(0.09, 0.14, 3.75), plasticMat, sx, 0.26, 0))
  for (const sx of [-0.98, 0.98] as const) car.add(mesh(new THREE.BoxGeometry(0.09, 0.08, 0.18), mat, sx, 0.94, 0.68))
  // Rear spoiler
  car.add(mesh(new THREE.BoxGeometry(1.62, 0.06, 0.26), trimMat, 0, 0.72, -2.24))
  addWheels(car,[{x:-1.00,y:0.36,z:WB},{x:1.00,y:0.36,z:WB},{x:-1.02,y:0.36,z:-WB},{x:1.02,y:0.36,z:-WB}],0.36,0.24)
  car.userData.bodyMaterial = mat
  return car
}

export function getSlotPositions(): SlotMap {
  return {
    wheel_FL:{x:-1.00,y:0.36,z:WB}, wheel_FR:{x:1.00,y:0.36,z:WB},
    wheel_RL:{x:-1.02,y:0.36,z:-WB}, wheel_RR:{x:1.02,y:0.36,z:-WB},
    front_bumper:{x:0,y:0.36,z:2.58}, rear_bumper:{x:0,y:0.34,z:-2.58},
    spoiler:{x:0,y:0.78,z:-2.30}, side_skirt_L:{x:-0.97,y:0.26,z:0}, side_skirt_R:{x:0.97,y:0.26,z:0},
    hood:{x:0,y:0.96,z:1.68}, exhaust_L:{x:-0.28,y:0.26,z:-2.56}, exhaust_R:{x:0.28,y:0.26,z:-2.56},
    headlight_L:{x:-0.56,y:0.60,z:2.52}, headlight_R:{x:0.56,y:0.60,z:2.52},
  }
}

function mesh(geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number): THREE.Mesh {
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); return m
}
