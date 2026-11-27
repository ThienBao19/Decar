import Link from 'next/link'

import { prisma } from '@/lib/prisma'
import { parsePage, requireAdmin } from '@/lib/admin'
import { buildCoverage, type YearRun } from '@/lib/model-coverage'

import { TD, TH } from '../_components/ListControls'

export const dynamic = 'force-dynamic'

const GROUPS_PER_PAGE = 50

interface Props {
  searchParams: { missing?: string; page?: string }
}

function Runs({ runs }: { runs: YearRun[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {runs.map((r) => (
        <span
          key={r.from}
          title={r.assetId ?? 'Photos only'}
          className={`rounded px-1.5 py-0.5 font-mono text-xs ${r.assetId ? 'bg-emerald-950 text-emerald-300' : 'bg-gray-800 text-gray-400'}`}
        >
          {r.from === r.to ? r.from : `${r.from}–${r.to}`}
        </span>
      ))}
    </div>
  )
}

export default async function AdminModelsPage({ searchParams }: Props) {
  await requireAdmin()
  const isMissingOnly = searchParams.missing === '1'
  const page = parsePage(searchParams.page)
  const vehicles = await prisma.vehicle.findMany({
    select: { id: true, make: true, model: true, year: true, modelAssignment: { select: { assetId: true } } },
  })
  const { groups, usage } = buildCoverage(vehicles.map(({ modelAssignment, ...v }) => ({ ...v, assignment: modelAssignment })))
  const shown = isMissingOnly ? groups.filter((g) => g.coveredCount < g.vehicleCount) : groups
  const pages = Math.max(1, Math.ceil(shown.length / GROUPS_PER_PAGE))
  const covered = groups.reduce((n, g) => n + g.coveredCount, 0)
  const href = (p: number, missing = isMissingOnly) => `/admin/models?${new URLSearchParams({ ...(missing && { missing: '1' }), page: String(p) }).toString()}`

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold">3D model coverage</h2>
        <p className="mt-1 text-sm text-gray-400">
          {covered} of {vehicles.length} vehicles show a studio model; the rest show photos. Add models per generation
          (docs/models.md), or assign one to a single vehicle on the Vehicles page.
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-800">
        <table className="w-full text-sm">
          <thead className="bg-gray-900 text-gray-400">
            <tr>
              <th className={TH}>Studio model</th>
              <th className={TH}>Years</th>
              <th className={TH}>License</th>
              <th className={TH}>Vehicles (automatic / assigned)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {usage.map(({ entry, automatic, assigned }) => (
              <tr key={entry.id} className="bg-gray-950">
                <td className={TD}><Link href={`/studio/${entry.id}`} className="hover:underline">{entry.title}</Link></td>
                <td className={TD}>{entry.years ? `${entry.years.from}–${entry.years.to ?? 'now'}` : '—'}</td>
                <td className={TD}>{entry.credit.license}</td>
                <td className={TD}>{automatic} / {assigned}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">By make and model</h3>
        <div className="flex gap-2 text-sm">
          <Link href={href(1, false)} className={`rounded-md px-3 py-1 ${isMissingOnly ? 'text-gray-400' : 'bg-gray-800'}`}>All</Link>
          <Link href={href(1, true)} className={`rounded-md px-3 py-1 ${isMissingOnly ? 'bg-gray-800' : 'text-gray-400'}`}>Missing a model</Link>
        </div>
      </div>
      <div className="overflow-x-auto rounded-xl border border-gray-800">
        <table className="w-full text-sm">
          <thead className="bg-gray-900 text-gray-400">
            <tr>
              <th className={TH}>Vehicle</th>
              <th className={TH}>Vehicles</th>
              <th className={TH}>With 3D</th>
              <th className={TH}>Model years (green: studio model)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {shown.slice((page - 1) * GROUPS_PER_PAGE, page * GROUPS_PER_PAGE).map((g) => (
              <tr key={`${g.make} ${g.model}`} className="bg-gray-950">
                <td className={TD}>
                  <Link href={`/admin/vehicles?q=${encodeURIComponent(g.model)}`} className="hover:underline">{g.make} {g.model}</Link>
                </td>
                <td className={TD}>{g.vehicleCount}</td>
                <td className={TD}>{g.coveredCount}</td>
                <td className={TD}><Runs runs={g.runs} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between text-sm text-gray-400">
        <span>{shown.length} models · page {page} of {pages}</span>
        <div className="flex gap-2">
          {page > 1 && <Link href={href(page - 1)} className="rounded-md bg-gray-800 px-3 py-1 hover:bg-gray-700">Previous</Link>}
          {page < pages && <Link href={href(page + 1)} className="rounded-md bg-gray-800 px-3 py-1 hover:bg-gray-700">Next</Link>}
        </div>
      </div>
    </div>
  )
}