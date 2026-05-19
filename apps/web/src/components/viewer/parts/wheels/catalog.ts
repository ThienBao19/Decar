import * as THREE from 'three'

import type { WheelPartDef } from '@decar/shared'

export interface WheelCatalogEntry extends WheelPartDef {
  build(radius?: number, width?: number): THREE.Group
}

function tireMesh(r: number, w: number): THREE.Mesh {
  const geo = new THREE.TorusGeometry(r, r * 0.18, 12, 40)
  const mat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 })
  const m = new THREE.Mesh(geo, mat)
  m.rotation.y = Math.PI / 2
  m.scale.z = w / (r * 0.36)
  return m
}

function barrelMesh(r: number, w: number, color: number, roughness = 0.3): THREE.Mesh {
  const geo = new THREE.CylinderGeometry(r * 0.82, r * 0.82, w, 32)
  const mat = new THREE.MeshStandardMaterial({ color, roughness, metalness: 0.8 })
  const m = new THREE.Mesh(geo, mat)
  m.rotation.z = Math.PI / 2
  return m
}

function brakeMesh(r: number): THREE.Mesh {
  const geo = new THREE.CylinderGeometry(r * 0.45, r * 0.45, 0.04, 28)
  const mat = new THREE.MeshStandardMaterial({ color: 0xcc2200, roughness: 0.5, metalness: 0.4 })
  const m = new THREE.Mesh(geo, mat)
  m.rotation.z = Math.PI / 2
  return m
}

function capMesh(r: number, color: number): THREE.Mesh {
  const geo = new THREE.CylinderGeometry(r * 0.12, r * 0.12, 0.03, 16)
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.2, metalness: 0.9 })
  const m = new THREE.Mesh(geo, mat)
  m.rotation.z = Math.PI / 2
  return m
}

function addSpokes(
  group: THREE.Group,
  count: number,
  r: number,
  w: number,
  spokeR: number,
  color: number,
  roughness = 0.25,
): void {
  const mat = new THREE.MeshStandardMaterial({ color, roughness, metalness: 0.85 })
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2
    const geo = new THREE.BoxGeometry(w * 0.85, spokeR, r * 0.72)
    const m = new THREE.Mesh(geo, mat)
    m.position.set(0, Math.sin(angle) * r * 0.38, Math.cos(angle) * r * 0.38)
    m.rotation.x = angle
    group.add(m)
  }
}

function buildOem5Spoke(r = 0.32, w = 0.22): THREE.Group {
  const g = new THREE.Group()
  g.add(tireMesh(r, w))
  g.add(barrelMesh(r, w, 0x888888))
  addSpokes(g, 5, r, w, 0.055, 0x999999, 0.3)
  g.add(brakeMesh(r))
  g.add(capMesh(r, 0xaaaaaa))
  return g
}

function buildBbsRs(r = 0.33, w = 0.23): THREE.Group {
  const g = new THREE.Group()
  g.add(tireMesh(r, w))
  g.add(barrelMesh(r, w, 0xd4af37, 0.15))
  addSpokes(g, 16, r, w, 0.03, 0xe8c84a, 0.15)
  g.add(brakeMesh(r))
  g.add(capMesh(r, 0xd4af37))
  return g
}

function buildEnkeiRpf1(r = 0.32, w = 0.22): THREE.Group {
  const g = new THREE.Group()
  g.add(tireMesh(r, w))
  g.add(barrelMesh(r, w, 0xcccccc, 0.2))
  addSpokes(g, 10, r, w, 0.04, 0xdddddd, 0.2)
  g.add(brakeMesh(r))
  g.add(capMesh(r, 0xffffff))
  return g
}

function buildWorkMeister(r = 0.34, w = 0.24): THREE.Group {
  const g = new THREE.Group()
  g.add(tireMesh(r, w))
  g.add(barrelMesh(r, w, 0xe0e0e0, 0.1))
  addSpokes(g, 3, r, w, 0.08, 0xf0f0f0, 0.1)
  g.add(brakeMesh(r))
  g.add(capMesh(r, 0xe0e0e0))
  return g
}

function buildVolkTe37(r = 0.33, w = 0.23): THREE.Group {
  const g = new THREE.Group()
  g.add(tireMesh(r, w))
  g.add(barrelMesh(r, w, 0xc0c0c0, 0.18))
  addSpokes(g, 6, r, w, 0.07, 0xd8d8d8, 0.18)
  g.add(brakeMesh(r))
  g.add(capMesh(r, 0xff2200))
  return g
}

function buildCarbonCenterlock(r = 0.35, w = 0.25): THREE.Group {
  const g = new THREE.Group()
  g.add(tireMesh(r, w))
  const barrelGeo = new THREE.CylinderGeometry(r * 0.82, r * 0.82, w, 32)
  const barrelMat = new THREE.MeshStandardMaterial({
    color: 0x111111,
    roughness: 0.05,
    metalness: 0.0,
    envMapIntensity: 1.5,
  })
  const barrel = new THREE.Mesh(barrelGeo, barrelMat)
  barrel.rotation.z = Math.PI / 2
  g.add(barrel)
  addSpokes(g, 5, r, w, 0.065, 0x1a1a1a, 0.05)
  g.add(brakeMesh(r))
  const lockGeo = new THREE.CylinderGeometry(r * 0.08, r * 0.08, 0.05, 6)
  const lockMat = new THREE.MeshStandardMaterial({ color: 0xffcc00, roughness: 0.1, metalness: 1 })
  const lock = new THREE.Mesh(lockGeo, lockMat)
  lock.rotation.z = Math.PI / 2
  g.add(lock)
  return g
}

function buildTurbofan(r = 0.33, w = 0.22): THREE.Group {
  const g = new THREE.Group()
  g.add(tireMesh(r, w))
  const dishGeo = new THREE.CylinderGeometry(r * 0.82, r * 0.82, w * 0.6, 32)
  const dishMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.25, metalness: 0.9 })
  const dish = new THREE.Mesh(dishGeo, dishMat)
  dish.rotation.z = Math.PI / 2
  g.add(dish)
  addSpokes(g, 12, r, w * 0.3, 0.025, 0xbbbbbb, 0.2)
  g.add(brakeMesh(r))
  g.add(capMesh(r, 0x888888))
  return g
}

function buildForgedMesh(r = 0.34, w = 0.24): THREE.Group {
  const g = new THREE.Group()
  g.add(tireMesh(r, w))
  g.add(barrelMesh(r, w, 0x1a1a1a, 0.3))
  addSpokes(g, 20, r, w, 0.025, 0x2a2a2a, 0.3)
  g.add(brakeMesh(r))
  g.add(capMesh(r, 0x111111))
  return g
}

function buildOffroadBeadlock(r = 0.33, w = 0.26): THREE.Group {
  const g = new THREE.Group()
  g.add(tireMesh(r, w))
  g.add(barrelMesh(r, w, 0x3a3a3a, 0.6))
  const ringGeo = new THREE.TorusGeometry(r * 0.85, r * 0.045, 8, 32)
  const ringMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.7, metalness: 0.5 })
  const ring = new THREE.Mesh(ringGeo, ringMat)
  ring.rotation.y = Math.PI / 2
  g.add(ring)
  addSpokes(g, 8, r, w, 0.05, 0x555555, 0.6)
  g.add(brakeMesh(r))
  g.add(capMesh(r, 0x444444))
  return g
}

function buildAeroCover(r = 0.32, w = 0.22): THREE.Group {
  const g = new THREE.Group()
  g.add(tireMesh(r, w))
  const coverGeo = new THREE.CylinderGeometry(r * 0.8, r * 0.8, w * 0.15, 32)
  const coverMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.05, metalness: 0.1 })
  const cover = new THREE.Mesh(coverGeo, coverMat)
  cover.rotation.z = Math.PI / 2
  g.add(cover)
  g.add(brakeMesh(r))
  const logoGeo = new THREE.CylinderGeometry(r * 0.1, r * 0.1, 0.02, 16)
  const logoMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.3 })
  const logo = new THREE.Mesh(logoGeo, logoMat)
  logo.rotation.z = Math.PI / 2
  g.add(logo)
  return g
}

export const WHEELS: WheelCatalogEntry[] = [
  {
    id: 'oem-5spoke',
    name: 'OEM 5-Spoke',
    category: 'wheel',
    tier: 'oem',
    rimDiameter: 18,
    finish: 'gloss',
    weight: 22,
    gripMultiplier: 1.0,
    description: 'Factory-spec 5-spoke alloy. Reliable and balanced.',
    build: buildOem5Spoke,
  },
  {
    id: 'bbs-rs',
    name: 'BBS RS Gold',
    category: 'wheel',
    tier: 'aftermarket',
    rimDiameter: 19,
    finish: 'chrome',
    weight: 18,
    gripMultiplier: 1.04,
    description: 'Iconic BBS multi-spoke in polished gold. Lightweight forged.',
    build: buildBbsRs,
  },
  {
    id: 'enkei-rpf1',
    name: 'Enkei RPF1',
    category: 'wheel',
    tier: 'aftermarket',
    rimDiameter: 18,
    finish: 'gloss',
    weight: 16,
    gripMultiplier: 1.05,
    description: 'Ultra-light 10-spoke racing wheel. Track-proven.',
    build: buildEnkeiRpf1,
  },
  {
    id: 'work-meister',
    name: 'WORK Meister S1',
    category: 'wheel',
    tier: 'aftermarket',
    rimDiameter: 19,
    finish: 'gloss',
    weight: 17,
    gripMultiplier: 1.03,
    description: 'Aggressive 3-piece Y-spoke. Deep dish JDM classic.',
    build: buildWorkMeister,
  },
  {
    id: 'volk-te37',
    name: 'Volk TE37 SL',
    category: 'wheel',
    tier: 'premium',
    rimDiameter: 18,
    finish: 'gloss',
    weight: 14,
    gripMultiplier: 1.08,
    description: 'Race-derived 6-spoke forged magnesium. Stiff and featherweight.',
    build: buildVolkTe37,
  },
  {
    id: 'carbon-centerlock',
    name: 'Carbon Centerlock GT',
    category: 'wheel',
    tier: 'premium',
    rimDiameter: 20,
    finish: 'carbon',
    weight: 11,
    gripMultiplier: 1.12,
    description: 'Full carbon-fiber with gold centerlock nut. GT3-spec.',
    build: buildCarbonCenterlock,
  },
  {
    id: 'turbofan',
    name: 'Turbofan Dish',
    category: 'wheel',
    tier: 'aftermarket',
    rimDiameter: 18,
    finish: 'brushed',
    weight: 19,
    gripMultiplier: 1.02,
    description: 'Vintage turbine-style dish. Timeless aero aesthetic.',
    build: buildTurbofan,
  },
  {
    id: 'forged-mesh',
    name: 'Forged Mesh V2',
    category: 'wheel',
    tier: 'premium',
    rimDiameter: 20,
    finish: 'matte',
    weight: 15,
    gripMultiplier: 1.06,
    description: '20-spoke deep matte mesh. Aggressive fitment.',
    build: buildForgedMesh,
  },
  {
    id: 'offroad-beadlock',
    name: 'Off-Road Beadlock',
    category: 'wheel',
    tier: 'aftermarket',
    rimDiameter: 18,
    finish: 'matte',
    weight: 26,
    gripMultiplier: 1.15,
    description: 'Heavy beadlock ring for low-pressure off-road runs.',
    build: buildOffroadBeadlock,
  },
  {
    id: 'aero-cover',
    name: 'Aero EV Cover',
    category: 'wheel',
    tier: 'oem',
    rimDiameter: 20,
    finish: 'gloss',
    weight: 20,
    gripMultiplier: 1.0,
    description: 'Smooth aerodynamic disc cover. Range-optimized for EVs.',
    build: buildAeroCover,
  },
]

export function getWheel(id: string): WheelCatalogEntry | undefined {
  return WHEELS.find((w) => w.id === id)
}