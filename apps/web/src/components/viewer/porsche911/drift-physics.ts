export interface DS {
  x: number; y: number; angle: number
  vx: number; vy: number; speed: number
  steer: number; driftAngle: number
  driftScore: number; isDrifting: boolean
  boost: number
}
export interface DK { fwd: boolean; back: boolean; left: boolean; right: boolean; boost: boolean; brake: boolean }
export const mkDS = (): DS => ({ x: 0, y: 0, angle: 0, vx: 0, vy: 0, speed: 0, steer: 0, driftAngle: 0, driftScore: 0, isDrifting: false, boost: 0 })
export const mkDK = (): DK => ({ fwd: false, back: false, left: false, right: false, boost: false, brake: false })
export function kDown(k: DK, code: string): DK {
  return { ...k, fwd: k.fwd || code === 'KeyW' || code === 'ArrowUp', back: k.back || code === 'KeyS' || code === 'ArrowDown', left: k.left || code === 'KeyA' || code === 'ArrowLeft', right: k.right || code === 'KeyD' || code === 'ArrowRight', boost: k.boost || code === 'ShiftLeft' || code === 'ShiftRight', brake: k.brake || code === 'Space' }
}
export function kUp(k: DK, code: string): DK {
  return { ...k, fwd: k.fwd && code !== 'KeyW' && code !== 'ArrowUp', back: k.back && code !== 'KeyS' && code !== 'ArrowDown', left: k.left && code !== 'KeyA' && code !== 'ArrowLeft', right: k.right && code !== 'KeyD' && code !== 'ArrowRight', boost: k.boost && code !== 'ShiftLeft' && code !== 'ShiftRight', brake: k.brake && code !== 'Space' }
}
export function tick(s: DS, k: DK, dt: number): DS {
  const MAX = k.boost ? 420 : 260
  const ACCEL = k.boost ? 320 : 200
  const STEER_MAX = 2.4
  const steerIn = (k.left ? 1 : 0) - (k.right ? 1 : 0)
  const steer = Math.max(-STEER_MAX, Math.min(STEER_MAX, s.steer + steerIn * 4 * dt - s.steer * 5 * dt))
  const angle = s.angle + steer * (Math.min(Math.abs(s.speed), 80) / 80) * dt
  const tvx = Math.sin(angle) * (k.fwd ? s.speed + ACCEL * dt : s.speed)
  const tvy = Math.cos(angle) * (k.fwd ? s.speed + ACCEL * dt : s.speed)
  const grip = k.brake ? 0.04 : (k.boost ? 0.82 : 0.88)
  const bf = Math.pow(grip, dt * 60)
  let vx = s.vx * bf + tvx * (1 - bf)
  let vy = s.vy * bf + tvy * (1 - bf)
  let speed = Math.sqrt(vx * vx + vy * vy)
  if (k.fwd && speed < MAX) speed = Math.min(MAX, speed + ACCEL * dt)
  else if (k.back) speed = Math.max(-80, speed - 300 * dt)
  else if (k.brake) speed = speed * Math.pow(0.1, dt)
  else speed = speed * Math.pow(0.985, dt * 60)
  if (speed > 0.5) { vx = vx / Math.sqrt(vx*vx+vy*vy) * speed; vy = vy / Math.sqrt(vx*vx+vy*vy) * speed }
  else { vx = 0; vy = 0; speed = 0 }
  const velAngle = Math.atan2(vx, vy)
  let dA = velAngle - angle
  while (dA > Math.PI) dA -= 2 * Math.PI
  while (dA < -Math.PI) dA += 2 * Math.PI
  const driftAngle = Math.abs(dA) * 180 / Math.PI
  const isDrifting = driftAngle > 10 && speed > 40
  const driftScore = isDrifting ? s.driftScore + driftAngle * speed * dt * 0.001 : s.driftScore * Math.pow(0.97, dt * 60)
  const boost = k.boost && speed > 20 ? Math.min(1, s.boost + dt * 2) : Math.max(0, s.boost - dt * 3)
  return { x: s.x + vx * dt, y: s.y + vy * dt, angle, vx, vy, speed, steer, driftAngle, driftScore, isDrifting, boost }
}
