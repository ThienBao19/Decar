import * as THREE from 'three'

import type { PartDef } from '@decar/shared'

export interface ExhaustCatalogEntry extends PartDef {
  build(): THREE.Group
}

function pipeMat(color: number, roughness = 0.25): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness: 0.9 })
}

function buildSingleCenter(): THREE.Group {
  const g = new THREE.Group()
  const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.22, 16), pipeMat(0x888888))
  pipe.rotation.x = Math.PI / 2
  g.add(pipe)
  return g
}

function buildDualTip(): THREE.Group {
  const g = new THREE.Group()
  for (const x of [-0.12, 0.12]) {
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.22, 16), pipeMat(0x999999))
    pipe.rotation.x = Math.PI / 2
    pipe.position.x = x
    g.add(pipe)
  }
  return g
}

function buildQuadTip(): THREE.Group {
  const g = new THREE.Group()
  for (const [px, py] of [[-0.18, 0.05], [-0.06, 0.05], [0.06, 0.05], [0.18, 0.05]] as [number, number][]) {
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.22, 16), pipeMat(0xaaaaaa))
    pipe.rotation.x = Math.PI / 2
    pipe.position.set(px, py - 0.05, 0)
    g.add(pipe)
  }
  return g
}

function buildTitaniumSingle(): THREE.Group {
  const g = new THREE.Group()
  const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.055, 0.26, 16), pipeMat(0x9b8faa, 0.15))
  pipe.rotation.x = Math.PI / 2
  g.add(pipe)
  const inner = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.04, 16), new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9 }))
  inner.rotation.x = Math.PI / 2
  inner.position.z = 0.11
  g.add(inner)
  return g
}

function buildStraightPipe(): THREE.Group {
  const g = new THREE.Group()
  for (const x of [-0.15, 0.15]) {
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.32, 16), pipeMat(0x777777, 0.4))
    pipe.rotation.x = Math.PI / 2
    pipe.position.set(x, -0.02, 0)
    g.add(pipe)
  }
  return g
}

function buildOvalDual(): THREE.Group {
  const g = new THREE.Group()
  for (const x of [-0.14, 0.14]) {
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.055, 0.2, 12), pipeMat(0xbbbbbb, 0.2))
    pipe.rotation.x = Math.PI / 2
    pipe.position.x = x
    g.add(pipe)
  }
  return g
}

function buildCenterExitRace(): THREE.Group {
  const g = new THREE.Group()
  const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.065, 0.28, 16), pipeMat(0x444444, 0.15))
  pipe.rotation.x = Math.PI / 2
  g.add(pipe)
  const heat = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.068, 0.04, 16), new THREE.MeshStandardMaterial({ color: 0xff6600, emissive: 0xff3300, emissiveIntensity: 0.4, roughness: 0.4 }))
  heat.rotation.x = Math.PI / 2
  heat.position.z = 0.12
  g.add(heat)
  return g
}

export const EXHAUSTS: ExhaustCatalogEntry[] = [
  { id: 'exhaust-single-center', name: 'Single Center Exit', category: 'exhaust', tier: 'oem', weight: 8, description: 'Standard single-tip center exhaust.', build: buildSingleCenter },
  { id: 'exhaust-dual-tip', name: 'Dual Tip', category: 'exhaust', tier: 'aftermarket', weight: 7, description: 'Classic dual-tip sports exhaust.', build: buildDualTip },
  { id: 'exhaust-quad-tip', name: 'Quad Tip', category: 'exhaust', tier: 'aftermarket', weight: 9, description: 'Four-tip exhaust for an aggressive look.', build: buildQuadTip },
  { id: 'exhaust-titanium', name: 'Titanium Single', category: 'exhaust', tier: 'premium', weight: 4, description: 'Titanium heat-gradient single exit.', build: buildTitaniumSingle },
  { id: 'exhaust-straight-pipe', name: 'Straight Pipe', category: 'exhaust', tier: 'aftermarket', weight: 5, description: 'Unmuffled straight pipes. Very loud.', build: buildStraightPipe },
  { id: 'exhaust-oval-dual', name: 'Oval Dual', category: 'exhaust', tier: 'aftermarket', weight: 7, description: 'Polished oval-tip dual exhaust.', build: buildOvalDual },
  { id: 'exhaust-center-race', name: 'Center Exit Race', category: 'exhaust', tier: 'premium', weight: 3, description: 'Single large center-exit with heat glow.', build: buildCenterExitRace },
]

export function getExhaust(id: string): ExhaustCatalogEntry | undefined {
  return EXHAUSTS.find((e) => e.id === id)
}