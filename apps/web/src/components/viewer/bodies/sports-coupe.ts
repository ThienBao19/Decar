import * as THREE from 'three'
import type { SlotMap } from '@decar/shared'
import { bodyMat, glassMat, trimMat, plasticMat, buildHeadlightRect, buildTaillightRect, addWheels } from './shared'

const WB_F = 1.35
const WB_R = 1.35

export function buildBody(color = 0xc0c0c8): THREE.Group {
  const car = new THREE.Group()
  const mat = bodyMat(color)
  // Lower body (wide rear haunches)
  car.add(mesh(new THREE.BoxGeometry(1.85, 0.45, 4.50), mat, 0, 0.42, 0))
  // Front taper
  const front = mesh(new THREE.BoxGeometry(1.70, 0.30, 0.80), mat, 0, 0.35, 2.30)
  front.rotation.x = -0.15; car.add(front)
  // Rear engine bay (wider)
  car.add(mesh(new THREE.BoxGeometry(1.95, 0.50, 1.20), mat, 0, 0.50, -1.50))
  // Cabin
  car.add(mesh(new THREE.BoxGeometry(1.50, 0.50, 1.80), mat, 0, 0.88, -0.20))
  // Roof
  car.add(mesh(new THREE.BoxGeometry(1.40, 0.12, 1.40), mat, 0, 1.16, -0.30))
  // Windshield
  const ws = mesh(new THREE.BoxGeometry(1.38, 0.55, 0.08), glassMat, 0, 0.95, 0.70)
  ws.rotation.x = 0.55; car.add(ws)
  // Rear window
  const rw = mesh(new THREE.BoxGeometry(1.30, 0.45, 0.06), glassMat, 0, 0.90, -1.00)
  rw.rotation.x = -0.65; car.add(rw)
  // Side windows
  for (const sx of [-0.74, 0.74] as const) car.add(mesh(new THREE.BoxGeometry(0.06, 0.35, 1.30), glassMat, sx, 0.90, -0.10))
  // Rear fenders (wide)
  for (const sx of [-1.00, 1.00] as const) car.add(mesh(new THREE.BoxGeometry(0.20, 0.40, 1.40), mat, sx, 0.48, -1.40))
  // Front fenders
  for (const sx of [-0.92, 0.92] as const) car.add(mesh(new THREE.BoxGeometry(0.12, 0.35, 1.00), mat, sx, 0.42, 1.40))
  // Front bumper + splitter
  car.add(mesh(new THREE.BoxGeometry(1.75, 0.20, 0.15), trimMat, 0, 0.28, 2.55))
  car.add(mesh(new THREE.BoxGeometry(1.60, 0.04, 0.25), trimMat, 0, 0.18, 2.60))
  // Headlights
  for (const sx of [-0.60, 0.60] as const) {
    const hl = buildHeadlightRect(0.28, 0.16); hl.position.set(sx, 0.52, 2.50); car.add(hl)
  }
  // Rear bumper
  car.add(mesh(new THREE.BoxGeometry(1.90, 0.22, 0.12), trimMat, 0, 0.30, -2.28))
  // Tail light bar
  for (const sx of [-0.62, 0.62] as const) {
    const tl = buildTaillightRect(0.42, 0.10); tl.position.set(sx, 0.60, -2.26); car.add(tl)
  }
  const tlBar = new THREE.MeshStandardMaterial({ color: 0xcc1111, emissive: 0xcc1111, emissiveIntensity: 0.55 })
  car.add(mesh(new THREE.BoxGeometry(1.70, 0.07, 0.03), tlBar, 0, 0.60, -2.26))
  // Rear spoiler
  car.add(mesh(new THREE.BoxGeometry(1.50, 0.04, 0.20), trimMat, 0, 0.75, -2.05))
  // Exhaust tips
  const tipMat = new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.90, roughness: 0.20 })
  for (const sx of [-0.18, 0.18] as const) {
    const t = mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.12, 16), tipMat, sx, 0.22, -2.35)
    t.rotation.x = Math.PI / 2; t.userData.isExhaust = true; car.add(t)
  }
  // Side skirts
  for (const sx of [-0.93, 0.93] as const) car.add(mesh(new THREE.BoxGeometry(0.08, 0.12, 3.20), plasticMat, sx, 0.22, 0))
  // Mirrors
  for (const sx of [-0.96, 0.96] as const) car.add(mesh(new THREE.BoxGeometry(0.08, 0.06, 0.14), mat, sx, 0.72, 0.55))
  addWheels(car,[{x:-0.82,y:0.34,z:WB_F},{x:0.82,y:0.34,z:WB_F},{x:-0.88,y:0.34,z:-WB_R},{x:0.88,y:0.34,z:-WB_R}],0.34,0.22)
  car.userData.bodyMaterial = mat
  return car
}

export function getSlotPositions(): SlotMap {
  return {
    wheel_FL:{x:-0.82,y:0.34,z:WB_F}, wheel_FR:{x:0.82,y:0.34,z:WB_F},
    wheel_RL:{x:-0.88,y:0.34,z:-WB_R}, wheel_RR:{x:0.88,y:0.34,z:-WB_R},
    front_bumper:{x:0,y:0.28,z:2.62}, rear_bumper:{x:0,y:0.30,z:-2.34},
    spoiler:{x:0,y:0.80,z:-2.10}, side_skirt_L:{x:-0.93,y:0.22,z:0}, side_skirt_R:{x:0.93,y:0.22,z:0},
    hood:{x:0,y:0.72,z:1.50}, exhaust_L:{x:-0.18,y:0.22,z:-2.38}, exhaust_R:{x:0.18,y:0.22,z:-2.38},
    headlight_L:{x:-0.60,y:0.52,z:2.52}, headlight_R:{x:0.60,y:0.52,z:2.52},
  }
}

function mesh(geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number): THREE.Mesh {
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); return m
}
