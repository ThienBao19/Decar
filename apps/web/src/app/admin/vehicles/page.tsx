import type { Prisma } from '@prisma/client'

import { prisma } from '@/lib/prisma'
import { ADMIN_PAGE_SIZE, parsePage, requireAdmin } from '@/lib/admin'

import { resolveStudioModel } from '@/lib/model-registry'

import { deleteVehicle } from '../actions'
import { ModelAssignmentForm } from '../_components/ModelAssignmentForm'
import { ConfirmButton } from '../_components/ConfirmButton'
import { DANGER_BTN, Pagination, SearchForm, TD, TH } from '../_components/ListControls'

export const dynamic = 'force-dynamic'

interface Props {
  searchParams: { q?: string; page?: string }
}

export default async function AdminVehiclesPage({ searchParams }: Props) {
  await requireAdmin()
  const q = searchParams.q?.trim() ?? ''
  const page = parsePage(searchParams.page)
  const where: Prisma.VehicleWhereInput = q
    ? {
        OR: [
          { make: { contains: q, mode: 'insensitive' } },
          { model: { contains: q, mode: 'insensitive' } },
          { slug: { contains: q.toLowerCase() } },
        ],
      }
    : {}

  const [total, vehicles] = await Promise.all([
    prisma.vehicle.count({ where }),
    prisma.vehicle.findMany({
      where,
      orderBy: [{ make: 'asc' }, { model: 'asc' }, { year: 'desc' }],
      skip: (page - 1) * ADMIN_PAGE_SIZE,
      take: ADMIN_PAGE_SIZE,
      select: {
        id: true,
        make: true,
        model: true,
        year: true,
        slug: true,
        engine: { select: { id: true } },
        modelAssignment: { select: { assetId: true } },
        _count: { select: { media: true, comparisonsA: true, comparisonsB: true } },
      },
    }),
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Vehicles</h2>
        <SearchForm q={q} placeholder="Search make, model or slug" />
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-800">
        <table className="w-full text-sm">
          <thead className="bg-gray-900 text-gray-400">
            <tr>
              <th className={TH}>Vehicle</th>
              <th className={TH}>Slug</th>
              <th className={TH}>Specs</th>
              <th className={TH}>3D model</th>
              <th className={TH}>Media</th>
              <th className={TH}>Comparisons</th>
              <th className={TH} />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {vehicles.map((v) => {
              const comparisons = v._count.comparisonsA + v._count.comparisonsB
              const title = `${v.year} ${v.make} ${v.model}`
              return (
                <tr key={v.id} className="bg-gray-950">
                  <td className={TD}>
                    <a href={`/vehicles/${v.slug}`} className="hover:underline">{title}</a>
                  </td>
                  <td className={`${TD} font-mono text-xs text-gray-400`}>{v.slug}</td>
                  <td className={TD}>{v.engine ? 'Engine' : <span className="text-gray-500">Missing</span>}</td>
                  <td className={TD}>
                    <ModelAssignmentForm
                      vehicleId={v.id}
                      assignment={v.modelAssignment}
                      resolvedId={resolveStudioModel(v, v.modelAssignment)?.id ?? null}
                    />
                  </td>
                  <td className={TD}>{v._count.media}</td>
                  <td className={TD}>{comparisons}</td>
                  <td className={`${TD} text-right`}>
                    <form action={deleteVehicle}>
                      <input type="hidden" name="vehicleId" value={v.id} />
                      <ConfirmButton
                        className={DANGER_BTN}
                        message={`Delete ${title}? This also deletes its specs, media records and ${comparisons} saved comparison(s).`}
                      >
                        Delete
                      </ConfirmButton>
                    </form>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <Pagination page={page} total={total} pageSize={ADMIN_PAGE_SIZE} basePath="/admin/vehicles" q={q} />
    </div>
  )
}