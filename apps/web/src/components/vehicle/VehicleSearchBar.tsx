'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import type { FuelType } from '@decar/shared'

interface Props {
  initialMake?: string
  initialModel?: string
  initialYear?: string
  initialBodyType?: string
  initialFuelType?: FuelType
}

const FUEL_TYPES: FuelType[] = ['PETROL', 'DIESEL', 'ELECTRIC', 'HYBRID', 'HYDROGEN']
const BODY_TYPES = ['Sedan', 'SUV', 'Coupe', 'Hatchback', 'Pickup', 'Minivan', 'Convertible', 'Wagon']
const CURRENT_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: 30 }, (_, i) => String(CURRENT_YEAR - i))

export function VehicleSearchBar({ initialMake, initialModel, initialYear, initialBodyType, initialFuelType }: Props) {
  const router = useRouter()
  const [make, setMake] = useState(initialMake ?? '')
  const [model, setModel] = useState(initialModel ?? '')
  const [year, setYear] = useState(initialYear ?? '')
  const [bodyType, setBodyType] = useState(initialBodyType ?? '')
  const [fuelType, setFuelType] = useState<string>(initialFuelType ?? '')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const params = new URLSearchParams()
    if (make) params.set('make', make)
    if (model) params.set('model', model)
    if (year) params.set('year', year)
    if (bodyType) params.set('bodyType', bodyType)
    if (fuelType) params.set('fuelType', fuelType)
    router.push(`/vehicles?${params.toString()}`)
  }

  function handleClear() {
    setMake('')
    setModel('')
    setYear('')
    setBodyType('')
    setFuelType('')
    router.push('/vehicles')
  }

  const hasFilters = make || model || year || bodyType || fuelType

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {/* Main search row */}
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Make (e.g. Toyota)"
          value={make}
          onChange={(e) => setMake(e.target.value)}
          className="flex-1 rounded-lg border border-[#2e2e2e] bg-[#1c1c1c] px-4 py-2.5 text-[14px] text-[#fafafa] placeholder:text-[#4d4d4d] outline-none transition-colors focus:border-[#3ecf8e]"
        />
        <input
          type="text"
          placeholder="Model (e.g. Camry)"
          value={model}
          onChange={(e) => setModel(e.target.value)}
          className="flex-1 rounded-lg border border-[#2e2e2e] bg-[#1c1c1c] px-4 py-2.5 text-[14px] text-[#fafafa] placeholder:text-[#4d4d4d] outline-none transition-colors focus:border-[#3ecf8e]"
        />
        <button
          type="submit"
          className="rounded-[9999px] bg-[#3ecf8e] px-5 py-2.5 text-[14px] font-medium text-[#0f0f0f] transition-opacity hover:opacity-90"
        >
          Search
        </button>
      </div>

      {/* Filter row */}
      <div className="flex flex-wrap gap-2">
        <select
          value={year}
          onChange={(e) => setYear(e.target.value)}
          className="rounded-lg border border-[#2e2e2e] bg-[#1c1c1c] px-3 py-2 text-[13px] text-[#b4b4b4] outline-none transition-colors focus:border-[#3ecf8e]"
        >
          <option value="">Any year</option>
          {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>

        <select
          value={bodyType}
          onChange={(e) => setBodyType(e.target.value)}
          className="rounded-lg border border-[#2e2e2e] bg-[#1c1c1c] px-3 py-2 text-[13px] text-[#b4b4b4] outline-none transition-colors focus:border-[#3ecf8e]"
        >
          <option value="">Any body</option>
          {BODY_TYPES.map((b) => <option key={b} value={b}>{b}</option>)}
        </select>

        <select
          value={fuelType}
          onChange={(e) => setFuelType(e.target.value)}
          className="rounded-lg border border-[#2e2e2e] bg-[#1c1c1c] px-3 py-2 text-[13px] text-[#b4b4b4] outline-none transition-colors focus:border-[#3ecf8e]"
        >
          <option value="">Any fuel</option>
          {FUEL_TYPES.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>

        {hasFilters && (
          <button
            type="button"
            onClick={handleClear}
            className="rounded-lg border border-[#2e2e2e] px-3 py-2 text-[13px] text-[#898989] transition-colors hover:border-[#363636] hover:text-[#fafafa]"
          >
            Clear
          </button>
        )}
      </div>
    </form>
  )
}
