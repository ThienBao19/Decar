import { describe, it, expect } from 'vitest'

import {
  findModelForVehicle, getStudioModel, listCredits, listStudioModels, modelPath, resolveStudioModel,
} from './model-registry'

describe('model-registry', () => {
  it('returns the model whose longest alias matches', () => {
    expect(findModelForVehicle('BMW', 'M4 Competition')?.id).toBe('bmw-m4-g82')
    expect(findModelForVehicle('Porsche', '911 GT3 RS')?.id).toBe('porsche-911-gt3')
  })

  it('returns null when no alias matches', () => {
    expect(findModelForVehicle('Skoda', 'Octavia')).toBeNull()
  })

  it('matches whole words, so a longer model name is not mistaken for a shorter one', () => {
    expect(findModelForVehicle('BMW', 'M440i')).toBeNull()
    expect(findModelForVehicle('BMW', 'M40i')).toBeNull()
    expect(findModelForVehicle('BMW', 'M4')?.id).toBe('bmw-m4-g82')
  })

  it('ignores case and punctuation in names', () => {
    expect(findModelForVehicle('Mercedes-AMG', 'G63')?.id).toBe('mercedes-amg-g63')
    expect(findModelForVehicle('TESLA', 'Model 3')?.id).toBe('tesla-model-3')
  })

  it('returns studio models only when they meet the realism bar', () => {
    expect(getStudioModel('BMW', 'M4', 2024)?.studio?.lengthM).toBeGreaterThan(4)
    expect(getStudioModel('Toyota', 'Camry', 2024)).toBeNull()
  })

  it('returns a studio model only for the generation it depicts', () => {
    expect(getStudioModel('BMW', 'M4', 2021)?.id).toBe('bmw-m4-g82')
    expect(getStudioModel('BMW', 'M4', 2020)).toBeNull()
  })

  it('throws for an unknown model id', () => {
    expect(() => modelPath('does-not-exist')).toThrow(/Unknown model id/)
  })

  it('lists credits for models and environments', () => {
    const titles = listCredits().map((c) => c.title)
    expect(titles).toContain('Studio Small 09')
    expect(titles).toContain('BMW M4 Competition M Package (G82)')
  })

  it('returns the automatic match when no admin assignment exists', () => {
    expect(resolveStudioModel({ make: 'BMW', model: 'M4', year: 2024 }, null)?.id).toBe('bmw-m4-g82')
    expect(resolveStudioModel({ make: 'BMW', model: 'M4', year: 2015 }, null)).toBeNull()
  })

  it('returns the assigned model for any year, and nothing when assigned photos only', () => {
    expect(resolveStudioModel({ make: 'BMW', model: 'M4', year: 2015 }, { assetId: 'bmw-m4-g82' })?.id).toBe('bmw-m4-g82')
    expect(resolveStudioModel({ make: 'BMW', model: 'M4', year: 2024 }, { assetId: null })).toBeNull()
  })

  it('returns null for an assignment to a model without a studio config or an unknown id', () => {
    expect(resolveStudioModel({ make: 'Toyota', model: 'Camry', year: 2024 }, { assetId: 'toyota-camry' })).toBeNull()
    expect(resolveStudioModel({ make: 'BMW', model: 'M4', year: 2024 }, { assetId: 'nope' })).toBeNull()
  })

  it('lists only studio models', () => {
    expect(listStudioModels().map((m) => m.id)).toEqual(['bmw-m4-g82'])
  })
})
