import { notFound } from 'next/navigation'
import { getServerSession } from 'next-auth'
import type { Metadata } from 'next'
import dynamic from 'next/dynamic'
import type { VehicleDetailDTO } from '@decar/shared'
import { authOptions } from '@/lib/auth'
import { apiClient } from '@/lib/api-client'
import { VehicleSpecs } from '@/components/vehicle/VehicleSpecs'
import { ColorSwatch } from '@/components/vehicle/ColorSwatch'
import { UpgradeGate } from '@/components/viewer/UpgradeGate'

export const revalidate = 3600

const Engine3DViewer = dynamic(
  () => import('@/components/viewer/Engine3DViewer').then((m) => m.Engine3DViewer),
  { ssr: false, loading: () => <ViewerSkeleton /> },
)
const ExteriorViewer = dynamic(
  () => import('@/components/viewer/ExteriorViewer').then((m) => m.ExteriorViewer),
  { ssr: false, loading: () => <ViewerSkeleton /> },
)

function ViewerSkeleton() {
  return (
    <div className="flex aspect-video w-full items-center justify-center rounded-xl border border-[#2e2e2e] bg-[#1c1c1c]">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#3ecf8e]/40 border-t-[#3ecf8e]" />
    </div>
  )
}

interface PageProps {
  params: { id: string }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const vehicle = await fetchVehicle(params.id)
  if (!vehicle) return { title: 'Vehicle Not Found' }
  return {
    title: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
    description: `Specs for the ${vehicle.year} ${vehicle.make} ${vehicle.model}.`,
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
      <nav className="mb-6 flex items-center gap-2 text-[13px] text-[#4d4d4d]">
        <a href="/vehicles" className="hover:text-[#898989]">Vehicles</a>
        <span>/</span>
        <span className="text-[#898989]">{vehicle.make} {vehicle.model}</span>
      </nav>

      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[32px] font-semibold tracking-tight text-[#fafafa]">
            {vehicle.year} {vehicle.make} {vehicle.model}
          </h1>
          {vehicle.trimLevel && (
            <p className="mt-1 text-[16px] text-[#898989]">{vehicle.trimLevel}</p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            {vehicle.exterior?.bodyType && (
              <span className="rounded-full border border-[#2e2e2e] bg-[#1c1c1c] px-3 py-1 text-[12px] text-[#b4b4b4]">{vehicle.exterior.bodyType}</span>
            )}
            <span className="rounded-full border border-[#2e2e2e] bg-[#1c1c1c] px-3 py-1 text-[12px] text-[#b4b4b4]">{vehicle.market}</span>
            {vehicle.engine?.fuelType && (
              <span className="rounded-full border border-[#2e2e2e] bg-[#1c1c1c] px-3 py-1 text-[12px] text-[#b4b4b4]">{vehicle.engine.fuelType}</span>
            )}
          </div>
        </div>
        {isPro && (
          <a
            href={`${process.env.NEXT_PUBLIC_API_URL ?? ''}/vehicles/${vehicle.id}/export/pdf`}
            className="flex items-center gap-2 rounded-[9999px] border border-[#2e2e2e] bg-[#1c1c1c] px-4 py-2 text-[13px] text-[#b4b4b4] hover:text-[#fafafa]"
            target="_blank" rel="noopener noreferrer"
          >Export PDF</a>
        )}
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section>
            <h2 className="mb-3 text-[15px] font-semibold text-[#fafafa]">Exterior 360</h2>
            {isPro ? <ExteriorViewer vehicleId={vehicle.id} /> : <UpgradeGate label="360 Exterior View" description="Rotate and inspect the full exterior in Pro." />}
          </section>
          <section>
            <h2 className="mb-3 text-[15px] font-semibold text-[#fafafa]">Engine Interactive 3D</h2>
            {isPro ? <Engine3DViewer vehicleId={vehicle.id} /> : <UpgradeGate label="Interactive 3D Engine" description="Explore engine internals in full 3D with Pro." />}
          </section>
          {vehicle.exterior && (
            <section>
              <h2 className="mb-3 text-[15px] font-semibold text-[#fafafa]">Dimensions</h2>
              <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { label: 'Length',    value: isPro ? `${vehicle.exterior.lengthMm} mm`    : 'Pro' },
                  { label: 'Width',     value: isPro ? `${vehicle.exterior.widthMm} mm`     : 'Pro' },
                  { label: 'Height',    value: isPro ? `${vehicle.exterior.heightMm} mm`    : 'Pro' },
                  { label: 'Wheelbase', value: isPro ? `${vehicle.exterior.wheelbaseMm} mm` : 'Pro' },
                ].map(({ label, value }) => (
                  <div key={label} className="rounded-lg border border-[#2e2e2e] bg-[#1c1c1c] px-4 py-3">
                    <dt className="text-[11px] uppercase tracking-widest text-[#4d4d4d]">{label}</dt>
                    <dd className={`mt-1 text-[14px] font-medium ${isPro ? 'text-[#fafafa]' : 'text-[#4d4d4d]'}`}>{value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}
          {isPro && vehicle.interior && (
            <section>
              <h2 className="mb-3 text-[15px] font-semibold text-[#fafafa]">Interior</h2>
              <dl className="divide-y divide-[#242424] rounded-xl border border-[#2e2e2e] bg-[#1c1c1c]">
                {[
                  { label: 'Seat material', value: vehicle.interior.seatMaterial },
                  { label: 'Rows / seats',  value: `${vehicle.interior.seatRows} rows / ${vehicle.interior.seatCount} seats` },
                  { label: 'Dashboard',     value: vehicle.interior.dashboard },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between px-4 py-3 text-[13px]">
                    <dt className="text-[#898989]">{label}</dt>
                    <dd className="font-medium text-[#fafafa]">{value}</dd>
                  </div>
                ))}
              </dl>
              {vehicle.interior.techFeatures.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {vehicle.interior.techFeatures.map((f) => (
                    <span key={f} className="rounded-full border border-[#2e2e2e] bg-[#1c1c1c] px-3 py-1 text-[12px] text-[#b4b4b4]">{f}</span>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>

        <div className="space-y-6">
          {vehicle.engine && <VehicleSpecs engine={vehicle.engine} isPro={isPro} />}
          {vehicle.exterior?.colors && vehicle.exterior.colors.length > 0 && (
            <section>
              <h2 className="mb-3 text-[15px] font-semibold text-[#fafafa]">Paint Colors</h2>
              <div className="flex flex-wrap gap-3 rounded-xl border border-[#2e2e2e] bg-[#1c1c1c] p-4">
                {vehicle.exterior.colors.map((color) => (
                  <ColorSwatch key={color.id} color={color} />
                ))}
              </div>
            </section>
          )}
          {!isPro && (
            <div className="rounded-xl border border-[#3ecf8e]/20 bg-[#3ecf8e]/5 p-5">
              <p className="text-[14px] font-semibold text-[#fafafa]">Unlock full specs</p>
              <p className="mt-1 text-[13px] text-[#898989]">Power, torque, 3D viewer, and PDF export on Pro.</p>
              <a href="/pricing" className="mt-4 block w-full rounded-[9999px] bg-[#3ecf8e] py-2 text-center text-[13px] font-medium text-[#0f0f0f] transition-opacity hover:opacity-90">
                Upgrade to Pro
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}