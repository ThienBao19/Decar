import * as THREE from 'three'

import type { StudioConfig } from '@/lib/model-registry'

// Moves the wheel_* / brake_* nodes of the parts contract (docs/models.md).
// The drive scene's car faces +z; the left side is +x.

export const CORNERS = ['FL', 'FR', 'RL', 'RR'] as const
export type Corner = (typeof CORNERS)[number]

// Real cars turn the front wheels about 35 degrees at full lock; the drive model's input tops out at 0.6
const STEER_RATIO = 1

const YAW: Record<StudioConfig['forward'], number> = { '+z': 0, '-z': Math.PI, '+x': -Math.PI / 2, '-x': Math.PI / 2 }

// Turns a model whose nose points along `forward` so it faces +z
export function yawToFaceZ(forward: StudioConfig['forward']): number {
  return YAW[forward]
}

// The axle in model space: the car's left, which is up x forward
export function axleFor(forward: StudioConfig['forward']): THREE.Vector3 {
  const f = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), -YAW[forward])
  return new THREE.Vector3(0, 1, 0).cross(f).normalize()
}

interface Part {
  node: THREE.Object3D
  corner: Corner
  isWheel: boolean
}

export interface WheelRig {
  parts: Part[]
  axle: THREE.Vector3
  // Rolling radius in metres
  radius: number
  spin: number
}

const isFront = (corner: Corner) => corner === 'FL' || corner === 'FR'

// Call after the car is scaled to its real length, so world units are metres
export function findWheelRig(root: THREE.Object3D, forward: StudioConfig['forward']): WheelRig | null {
  const parts: Part[] = []
  for (const corner of CORNERS) {
    const wheel = root.getObjectByName(`wheel_${corner}`)
    if (!wheel) return null
    parts.push({ node: wheel, corner, isWheel: true })
    const brake = root.getObjectByName(`brake_${corner}`)
    if (brake) parts.push({ node: brake, corner, isWheel: false })
  }
  const frontLeft = parts[0]!.node
  const size = new THREE.Box3().setFromObject(frontLeft).getSize(new THREE.Vector3())
  return { parts, axle: axleFor(forward), radius: Math.max(size.y, 0.01) / 2, spin: 0 }
}

// Rolling: the wheel turns speed / radius radians per second about the axle (forward
// motion turns the top of the tyre forward). Front corners also yaw by the steer angle.
export function updateWheelRig(rig: WheelRig, speed: number, steerAngle: number, dt: number): WheelRig {
  const spin = (rig.spin + (speed * dt) / rig.radius) % (Math.PI * 2)
  const steer = steerAngle * STEER_RATIO
  const spinQ = new THREE.Quaternion().setFromAxisAngle(rig.axle, spin)
  const up = new THREE.Vector3(0, 1, 0)
  for (const p of rig.parts) {
    const yawQ = new THREE.Quaternion().setFromAxisAngle(up, isFront(p.corner) ? steer : 0)
    p.node.quaternion.copy(p.isWheel ? yawQ.multiply(spinQ) : yawQ)
  }
  return { ...rig, spin }
}