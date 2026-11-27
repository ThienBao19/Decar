import { describe, it, expect } from 'vitest'
import * as THREE from 'three'

import { axleFor, findWheelRig, updateWheelRig, yawToFaceZ } from './wheel-rig'

const CORNER_POS: Record<string, [number, number, number]> = {
  FL: [0.8, 0.35, 1.4], FR: [-0.8, 0.35, 1.4], RL: [0.8, 0.35, -1.4], RR: [-0.8, 0.35, -1.4],
}

// A +z-forward car whose wheels are 0.7 m across
function car(withBrakes = true): THREE.Group {
  const root = new THREE.Group()
  for (const [corner, pos] of Object.entries(CORNER_POS)) {
    const wheel = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.7, 0.7))
    wheel.name = `wheel_${corner}`
    wheel.position.set(...pos)
    root.add(wheel)
    if (withBrakes) {
      const brake = new THREE.Object3D()
      brake.name = `brake_${corner}`
      brake.position.set(...pos)
      root.add(brake)
    }
  }
  root.updateMatrixWorld(true)
  return root
}

describe('yawToFaceZ', () => {
  it('returns a yaw that turns each forward axis onto +z', () => {
    const axes = { '+z': [0, 0, 1], '-z': [0, 0, -1], '+x': [1, 0, 0], '-x': [-1, 0, 0] } as const
    for (const [forward, v] of Object.entries(axes)) {
      const turned = new THREE.Vector3(...v).applyAxisAngle(new THREE.Vector3(0, 1, 0), yawToFaceZ(forward as '+z'))
      expect(turned.distanceTo(new THREE.Vector3(0, 0, 1))).toBeLessThan(1e-9)
    }
  })
})

describe('axleFor', () => {
  it('returns the left side of the car', () => {
    expect(axleFor('+z').toArray()).toEqual([1, 0, 0])
    expect(axleFor('+x').distanceTo(new THREE.Vector3(0, 0, -1))).toBeLessThan(1e-9)
  })
})

describe('findWheelRig', () => {
  it('returns null when a wheel is missing', () => {
    const root = car()
    root.remove(root.getObjectByName('wheel_RR')!)
    expect(findWheelRig(root, '+z')).toBeNull()
  })

  it('finds wheels and brakes and measures the radius in world units', () => {
    const rig = findWheelRig(car(), '+z')!
    expect(rig.parts).toHaveLength(8)
    expect(rig.radius).toBeCloseTo(0.35)
  })
})

describe('updateWheelRig', () => {
  it('rolls the tyre top forward when driving forward', () => {
    const rig = updateWheelRig(findWheelRig(car(false), '+z')!, 0.35 * (Math.PI / 2), 0, 1)
    const wheel = rig.parts[0]!.node
    const top = new THREE.Vector3(0, 1, 0).applyQuaternion(wheel.quaternion)
    expect(top.z).toBeCloseTo(1)
    expect(rig.spin).toBeCloseTo(Math.PI / 2)
  })

  it('steers only the front corners, to the left for a positive angle', () => {
    const rig = updateWheelRig(findWheelRig(car(), '+z')!, 0, 0.4, 1 / 60)
    const facing = (name: string) =>
      new THREE.Vector3(0, 0, 1).applyQuaternion(rig.parts.find((p) => p.node.name === name)!.node.quaternion)
    expect(facing('wheel_FL').x).toBeCloseTo(Math.sin(0.4))
    expect(facing('brake_FR').x).toBeCloseTo(Math.sin(0.4))
    expect(facing('wheel_RL').x).toBeCloseTo(0)
  })

  it('never spins a brake', () => {
    const rig = updateWheelRig(findWheelRig(car(), '+z')!, 20, 0, 0.1)
    const brake = rig.parts.find((p) => p.node.name === 'brake_RL')!.node
    expect(brake.quaternion.angleTo(new THREE.Quaternion())).toBeCloseTo(0)
  })
})
