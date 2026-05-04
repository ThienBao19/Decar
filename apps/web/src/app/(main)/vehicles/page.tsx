import type { Metadata } from 'next'
import type { VehicleListItemDTO, VehicleSearchParams } from '@decar/shared'
import { VehicleCard } from '@/components/vehicle/VehicleCard'
import { VehicleSearchBar } from '@/components/vehicle/VehicleSearchBar'
import { apiClient } from '@/lib/api-client'

export const metadata: Metadata = { title: 'Browse Vehicles' }

interface PageProps {
  searchParams: VehicleSearchParams & { page?: string }
}

export default async function VehiclesPage({ searchParams }: PageProps) {
  const params = new URLSearchParams()
  if (searchParams.make) params.set('make', searchParams.make)
  if (searchParams.model) params.set('model', searchParams.model)
  if (searchParams.year) params.set('year', String(searchParams.year))
  if (searchParams.fuelType) params.set('fuelType', searchParams.fuelType)
  if (searchParams.bodyType) params.set('bodyType', searchParams.bodyType)
  params.set('page', searchParams.page ?? '1')
  params.set('limit', '24')

  let result: { data: VehicleListItemDTO[]; total: number } = { data: [], total: 0 }
  try {
    result = await apiClient.get<{ data: VehicleListItemDTO[]; total: number }>(
      `/vehicles?${params.toString()}`,
    )
  } catch {
    // API unavailable — show empty state
  }

  const hasFilters = !!(searchParams.make || searchParams.model || searchParams.year
    || searchParams.fuelType || searchParams.bodyType)

  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-[28px] font-semibold tracking-tight text-[#fafafa]">Browse Vehicles</h1>
        <p className="text-[14px] text-[#898989]">
          {result.total > 0
            ? `${result.total.toLocaleString()} vehicles in the database`
            : 'Search the vehicle database'}
        </p>
      </div>

      {/* Search & filters */}
      <div className="mt-8">
        <VehicleSearchBar
          {...(searchParams.make ? { initialMake: searchParams.make } : {})}
          {...(searchParams.model ? { initialModel: searchParams.model } : {})}
          {...(searchParams.year ? { initialYear: String(searchParams.year) } : {})}
          {...(searchParams.bodyType ? { initialBodyType: searchParams.bodyType } : {})}
          {...(searchParams.fuelType ? { initialFuelType: searchParams.fuelType } : {})}
        />
      </div>

      {/* Results */}
      {result.data.length === 0 ? (
        <div className="mt-20 flex flex-col items-center gap-3 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[#2e2e2e] bg-[#1c1c1c]">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4d4d4d" strokeWidth="2">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
          </div>
          <p className="text-[15px] font-medium text-[#898989]">
            {hasFilters ? 'No vehicles match your filters' : 'No vehicles in the database yet'}
          </p>
          {hasFilters && (
            <a href="/vehicles" className="text-[13px] text-[#3ecf8e] hover:underline">
              Clear filters
            </a>
          )}
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {result.data.map((vehicle) => (
            <VehicleCard key={vehicle.id} vehicle={vehicle} />
          ))}
        </div>
      )}
    </div>
  )
}
