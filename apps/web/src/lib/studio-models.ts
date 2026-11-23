// Models that meet the realism bar (PBR materials, accurate shape). Vehicles without
// an entry here show photos only; low-poly stand-ins are never used in the studio.

export interface MaterialOverride {
  color?: string
  metalness?: number
  roughness?: number
  clearcoat?: number
  clearcoatRoughness?: number
  opacity?: number
}

export interface StudioModel {
  path: string
  // Real-world body length in metres; the model is scaled to it
  lengthM: number
  // Keys are substrings of glTF material names, matched case-insensitively
  materials: Record<string, MaterialOverride>
}

const PAINT: MaterialOverride = { metalness: 0.1, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.03 }

const STUDIO_MODELS: Record<string, StudioModel> = {
  'bmw m4': {
    path: '/models/vehicles/bmw_m4_competition.glb',
    lengthM: 4.79,
    materials: {
      body: PAINT,
      livery: PAINT,
      zx1: PAINT,
      windows: { roughness: 0.02, metalness: 0, opacity: 0.35 },
      headlight: { roughness: 0.02, metalness: 0, opacity: 0.25 },
      chrome: { color: '#d8d8d8', metalness: 1, roughness: 0.12 },
      rim: { metalness: 0.85, roughness: 0.28 },
      black161: { roughness: 0.55 },
      pillars: { roughness: 0.35, clearcoat: 1, clearcoatRoughness: 0.05 },
      caliper: { roughness: 0.4 },
      interior: { roughness: 0.8, metalness: 0 },
      dash: { roughness: 0.7 },
      logo: { roughness: 0.25 },
    },
  },
}

export function getStudioModel(make: string, model: string): StudioModel | null {
  const key = `${make} ${model}`.toLowerCase()
  const match = Object.keys(STUDIO_MODELS)
    .sort((a, b) => b.length - a.length)
    .find((k) => key.includes(k))
  return match ? STUDIO_MODELS[match] ?? null : null
}