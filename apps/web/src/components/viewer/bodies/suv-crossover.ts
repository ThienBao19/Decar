import * as THREE from 'three'
import type { SlotMap } from '@decar/shared'
import { bodyMat, glassMat, trimMat, chromeMat, plasticMat, buildHeadlightRect, addWheels } from './shared'

const WB = 1.45

export function buildBody(color = 0x3d5a73): THREE.Group {
  const car = new THREE.Group()
  const mat = bodyMat(color)
  car.add(mesh(new THREE.BoxGeometry(1.92, 0.54, 4.64), mat, 0, 0.56, 0))
  car.add(mesh(new THREE.BoxGeometry(1.86, 0.22, 4.44), mat, 0, 0.88, -0.06))
  car.add(mesh(new THREE.BoxGeometry(1.70, 0.74, 2.52), mat, 0, 1.22, -0.28))
  car.add(mesh(new THREE.BoxGeometry(1.62, 0.10, 2.32), mat, 0, 1.62, -0.30))
  for (const sx of [-0.80, 0.80] as const) car.add(mesh(new THREE.BoxGeometry(0.042,0.052,1.96),plasticMat,sx,1.68,-0.32))
  const ws = mesh(new THREE.BoxGeometry(1.56, 0.66, 0.07), glassMat, 0, 1.24, 0.99)
  ws.rotation.x = 0.50; car.add(ws)
  const rg = mesh(new THREE.BoxGeometry(1.50, 0.56, 0.06), glassMat, 0, 1.20, -1.54)
  rg.rotation.x = -0.40; car.add(rg)
  for (const sx of [-0.86, 0.86] as const) {
    car.add(mesh(new THREE.BoxGeometry(0.06, 0.46, 1.08), glassMat, sx, 1.22, 0.14))
    car.add(mesh(new THREE.BoxGeometry(0.06, 0.40, 0.58), glassMat, sx, 1.17, -0.96))
  }
  const sunMat = new THREE.MeshStandardMaterial({ color: 0x0d1520, transparent: true, opacity: 0.80 })
  car.add(mesh(new THREE.BoxGeometry(1.24, 0.04, 1.52), sunMat, 0, 1.68, -0.22))
  for (const [sx, sz] of [[-0.97,1.45],[0.97,1.45],[-0.97,-1.45],[0.97,-1.45]] as const) {
    const arch = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.068, 10, 28, Math.PI), plasticMat)
    arch.rotation.z = Math.PI / 2; arch.position.set(sx, 0.48, sz); car.add(arch)
  }
  for (const sx of [-0.97, 0.97] as const) car.add(mesh(new THREE.BoxGeometry(0.088, 0.22, 3.58), plasticMat, sx, 0.34, 0))
  car.add(mesh(new THREE.BoxGeometry(1.92, 0.28, 0.15), plasticMat, 0, 0.38, 2.82))
  car.add(mesh(new THREE.BoxGeometry(1.16, 0.24, 0.10), trimMat, 0, 0.66, 2.84))
  for (let i = 0; i < 3; i++) car.add(mesh(new THREE.BoxGeometry(1.10, 0.025, 0.06), chromeMat, 0, 0.58+i*0.07, 2.86))
  for (const sx of [-0.68, 0.68] as const) {
    const hl = buildHeadlightRect(0.32, 0.18); hl.position.set(sx, 0.74, 2.76); car.add(hl)
  }
  car.add(mesh(new THREE.BoxGeometry(1.92, 0.30, 0.15), plasticMat, 0, 0.40, -2.38))
  car.add(mesh(new THREE.BoxGeometry(1.88, 0.86, 0.10), mat, 0, 0.94, -2.36))
  const tlMat = new THREE.MeshStandardMaterial({ color: 0xdd1111, emissive: 0xdd1111, emissiveIntensity: 0.65 })
  car.add(mesh(new THREE.BoxGeometry(1.94, 0.062, 0.04), tlMat, 0, 1.35, -2.35))
  const tipMat = new THREE.MeshStandardMaterial({ color: 0x666666, metalness: 0.88, roughness: 0.18 })
  for (const sx of [-0.24, 0.24] as const) {
    const t = mesh(new THREE.CylinderGeometry(0.037, 0.044, 0.11, 12), tipMat, sx, 0.28, -2.44)
    t.rotation.x = Math.PI / 2; t.userData.isExhaust = true; car.add(t)
  }
  for (const sx of [-0.98, 0.98] as const) car.add(mesh(new THREE.BoxGeometry(0.088,0.082,0.18),mat,sx,1.00,0.80))
  addWheels(car,[{x:-0.97,y:0.38,z:WB},{x:0.97,y:0.38,z:WB},{x:-0.97,y:0.38,z:-WB},{x:0.97,y:0.38,z:-WB}],0.37,0.22)
  car.userData.bodyMaterial = mat
  return car
}

export function getSlotPositions(): SlotMap {
  return {
    wheel_FL:{x:-0.97,y:0.38,z:WB}, wheel_FR:{x:0.97,y:0.38,z:WB},
    wheel_RL:{x:-0.97,y:0.38,z:-WB}, wheel_RR:{x:0.97,y:0.38,z:-WB},
    front_bumper:{x:0,y:0.40,z:2.88}, rear_bumper:{x:0,y:0.40,z:-2.44},
    spoiler:{x:0,y:1.44,z:-2.24}, side_skirt_L:{x:-0.97,y:0.34,z:0}, side_skirt_R:{x:0.97,y:0.34,z:0},
    hood:{x:0,y:0.98,z:1.80}, exhaust_L:{x:-0.24,y:0.28,z:-2.46}, exhaust_R:{x:0.24,y:0.28,z:-2.46},
    headlight_L:{x:-0.68,y:0.74,z:2.78}, headlight_R:{x:0.68,y:0.74,z:2.78},
  }
}

function mesh(geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number): THREE.Mesh {
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); return m
}
