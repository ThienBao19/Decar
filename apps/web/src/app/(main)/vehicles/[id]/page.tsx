import { notFound } from 'next/navigation'
import { getServerSession } from 'next-auth'
import type { Metadata } from 'next'
import dynamic from 'next/dynamic'
import { authOptions } from '@/lib/auth'
import { getVehicleBySlug } from '@/lib/vehicle-cache'
import { enrichVehicleIfNeeded } from '@/lib/vehicle-enrichment'
import { getVehicleGalleryUrls } from '@/lib/vehicle-images'
import { VehicleImageGallery } from '@/components/vehicle/VehicleImageGallery'
import { VehicleDriveSection } from '@/components/viewer/VehicleDriveSection'
import { SaveComparisonButton } from '@/components/vehicle/SaveComparisonButton'
import { formatPower, formatTorque } from '@/lib/engine-format'
import { getStudioModel } from '@/lib/model-registry'
const StudioViewer = dynamic(
  () => import('@/components/viewer/StudioViewer').then((m) => m.StudioViewer),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center text-[12px] text-[#4d4d4d]">Loading studio…</div>
    ),
  },
)
const VehicleAssemblySection = dynamic(
  () => import('@/components/viewer/VehicleAssemblySection'),
  { ssr: false },
)

export const revalidate = 3600

interface PageProps {
  params: { id: string }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const vehicle = await getVehicleBySlug(params.id)
  if (!vehicle) return { title: 'Vehicle Not Found' }
  return {
    title: `${vehicle.year} ${vehicle.make} ${vehicle.model} | Decar`,
    description: `Full specs for the ${vehicle.year} ${vehicle.make} ${vehicle.model}.`,
  }
}

export default async function VehicleDetailPage({ params }: PageProps) {
  const [initialVehicle, session] = await Promise.all([
    getVehicleBySlug(params.id),
    getServerSession(authOptions),
  ])

  if (!initialVehicle) notFound()

  // Auto-enrich: fetch specs from fueleconomy.gov if missing
  let v = initialVehicle
  if (!v.engine) {
    await enrichVehicleIfNeeded(v.id)
    const enriched = await getVehicleBySlug(params.id)
    if (enriched) v = enriched
  }

  const isPro = session?.user?.tier === 'PRO'

  // Derive display values
  const fuelLabel = v.engine?.fuelType ?? 'N/A'
  const galleryImages = getVehicleGalleryUrls(v.make, v.model, v.year)
  const vehicleTitle = `${v.year} ${v.make} ${v.model}`
  const studioModel = getStudioModel(v.make, v.model, v.year)

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-2 text-[13px] text-[#4d4d4d]">
        <a href="/vehicles" className="hover:text-[#898989]">Vehicles</a>
        <span>/</span>
        <a href={`/vehicles?make=${encodeURIComponent(v.make)}`} className="hover:text-[#898989]">{v.make}</a>
        <span>/</span>
        <span className="text-[#898989]">{v.model}</span>
      </nav>

      {/* Title */}
      <div className="mb-8">
        <h1 className="text-[32px] font-semibold tracking-tight text-[#fafafa]">
          {vehicleTitle}
        </h1>
        {v.trimLevel && (
          <p className="mt-1 text-[16px] text-[#898989]">{v.trimLevel}</p>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          {v.exterior?.bodyType && (
            <span className="rounded-full border border-[#2e2e2e] bg-[#1c1c1c] px-3 py-1 text-[12px] text-[#b4b4b4]">
              {v.exterior.bodyType}
            </span>
          )}
          <span className="rounded-full border border-[#2e2e2e] bg-[#1c1c1c] px-3 py-1 text-[12px] text-[#b4b4b4]">
            {v.market}
          </span>
          {v.engine?.fuelType && (
            <span className="rounded-full border border-[#2e2e2e] bg-[#1c1c1c] px-3 py-1 text-[12px] text-[#b4b4b4]">
              {fuelLabel}
            </span>
          )}
        </div>
      </div>

      {/* Studio 3D view — only for vehicles with a realistic model */}
      {studioModel && (
        <div className="mb-8 overflow-hidden rounded-xl border border-[#2e2e2e]" style={{ height: 480 }}>
          <StudioViewer model={studioModel} title={vehicleTitle} />
        </div>
      )}

      {/* Vehicle image gallery */}
      <div className="mb-8">
        <VehicleImageGallery images={galleryImages} alt={vehicleTitle} />
      </div>

      {/* Drive this vehicle */}
      <div className="mb-8">
        <h2 className="mb-3 text-[15px] font-semibold text-[#fafafa]">Drive It</h2>
        <VehicleDriveSection make={v.make} model={v.model} bodyType={v.exterior?.bodyType ?? null} />
      </div>

      {/* Assembly workshop */}
      <div className="mb-8">
        <VehicleAssemblySection />
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main content */}
        <div className="space-y-6 lg:col-span-2">
          {/* Engine specs */}
          {v.engine && (
            <section className="rounded-xl border border-[#2e2e2e] bg-[#171717] overflow-hidden">
              <div className="border-b border-[#2e2e2e] px-5 py-3">
                <h2 className="text-[15px] font-semibold text-[#fafafa]">Engine</h2>
              </div>
              <dl className="divide-y divide-[#242424]">
                {[
                  { label: 'Displacement', value: `${v.engine.displacement}L` },
                  { label: 'Cylinders', value: String(v.engine.cylinders) },
                  { label: 'Power', value: isPro ? formatPower(v.engine.powerKw) : 'Pro' },
                  { label: 'Torque', value: isPro ? formatTorque(v.engine.torqueNm) : 'Pro' },
                  { label: 'Fuel type', value: fuelLabel },
                  { label: 'Transmission', value: v.engine.transmission },
                  { label: 'Drivetrain', value: v.engine.drivetrain },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between px-5 py-3 text-[13px]">
                    <dt className="text-[#898989]">{label}</dt>
                    <dd className={`font-medium ${value === 'Pro' ? 'text-[#4d4d4d]' : 'text-[#fafafa]'}`}>
                      {value === 'Pro' ? (
                        <span className="rounded-full border border-[#3ecf8e]/30 bg-[#3ecf8e]/10 px-2 py-0.5 text-[11px] text-[#3ecf8e]">
                          Pro
                        </span>
                      ) : value}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          {/* Dimensions */}
          {v.exterior && (
            <section>
              <h2 className="mb-3 text-[15px] font-semibold text-[#fafafa]">Dimensions</h2>
              <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { label: 'Length', value: `${v.exterior.lengthMm} mm` },
                  { label: 'Width', value: `${v.exterior.widthMm} mm` },
                  { label: 'Height', value: `${v.exterior.heightMm} mm` },
                  { label: 'Wheelbase', value: `${v.exterior.wheelbaseMm} mm` },
                ].map(({ label, value }) => (
                  <div key={label} className="rounded-lg border border-[#2e2e2e] bg-[#1c1c1c] px-4 py-3">
                    <dt className="text-[11px] uppercase tracking-widest text-[#4d4d4d]">{label}</dt>
                    <dd className="mt-1 text-[14px] font-medium text-[#fafafa]">{value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          {/* Interior */}
          {v.interior && isPro && (
            <section>
              <h2 className="mb-3 text-[15px] font-semibold text-[#fafafa]">Interior</h2>
              <dl className="divide-y divide-[#242424] rounded-xl border border-[#2e2e2e] bg-[#1c1c1c]">
                {[
                  { label: 'Seat material', value: v.interior.seatMaterial },
                  { label: 'Rows / seats', value: `${v.interior.seatRows} rows / ${v.interior.seatCount} seats` },
                  { label: 'Dashboard', value: v.interior.dashboard },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between px-4 py-3 text-[13px]">
                    <dt className="text-[#898989]">{label}</dt>
                    <dd className="font-medium text-[#fafafa]">{value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          {/* No data state */}
          {!v.engine && !v.exterior && (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-[#2e2e2e] bg-[#171717] px-8 py-16 text-center">
              <span className="text-[32px]">🚗</span>
              <p className="text-[15px] font-medium text-[#898989]">
                Basic listing from NHTSA
              </p>
              <p className="text-[13px] text-[#4d4d4d]">
                Detailed specs will be added as data becomes available.
                This vehicle was cached from the NHTSA database.
              </p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Colors */}
          {v.exterior?.colors && v.exterior.colors.length > 0 && (
            <section>
              <h2 className="mb-3 text-[15px] font-semibold text-[#fafafa]">Paint Colors</h2>
              <div className="flex flex-wrap gap-3 rounded-xl border border-[#2e2e2e] bg-[#1c1c1c] p-4">
                {v.exterior.colors.map((color: { id: string; name: string; hexCode: string }) => (
                  <div key={color.id} className="flex flex-col items-center gap-1.5">
                    <div
                      className="h-8 w-8 rounded-full border border-[#2e2e2e]"
                      style={{ backgroundColor: color.hexCode }}
                      title={color.name}
                    />
                    <span className="text-[10px] text-[#4d4d4d]">{color.name}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Upgrade CTA */}
          {!isPro && (
            <div className="rounded-xl border border-[#3ecf8e]/20 bg-[#3ecf8e]/5 p-5">
              <p className="text-[14px] font-semibold text-[#fafafa]">Unlock full specs</p>
              <p className="mt-1 text-[13px] text-[#898989]">
                Power, torque, interior details, and a printable spec sheet.
              </p>
              <a
                href="/pricing"
                className="mt-4 block w-full rounded-[9999px] bg-[#3ecf8e] py-2 text-center text-[13px] font-medium text-[#0f0f0f] transition-opacity hover:opacity-90"
              >
                Upgrade to Pro
              </a>
            </div>
          )}

          {isPro && (
            <a
              href={`/api/vehicles/${v.id}/spec-sheet`}
              target="_blank"
              rel="noopener"
              className="block rounded-[9999px] border border-[#3ecf8e]/40 py-2 text-center text-[13px] font-medium text-[#3ecf8e] transition-colors hover:bg-[#3ecf8e]/10"
            >
              Print spec sheet
            </a>
          )}

          {/* Compare */}
          {session && (
            <div className="rounded-xl border border-[#2e2e2e] bg-[#171717] p-4">
              <h3 className="text-[13px] font-semibold text-[#fafafa]">Compare</h3>
              <p className="mt-1 text-[12px] text-[#4d4d4d]">Pick two vehicles to compare side by side.</p>
              <div className="mt-3">
                <SaveComparisonButton vehicleId={v.id} vehicleName={vehicleTitle} />
              </div>
            </div>
          )}

                    {/* Vehicle info card */}
          <div className="rounded-xl border border-[#2e2e2e] bg-[#171717] p-5">
            <h3 className="text-[13px] font-semibold text-[#fafafa]">Vehicle Info</h3>
            <dl className="mt-3 space-y-2 text-[12px]">
              <div className="flex justify-between">
                <dt className="text-[#4d4d4d]">Market</dt>
                <dd className="text-[#b4b4b4]">{v.market}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[#4d4d4d]">Added</dt>
                <dd className="text-[#b4b4b4]">{new Date(v.createdAt).toLocaleDateString()}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[#4d4d4d]">Source</dt>
                <dd className="text-[#b4b4b4]">NHTSA vPIC</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  )
}