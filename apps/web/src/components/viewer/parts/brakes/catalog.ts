import * as THREE from 'three'

import type { PartDef } from '@decar/shared'

export interface BrakeCatalogEntry extends PartDef {
  build(wheelRadius?: number): THREE.Group
}

function caliperMat(color: number): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.45, metalness: 0.5 })
}

function rotorMat(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.5, metalness: 0.8 })
}

function buildOemCaliper(r = 0.32): THREE.Group {
  const g = new THREE.Group()
  const rotor = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.46, r * 0.46, 0.035, 28), rotorMat())
  rotor.rotation.z = Math.PI / 2
  g.add(rotor)
  const caliper = new THREE.Mesh(new THREE.BoxGeometry(0.06, r * 0.28, 0.12), caliperMat(0x333333))
  caliper.position.set(0.045, r * 0.32, 0)
  g.add(caliper)
  return g
}

function buildBremboRedCaliper(r = 0.32): THREE.Group {
  const g = new THREE.Group()
  const rotor = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.48, r * 0.48, 0.04, 28), rotorMat())
  rotor.rotation.z = Math.PI / 2
  g.add(rotor)
  const caliper = new THREE.Mesh(new THREE.BoxGeometry(0.07, r * 0.3, 0.14), caliperMat(0xcc0000))
  caliper.position.set(0.048, r * 0.34, 0)
  g.add(caliper)
  // Brembo text slab
  const logo = new THREE.Mesh(new THREE.BoxGeometry(0.005, r * 0.06, 0.1), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 }))
  logo.position.set(0.082, r * 0.34, 0)
  g.add(logo)
  return g
}

function buildCarbonCeramicCaliper(r = 0.32): THREE.Group {
  const g = new THREE.Group()
  // CC rotor — cross-drilled pattern (approximated)
  const rotor = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.48, r * 0.48, 0.038, 28), new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.3, metalness: 0.7 }))
  rotor.rotation.z = Math.PI / 2
  g.add(rotor)
  const caliper = new THREE.Mesh(new THREE.BoxGeometry(0.075, r * 0.32, 0.15), caliperMat(0xffcc00))
  caliper.position.set(0.05, r * 0.35, 0)
  g.add(caliper)
  return g
}

function buildAlconRacingCaliper(r = 0.32): THREE.Group {
  const g = new THREE.Group()
  const rotor = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.5, r * 0.5, 0.042, 32), new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.25, metalness: 0.85 }))
  rotor.rotation.z = Math.PI / 2
  g.add(rotor)
  // 6-piston monoblock caliper
  const caliper = new THREE.Mesh(new THREE.BoxGeometry(0.08, r * 0.34, 0.17), caliperMat(0x2244aa))
  caliper.position.set(0.052, r * 0.36, 0)
  g.add(caliper)
  for (let i = 0; i < 3; i++) {
    const piston = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.035, 12), new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.3, metalness: 0.9 }))
    piston.rotation.x = Math.PI / 2
    piston.position.set(0.09, r * 0.36 + (i - 1) * 0.055, 0)
    g.add(piston)
  }
  return g
}

export const BRAKE_CALIPERS: BrakeCatalogEntry[] = [
  { id: 'brake-oem', name: 'OEM Caliper', category: 'brake_caliper', tier: 'oem', weight: 8, description: 'Factory steel caliper, black finish.', build: buildOemCaliper },
  { id: 'brake-brembo-red', name: 'Brembo Red', category: 'brake_caliper', tier: 'aftermarket', weight: 6, gripMultiplier: 1.04, description: 'Iconic Brembo red caliper with logo.', build: buildBremboRedCaliper },
  { id: 'brake-carbon-ceramic', name: 'Carbon Ceramic', category: 'brake_caliper', tier: 'premium', weight: 3.5, gripMultiplier: 1.1, description: 'Carbon-ceramic rotor with gold caliper.', build: buildCarbonCeramicCaliper },
  { id: 'brake-alcon-racing', name: 'Alcon Racing 6-Pot', category: 'brake_caliper', tier: 'premium', weight: 4, gripMultiplier: 1.14, description: 'Alcon 6-piston monoblock race caliper.', build: buildAlconRacingCaliper },
]

export function getBrakeCaliper(id: string): BrakeCatalogEntry | undefined {
  return BRAKE_CALIPERS.find((b) => b.id === id)
}