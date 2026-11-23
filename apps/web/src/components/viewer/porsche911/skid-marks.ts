import * as THREE from 'three'
interface Mark { x1: number; z1: number; x2: number; z2: number }
const CAP = 400
export class SkidMarks {
  private readonly _buf: Array<Mark | null>
  private readonly _geo: THREE.BufferGeometry
  private readonly _mesh: THREE.LineSegments
  private _head = 0
  constructor(parent: THREE.Object3D) {
    this._buf = new Array<Mark | null>(CAP).fill(null)
    this._geo = new THREE.BufferGeometry()
    const mat = new THREE.LineBasicMaterial({ color: 0x111111, transparent: true, opacity: 0.7 })
    this._mesh = new THREE.LineSegments(this._geo, mat)
    parent.add(this._mesh)
  }
  add(x1: number, z1: number, x2: number, z2: number): void {
    this._buf[this._head % CAP] = { x1, z1, x2, z2 }
    this._head += 1
    this._flush()
  }
  private _flush(): void {
    const n = Math.min(this._head, CAP)
    const pts = new Float32Array(n * 6)
    for (let i = 0; i < n; i++) {
      const m = this._buf[i]
      if (!m) continue
      const b = i * 6
      pts[b] = m.x1; pts[b + 1] = -0.43; pts[b + 2] = m.z1
      pts[b + 3] = m.x2; pts[b + 4] = -0.43; pts[b + 5] = m.z2
    }
    this._geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3))
  }
  dispose(): void {
    this._geo.dispose()
    ;(this._mesh.material as THREE.Material).dispose()
    this._mesh.parent?.remove(this._mesh)
  }
}
