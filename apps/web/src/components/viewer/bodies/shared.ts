import * as THREE from 'three'

export function bodyMat(color: number) {
  return new THREE.MeshStandardMaterial({ color, metalness: 0.82, roughness: 0.20 })
}
export const glassMat = new THREE.MeshStandardMaterial({ color: 0x1c2a3a, metalness: 0.12, roughness: 0.05, transparent: true, opacity: 0.72 })
export const trimMat  = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.40, roughness: 0.50 })
export const chromeMat= new THREE.MeshStandardMaterial({ color: 0xaaaaaa, metalness: 0.95, roughness: 0.10 })
export const plasticMat=new THREE.MeshStandardMaterial({ color: 0x1e1e1e, roughness: 0.85, metalness: 0.05 })

export function buildBasicWheel(radius = 0.34, width = 0.22, spokes = 5): THREE.Group {
  const g = new THREE.Group()
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x181818, roughness: 0.9, metalness: 0.05 })
  const rimMat  = new THREE.MeshStandardMaterial({ color: 0x999999, metalness: 0.88, roughness: 0.14 })
  const tire = new THREE.Mesh(new THREE.TorusGeometry(radius, width * 0.38, 14, 32), tireMat)
  tire.rotation.y = Math.PI / 2
  g.add(tire)
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.72, radius * 0.72, width * 0.28, 32), rimMat)
  rim.rotation.z = Math.PI / 2
  g.add(rim)
  const spokeMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.90, roughness: 0.16 })
  for (let i = 0; i < spokes; i++) {
    const a = (i / spokes) * Math.PI * 2
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(radius * 0.58, width * 0.14, 0.055), spokeMat)
    spoke.position.set(Math.cos(a) * radius * 0.36, 0, Math.sin(a) * radius * 0.36)
    spoke.rotation.y = -a
    g.add(spoke)
  }
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.052, width * 0.32, 14), new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.7, roughness: 0.3 }))
  cap.rotation.z = Math.PI / 2
  g.add(cap)
  return g
}

export function buildHeadlightRect(w2: number, h: number, emissive = 0xfff0cc): THREE.Group {
  const g = new THREE.Group()
  const housing = new THREE.Mesh(new THREE.BoxGeometry(w2, h, 0.10), trimMat)
  g.add(housing)
  const lensMat = new THREE.MeshStandardMaterial({ color: emissive, emissive, emissiveIntensity: 0.9, transparent: true, opacity: 0.94 })
  const lens = new THREE.Mesh(new THREE.BoxGeometry(w2 * 0.80, h * 0.72, 0.02), lensMat)
  lens.position.z = 0.055
  g.add(lens)
  return g
}

export function buildTaillightRect(w2: number, h: number): THREE.Group {
  const g = new THREE.Group()
  const mat = new THREE.MeshStandardMaterial({ color: 0xcc1111, emissive: 0xcc1111, emissiveIntensity: 0.65 })
  const lens = new THREE.Mesh(new THREE.BoxGeometry(w2, h, 0.04), mat)
  g.add(lens)
  return g
}

export function addWheels(car: THREE.Group, positions: Array<{x:number;y:number;z:number}>, r=0.34, w=0.22) {
  const wheels: THREE.Group[] = []
  for (const p of positions) {
    const wh = buildBasicWheel(r, w)
    wh.position.set(p.x, p.y, p.z)
    wh.userData.isWheel = true
    car.add(wh)
    wheels.push(wh)
  }
  car.userData.wheels = wheels
}