import { notFound } from 'next/navigation'
import { getServerSession } from 'next-auth'
import type { Metadata } from 'next'
import type { VehicleDetailDTO } from '@decar/shared'
import { authOptions } from '@/lib/auth'
import { apiClient } from '@/lib/api-client'
import { VehicleSpecs } from '@/components/vehicle/VehicleSpecs'
import { ColorSwatch } from '@/components/vehicle/ColorSwatch'
import { UpgradeGate } from '@/components/viewer/UpgradeGate'
import { Engine3DViewer } from '@/components/viewer/Engine3DViewer'
import { ExteriorViewer } from '@/components/viewer/ExteriorViewer'

// ISR: revalidate vehicle pages every hour
export const revalidate = 3600

interface PageProps {
  params: { id: string }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const vehicle = await fetchVehicle(params.id)
  if (!vehicle) return { title: 'Vehicle Not Found' }
  return {
    title: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
    description: `Full specs for the ${vehicle.year} ${vehicle.make} ${vehicle.model}.`,
  }
}

async function fetchVehicle(id: string): Promise<VehicleDetailDTO | null> {
  try {
    return await apiClient.get<VehicleDetailDTO>(`/vehicles/${id}`)
  } catch {
    return null
  }
}

export default async function VehicleDetailPage({ params }: PageProps) {
  const [vehicle, session] = await Promise.all([
    fetchVehicle(params.id),
    getServerSession(authOptions),
  ])

  if (!vehicle) notFound()

  const isPro = session?.user?.tier === 'PRO'

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900">
          {vehicle.year} {vehicle.make} {vehicle.model}
        </h1>
        {vehicle.trimLevel && (
          <p className="mt-1 text-lg text-gray-500">{vehicle.trimLevel}</p>
        )}
      </div>

      <div className="grid gap-10 lg:grid-cols-3">
        {/* Left column: viewer */}
        <div className="lg:col-span-2 space-y-6">
          {/* Exterior 360° viewer */}
          <div>
            <h2 className="mb-3 text-xl font-semibold text-gray-800">Exterior</h2>
            {isPro ? (
              <ExteriorViewer vehicleId={vehicle.id} />
            ) : (
              <UpgradeGate label="360° Exterior View" />
            )}
          </div>

          {/* Engine 3D viewer */}
          <div>
            <h2 className="mb-3 text-xl font-semibold text-gray-800">Engine</h2>
            {isPro ? (
              <Engine3DViewer vehicleId={vehicle.id} />
            ) : (
              <UpgradeGate label="Interactive 3D Engine" />
            )}
          </div>
        </div>

        {/* Right column: specs */}
        <div className="space-y-6">
          {vehicle.engine && <VehicleSpecs engine={vehicle.engine} />}
          {vehicle.exterior?.colors && vehicle.exterior.colors.length > 0 && (
            <div>
              <h2 className="mb-3 text-lg font-semibold text-gray-800">Paint Colors</h2>
              <div className="flex flex-wrap gap-2">
                {vehicle.exterior.colors.map((color) => (
                  <ColorSwatch key={color.id} color={color} />
                ))}
              </div>
            </div>
          )}

          {isPro && (
            <a
              href={`${process.env.NEXT_PUBLIC_API_URL}/vehicles/${vehicle.id}/export/pdf`}
              className="block w-full rounded-lg border border-brand-500 px-4 py-2.5 text-center text-sm font-medium text-brand-600 hover:bg-brand-50"
              target="_blank"
              rel="noopener noreferrer"
            >
              Export PDF
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
