import * as THREE from 'three'

export interface DrivingState {
  speed: number
  maxSpeed: number
  steerAngle: number
  heading: number
  posX: number
  posZ: number
  isRevving: boolean
  revTimer: number
  nitroBoost: number
  isDrifting: boolean
  driftIntensity: number
}

const ACCEL_RATE = 12
const BRAKE_RATE = 18
const HANDBRAKE_RATE = 45
const FRICTION = 4
const MAX_SPEED = 60
const NITRO_MAX = 90
const STEER_RATE = 2.2
const STEER_RETURN = 4
const MAX_STEER = 0.6
const NITRO_ACCEL = 25
const REV_DURATION = 1.5
const DRIFT_SPEED_THRESHOLD = 18
const DRIFT_STEER_THRESHOLD = 0.28

export function createDrivingState(): DrivingState {
  return {
    speed: 0, maxSpeed: MAX_SPEED, steerAngle: 0,
    heading: 0, posX: 0, posZ: 0,
    isRevving: false, revTimer: 0, nitroBoost: 0,
    isDrifting: false, driftIntensity: 0,
  }
}

export interface KeyState {
  forward: boolean
  backward: boolean
  left: boolean
  right: boolean
  shift: boolean
  brake: boolean
}

export function createKeyState(): KeyState {
  return { forward: false, backward: false, left: false, right: false, shift: false, brake: false }
}

export function handleKeyDown(keys: KeyState, code: string): KeyState {
  return {
    ...keys,
    forward: keys.forward || code === 'ArrowUp' || code === 'KeyW',
    backward: keys.backward || code === 'ArrowDown' || code === 'KeyS',
    left: keys.left || code === 'ArrowLeft' || code === 'KeyA',
    right: keys.right || code === 'ArrowRight' || code === 'KeyD',
    shift: keys.shift || code === 'ShiftLeft' || code === 'ShiftRight',
    brake: keys.brake || code === 'Space',
  }
}

export function handleKeyUp(keys: KeyState, code: string): KeyState {
  return {
    ...keys,
    forward: keys.forward && code !== 'ArrowUp' && code !== 'KeyW',
    backward: keys.backward && code !== 'ArrowDown' && code !== 'KeyS',
    left: keys.left && code !== 'ArrowLeft' && code !== 'KeyA',
    right: keys.right && code !== 'ArrowRight' && code !== 'KeyD',
    shift: keys.shift && code !== 'ShiftLeft' && code !== 'ShiftRight',
    brake: keys.brake && code !== 'Space',
  }
}

export function updateDriving(state: DrivingState, keys: KeyState, dt: number): DrivingState {
  const effectiveMax = keys.shift ? NITRO_MAX : MAX_SPEED

  // Nitro / Rev
  const nitroBoost = keys.shift && Math.abs(state.speed) > 2
    ? Math.min(1, state.nitroBoost + dt * 2)
    : Math.max(0, state.nitroBoost - dt * 3)
  const isRevving = keys.shift && Math.abs(state.speed) > 2 ? true : state.revTimer > 0
  const revTimer = isRevving && !keys.shift ? Math.max(0, state.revTimer - dt) : (keys.shift ? REV_DURATION : state.revTimer)

  // Speed — handbrake (Space) = rapid decel
  let speed = state.speed
  if (keys.forward) {
    speed = Math.min(effectiveMax, speed + (keys.shift ? NITRO_ACCEL : ACCEL_RATE) * dt)
  } else if (keys.backward) {
    speed = Math.max(-MAX_SPEED * 0.3, speed - BRAKE_RATE * dt)
  } else if (keys.brake) {
    speed = speed > 0 ? Math.max(0, speed - HANDBRAKE_RATE * dt) : Math.min(0, speed + HANDBRAKE_RATE * dt)
  } else {
    if (speed > 0.1) speed = Math.max(0, speed - FRICTION * dt)
    else if (speed < -0.1) speed = Math.min(0, speed + FRICTION * dt)
    else speed = 0
  }

  // Steering
  const steerInput = (keys.left ? 1 : 0) - (keys.right ? 1 : 0)
  let steerAngle = state.steerAngle
  if (steerInput !== 0) {
    steerAngle = clamp(steerAngle + steerInput * STEER_RATE * dt, -MAX_STEER, MAX_STEER)
  } else if (Math.abs(steerAngle) > 0.01) {
    const dir = steerAngle > 0 ? -1 : 1
    steerAngle = Math.abs(steerAngle + dir * STEER_RETURN * dt) < 0.02 ? 0 : steerAngle + dir * STEER_RETURN * dt
  }

  // Movement
  const speedFactor = speed * dt
  const turnRate = steerAngle * (speed / MAX_SPEED) * 1.8
  const heading = Math.abs(speedFactor) > 0.001 ? state.heading + turnRate * dt : state.heading
  const posX = Math.abs(speedFactor) > 0.001 ? state.posX + Math.sin(heading) * speedFactor : state.posX
  const posZ = Math.abs(speedFactor) > 0.001 ? state.posZ + Math.cos(heading) * speedFactor : state.posZ

  // Drift detection
  const handbrakeSlide = keys.brake && Math.abs(speed) > 10 && Math.abs(steerAngle) > 0.2
  const naturalDrift = Math.abs(speed) > DRIFT_SPEED_THRESHOLD && Math.abs(steerAngle) > DRIFT_STEER_THRESHOLD
  const isDrifting = handbrakeSlide || naturalDrift
  const driftIntensity = isDrifting ? Math.min(1, Math.abs(steerAngle) / MAX_STEER * (Math.abs(speed) / MAX_SPEED)) : 0

  return {
    speed, maxSpeed: effectiveMax, steerAngle, heading, posX, posZ,
    isRevving, revTimer, nitroBoost, isDrifting, driftIntensity,
  }
}

export function applyToCarGroup(carGroup: THREE.Group, state: DrivingState, dt: number): void {
  carGroup.position.set(state.posX, 0, state.posZ)
  carGroup.rotation.set(0, state.heading, 0)

  const wheels = carGroup.userData.wheels as THREE.Group[] | undefined
  if (!wheels) return
  const spin = state.speed * dt * 3
  for (const w of wheels) {
    w.rotation.set(w.rotation.x + spin, w.rotation.y, 0)
  }
  if (wheels[0]) wheels[0].rotation.set(wheels[0].rotation.x, state.steerAngle * 0.5, 0)
  if (wheels[1]) wheels[1].rotation.set(wheels[1].rotation.x, state.steerAngle * 0.5, 0)
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
  const targetPos = new THREE.Vector3(
    state.posX - Math.sin(state.heading) * dist,
    height,
    state.posZ - Math.cos(state.heading) * dist,
  )
  const lookTarget = new THREE.Vector3(
    state.posX + Math.sin(state.heading) * 4,
    1.0,
    state.posZ + Math.cos(state.heading) * 4,
  )
  const lerpFactor = 1 - Math.exp(-3 * dt)
  const camPos = currentPos.clone().lerp(targetPos, lerpFactor)
  const camLook = currentLook.clone().lerp(lookTarget, lerpFactor)
  camera.position.copy(camPos)
  camera.lookAt(camLook)
  return { camPos, camLook }
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val))
}
