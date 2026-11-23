import * as THREE from 'three'

import type { StudioConfig } from '@/lib/model-registry'

export type ViewName = 'front34' | 'side' | 'rear34' | 'front'

export const VIEWS: { name: ViewName; label: string }[] = [
  { name: 'front34', label: 'Front 3/4' },
  { name: 'side', label: 'Side' },
  { name: 'rear34', label: 'Rear 3/4' },
  { name: 'front', label: 'Front' },
]

const FORWARD: Record<StudioConfig['forward'], THREE.Vector3> = {
  '+x': new THREE.Vector3(1, 0, 0),
  '-x': new THREE.Vector3(-1, 0, 0),
  '+z': new THREE.Vector3(0, 0, 1),
  '-z': new THREE.Vector3(0, 0, -1),
}

export interface CameraPose {
  position: THREE.Vector3
  target: THREE.Vector3
}

// Poses scale with the car so every model is framed the same way
export function poseFor(view: ViewName, size: THREE.Vector3, forward: StudioConfig['forward']): CameraPose {
  const f = FORWARD[forward]
  const r = new THREE.Vector3().crossVectors(f, new THREE.Vector3(0, 1, 0)).normalize()
  const length = Math.max(size.x, size.z)
  const d = length * 1.6
  const target = new THREE.Vector3(0, size.y * 0.42, 0)
  const at = (fw: number, side: number, height: number) =>
    new THREE.Vector3().addScaledVector(f, d * fw).addScaledVector(r, d * side).setY(height)
  const positions: Record<ViewName, THREE.Vector3> = {
    front34: at(0.78, -0.68, size.y * 1.05),
    side: at(0, -1.05, size.y * 0.85),
    rear34: at(-0.78, -0.68, size.y * 1.2),
    front: at(1.05, 0, size.y * 0.8),
  }
  return { position: positions[view], target }
}

// Eases the camera toward a pose; returns true once it has arrived
export function stepToward(camera: THREE.Camera, controlsTarget: THREE.Vector3, pose: CameraPose, dt: number): boolean {
  const k = 1 - Math.exp(-dt * 5)
  camera.position.lerp(pose.position, k)
  controlsTarget.lerp(pose.target, k)
  return camera.position.distanceTo(pose.position) < 0.01
}