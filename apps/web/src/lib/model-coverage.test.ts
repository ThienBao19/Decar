import { describe, it, expect } from 'vitest'

import { buildCoverage, type CoverageVehicle } from './model-coverage'

let n = 0
const v = (make: string, model: string, year: number, assignment: CoverageVehicle['assignment'] = null): CoverageVehicle =>
  ({ id: `v${n++}`, make, model, year, assignment })

describe('buildCoverage', () => {
  it('returns year runs split where the outcome changes or a year is missing', () => {
    const { groups } = buildCoverage([
      v('BMW', 'M4', 2019), v('BMW', 'M4', 2020), v('BMW', 'M4', 2021), v('BMW', 'M4', 2022), v('BMW', 'M4', 2024),
    ])
    expect(groups[0]!.runs).toEqual([
      { from: 2019, to: 2020, assetId: null },
      { from: 2021, to: 2022, assetId: 'bmw-m4-g82' },
      { from: 2024, to: 2024, assetId: 'bmw-m4-g82' },
    ])
    expect(groups[0]).toMatchObject({ vehicleCount: 5, coveredCount: 3 })
  })

  it('groups make and model case-insensitively and sorts by vehicle count', () => {
    const { groups } = buildCoverage([v('Toyota', 'Camry', 2024), v('BMW', 'M4', 2024), v('bmw', 'm4', 2023)])
    expect(groups.map((g) => `${g.make} ${g.model} ${g.vehicleCount}`)).toEqual(['BMW M4 2', 'Toyota Camry 1'])
  })

  it('returns a year as covered when any trim of that year has a model', () => {
    const { groups } = buildCoverage([v('BMW', 'M4', 2015), v('BMW', 'M4', 2015, { assetId: 'bmw-m4-g82' })])
    expect(groups[0]!.runs).toEqual([{ from: 2015, to: 2015, assetId: 'bmw-m4-g82' }])
  })

  it('counts automatic and assigned uses per studio model, and nothing for photos-only', () => {
    const { usage } = buildCoverage([
      v('BMW', 'M4', 2024), v('BMW', 'M4', 2015, { assetId: 'bmw-m4-g82' }), v('BMW', 'M4', 2023, { assetId: null }),
    ])
    expect(usage).toHaveLength(1)
    expect(usage[0]).toMatchObject({ automatic: 1, assigned: 1 })
  })
})
