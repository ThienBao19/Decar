import * as THREE from 'three'

const ROAD_COLOR = 0x1a1a1e
const LANE_COLOR = 0xffffff
const GRASS_COLOR = 0x0a1a0a
const LAMP_COLOR = 0xffcc66
const BUILDING_COLORS = [0x111118, 0x141420, 0x0f0f16, 0x161622]

export function buildEnvironment(): THREE.Group {
  const env = new THREE.Group()

  // Ground plane
  const groundGeo = new THREE.PlaneGeometry(600, 600)
  const groundMat = new THREE.MeshStandardMaterial({ color: GRASS_COLOR, roughness: 0.95 })
  const ground = new THREE.Mesh(groundGeo, groundMat)
  ground.rotation.x = -Math.PI / 2
  ground.position.y = 0
  ground.receiveShadow = true
  env.add(ground)

  // Road (straight long road along Z axis)
  const roadGeo = new THREE.PlaneGeometry(12, 600)
  const roadMat = new THREE.MeshStandardMaterial({ color: ROAD_COLOR, roughness: 0.85 })
  const road = new THREE.Mesh(roadGeo, roadMat)
  road.rotation.x = -Math.PI / 2
  road.position.y = 0.01
  road.receiveShadow = true
  env.add(road)

  // Lane markings (dashed center line)
  const dashGeo = new THREE.PlaneGeometry(0.15, 3)
  const dashMat = new THREE.MeshStandardMaterial({ color: LANE_COLOR, roughness: 0.5, emissive: LANE_COLOR, emissiveIntensity: 0.05 })
  for (let z = -290; z < 290; z += 8) {
    const dashMesh = new THREE.Mesh(dashGeo, dashMat)
    dashMesh.rotation.x = -Math.PI / 2
    dashMesh.position.set(0, 0.02, z)
    env.add(dashMesh)
  }

  // Road edge lines
  const edgeGeo = new THREE.PlaneGeometry(0.12, 600)
  const edgeMat = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.6 })
  const leftEdge = new THREE.Mesh(edgeGeo, edgeMat)
  leftEdge.rotation.x = -Math.PI / 2
  leftEdge.position.set(-5.8, 0.02, 0)
  env.add(leftEdge)
  const rightEdge = new THREE.Mesh(edgeGeo.clone(), edgeMat)
  rightEdge.rotation.x = -Math.PI / 2
  rightEdge.position.set(5.8, 0.02, 0)
  env.add(rightEdge)

  // Street lamps
  const lampPoleGeo = new THREE.CylinderGeometry(0.08, 0.1, 6, 8)
  const lampPoleMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.7, roughness: 0.3 })
  const lampHeadGeo = new THREE.SphereGeometry(0.25, 12, 12)
  const lampHeadMat = new THREE.MeshStandardMaterial({ color: LAMP_COLOR, emissive: LAMP_COLOR, emissiveIntensity: 0.6, transparent: true, opacity: 0.9 })

  for (let z = -280; z < 280; z += 40) {
    for (const side of [-1, 1]) {
      const pole = new THREE.Mesh(lampPoleGeo, lampPoleMat)
      pole.position.set(side * 7.5, 3, z)
      env.add(pole)

      const lampArm = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.08, 0.08), lampPoleMat)
      lampArm.position.set(side * 6.8, 5.9, z)
      env.add(lampArm)

      const head = new THREE.Mesh(lampHeadGeo, lampHeadMat)
      head.position.set(side * 6, 5.9, z)
      env.add(head)

      const lampLight = new THREE.PointLight(LAMP_COLOR, 0.8, 25, 1.5)
      lampLight.position.set(side * 6, 5.8, z)
      env.add(lampLight)
    }
  }

  // Buildings along the sides
  const buildingMats = BUILDING_COLORS.map((c) =>
    new THREE.MeshStandardMaterial({ color: c, roughness: 0.9, metalness: 0.1 }),
  )

  for (let z = -250; z < 250; z += 25) {
    for (const side of [-1, 1]) {
      const w = 8 + Math.random() * 12
      const h = 10 + Math.random() * 40
      const d = 8 + Math.random() * 12
      const bGeo = new THREE.BoxGeometry(w, h, d)
      const bMat = buildingMats[Math.floor(Math.random() * buildingMats.length)]
      const building = new THREE.Mesh(bGeo, bMat as THREE.MeshStandardMaterial)
      building.position.set(side * (20 + Math.random() * 15), h / 2, z + Math.random() * 10)
      env.add(building)

      // Window lights on buildings
      const windowMat = new THREE.MeshStandardMaterial({
        color: 0xffdd88,
        emissive: 0xffdd88,
        emissiveIntensity: 0.3,
        transparent: true,
        opacity: 0.6,
      })
      const rows = Math.floor(h / 4)
      const cols = Math.floor(w / 3)
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          if (Math.random() > 0.6) continue
          const winGeo = new THREE.PlaneGeometry(1.2, 1.5)
          const win = new THREE.Mesh(winGeo, windowMat)
          win.position.set(
            building.position.x + (col - cols / 2) * 2.5,
            2 + row * 3.5,
            building.position.z + (side > 0 ? -d / 2 - 0.01 : d / 2 + 0.01),
          )
          if (side > 0) win.rotation.y = Math.PI
          env.add(win)
        }
      }
    }
  }

  // Trees between road and buildings
  const trunkGeo = new THREE.CylinderGeometry(0.15, 0.2, 3, 6)
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x2a1a0a, roughness: 0.9 })
  const canopyGeo = new THREE.SphereGeometry(1.5, 8, 8)
  const canopyMat = new THREE.MeshStandardMaterial({ color: 0x0a2a0a, roughness: 0.9 })

  for (let z = -260; z < 260; z += 20) {
    for (const side of [-1, 1]) {
      if (Math.random() > 0.7) continue
      const tx = side * (10 + Math.random() * 3)
      const trunk = new THREE.Mesh(trunkGeo, trunkMat)
      trunk.position.set(tx, 1.5, z + Math.random() * 5)
      env.add(trunk)
      const canopy = new THREE.Mesh(canopyGeo, canopyMat)
      canopy.position.set(tx, 4, z + Math.random() * 5)
      env.add(canopy)
    }
  }

  return env
}

export function buildLighting(scene: THREE.Scene): void {
  // Ambient
  const ambient = new THREE.AmbientLight(0x1a1a2e, 0.4)
  scene.add(ambient)

  // Main directional (moonlight)
  const moon = new THREE.DirectionalLight(0x4466aa, 0.6)
  moon.position.set(-20, 40, 20)
  moon.castShadow = true
  moon.shadow.mapSize.set(2048, 2048)
  moon.shadow.camera.near = 0.5
  moon.shadow.camera.far = 120
  moon.shadow.camera.left = -40
  moon.shadow.camera.right = 40
  moon.shadow.camera.top = 40
  moon.shadow.camera.bottom = -40
  scene.add(moon)

  // Hemisphere (sky/ground)
  const hemi = new THREE.HemisphereLight(0x1a1a3e, 0x080810, 0.3)
  scene.add(hemi)
}