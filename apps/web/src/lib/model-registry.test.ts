import { describe, it, expect } from 'vitest'

import { findModelForVehicle, getStudioModel, listCredits, modelPath } from './model-registry'

describe('model-registry', () => {
  it('returns the model whose longest alias matches', () => {
    expect(findModelForVehicle('BMW', 'M4 Competition')?.id).toBe('bmw-m4-g82')
    expect(findModelForVehicle('Porsche', '911 GT3 RS')?.id).toBe('porsche-911-gt3')
  })

  it('returns null when no alias matches', () => {
    expect(findModelForVehicle('Skoda', 'Octavia')).toBeNull()
  })

  it('returns studio models only when they meet the realism bar', () => {
    expect(getStudioModel('BMW', 'M4')?.studio?.lengthM).toBeGreaterThan(4)
    expect(getStudioModel('Toyota', 'Camry')).toBeNull()
  })

  it('throws for an unknown model id', () => {
    expect(() => modelPath('does-not-exist')).toThrow(/Unknown model id/)
  })

  it('lists credits for models and environments', () => {
    const titles = listCredits().map((c) => c.title)
    expect(titles).toContain('Studio Small 09')
    expect(titles).toContain('BMW M4 Competition M Package (G82)')
  })
})
