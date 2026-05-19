import * as THREE from 'three'

import type { PaintConfig, PaintFinish, WrapType } from '@decar/shared'

// ─── OEM color presets ────────────────────────────────────────────────────

export interface OemColorPreset {
  id: string
  name: string
  hex: number
  finish: PaintFinish
}

export const OEM_PRESETS: OemColorPreset[] = [
  { id: 'midnight-black', name: 'Midnight Black', hex: 0x0a0a0a, finish: 'metallic' },
  { id: 'alpine-white', name: 'Alpine White', hex: 0xf5f5f5, finish: 'gloss' },
  { id: 'interlagos-blue', name: 'Interlagos Blue', hex: 0x1a4f8a, finish: 'metallic' },
  { id: 'imola-red', name: 'Imola Red', hex: 0xcc1111, finish: 'gloss' },
  { id: 'nardo-grey', name: 'Nardo Grey', hex: 0x888888, finish: 'matte' },
  { id: 'sunset-orange', name: 'Sunset Orange', hex: 0xe85d04, finish: 'pearl' },
  { id: 'racing-green', name: 'British Racing Green', hex: 0x1a3a1a, finish: 'gloss' },
  { id: 'frozen-purple', name: 'Frozen Purple', hex: 0x5b2d8e, finish: 'matte' },
  { id: 'gold-bronze', name: 'Yas Marina Gold', hex: 0xb8860b, finish: 'metallic' },
  { id: 'chalk-white', name: 'Chalk Matte', hex: 0xe8e8e0, finish: 'matte' },
]

// ─── Material builder ─────────────────────────────────────────────────────

export function buildPaintMaterial(config: PaintConfig): THREE.MeshStandardMaterial {
  const base = new THREE.MeshStandardMaterial({ color: config.bodyColor })

  switch (config.finish) {
    case 'metallic':
      base.roughness = 0.25
      base.metalness = 0.6
      base.envMapIntensity = 1.2
      break
    case 'pearl':
      base.roughness = 0.18
      base.metalness = 0.3
      base.envMapIntensity = 1.5
      break
    case 'matte':
      base.roughness = 0.88
      base.metalness = 0.0
      base.envMapIntensity = 0.1
      break
    case 'satin':
      base.roughness = 0.55
      base.metalness = 0.1
      base.envMapIntensity = 0.6
      break
    case 'gloss':
    default:
      base.roughness = 0.08
      base.metalness = 0.05
      base.envMapIntensity = 1.8
      break
  }

  return base
}

export function buildRoofMaterial(config: PaintConfig): THREE.MeshStandardMaterial {
  const color = config.roofColor ?? config.bodyColor
  return buildPaintMaterial({ ...config, bodyColor: color })
}

// ─── Wrap materials ───────────────────────────────────────────────────────

export function buildWrapMaterial(wrapType: WrapType): THREE.MeshStandardMaterial {
  switch (wrapType) {
    case 'carbon':
      return new THREE.MeshStandardMaterial({
        color: 0x111111,
        roughness: 0.1,
        metalness: 0.0,
        envMapIntensity: 2.0,
      })
    case 'chrome':
      return new THREE.MeshStandardMaterial({
        color: 0xe8e8e8,
        roughness: 0.02,
        metalness: 1.0,
        envMapIntensity: 3.0,
      })
    case 'vinyl-gloss':
      return new THREE.MeshStandardMaterial({
        color: 0x222222,
        roughness: 0.06,
        metalness: 0.0,
        envMapIntensity: 1.4,
      })
    case 'vinyl-matte':
      return new THREE.MeshStandardMaterial({
        color: 0x333333,
        roughness: 0.85,
        metalness: 0.0,
        envMapIntensity: 0.05,
      })
    case 'brushed-metal':
      return new THREE.MeshStandardMaterial({
        color: 0xaaaaaa,
        roughness: 0.45,
        metalness: 0.95,
        envMapIntensity: 0.8,
      })
    default:
      return new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.4 })
  }
}

// ─── Window tint material ─────────────────────────────────────────────────

export function buildWindowMaterial(tint: number): THREE.MeshStandardMaterial {
  // tint: 0=limo, 5=very dark, 20=dark, 35=medium, 50=light
  const opacity = 0.1 + (tint / 50) * 0.55
  return new THREE.MeshStandardMaterial({
    color: 0x0a1020,
    roughness: 0.05,
    metalness: 0.1,
    transparent: true,
    opacity,
    envMapIntensity: 1.2,
  })
}

// ─── Apply paint to a car Group ───────────────────────────────────────────

export function applyPaintToGroup(
  group: THREE.Group,
  config: PaintConfig,
  options: { bodyMeshNames?: string[]; roofMeshName?: string; windowMeshNames?: string[] } = {},
): void {
  const paintMat = buildPaintMaterial(config)
  const roofMat = buildRoofMaterial(config)
  const windowMat = buildWindowMaterial(config.windowTint)

  const bodyNames = new Set(options.bodyMeshNames ?? ['body', 'hood', 'trunk', 'door', 'fender', 'bumper'])
  const roofName = options.roofMeshName ?? 'roof'
  const windowNames = new Set(options.windowMeshNames ?? ['glass', 'window', 'windshield'])

  group.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return
    const name = child.name.toLowerCase()

    if (name === roofName) {
      child.material = config.roofColor !== undefined ? roofMat : paintMat
    } else if ([...windowNames].some((w) => name.includes(w))) {
      child.material = windowMat
    } else if ([...bodyNames].some((b) => name.includes(b))) {
      child.material = config.wrapType ? buildWrapMaterial(config.wrapType) : paintMat
    }
  })
}