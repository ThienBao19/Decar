import type { Metadata } from 'next'
import type { VehicleListItemDTO, VehicleSearchParams } from '@decar/shared'
import { VehicleCard } from '@/components/vehicle/VehicleCard'
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

  const result = await apiClient.get<{ data: VehicleListItemDTO[]; total: number }>(
    `/vehicles?${params.toString()}`,
  )

  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      <h1 className="text-3xl font-bold text-gray-900">Browse Vehicles</h1>
      <p className="mt-2 text-gray-500">
        {result.total.toLocaleString()} vehicles in the database
      </p>

      {result.data.length === 0 ? (
        <div className="mt-16 text-center text-gray-400">No vehicles found.</div>
      ) : (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {result.data.map((vehicle) => (
            <VehicleCard key={vehicle.id} vehicle={vehicle} />
          ))}
        </div>
      )}
    </div>
  )
}
