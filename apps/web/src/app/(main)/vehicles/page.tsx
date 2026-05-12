import type { Metadata } from 'next'
import Link from 'next/link'
import { searchVehicles, getPopularMakes, getYearRange } from '@/lib/vehicle-cache'
import { VehicleSearchForm } from '@/components/vehicle/VehicleSearchForm'

export const metadata: Metadata = { title: 'Browse Vehicles | Decar' }

interface PageProps {
  searchParams: {
    make?: string
    model?: string
    year?: string
    fuelType?: string
    bodyType?: string
    page?: string
  }
}

export default async function VehiclesPage({ searchParams }: PageProps) {
  const sp = searchParams
  const pageNum = sp.page ? parseInt(sp.page, 10) : 1
  const yearNum = sp.year ? parseInt(sp.year, 10) : undefined

  const searchArgs: Record<string, string | number> = { page: pageNum, limit: 24 }
  if (sp.make) searchArgs.make = sp.make
  if (sp.model) searchArgs.model = sp.model
  if (yearNum) searchArgs.year = yearNum
  if (sp.fuelType) searchArgs.fuelType = sp.fuelType
  if (sp.bodyType) searchArgs.bodyType = sp.bodyType

  const result = await searchVehicles(searchArgs as Parameters<typeof searchVehicles>[0])
  const popularMakes = getPopularMakes()
  const years = getYearRange()
  const hasFilters = !!(sp.make || sp.model || sp.year)
  const totalPages = Math.ceil(result.total / 24)

  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-[28px] font-semibold tracking-tight text-[#fafafa]">
          Browse Vehicles
        </h1>
        <p className="text-[14px] text-[#898989]">
          {result.total > 0
            ? `${result.total.toLocaleString()} vehicles found${result.fromNHTSA ? ' from NHTSA' : ''}`
            : 'Search from 50,000+ vehicles via NHTSA database'}
        </p>
      </div>

      {/* Search form */}
      <div className="mt-8">
        <VehicleSearchForm
          popularMakes={popularMakes}
          years={years}
          {...(sp.make ? { initialMake: sp.make } : {})}
          {...(sp.model ? { initialModel: sp.model } : {})}
          {...(sp.year ? { initialYear: sp.year } : {})}
        />
      </div>

      {/* Popular makes (when no search) */}
      {!hasFilters && (
        <div className="mt-10">
          <h2 className="mb-4 text-[15px] font-semibold text-[#fafafa]">Popular Makes</h2>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
            {popularMakes.slice(0, 24).map((make) => (
              <Link
                key={make}
                href={`/vehicles?make=${encodeURIComponent(make)}`}
                className="flex items-center justify-center rounded-lg border border-[#2e2e2e] bg-[#1c1c1c] px-3 py-3 text-[13px] font-medium text-[#b4b4b4] transition-all hover:border-[#3ecf8e]/40 hover:bg-[#1c1c1c]/80 hover:text-[#fafafa]"
              >
                {make}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Results */}
      {hasFilters && result.data.length === 0 && (
        <div className="mt-20 flex flex-col items-center gap-3 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[#2e2e2e] bg-[#1c1c1c]">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4d4d4d" strokeWidth="2">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
          </div>
          <p className="text-[15px] font-medium text-[#898989]">
            No vehicles match your search
          </p>
          <Link href="/vehicles" className="text-[13px] text-[#3ecf8e] hover:underline">
            Clear search
          </Link>
        </div>
      )}

      {result.data.length > 0 && (
        <>
          {result.fromNHTSA && (
            <div className="mt-6 flex items-center gap-2 rounded-lg border border-[#3ecf8e]/20 bg-[#3ecf8e]/5 px-4 py-2.5">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#3ecf8e] animate-pulse" />
              <span className="text-[13px] text-[#3ecf8e]">
                Live data from NHTSA database — results are being cached for faster future access
              </span>
            </div>
          )}

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {result.data.map((v) => (
              <Link
                key={v.id}
                href={`/vehicles/${v.slug}`}
                className="group flex flex-col gap-3 rounded-xl border border-[#2e2e2e] bg-[#171717] p-5 transition-all hover:border-[#363636] hover:bg-[#1c1c1c]"
              >
                <div className="flex aspect-[16/10] items-center justify-center rounded-lg bg-[#0f0f0f]">
                  <span className="text-[32px] font-bold text-[#2e2e2e]">
                    {v.make.charAt(0)}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <h3 className="text-[15px] font-semibold text-[#fafafa] group-hover:text-[#3ecf8e] transition-colors">
                    {v.year} {v.make} {v.model}
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {v.trimLevel && (
                      <span className="rounded-full border border-[#2e2e2e] bg-[#0f0f0f] px-2 py-0.5 text-[11px] text-[#898989]">
                        {v.trimLevel}
                      </span>
                    )}
                    <span className="rounded-full border border-[#2e2e2e] bg-[#0f0f0f] px-2 py-0.5 text-[11px] text-[#898989]">
                      {v.market}
                    </span>
                    {v.bodyType && (
                      <span className="rounded-full border border-[#2e2e2e] bg-[#0f0f0f] px-2 py-0.5 text-[11px] text-[#898989]">
                        {v.bodyType}
                      </span>
                    )}
                    {!v.cached && (
                      <span className="rounded-full border border-[#3ecf8e]/30 bg-[#3ecf8e]/10 px-2 py-0.5 text-[11px] text-[#3ecf8e]">
                        NHTSA
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              {pageNum > 1 && (
                <Link
                  href={`/vehicles?${buildPageParams(sp, pageNum - 1)}`}
                  className="rounded-lg border border-[#2e2e2e] bg-[#1c1c1c] px-4 py-2 text-[13px] text-[#b4b4b4] hover:text-[#fafafa]"
                >
                  Previous
                </Link>
              )}
              <span className="px-3 text-[13px] text-[#4d4d4d]">
                Page {pageNum} of {totalPages}
              </span>
              {pageNum < totalPages && (
                <Link
                  href={`/vehicles?${buildPageParams(sp, pageNum + 1)}`}
                  className="rounded-lg border border-[#2e2e2e] bg-[#1c1c1c] px-4 py-2 text-[13px] text-[#b4b4b4] hover:text-[#fafafa]"
                >
                  Next
                </Link>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function buildPageParams(
  sp: Record<string, string | undefined>,
  page: number,
): string {
  const params = new URLSearchParams()
  if (sp.make) params.set('make', sp.make)
  if (sp.model) params.set('model', sp.model)
  if (sp.year) params.set('year', sp.year)
  if (sp.fuelType) params.set('fuelType', sp.fuelType)
  if (sp.bodyType) params.set('bodyType', sp.bodyType)
  params.set('page', String(page))
  return params.toString()
}