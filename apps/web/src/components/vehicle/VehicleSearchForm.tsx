'use client'

import { useRouter } from 'next/navigation'
import { useState, useCallback, useEffect, useRef } from 'react'

interface Props {
  popularMakes: string[]
  years: number[]
  initialMake?: string
  initialModel?: string
  initialYear?: string
}

export function VehicleSearchForm({
  popularMakes,
  years,
  initialMake,
  initialModel,
  initialYear,
}: Props) {
  const router = useRouter()
  const [make, setMake] = useState(initialMake ?? '')
  const [model, setModel] = useState(initialModel ?? '')
  const [year, setYear] = useState(initialYear ?? '')
  const [modelSuggestions, setModelSuggestions] = useState<string[]>([])
  const [showMakeSuggestions, setShowMakeSuggestions] = useState(false)
  const [showModelSuggestions, setShowModelSuggestions] = useState(false)
  const [loading, setLoading] = useState(false)
  const makeRef = useRef<HTMLDivElement>(null)
  const modelRef = useRef<HTMLDivElement>(null)

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (makeRef.current && !makeRef.current.contains(e.target as Node)) {
        setShowMakeSuggestions(false)
      }
      if (modelRef.current && !modelRef.current.contains(e.target as Node)) {
        setShowModelSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Fetch models when make changes
  const fetchModels = useCallback(async (makeName: string, yearVal?: string) => {
    if (!makeName) {
      setModelSuggestions([])
      return
    }
    try {
      const params = new URLSearchParams({ make: makeName })
      if (yearVal) params.set('year', yearVal)
      const res = await fetch(`/api/vehicles/models?${params.toString()}`)
      const json = await res.json()
      setModelSuggestions(json.data ?? [])
    } catch {
      setModelSuggestions([])
    }
  }, [])

  // Debounced model fetch
  useEffect(() => {
    if (make.length < 2) return
    const timer = setTimeout(() => fetchModels(make, year), 300)
    return () => clearTimeout(timer)
  }, [make, year, fetchModels])

  // Filter makes for autocomplete
  const filteredMakes = make.length > 0
    ? popularMakes.filter((m) => m.toLowerCase().includes(make.toLowerCase()))
    : popularMakes

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!make) return
    setLoading(true)
    const params = new URLSearchParams()
    params.set('make', make)
    if (model) params.set('model', model)
    if (year) params.set('year', year)
    router.push(`/vehicles?${params.toString()}`)
  }

  function selectMake(m: string) {
    setMake(m)
    setModel('')
    setShowMakeSuggestions(false)
    fetchModels(m, year)
  }

  function selectModel(m: string) {
    setModel(m)
    setShowModelSuggestions(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex gap-2">
        {/* Make input with autocomplete */}
        <div ref={makeRef} className="relative flex-1">
          <input
            type="text"
            placeholder="Make (e.g. Toyota, BMW, Porsche)"
            value={make}
            onChange={(e) => {
              setMake(e.target.value)
              setShowMakeSuggestions(true)
            }}
            onFocus={() => setShowMakeSuggestions(true)}
            className="w-full rounded-lg border border-[#2e2e2e] bg-[#1c1c1c] px-4 py-2.5 text-[14px] text-[#fafafa] placeholder:text-[#4d4d4d] outline-none transition-colors focus:border-[#3ecf8e]"
          />
          {showMakeSuggestions && filteredMakes.length > 0 && (
            <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-y-auto rounded-lg border border-[#2e2e2e] bg-[#171717] shadow-xl">
              {filteredMakes.slice(0, 12).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => selectMake(m)}
                  className="flex w-full items-center px-4 py-2.5 text-left text-[13px] text-[#b4b4b4] hover:bg-[#1c1c1c] hover:text-[#fafafa] transition-colors"
                >
                  {m}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Model input with autocomplete */}
        <div ref={modelRef} className="relative flex-1">
          <input
            type="text"
            placeholder="Model (e.g. Camry, 911, Civic)"
            value={model}
            onChange={(e) => {
              setModel(e.target.value)
              setShowModelSuggestions(true)
            }}
            onFocus={() => setShowModelSuggestions(true)}
            className="w-full rounded-lg border border-[#2e2e2e] bg-[#1c1c1c] px-4 py-2.5 text-[14px] text-[#fafafa] placeholder:text-[#4d4d4d] outline-none transition-colors focus:border-[#3ecf8e]"
          />
          {showModelSuggestions && modelSuggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-y-auto rounded-lg border border-[#2e2e2e] bg-[#171717] shadow-xl">
              {modelSuggestions
                .filter((m) => !model || m.toLowerCase().includes(model.toLowerCase()))
                .slice(0, 15)
                .map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => selectModel(m)}
                    className="flex w-full items-center px-4 py-2.5 text-left text-[13px] text-[#b4b4b4] hover:bg-[#1c1c1c] hover:text-[#fafafa] transition-colors"
                  >
                    {m}
                  </button>
                ))}
            </div>
          )}
        </div>

        {/* Year select */}
        <select
          value={year}
          onChange={(e) => setYear(e.target.value)}
          className="rounded-lg border border-[#2e2e2e] bg-[#1c1c1c] px-3 py-2.5 text-[13px] text-[#b4b4b4] outline-none transition-colors focus:border-[#3ecf8e]"
        >
          <option value="">All years</option>
          {years.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>

        {/* Search button */}
        <button
          type="submit"
          disabled={!make || loading}
          className="rounded-[9999px] bg-[#3ecf8e] px-6 py-2.5 text-[14px] font-medium text-[#0f0f0f] transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#0f0f0f]/30 border-t-[#0f0f0f]" />
              Searching
            </span>
          ) : (
            'Search'
          )}
        </button>
      </div>

      {(make || model || year) && (
        <div className="flex items-center gap-2">
          <span className="text-[12px] text-[#4d4d4d]">Filters:</span>
          {make && (
            <span className="flex items-center gap-1 rounded-full border border-[#2e2e2e] bg-[#1c1c1c] px-2.5 py-1 text-[12px] text-[#b4b4b4]">
              {make}
              <button
                type="button"
                onClick={() => { setMake(''); setModel('') }}
                className="ml-0.5 text-[#4d4d4d] hover:text-[#fafafa]"
              >x</button>
            </span>
          )}
          {model && (
            <span className="flex items-center gap-1 rounded-full border border-[#2e2e2e] bg-[#1c1c1c] px-2.5 py-1 text-[12px] text-[#b4b4b4]">
              {model}
              <button
                type="button"
                onClick={() => setModel('')}
                className="ml-0.5 text-[#4d4d4d] hover:text-[#fafafa]"
              >x</button>
            </span>
          )}
          {year && (
            <span className="flex items-center gap-1 rounded-full border border-[#2e2e2e] bg-[#1c1c1c] px-2.5 py-1 text-[12px] text-[#b4b4b4]">
              {year}
              <button
                type="button"
                onClick={() => setYear('')}
                className="ml-0.5 text-[#4d4d4d] hover:text-[#fafafa]"
              >x</button>
            </span>
          )}
          <button
            type="button"
            onClick={() => { setMake(''); setModel(''); setYear(''); router.push('/vehicles') }}
            className="text-[12px] text-[#898989] hover:text-[#3ecf8e]"
          >
            Clear all
          </button>
        </div>
      )}
    </form>
  )
}