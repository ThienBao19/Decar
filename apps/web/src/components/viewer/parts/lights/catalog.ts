import * as THREE from 'three'

import type { PartDef } from '@decar/shared'

export interface LightCatalogEntry extends PartDef {
  build(emissive?: number): THREE.Group
}

function lensMat(color: number, emissive: number, intensity = 0.6): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, emissive, emissiveIntensity: intensity, roughness: 0.05, metalness: 0 })
}

function housingMat(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.4, metalness: 0.6 })
}

// ─── HEADLIGHTS ───────────────────────────────────────────────────────────

function buildHalogenHeadlight(emissive = 0xffffcc): THREE.Group {
  const g = new THREE.Group()
  const housing = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.16, 0.12), housingMat())
  g.add(housing)
  const lens = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.12, 0.04), lensMat(0xffffee, emissive, 0.5))
  lens.position.z = 0.04
  g.add(lens)
  return g
}

function buildProjectorHeadlight(emissive = 0xffffff): THREE.Group {
  const g = new THREE.Group()
  const housing = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.18, 0.14), housingMat())
  g.add(housing)
  // projector bowl
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.075, 0.06, 20), lensMat(0xffffff, emissive, 0.8))
  bowl.rotation.x = Math.PI / 2
  bowl.position.set(-0.06, 0, 0.05)
  g.add(bowl)
  // DRL strip
  const drl = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.02, 0.02), lensMat(0xffffff, 0xffffff, 1.0))
  drl.position.set(0, -0.07, 0.06)
  g.add(drl)
  return g
}

function buildLedMatrixHeadlight(emissive = 0xffffff): THREE.Group {
  const g = new THREE.Group()
  const housing = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.2, 0.14), housingMat())
  g.add(housing)
  // matrix pixel grid 4x2
  for (let col = 0; col < 4; col++) {
    for (let row = 0; row < 2; row++) {
      const px = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.06, 0.02), lensMat(0xffffff, emissive, 0.9))
      px.position.set(-0.14 + col * 0.085, -0.03 + row * 0.07, 0.07)
      g.add(px)
    }
  }
  // signature DRL
  const drl = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.018, 0.02), lensMat(0xffffff, 0xffffff, 1.2))
  drl.position.set(0, 0.09, 0.07)
  g.add(drl)
  return g
}

function buildLaserHeadlight(emissive = 0xe8f4ff): THREE.Group {
  const g = new THREE.Group()
  const housing = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.2, 0.15), housingMat())
  g.add(housing)
  // laser module (blue-white glow)
  const laser = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.05, 16), lensMat(emissive, emissive, 1.4))
  laser.rotation.x = Math.PI / 2
  laser.position.set(0, 0, 0.07)
  g.add(laser)
  const drl = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.016, 0.02), lensMat(emissive, emissive, 1.3))
  drl.position.set(0, 0.092, 0.07)
  g.add(drl)
  return g
}

function buildRetroRoundHeadlight(emissive = 0xffee88): THREE.Group {
  const g = new THREE.Group()
  // Retro round style (muscle car)
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.02, 8, 24), new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.2, metalness: 0.9 }))
  ring.rotation.y = Math.PI / 2
  g.add(ring)
  const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.04, 24), lensMat(0xffffcc, emissive, 0.7))
  lens.rotation.x = Math.PI / 2
  g.add(lens)
  return g
}

// ─── TAILLIGHTS ───────────────────────────────────────────────────────────

function buildStandardTaillight(): THREE.Group {
  const g = new THREE.Group()
  const housing = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.14, 0.08), housingMat())
  g.add(housing)
  const lens = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.1, 0.03), lensMat(0xdd0000, 0xcc0000, 0.4))
  lens.position.z = 0.035
  g.add(lens)
  return g
}

function buildLedBarTaillight(): THREE.Group {
  const g = new THREE.Group()
  const housing = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.1, 0.08), housingMat())
  g.add(housing)
  // full-width LED bar
  const bar = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.022, 0.025), lensMat(0xff1111, 0xee0000, 0.9))
  bar.position.z = 0.04
  g.add(bar)
  return g
}

function buildTriangularTaillight(): THREE.Group {
  const g = new THREE.Group()
  const housing = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.22, 0.09), housingMat())
  g.add(housing)
  // inner chevron strips
  for (let i = 0; i < 3; i++) {
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.15 - i * 0.04, 0.025), lensMat(0xff2200, 0xcc1100, 0.7))
    strip.position.set(0.1 - i * 0.1, 0, 0.04)
    g.add(strip)
  }
  return g
}

function buildOledTaillight(): THREE.Group {
  const g = new THREE.Group()
  const housing = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.16, 0.07), housingMat())
  g.add(housing)
  // OLED panel — seamless full-surface glow
  const panel = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.12, 0.02), lensMat(0xff0000, 0xff0000, 1.1))
  panel.position.z = 0.035
  g.add(panel)
  return g
}

export const HEADLIGHTS: LightCatalogEntry[] = [
  { id: 'hl-halogen', name: 'Halogen Headlight', category: 'headlight', tier: 'oem', weight: 3, description: 'Classic halogen sealed beam.', build: buildHalogenHeadlight },
  { id: 'hl-projector', name: 'Projector + DRL', category: 'headlight', tier: 'aftermarket', weight: 4, description: 'Projector bowl with LED DRL strip.', build: buildProjectorHeadlight },
  { id: 'hl-led-matrix', name: 'LED Matrix', category: 'headlight', tier: 'aftermarket', weight: 4.5, description: '8-pixel adaptive LED matrix with DRL.', build: buildLedMatrixHeadlight },
  { id: 'hl-laser', name: 'Laser Headlight', category: 'headlight', tier: 'premium', weight: 3.5, description: 'Blue-white laser module, max visibility.', build: buildLaserHeadlight },
  { id: 'hl-retro-round', name: 'Retro Round', category: 'headlight', tier: 'aftermarket', weight: 3, description: 'Classic round muscle-car chrome bezel.', build: buildRetroRoundHeadlight },
]

export const TAILLIGHTS: LightCatalogEntry[] = [
  { id: 'tl-standard', name: 'Standard Taillight', category: 'taillight', tier: 'oem', weight: 2, description: 'Factory LED tail cluster.', build: buildStandardTaillight },
  { id: 'tl-led-bar', name: 'Full-Width LED Bar', category: 'taillight', tier: 'aftermarket', weight: 2.5, description: 'Continuous LED bar spanning the trunk.', build: buildLedBarTaillight },
  { id: 'tl-triangular', name: 'Chevron Taillight', category: 'taillight', tier: 'aftermarket', weight: 2.5, description: 'Angled chevron LED strips.', build: buildTriangularTaillight },
  { id: 'tl-oled', name: 'OLED Panel', category: 'taillight', tier: 'premium', weight: 2, description: 'Seamless full-surface OLED taillight.', build: buildOledTaillight },
]

export function getHeadlight(id: string): LightCatalogEntry | undefined {
  return HEADLIGHTS.find((h) => h.id === id)
}

export function getTaillight(id: string): LightCatalogEntry | undefined {
  return TAILLIGHTS.find((t) => t.id === id)
}