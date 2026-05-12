import * as THREE from 'three'

export interface DrivingState {
  speed: number
  maxSpeed: number
  acceleration: number
  braking: number
  steerAngle: number
  heading: number
  posX: number
  posZ: number
  isRevving: boolean
  revTimer: number
  nitroBoost: number
}

const ACCEL_RATE = 12
const BRAKE_RATE = 18
const FRICTION = 4
const MAX_SPEED = 60
const NITRO_MAX_SPEED = 90
const STEER_RATE = 2.2
const STEER_RETURN = 4
const MAX_STEER = 0.6
const NITRO_ACCEL = 25
const REV_DURATION = 1.5

export function createDrivingState(): DrivingState {
  return {
    speed: 0,
    maxSpeed: MAX_SPEED,
    acceleration: 0,
    braking: 0,
    steerAngle: 0,
    heading: 0,
    posX: 0,
    posZ: 0,
    isRevving: false,
    revTimer: 0,
    nitroBoost: 0,
  }
}

export interface KeyState {
  forward: boolean
  backward: boolean
  left: boolean
  right: boolean
  shift: boolean
}

export function createKeyState(): KeyState {
  return { forward: false, backward: false, left: false, right: false, shift: false }
}

export function handleKeyDown(keys: KeyState, code: string): void {
  if (code === 'ArrowUp' || code === 'KeyW') keys.forward = true
  if (code === 'ArrowDown' || code === 'KeyS') keys.backward = true
  if (code === 'ArrowLeft' || code === 'KeyA') keys.left = true
  if (code === 'ArrowRight' || code === 'KeyD') keys.right = true
  if (code === 'ShiftLeft' || code === 'ShiftRight') keys.shift = true
}

export function handleKeyUp(keys: KeyState, code: string): void {
  if (code === 'ArrowUp' || code === 'KeyW') keys.forward = false
  if (code === 'ArrowDown' || code === 'KeyS') keys.backward = false
  if (code === 'ArrowLeft' || code === 'KeyA') keys.left = false
  if (code === 'ArrowRight' || code === 'KeyD') keys.right = false
  if (code === 'ShiftLeft' || code === 'ShiftRight') keys.shift = false
}

export function updateDriving(state: DrivingState, keys: KeyState, dt: number): DrivingState {
  const next = { ...state }
  const effectiveMax = keys.shift ? NITRO_MAX_SPEED : MAX_SPEED

  // Nitro / Rev
  if (keys.shift && Math.abs(state.speed) > 2) {
    next.isRevving = true
    next.revTimer = REV_DURATION
    next.nitroBoost = Math.min(1, state.nitroBoost + dt * 2)
  } else {
    next.nitroBoost = Math.max(0, state.nitroBoost - dt * 3)
    if (state.revTimer > 0) {
      next.revTimer = state.revTimer - dt
      if (next.revTimer <= 0) next.isRevving = false
    }
  }

  // Acceleration
  if (keys.forward) {
    const accel = keys.shift ? NITRO_ACCEL : ACCEL_RATE
    next.speed = Math.min(effectiveMax, state.speed + accel * dt)
  } else if (keys.backward) {
    next.speed = Math.max(-MAX_SPEED * 0.3, state.speed - BRAKE_RATE * dt)
  } else {
    // Friction
    if (state.speed > 0.1) {
      next.speed = Math.max(0, state.speed - FRICTION * dt)
    } else if (state.speed < -0.1) {
      next.speed = Math.min(0, state.speed + FRICTION * dt)
    } else {
      next.speed = 0
    }
  }

  // Steering
  const steerInput = (keys.left ? 1 : 0) - (keys.right ? 1 : 0)
  if (steerInput !== 0) {
    next.steerAngle = clamp(state.steerAngle + steerInput * STEER_RATE * dt, -MAX_STEER, MAX_STEER)
  } else {
    if (Math.abs(state.steerAngle) > 0.01) {
      const returnDir = state.steerAngle > 0 ? -1 : 1
      next.steerAngle = state.steerAngle + returnDir * STEER_RETURN * dt
      if (Math.abs(next.steerAngle) < 0.02) next.steerAngle = 0
    }
  }

  // Movement
  const speedFactor = state.speed * dt
  if (Math.abs(speedFactor) > 0.001) {
    const turnRate = state.steerAngle * (state.speed / MAX_SPEED) * 1.8
    next.heading = state.heading + turnRate * dt
    next.posX = state.posX + Math.sin(next.heading) * speedFactor
    next.posZ = state.posZ + Math.cos(next.heading) * speedFactor
  }

  return next
}

export function applyToCarGroup(
  carGroup: THREE.Group,
  state: DrivingState,
  dt: number,
): void {
  carGroup.position.set(state.posX, 0, state.posZ)
  carGroup.rotation.y = state.heading

  // Wheel rotation
  const wheels = carGroup.userData.wheels as THREE.Group[] | undefined
  if (wheels) {
    const wheelSpin = state.speed * dt * 3
    for (const w of wheels) {
      w.rotation.x += wheelSpin
    }
    // Front wheel steering visual
    if (wheels[0]) wheels[0].rotation.y = state.steerAngle * 0.5
    if (wheels[1]) wheels[1].rotation.y = state.steerAngle * 0.5
  }
}

export function updateChaseCamera(
  camera: THREE.PerspectiveCamera,
  state: DrivingState,
  currentPos: THREE.Vector3,
  currentLook: THREE.Vector3,
  dt: number,
): { camPos: THREE.Vector3; camLook: THREE.Vector3 } {
  const dist = 8 + Math.abs(state.speed) * 0.04
  const height = 3 + Math.abs(state.speed) * 0.015

  const targetX = state.posX - Math.sin(state.heading) * dist
  const targetZ = state.posZ - Math.cos(state.heading) * dist

  const targetPos = new THREE.Vector3(targetX, height, targetZ)
  const lookTarget = new THREE.Vector3(
    state.posX + Math.sin(state.heading) * 4,
    1.0,
    state.posZ + Math.cos(state.heading) * 4,
  )

  const lerpFactor = 1 - Math.exp(-3 * dt)
  const newPos = currentPos.clone().lerp(targetPos, lerpFactor)
  const newLook = currentLook.clone().lerp(lookTarget, lerpFactor)

  camera.position.copy(newPos)
  camera.lookAt(newLook)

  return { camPos: newPos, camLook: newLook }
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val))
}