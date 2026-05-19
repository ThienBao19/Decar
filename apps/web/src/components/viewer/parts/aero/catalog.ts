import * as THREE from 'three'

import type { PartDef } from '@decar/shared'

export interface AeroCatalogEntry extends PartDef {
  build(): THREE.Group
}

// ─── shared materials ─────────────────────────────────────────────────────

function aeroMat(color: number, roughness = 0.4): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness: 0.1 })
}

function carbonMat(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.08, metalness: 0.05, envMapIntensity: 2 })
}

// ─── FRONT BUMPERS (5) ───────────────────────────────────────────────────

function buildOemFrontBumper(): THREE.Group {
  const g = new THREE.Group()
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(1.8, 0.22, 0.18),
    aeroMat(0x333333),
  )
  body.position.set(0, -0.1, 0)
  g.add(body)
  // fog light cutouts (left/right inserts)
  for (const x of [-0.65, 0.65]) {
    const fog = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.1, 0.04), aeroMat(0x888888, 0.8))
    fog.position.set(x, -0.1, 0.08)
    g.add(fog)
  }
  return g
}

function buildSportsFrontBumper(): THREE.Group {
  const g = new THREE.Group()
  const main = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.28, 0.22), aeroMat(0x222222))
  main.position.set(0, -0.12, 0)
  g.add(main)
  // wide center duct
  const duct = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.12, 0.06), aeroMat(0x111111, 0.9))
  duct.position.set(0, -0.18, 0.1)
  g.add(duct)
  // splitter lip
  const lip = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.03, 0.12), aeroMat(0x1a1a1a))
  lip.position.set(0, -0.27, 0.06)
  g.add(lip)
  return g
}

function buildWidebodyFrontBumper(): THREE.Group {
  const g = new THREE.Group()
  const main = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.3, 0.25), aeroMat(0x1a1a1a))
  main.position.set(0, -0.13, 0)
  g.add(main)
  // triple duct row
  for (const x of [-0.55, 0, 0.55]) {
    const duct = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.14, 0.08), aeroMat(0x0a0a0a, 0.95))
    duct.position.set(x, -0.16, 0.12)
    g.add(duct)
  }
  // canards
  for (const side of [-1, 1]) {
    const canard = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.03, 0.14), carbonMat())
    canard.position.set(side * 0.88, -0.08, 0.04)
    canard.rotation.z = side * 0.18
    g.add(canard)
  }
  return g
}

function buildCarbonRaceFrontBumper(): THREE.Group {
  const g = new THREE.Group()
  const main = new THREE.Mesh(new THREE.BoxGeometry(1.92, 0.32, 0.26), carbonMat())
  main.position.set(0, -0.14, 0)
  g.add(main)
  // GT splitter
  const splitter = new THREE.Mesh(new THREE.BoxGeometry(1.95, 0.04, 0.22), carbonMat())
  splitter.position.set(0, -0.3, 0.1)
  g.add(splitter)
  // large single duct
  const duct = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.16, 0.1), aeroMat(0x0a0a0a, 0.95))
  duct.position.set(0, -0.17, 0.14)
  g.add(duct)
  // dive planes
  for (const side of [-1, 1]) {
    const dp = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.16, 0.04), carbonMat())
    dp.position.set(side * 0.92, -0.1, 0.06)
    dp.rotation.y = side * -0.3
    g.add(dp)
  }
  return g
}

function buildOffroadFrontBumper(): THREE.Group {
  const g = new THREE.Group()
  // heavy-duty steel-look
  const main = new THREE.Mesh(new THREE.BoxGeometry(1.96, 0.34, 0.28), aeroMat(0x2a2a2a, 0.7))
  main.position.set(0, -0.15, 0)
  g.add(main)
  // winch bar
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.6, 12), aeroMat(0x555555, 0.6))
  bar.rotation.z = Math.PI / 2
  bar.position.set(0, -0.06, 0.14)
  g.add(bar)
  // skid plate
  const skid = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.06, 0.2), aeroMat(0x444444, 0.6))
  skid.position.set(0, -0.32, 0.08)
  g.add(skid)
  return g
}

// ─── REAR BUMPERS (5) ────────────────────────────────────────────────────

function buildOemRearBumper(): THREE.Group {
  const g = new THREE.Group()
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.22, 0.16), aeroMat(0x333333))
  body.position.set(0, -0.1, 0)
  g.add(body)
  // diffuser stub
  const diff = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.08, 0.12), aeroMat(0x222222, 0.8))
  diff.position.set(0, -0.2, -0.04)
  g.add(diff)
  return g
}

function buildSportsRearBumper(): THREE.Group {
  const g = new THREE.Group()
  const main = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.28, 0.2), aeroMat(0x222222))
  main.position.set(0, -0.12, 0)
  g.add(main)
  // diffuser fins
  for (let i = -2; i <= 2; i++) {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.1, 0.18), aeroMat(0x111111, 0.85))
    fin.position.set(i * 0.16, -0.2, -0.01)
    g.add(fin)
  }
  return g
}

function buildWidebodyRearBumper(): THREE.Group {
  const g = new THREE.Group()
  const main = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.3, 0.22), aeroMat(0x1a1a1a))
  main.position.set(0, -0.13, 0)
  g.add(main)
  // extended diffuser
  const diff = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.12, 0.26), aeroMat(0x0d0d0d))
  diff.position.set(0, -0.24, -0.02)
  g.add(diff)
  for (let i = -3; i <= 3; i++) {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.1, 0.24), aeroMat(0x111111, 0.8))
    fin.position.set(i * 0.18, -0.24, -0.02)
    g.add(fin)
  }
  return g
}

function buildCarbonRaceRearBumper(): THREE.Group {
  const g = new THREE.Group()
  const main = new THREE.Mesh(new THREE.BoxGeometry(1.92, 0.32, 0.24), carbonMat())
  main.position.set(0, -0.14, 0)
  g.add(main)
  // large diffuser with 7 fins
  const diff = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.14, 0.3), carbonMat())
  diff.position.set(0, -0.27, -0.03)
  g.add(diff)
  for (let i = -3; i <= 3; i++) {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.12, 0.28), aeroMat(0x0a0a0a, 0.9))
    fin.position.set(i * 0.2, -0.27, -0.03)
    g.add(fin)
  }
  return g
}

function buildOffroadRearBumper(): THREE.Group {
  const g = new THREE.Group()
  const main = new THREE.Mesh(new THREE.BoxGeometry(1.96, 0.3, 0.24), aeroMat(0x2a2a2a, 0.7))
  main.position.set(0, -0.13, 0)
  g.add(main)
  // tow hitch receiver
  const hitch = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.28), aeroMat(0x555555, 0.6))
  hitch.position.set(0, -0.18, -0.1)
  g.add(hitch)
  // step bar
  const step = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.4, 10), aeroMat(0x666666, 0.5))
  step.rotation.z = Math.PI / 2
  step.position.set(0, -0.28, 0.08)
  g.add(step)
  return g
}

// ─── SPOILERS (5) ────────────────────────────────────────────────────────

function buildOemSpoiler(): THREE.Group {
  const g = new THREE.Group()
  const lip = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.06, 0.2), aeroMat(0x333333))
  g.add(lip)
  return g
}

function buildDuckbillSpoiler(): THREE.Group {
  const g = new THREE.Group()
  const blade = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.04, 0.28), aeroMat(0x222222))
  blade.rotation.x = -0.2
  blade.position.y = 0.06
  g.add(blade)
  const base = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.06, 0.12), aeroMat(0x222222))
  g.add(base)
  return g
}

function buildGTWingSpoiler(): THREE.Group {
  const g = new THREE.Group()
  // two uprights
  for (const x of [-0.6, 0.6]) {
    const upright = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.28, 0.1), aeroMat(0x1a1a1a))
    upright.position.set(x, 0.14, 0)
    g.add(upright)
  }
  // main blade
  const blade = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.05, 0.34), aeroMat(0x111111))
  blade.position.set(0, 0.3, 0)
  blade.rotation.x = 0.15
  g.add(blade)
  // Gurney flap
  const gurney = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.06, 0.02), aeroMat(0x1a1a1a))
  gurney.position.set(0, 0.33, 0.16)
  g.add(gurney)
  return g
}

function buildCarbonGTWing(): THREE.Group {
  const g = new THREE.Group()
  for (const x of [-0.65, 0.65]) {
    const upright = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.38, 0.12), carbonMat())
    upright.position.set(x, 0.19, 0)
    g.add(upright)
  }
  const blade = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.06, 0.42), carbonMat())
  blade.position.set(0, 0.4, 0)
  blade.rotation.x = 0.2
  g.add(blade)
  const gurney = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.08, 0.025), carbonMat())
  gurney.position.set(0, 0.44, 0.2)
  g.add(gurney)
  return g
}

function buildSwanNeckWing(): THREE.Group {
  const g = new THREE.Group()
  // swan-neck mounts (mount from above blade)
  for (const x of [-0.55, 0.55]) {
    const neck = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.32, 0.06), carbonMat())
    neck.position.set(x, 0.32, -0.08)
    neck.rotation.x = 0.4
    g.add(neck)
  }
  const blade = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.055, 0.38), carbonMat())
  blade.position.set(0, 0.38, 0)
  blade.rotation.x = 0.12
  g.add(blade)
  return g
}

// ─── SIDE SKIRTS (5) ─────────────────────────────────────────────────────

function buildOemSideSkirts(): THREE.Group {
  const g = new THREE.Group()
  const skirt = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 2.2), aeroMat(0x333333))
  g.add(skirt)
  return g
}

function buildSportsSideSkirts(): THREE.Group {
  const g = new THREE.Group()
  const main = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 2.3), aeroMat(0x222222))
  g.add(main)
  // single duct slot
  const slot = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.04, 0.5), aeroMat(0x111111, 0.9))
  slot.position.set(0.04, -0.04, 0.2)
  g.add(slot)
  return g
}

function buildWidebodySideSkirts(): THREE.Group {
  const g = new THREE.Group()
  const main = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.14, 2.4), aeroMat(0x1a1a1a))
  g.add(main)
  // stepped lower edge
  const step = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.03, 2.4), aeroMat(0x111111))
  step.position.set(0.02, -0.085, 0)
  g.add(step)
  return g
}

function buildCarbonRaceSkirts(): THREE.Group {
  const g = new THREE.Group()
  const main = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.16, 2.4), carbonMat())
  g.add(main)
  const fin1 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.3), carbonMat())
  fin1.position.set(0.06, -0.06, -0.8)
  g.add(fin1)
  const fin2 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.3), carbonMat())
  fin2.position.set(0.06, -0.06, 0.5)
  g.add(fin2)
  return g
}

function buildOffroadRockSliders(): THREE.Group {
  const g = new THREE.Group()
  const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.3, 10), aeroMat(0x3a3a3a, 0.65))
  rail.rotation.z = Math.PI / 2
  rail.position.y = -0.06
  g.add(rail)
  const plate = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.06, 2.3), aeroMat(0x2a2a2a, 0.7))
  plate.position.set(0, 0.04, 0)
  g.add(plate)
  return g
}

// ─── HOODS (5) ───────────────────────────────────────────────────────────

function buildStockHood(): THREE.Group {
  const g = new THREE.Group()
  const hood = new THREE.Mesh(new THREE.BoxGeometry(1.78, 0.04, 0.95), aeroMat(0x555555))
  g.add(hood)
  return g
}

function buildScoopHood(): THREE.Group {
  const g = new THREE.Group()
  const base = new THREE.Mesh(new THREE.BoxGeometry(1.78, 0.04, 0.95), aeroMat(0x444444))
  g.add(base)
  const scoop = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.06, 0.3), aeroMat(0x333333))
  scoop.position.set(0, 0.05, -0.1)
  g.add(scoop)
  return g
}

function buildDoubleBlisterHood(): THREE.Group {
  const g = new THREE.Group()
  const base = new THREE.Mesh(new THREE.BoxGeometry(1.78, 0.04, 0.95), aeroMat(0x444444))
  g.add(base)
  for (const x of [-0.35, 0.35]) {
    const blister = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.06, 0.65), aeroMat(0x3a3a3a))
    blister.position.set(x, 0.05, -0.06)
    g.add(blister)
  }
  return g
}

function buildCarbonHood(): THREE.Group {
  const g = new THREE.Group()
  const base = new THREE.Mesh(new THREE.BoxGeometry(1.78, 0.035, 0.95), carbonMat())
  g.add(base)
  const vent = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.02, 0.18), aeroMat(0x0a0a0a, 0.9))
  vent.position.set(0, 0.025, -0.18)
  g.add(vent)
  return g
}

function buildFlatHoodWithVents(): THREE.Group {
  const g = new THREE.Group()
  const base = new THREE.Mesh(new THREE.BoxGeometry(1.78, 0.04, 0.95), aeroMat(0x333333))
  g.add(base)
  for (const z of [-0.22, -0.06, 0.1]) {
    const vent = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.02, 0.06), aeroMat(0x1a1a1a, 0.9))
    vent.position.set(0, 0.025, z)
    g.add(vent)
  }
  return g
}

// ─── catalog arrays ───────────────────────────────────────────────────────

export const FRONT_BUMPERS: AeroCatalogEntry[] = [
  { id: 'front-oem', name: 'OEM Front Bumper', category: 'front_bumper', tier: 'oem', weight: 12, dragCoefficient: 0, description: 'Standard factory front bumper.', build: buildOemFrontBumper },
  { id: 'front-sports', name: 'Sports Front Bumper', category: 'front_bumper', tier: 'aftermarket', weight: 9, dragCoefficient: -0.02, downforce: 5, description: 'Low-slung lip with center duct.', build: buildSportsFrontBumper },
  { id: 'front-widebody', name: 'Widebody Front', category: 'front_bumper', tier: 'aftermarket', weight: 11, dragCoefficient: -0.015, downforce: 12, description: 'Triple-duct widebody front with canards.', build: buildWidebodyFrontBumper },
  { id: 'front-carbon-race', name: 'Carbon Race Front', category: 'front_bumper', tier: 'premium', weight: 6, dragCoefficient: -0.04, downforce: 22, description: 'Full carbon GT splitter with dive planes.', build: buildCarbonRaceFrontBumper },
  { id: 'front-offroad', name: 'Off-Road Bull Bar', category: 'front_bumper', tier: 'aftermarket', weight: 28, dragCoefficient: 0.04, description: 'Heavy steel bull bar with winch mount.', build: buildOffroadFrontBumper },
]

export const REAR_BUMPERS: AeroCatalogEntry[] = [
  { id: 'rear-oem', name: 'OEM Rear Bumper', category: 'rear_bumper', tier: 'oem', weight: 11, dragCoefficient: 0, description: 'Standard factory rear bumper.', build: buildOemRearBumper },
  { id: 'rear-sports', name: 'Sports Rear Bumper', category: 'rear_bumper', tier: 'aftermarket', weight: 8, dragCoefficient: -0.01, downforce: 4, description: 'Diffuser fins with clean lines.', build: buildSportsRearBumper },
  { id: 'rear-widebody', name: 'Widebody Rear', category: 'rear_bumper', tier: 'aftermarket', weight: 10, dragCoefficient: -0.02, downforce: 14, description: 'Extended diffuser with 7 fins.', build: buildWidebodyRearBumper },
  { id: 'rear-carbon-race', name: 'Carbon Race Rear', category: 'rear_bumper', tier: 'premium', weight: 5, dragCoefficient: -0.035, downforce: 24, description: 'Full carbon large diffuser, GT-spec.', build: buildCarbonRaceRearBumper },
  { id: 'rear-offroad', name: 'Off-Road Rear Guard', category: 'rear_bumper', tier: 'aftermarket', weight: 22, dragCoefficient: 0.02, description: 'Heavy-duty rear guard with tow hitch.', build: buildOffroadRearBumper },
]

export const SPOILERS: AeroCatalogEntry[] = [
  { id: 'spoiler-oem', name: 'OEM Lip Spoiler', category: 'spoiler', tier: 'oem', weight: 2, dragCoefficient: 0, downforce: 2, description: 'Factory trunk lip spoiler.', build: buildOemSpoiler },
  { id: 'spoiler-duckbill', name: 'Duckbill Spoiler', category: 'spoiler', tier: 'aftermarket', weight: 3, dragCoefficient: 0.005, downforce: 8, description: 'Raked duckbill lip. Classic JDM style.', build: buildDuckbillSpoiler },
  { id: 'spoiler-gt-wing', name: 'GT Wing', category: 'spoiler', tier: 'aftermarket', weight: 5, dragCoefficient: 0.018, downforce: 28, description: 'Adjustable GT wing on twin uprights.', build: buildGTWingSpoiler },
  { id: 'spoiler-carbon-gt', name: 'Carbon GT Wing', category: 'spoiler', tier: 'premium', weight: 3, dragCoefficient: 0.02, downforce: 38, description: 'Carbon GT wing with Gurney flap.', build: buildCarbonGTWing },
  { id: 'spoiler-swan-neck', name: 'Swan-Neck Wing', category: 'spoiler', tier: 'premium', weight: 3.5, dragCoefficient: 0.016, downforce: 42, description: 'Top-mount swan-neck. Max-aero GT3 spec.', build: buildSwanNeckWing },
]

export const SIDE_SKIRTS: AeroCatalogEntry[] = [
  { id: 'skirts-oem', name: 'OEM Side Skirts', category: 'side_skirts', tier: 'oem', weight: 3, dragCoefficient: 0, description: 'Factory rocker panels.', build: buildOemSideSkirts },
  { id: 'skirts-sports', name: 'Sports Side Skirts', category: 'side_skirts', tier: 'aftermarket', weight: 2.5, dragCoefficient: -0.005, downforce: 3, description: 'Subtle sports skirts with duct slot.', build: buildSportsSideSkirts },
  { id: 'skirts-widebody', name: 'Widebody Skirts', category: 'side_skirts', tier: 'aftermarket', weight: 3, dragCoefficient: -0.008, downforce: 6, description: 'Stepped lower-edge widebody skirts.', build: buildWidebodySideSkirts },
  { id: 'skirts-carbon-race', name: 'Carbon Race Skirts', category: 'side_skirts', tier: 'premium', weight: 1.5, dragCoefficient: -0.012, downforce: 10, description: 'Full carbon with aero fins.', build: buildCarbonRaceSkirts },
  { id: 'skirts-offroad', name: 'Rock Sliders', category: 'side_skirts', tier: 'aftermarket', weight: 14, dragCoefficient: 0.01, description: 'Steel rock sliders for off-road protection.', build: buildOffroadRockSliders },
]

export const HOODS: AeroCatalogEntry[] = [
  { id: 'hood-stock', name: 'Stock Hood', category: 'hood', tier: 'oem', weight: 14, dragCoefficient: 0, description: 'Standard factory hood.', build: buildStockHood },
  { id: 'hood-scoop', name: 'Hood Scoop', category: 'hood', tier: 'aftermarket', weight: 12, dragCoefficient: 0.005, description: 'Center ram-air scoop for forced induction.', build: buildScoopHood },
  { id: 'hood-double-blister', name: 'Double Blister Hood', category: 'hood', tier: 'aftermarket', weight: 13, dragCoefficient: 0.003, description: 'Twin raised blisters for wide cam covers.', build: buildDoubleBlisterHood },
  { id: 'hood-carbon', name: 'Carbon Hood', category: 'hood', tier: 'premium', weight: 6, dragCoefficient: -0.002, description: 'Full carbon fiber, weight-optimized.', build: buildCarbonHood },
  { id: 'hood-vented', name: 'Louvered Vent Hood', category: 'hood', tier: 'premium', weight: 8, dragCoefficient: -0.004, downforce: 4, description: 'Three-row louvered vents for engine cooling.', build: buildFlatHoodWithVents },
]

export function getAeroPart(id: string): AeroCatalogEntry | undefined {
  return [
    ...FRONT_BUMPERS,
    ...REAR_BUMPERS,
    ...SPOILERS,
    ...SIDE_SKIRTS,
    ...HOODS,
  ].find((p) => p.id === id)
}