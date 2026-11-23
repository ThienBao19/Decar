import type { Prisma } from '@prisma/client'

import { prisma } from '@/lib/prisma'
import { ADMIN_PAGE_SIZE, parsePage, requireAdmin } from '@/lib/admin'

import { setUserAdmin, setUserTier } from '../actions'
import { Pagination, SearchForm, SMALL_BTN, TD, TH } from '../_components/ListControls'

export const dynamic = 'force-dynamic'

interface Props {
  searchParams: { q?: string; page?: string }
}

export default async function AdminUsersPage({ searchParams }: Props) {
  const session = await requireAdmin()
  const q = searchParams.q?.trim() ?? ''
  const page = parsePage(searchParams.page)
  const where: Prisma.UserWhereInput = q
    ? { OR: [{ email: { contains: q, mode: 'insensitive' } }, { name: { contains: q, mode: 'insensitive' } }] }
    : {}

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * ADMIN_PAGE_SIZE,
      take: ADMIN_PAGE_SIZE,
      select: {
        id: true,
        email: true,
        name: true,
        isAdmin: true,
        createdAt: true,
        subscription: { select: { tier: true, stripeSubscriptionId: true } },
        _count: { select: { builds: true, comparisons: true } },
      },
    }),
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Users</h2>
        <SearchForm q={q} placeholder="Search email or name" />
      </div>
      <p className="text-sm text-gray-500">
        Manual plan changes do not touch Stripe. A later Stripe webhook for a paying user overrides them.
      </p>

      <div className="overflow-x-auto rounded-xl border border-gray-800">
        <table className="w-full text-sm">
          <thead className="bg-gray-900 text-gray-400">
            <tr>
              <th className={TH}>Email</th>
              <th className={TH}>Name</th>
              <th className={TH}>Plan</th>
              <th className={TH}>Builds / Comparisons</th>
              <th className={TH}>Role</th>
              <th className={TH}>Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {users.map((u) => {
              const tier = u.subscription?.tier ?? 'FREE'
              const isSelf = u.id === session.user.id
              return (
                <tr key={u.id} className="bg-gray-950">
                  <td className={`${TD} font-mono text-xs`}>{u.email}</td>
                  <td className={TD}>{u.name ?? '—'}</td>
                  <td className={TD}>
                    <form action={setUserTier} className="flex items-center gap-2">
                      <input type="hidden" name="userId" value={u.id} />
                      <input type="hidden" name="tier" value={tier === 'PRO' ? 'FREE' : 'PRO'} />
                      <span className={tier === 'PRO' ? 'text-emerald-400' : 'text-gray-400'}>{tier}</span>
                      {u.subscription?.stripeSubscriptionId && <span className="text-xs text-gray-500">Stripe</span>}
                      <button type="submit" className={SMALL_BTN}>{tier === 'PRO' ? 'Set FREE' : 'Set PRO'}</button>
                    </form>
                  </td>
                  <td className={TD}>{u._count.builds} / {u._count.comparisons}</td>
                  <td className={TD}>
                    <form action={setUserAdmin} className="flex items-center gap-2">
                      <input type="hidden" name="userId" value={u.id} />
                      <input type="hidden" name="isAdmin" value={String(!u.isAdmin)} />
                      <span className={u.isAdmin ? 'text-red-300' : 'text-gray-400'}>{u.isAdmin ? 'Admin' : 'User'}</span>
                      {!isSelf && (
                        <button type="submit" className={SMALL_BTN}>{u.isAdmin ? 'Remove admin' : 'Make admin'}</button>
                      )}
                    </form>
                  </td>
                  <td className={`${TD} text-gray-400`}>{u.createdAt.toLocaleDateString()}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <Pagination page={page} total={total} pageSize={ADMIN_PAGE_SIZE} basePath="/admin/users" q={q} />
    </div>
  )
}