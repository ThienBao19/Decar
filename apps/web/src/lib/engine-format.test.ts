import { describe, it, expect } from 'vitest'

import { formatPower, formatTorque } from './engine-format'

describe('formatPower', () => {
  it('returns a dash when power is unknown (0)', () => {
    expect(formatPower(0)).toBe('—')
  })

  it('returns kW with converted hp', () => {
    expect(formatPower(100)).toBe('100 kW (134 hp)')
  })
})

describe('formatTorque', () => {
  it('returns a dash when torque is unknown (0)', () => {
    expect(formatTorque(0)).toBe('—')
  })

  it('returns Nm with converted lb-ft', () => {
    expect(formatTorque(400)).toBe('400 Nm (295 lb-ft)')
  })
})
