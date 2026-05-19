import * as THREE from 'three'
import type { SlotMap } from '@decar/shared'
import { bodyMat, glassMat, trimMat, chromeMat, plasticMat, buildHeadlightRect, buildTaillightRect, addWheels } from './shared'

const WB = 1.48

export function buildBody(color = 0x1a3a5c): THREE.Group {
  const car = new THREE.Group()
  const mat = bodyMat(color)
  car.add(mesh(new THREE.BoxGeometry(1.82, 0.46, 4.76), mat, 0, 0.50, 0))
  car.add(mesh(new THREE.BoxGeometry(1.78, 0.30, 1.20), mat, 0, 0.68, 1.72))
  car.add(mesh(new THREE.BoxGeometry(1.78, 0.28, 0.90), mat, 0, 0.64, -1.90))
  car.add(mesh(new THREE.BoxGeometry(1.76, 0.18, 4.55), mat, 0, 0.78, 0))
  car.add(mesh(new THREE.BoxGeometry(1.62, 0.64, 2.18), mat, 0, 1.08, -0.14))
  car.add(mesh(new THREE.BoxGeometry(1.54, 0.10, 1.92), mat, 0, 1.43, -0.16))
  const ws = mesh(new THREE.BoxGeometry(1.50, 0.60, 0.07), glassMat, 0, 1.10, 0.88)
  ws.rotation.x = 0.52; car.add(ws)
  const rg = mesh(new THREE.BoxGeometry(1.44, 0.52, 0.06), glassMat, 0, 1.06, -1.18)
  rg.rotation.x = -0.38; car.add(rg)
  for (const sx of [-0.82, 0.82] as const) {
    car.add(mesh(new THREE.BoxGeometry(0.06, 0.42, 1.02), glassMat, sx, 1.10, 0.20))
    car.add(mesh(new THREE.BoxGeometry(0.06, 0.38, 0.78), glassMat, sx, 1.06, -0.74))
  }
  car.add(mesh(new THREE.BoxGeometry(1.84, 0.26, 0.14), plasticMat, 0, 0.38, 2.44))
  car.add(mesh(new THREE.BoxGeometry(0.96, 0.18, 0.08), trimMat, 0, 0.54, 2.44))
  for (const sx of [-0.58, 0.58] as const) {
    const hl = buildHeadlightRect(0.36, 0.16); hl.position.set(sx, 0.62, 2.42); car.add(hl)
  }
  car.add(mesh(new THREE.BoxGeometry(1.60, 0.04, 0.06), chromeMat, 0, 0.28, 2.44))
  car.add(mesh(new THREE.BoxGeometry(1.84, 0.26, 0.14), plasticMat, 0, 0.38, -2.44))
  for (const sx of [-0.54, 0.54] as const) {
    const tl = buildTaillightRect(0.38, 0.14); tl.position.set(sx, 0.60, -2.43); car.add(tl)
  }
  const tipMat = new THREE.MeshStandardMaterial({ color: 0x666666, metalness: 0.88, roughness: 0.18 })
  for (const sx of [-0.22, 0.22] as const) {
    const t = mesh(new THREE.CylinderGeometry(0.036, 0.042, 0.11, 12), tipMat, sx, 0.26, -2.46)
    t.rotation.x = Math.PI / 2; t.userData.isExhaust = true; car.add(t)
  }
  for (const sx of [-0.92, 0.92] as const) {
    car.add(mesh(new THREE.BoxGeometry(0.08, 0.07, 0.16), mat, sx, 0.96, 0.72))
    car.add(mesh(new THREE.BoxGeometry(0.07, 0.12, 3.60), plasticMat, sx, 0.26, 0))
  }
  addWheels(car,[{x:-0.92,y:0.34,z:WB},{x:0.92,y:0.34,z:WB},{x:-0.92,y:0.34,z:-WB},{x:0.92,y:0.34,z:-WB}],0.34,0.21)
  car.userData.bodyMaterial = mat
  return car
}

export function getSlotPositions(): SlotMap {
  return {
    wheel_FL:{x:-0.92,y:0.34,z:WB}, wheel_FR:{x:0.92,y:0.34,z:WB},
    wheel_RL:{x:-0.92,y:0.34,z:-WB}, wheel_RR:{x:0.92,y:0.34,z:-WB},
    front_bumper:{x:0,y:0.38,z:2.50}, rear_bumper:{x:0,y:0.38,z:-2.50},
    spoiler:{x:0,y:0.70,z:-2.18}, side_skirt_L:{x:-0.92,y:0.26,z:0}, side_skirt_R:{x:0.92,y:0.26,z:0},
    hood:{x:0,y:0.84,z:1.72}, exhaust_L:{x:-0.22,y:0.26,z:-2.48}, exhaust_R:{x:0.22,y:0.26,z:-2.48},
    headlight_L:{x:-0.58,y:0.62,z:2.44}, headlight_R:{x:0.58,y:0.62,z:2.44},
  }
}

function mesh(geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number): THREE.Mesh {
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); return m
}
