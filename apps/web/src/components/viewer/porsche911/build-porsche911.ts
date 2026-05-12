import * as THREE from 'three'

const BODY_COLOR = 0xc0c0c8
const GLASS_COLOR = 0x1a2030
const HEADLIGHT_COLOR = 0xfff8e0
const TAILLIGHT_COLOR = 0xcc1111
const TRIM_COLOR = 0x111111

function createBodyMaterial(color = BODY_COLOR): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    metalness: 0.85,
    roughness: 0.18,
  })
}

function buildWheel(isRear: boolean): THREE.Group {
  const wheel = new THREE.Group()
  const radius = isRear ? 0.36 : 0.34
  const width = isRear ? 0.32 : 0.26

  const tireGeo = new THREE.TorusGeometry(radius, width * 0.38, 16, 32)
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9, metalness: 0.05 })
  const tire = new THREE.Mesh(tireGeo, tireMat)
  tire.rotation.y = Math.PI / 2
  wheel.add(tire)

  const rimGeo = new THREE.CylinderGeometry(radius * 0.7, radius * 0.7, width * 0.3, 32)
  const rimMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.9, roughness: 0.15 })
  const rim = new THREE.Mesh(rimGeo, rimMat)
  rim.rotation.z = Math.PI / 2
  wheel.add(rim)

  const spokeCount = 5
  for (let i = 0; i < spokeCount; i += 1) {
    const angle = (i / spokeCount) * Math.PI * 2
    const spokeGeo = new THREE.BoxGeometry(radius * 0.6, width * 0.15, 0.06)
    const spoke = new THREE.Mesh(spokeGeo, rimMat)
    spoke.position.set(Math.cos(angle) * radius * 0.35, 0, Math.sin(angle) * radius * 0.35)
    spoke.rotation.y = -angle
    wheel.add(spoke)
  }

  const capGeo = new THREE.CylinderGeometry(0.06, 0.06, width * 0.35, 16)
  const capMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.8, roughness: 0.2 })
  const cap = new THREE.Mesh(capGeo, capMat)
  cap.rotation.z = Math.PI / 2
  wheel.add(cap)

  const brakeGeo = new THREE.CylinderGeometry(radius * 0.55, radius * 0.55, 0.04, 24)
  const brakeMat = new THREE.MeshStandardMaterial({ color: 0xcc2200, metalness: 0.6, roughness: 0.4 })
  const brake = new THREE.Mesh(brakeGeo, brakeMat)
  brake.rotation.z = Math.PI / 2
  wheel.add(brake)

  return wheel
}

function buildHeadlight(side: number): THREE.Group {
  const group = new THREE.Group()
  const housingGeo = new THREE.CylinderGeometry(0.14, 0.15, 0.08, 24)
  const housingMat = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.5, roughness: 0.3 })
  const housing = new THREE.Mesh(housingGeo, housingMat)
  housing.rotation.x = Math.PI / 2
  group.add(housing)

  const lensGeo = new THREE.CircleGeometry(0.12, 24)
  const lensMat = new THREE.MeshStandardMaterial({
    color: HEADLIGHT_COLOR, emissive: HEADLIGHT_COLOR, emissiveIntensity: 0.8, transparent: true, opacity: 0.95,
  })
  const lens = new THREE.Mesh(lensGeo, lensMat)
  lens.position.z = 0.041
  group.add(lens)

  const light = new THREE.SpotLight(0xfff5e0, 3, 30, Math.PI / 6, 0.5, 1.5)
  light.position.set(0, 0, 0.05)
  light.target.position.set(side * 0.3, -0.5, 5)
  group.add(light)
  group.add(light.target)

  return group
}

export function buildPorsche911(bodyHex?: number): THREE.Group {
  const car = new THREE.Group()
  const mat = createBodyMaterial(bodyHex ?? BODY_COLOR)
  const glassMat = new THREE.MeshStandardMaterial({ color: GLASS_COLOR, metalness: 0.2, roughness: 0.05, transparent: true, opacity: 0.7 })
  const trimMat = new THREE.MeshStandardMaterial({ color: TRIM_COLOR, metalness: 0.5, roughness: 0.4 })
  const intMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9, metalness: 0.1 })

  // Lower body
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.45, 4.5), mat)
  body.position.set(0, 0.42, 0)
  car.add(body)

  // Front taper
  const front = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.3, 0.8), mat)
  front.position.set(0, 0.35, 2.3)
  front.rotation.x = -0.15
  car.add(front)

  // Rear engine bay (wider haunches)
  const rearPart = new THREE.Mesh(new THREE.BoxGeometry(1.95, 0.5, 1.2), mat)
  rearPart.position.set(0, 0.5, -1.5)
  car.add(rearPart)

  // Cabin
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.5, 1.8), mat)
  cabin.position.set(0, 0.88, -0.2)
  car.add(cabin)

  // Roof
  const roof = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.12, 1.4), mat)
  roof.position.set(0, 1.16, -0.3)
  car.add(roof)

  // Windshield
  const ws = new THREE.Mesh(new THREE.BoxGeometry(1.38, 0.55, 0.08), glassMat)
  ws.position.set(0, 0.95, 0.7)
  ws.rotation.x = 0.55
  car.add(ws)

  // Rear window
  const rwn = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.45, 0.06), glassMat)
  rwn.position.set(0, 0.9, -1.0)
  rwn.rotation.x = -0.65
  car.add(rwn)

  // Side windows
  const swGeo = new THREE.BoxGeometry(0.06, 0.35, 1.3)
  const lwMesh = new THREE.Mesh(swGeo, glassMat)
  lwMesh.position.set(-0.74, 0.9, -0.1)
  car.add(lwMesh)
  const rwMesh = new THREE.Mesh(swGeo, glassMat)
  rwMesh.position.set(0.74, 0.9, -0.1)
  car.add(rwMesh)

  // Rear fenders
  const fGeo = new THREE.BoxGeometry(0.2, 0.4, 1.4)
  const lfMesh = new THREE.Mesh(fGeo, mat)
  lfMesh.position.set(-1.0, 0.48, -1.4)
  car.add(lfMesh)
  const rfMesh = new THREE.Mesh(fGeo, mat)
  rfMesh.position.set(1.0, 0.48, -1.4)
  car.add(rfMesh)

  // Front fenders
  const ffGeo = new THREE.BoxGeometry(0.12, 0.35, 1.0)
  const lffMesh = new THREE.Mesh(ffGeo, mat)
  lffMesh.position.set(-0.92, 0.42, 1.4)
  car.add(lffMesh)
  const rffMesh = new THREE.Mesh(ffGeo, mat)
  rffMesh.position.set(0.92, 0.42, 1.4)
  car.add(rffMesh)

  // Front bumper + splitter
  const fb = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.2, 0.15), trimMat)
  fb.position.set(0, 0.28, 2.55)
  car.add(fb)
  const spl = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.04, 0.25), trimMat)
  spl.position.set(0, 0.18, 2.6)
  car.add(spl)

  // Headlights
  const leftHL = buildHeadlight(-1)
  leftHL.position.set(-0.6, 0.52, 2.5)
  car.add(leftHL)
  const rightHL = buildHeadlight(1)
  rightHL.position.set(0.6, 0.52, 2.5)
  car.add(rightHL)

  // Rear bumper
  const rb = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.22, 0.12), trimMat)
  rb.position.set(0, 0.3, -2.28)
  car.add(rb)

  // Tail light bar
  const tlMat = new THREE.MeshStandardMaterial({ color: TAILLIGHT_COLOR, emissive: TAILLIGHT_COLOR, emissiveIntensity: 0.6 })
  const tl = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.07, 0.03), tlMat)
  tl.position.set(0, 0.6, -2.26)
  car.add(tl)

  // Rear spoiler
  const spoiler = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.04, 0.2), trimMat)
  spoiler.position.set(0, 0.75, -2.05)
  spoiler.rotation.x = -0.15
  car.add(spoiler)

  // Exhaust tips
  const tipGeo = new THREE.CylinderGeometry(0.04, 0.05, 0.12, 16)
  const tipMat = new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.9, roughness: 0.2 })
  const exL = new THREE.Mesh(tipGeo, tipMat)
  exL.rotation.x = Math.PI / 2
  exL.position.set(-0.18, 0.22, -2.35)
  exL.userData.isExhaust = true
  car.add(exL)
  const exR = new THREE.Mesh(tipGeo, tipMat)
  exR.rotation.x = Math.PI / 2
  exR.position.set(0.18, 0.22, -2.35)
  exR.userData.isExhaust = true
  car.add(exR)

  // Engine grille
  const eg = new THREE.Mesh(
    new THREE.BoxGeometry(1.0, 0.18, 0.02),
    new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.3, roughness: 0.8 }),
  )
  eg.position.set(0, 0.45, -2.27)
  car.add(eg)

  // Wheels
  const wheelPositions = [
    { x: -0.82, z: 1.35, rear: false },
    { x: 0.82, z: 1.35, rear: false },
    { x: -0.88, z: -1.35, rear: true },
    { x: 0.88, z: -1.35, rear: true },
  ]
  const wheels: THREE.Group[] = []
  for (const wp of wheelPositions) {
    const w = buildWheel(wp.rear)
    w.position.set(wp.x, 0.34, wp.z)
    w.userData.isWheel = true
    car.add(w)
    wheels.push(w)
  }
  car.userData.wheels = wheels

  // Side skirts
  const skGeo = new THREE.BoxGeometry(0.08, 0.12, 3.2)
  const lsk = new THREE.Mesh(skGeo, trimMat)
  lsk.position.set(-0.93, 0.22, 0)
  car.add(lsk)
  const rsk = new THREE.Mesh(skGeo.clone(), trimMat)
  rsk.position.set(0.93, 0.22, 0)
  car.add(rsk)

  // Interior
  const intFloor = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.12, 1.4), intMat)
  intFloor.position.set(0, 0.68, -0.15)
  car.add(intFloor)
  const dash = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.25, 0.15), intMat)
  dash.position.set(0, 0.75, 0.45)
  car.add(dash)

  // Door mirrors
  const mirGeo = new THREE.BoxGeometry(0.08, 0.06, 0.14)
  const lm = new THREE.Mesh(mirGeo, mat)
  lm.position.set(-0.96, 0.72, 0.55)
  car.add(lm)
  const rmMesh = new THREE.Mesh(mirGeo, mat)
  rmMesh.position.set(0.96, 0.72, 0.55)
  car.add(rmMesh)

  car.userData.bodyMaterial = mat
  return car
}