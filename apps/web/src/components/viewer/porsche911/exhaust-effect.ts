import * as THREE from 'three'

const PARTICLE_COUNT = 80
const PARTICLE_LIFE = 0.8
const FLAME_COLORS = [0xff4400, 0xff6600, 0xff8800, 0xffaa00, 0xff2200]

interface Particle {
  mesh: THREE.Mesh
  velocity: THREE.Vector3
  life: number
  maxLife: number
  active: boolean
}

export class ExhaustEffect {
  private particles: Particle[] = []
  private group: THREE.Group
  private clock: THREE.Clock
  private isActive = false
  private intensity = 0

  constructor(parent: THREE.Object3D) {
    this.group = new THREE.Group()
    parent.add(this.group)
    this.clock = new THREE.Clock()
    this.initParticles()
  }

  private initParticles(): void {
    const geo = new THREE.SphereGeometry(0.06, 6, 6)
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const colorIdx = Math.floor(Math.random() * FLAME_COLORS.length)
      const mat = new THREE.MeshBasicMaterial({
        color: FLAME_COLORS[colorIdx] as number,
        transparent: true,
        opacity: 0,
      })
      const mesh = new THREE.Mesh(geo, mat)
      mesh.visible = false
      this.group.add(mesh)
      this.particles.push({
        mesh,
        velocity: new THREE.Vector3(),
        life: 0,
        maxLife: PARTICLE_LIFE,
        active: false,
      })
    }
  }

  trigger(intensity = 1): void {
    this.isActive = true
    this.intensity = intensity
  }

  stop(): void {
    this.isActive = false
  }

  update(
    carPosition: THREE.Vector3,
    carHeading: number,
    speed: number,
    dt: number,
  ): void {
    // Spawn new particles when active
    if (this.isActive) {
      const spawnCount = Math.ceil(this.intensity * 6)
      for (let s = 0; s < spawnCount; s++) {
        const p = this.particles.find((pp) => !pp.active)
        if (!p) continue

        p.active = true
        p.life = 0
        p.maxLife = PARTICLE_LIFE * (0.5 + Math.random() * 0.5)

        // Position at exhaust tips
        const side = Math.random() > 0.5 ? -0.18 : 0.18
        const ex = carPosition.x + Math.sin(carHeading + Math.PI) * 2.4 + Math.sin(carHeading + Math.PI / 2) * side
        const ez = carPosition.z + Math.cos(carHeading + Math.PI) * 2.4 + Math.cos(carHeading + Math.PI / 2) * side

        p.mesh.position.set(ex, 0.22 + Math.random() * 0.1, ez)

        // Velocity: backward from car + randomness
        const backSpeed = 3 + Math.random() * 5 + speed * 0.1
        p.velocity.set(
          Math.sin(carHeading + Math.PI) * backSpeed + (Math.random() - 0.5) * 2,
          1.5 + Math.random() * 2,
          Math.cos(carHeading + Math.PI) * backSpeed + (Math.random() - 0.5) * 2,
        )

        p.mesh.visible = true
        const mat = p.mesh.material as THREE.MeshBasicMaterial
        const ci = Math.floor(Math.random() * FLAME_COLORS.length)
        mat.color.setHex(FLAME_COLORS[ci] as number)
        mat.opacity = 1

        // Random size
        const scale = 0.5 + Math.random() * 1.5
        p.mesh.scale.setScalar(scale)
      }
    }

    // Update existing particles
    for (const p of this.particles) {
      if (!p.active) continue
      p.life += dt
      if (p.life >= p.maxLife) {
        p.active = false
        p.mesh.visible = false
        continue
      }

      const progress = p.life / p.maxLife

      // Move
      p.mesh.position.x += p.velocity.x * dt
      p.mesh.position.y += p.velocity.y * dt
      p.mesh.position.z += p.velocity.z * dt

      // Gravity + drag
      p.velocity.y -= 3 * dt
      p.velocity.x *= 0.97
      p.velocity.z *= 0.97

      // Fade
      const mat = p.mesh.material as THREE.MeshBasicMaterial
      mat.opacity = Math.max(0, 1 - progress * progress)

      // Grow + fade to smoke color
      const newScale = (0.5 + progress * 2) * (p.mesh.scale.x / (0.5 + Math.random() * 0.01))
      p.mesh.scale.setScalar(Math.min(3, 0.5 + progress * 2))

      if (progress > 0.4) {
        mat.color.lerp(new THREE.Color(0x333333), dt * 3)
      }
    }

    // Fade intensity
    if (!this.isActive) {
      this.intensity = Math.max(0, this.intensity - dt * 4)
    }
  }

  dispose(): void {
    for (const p of this.particles) {
      p.mesh.geometry.dispose()
      ;(p.mesh.material as THREE.Material).dispose()
    }
    this.group.parent?.remove(this.group)
  }
}