import * as THREE from 'three'
const COLORS = [0xffee00, 0xffaa00, 0xffffff, 0xff8800]
const LIFE = 0.28
interface Spark { mesh: THREE.Mesh; vel: THREE.Vector3; life: number; active: boolean }
export class TireSparks {
  private pts: Spark[]
  readonly group: THREE.Group
  constructor(parent: THREE.Object3D) {
    this.group = new THREE.Group()
    parent.add(this.group)
    const geo = new THREE.SphereGeometry(0.032, 4, 4)
    this.pts = Array.from({ length: 60 }, () => {
      const mat = new THREE.MeshBasicMaterial({ color: 0xffee00, transparent: true, opacity: 0 })
      const mesh = new THREE.Mesh(geo, mat)
      mesh.visible = false
      this.group.add(mesh)
      return { mesh, vel: new THREE.Vector3(), life: 0, active: false }
    })
  }
  spawn(x: number, z: number, heading: number, intensity: number): void {
    for (let i = 0; i < Math.ceil(intensity * 8); i++) {
      const p = this.pts.find((pp) => !pp.active)
      if (!p) continue
      const ang = heading + Math.PI + (Math.random() - 0.5) * 1.6
      p.active = true; p.life = 0; p.mesh.visible = true
      p.mesh.position.set(x + (Math.random() - 0.5) * 0.9, 0.06, z + (Math.random() - 0.5) * 0.9)
      p.vel.set(Math.sin(ang) * (3 + Math.random() * 7), 1.5 + Math.random() * 2, Math.cos(ang) * (3 + Math.random() * 7))
      const mat = p.mesh.material as THREE.MeshBasicMaterial
      mat.opacity = 1
      mat.color.setHex(COLORS[Math.floor(Math.random() * COLORS.length)] as number)
    }
  }
  update(dt: number): void {
    for (const p of this.pts) {
      if (!p.active) continue
      p.life += dt
      if (p.life >= LIFE) { p.active = false; p.mesh.visible = false; continue }
      p.mesh.position.set(p.mesh.position.x + p.vel.x * dt, p.mesh.position.y + p.vel.y * dt, p.mesh.position.z + p.vel.z * dt)
      p.vel.y -= 9 * dt
      ;(p.mesh.material as THREE.MeshBasicMaterial).opacity = 1 - p.life / LIFE
    }
  }
  dispose(): void {
    for (const p of this.pts) { p.mesh.geometry.dispose(); (p.mesh.material as THREE.Material).dispose() }
    this.group.parent?.remove(this.group)
  }
}
