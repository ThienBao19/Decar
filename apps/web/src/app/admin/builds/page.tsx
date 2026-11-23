import type { Prisma } from '@prisma/client'

import { prisma } from '@/lib/prisma'
import { ADMIN_PAGE_SIZE, parsePage, requireAdmin } from '@/lib/admin'

import { deleteBuild, setBuildPublic } from '../actions'
import { ConfirmButton } from '../_components/ConfirmButton'
import { DANGER_BTN, Pagination, SearchForm, SMALL_BTN, TD, TH } from '../_components/ListControls'

export const dynamic = 'force-dynamic'

interface Props {
  searchParams: { q?: string; page?: string }
}

export default async function AdminBuildsPage({ searchParams }: Props) {
  await requireAdmin()
  const q = searchParams.q?.trim() ?? ''
  const page = parsePage(searchParams.page)
  const where: Prisma.VehicleBuildWhereInput = q
    ? { OR: [{ name: { contains: q, mode: 'insensitive' } }, { user: { email: { contains: q, mode: 'insensitive' } } }] }
    : {}

  const [total, builds] = await Promise.all([
    prisma.vehicleBuild.count({ where }),
    prisma.vehicleBuild.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      skip: (page - 1) * ADMIN_PAGE_SIZE,
      take: ADMIN_PAGE_SIZE,
      select: { id: true, name: true, isPublic: true, updatedAt: true, user: { select: { email: true } } },
    }),
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Builds</h2>
        <SearchForm q={q} placeholder="Search build name or owner email" />
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-800">
        <table className="w-full text-sm">
          <thead className="bg-gray-900 text-gray-400">
            <tr>
              <th className={TH}>Name</th>
              <th className={TH}>Owner</th>
              <th className={TH}>Visibility</th>
              <th className={TH}>Updated</th>
              <th className={TH} />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {builds.map((b) => (
              <tr key={b.id} className="bg-gray-950">
                <td className={TD}>
                  <a href={`/builder?id=${b.id}`} className="hover:underline">{b.name}</a>
                </td>
                <td className={`${TD} font-mono text-xs`}>{b.user.email}</td>
                <td className={TD}>
                  <form action={setBuildPublic} className="flex items-center gap-2">
                    <input type="hidden" name="buildId" value={b.id} />
                    <input type="hidden" name="isPublic" value="false" />
                    <span className={b.isPublic ? 'text-emerald-400' : 'text-gray-400'}>
                      {b.isPublic ? 'Public' : 'Private'}
                    </span>
                    {b.isPublic && <button type="submit" className={SMALL_BTN}>Make private</button>}
                  </form>
                </td>
                <td className={`${TD} text-gray-400`}>{b.updatedAt.toLocaleDateString()}</td>
                <td className={`${TD} text-right`}>
                  <form action={deleteBuild}>
                    <input type="hidden" name="buildId" value={b.id} />
                    <ConfirmButton className={DANGER_BTN} message={`Delete build "${b.name}"? This cannot be undone.`}>
                      Delete
                    </ConfirmButton>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination page={page} total={total} pageSize={ADMIN_PAGE_SIZE} basePath="/admin/builds" q={q} />
    </div>
  )
}