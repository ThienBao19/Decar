import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import type { Metadata } from 'next'
import Link from 'next/link'
import { authOptions } from '@/lib/auth'
import { apiClient } from '@/lib/api-client'
import { ComparisonTable } from '@/components/vehicle/ComparisonTable'
import type { VehicleDetailDTO } from '@decar/shared'

export const metadata: Metadata = { title: 'Comparisons | Decar' }

interface ComparisonItem {
  id: string
  createdAt: string
  vehicleA: VehicleDetailDTO
  vehicleB: VehicleDetailDTO
}

export default async function ComparisonsPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const isPro = (session.user as { tier?: string }).tier === 'PRO'

  let comparisons: ComparisonItem[] = []
  try {
    comparisons = await apiClient.get<ComparisonItem[]>('/comparisons', { session })
  } catch {
    // show empty state on error
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight text-[#fafafa]">Comparisons</h1>
          <p className="mt-1 text-[14px] text-[#898989]">
            {isPro ? 'Unlimited comparisons' : `${comparisons.length}/1 on Free tier`}
          </p>
        </div>
        <Link
          href="/vehicles"
          className="rounded-[9999px] bg-[#3ecf8e] px-5 py-2 text-[13px] font-medium text-[#0f0f0f] transition-opacity hover:opacity-90"
        >
          + New comparison
        </Link>
      </div>

      {comparisons.length === 0 ? (
        <div className="mt-20 flex flex-col items-center gap-4 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full border border-[#2e2e2e] bg-[#1c1c1c] text-[24px]">
            ⚖️
          </div>
          <p className="text-[15px] font-medium text-[#898989]">No saved comparisons yet</p>
          <p className="max-w-xs text-[13px] text-[#4d4d4d]">
            Browse vehicles and pick any two to compare side by side.
          </p>
          <Link
            href="/vehicles"
            className="rounded-[9999px] border border-[#3ecf8e]/40 px-5 py-2 text-[13px] text-[#3ecf8e] transition-colors hover:bg-[#3ecf8e]/10"
          >
            Browse vehicles
          </Link>
        </div>
      ) : (
        <div className="mt-8 flex flex-col gap-10">
          {comparisons.map((c) => (
            <div key={c.id} className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[14px] font-medium text-[#b4b4b4]">
                  {c.vehicleA.year} {c.vehicleA.make} {c.vehicleA.model}
                  <span className="mx-2 text-[#4d4d4d]">vs</span>
                  {c.vehicleB.year} {c.vehicleB.make} {c.vehicleB.model}
                </p>
                <span className="shrink-0 text-[12px] text-[#4d4d4d]">
                  {new Date(c.createdAt).toLocaleDateString()}
                </span>
              </div>
              <ComparisonTable vehicleA={c.vehicleA} vehicleB={c.vehicleB} />
            </div>
          ))}
        </div>
      )}

      {!isPro && comparisons.length >= 1 && (
        <div className="mt-10 rounded-xl border border-[#3ecf8e]/20 bg-[#3ecf8e]/5 p-6">
          <p className="text-[15px] font-semibold text-[#fafafa]">Unlock unlimited comparisons</p>
          <p className="mt-1 text-[13px] text-[#898989]">
            Free tier allows 1 saved comparison. Upgrade to Pro to save as many as you want.
          </p>
          <Link
            href="/pricing"
            className="mt-4 inline-block rounded-[9999px] bg-[#3ecf8e] px-5 py-2 text-[13px] font-medium text-[#0f0f0f] transition-opacity hover:opacity-90"
          >
            Upgrade to Pro
          </Link>
        </div>
      )}
    </div>
  )
}
