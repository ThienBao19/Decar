import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

async function getMetrics() {
  const [totalUsers, proUsers, totalVehicles, totalBuilds, recentUsers] = await Promise.all([
    prisma.user.count(),
    prisma.subscription.count({ where: { tier: 'PRO', status: 'ACTIVE' } }),
    prisma.vehicle.count(),
    prisma.vehicleBuild.count(),
    prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { id: true, email: true, name: true, createdAt: true, isAdmin: true },
    }),
  ])

  return { totalUsers, proUsers, totalVehicles, totalBuilds, recentUsers }
}

function StatCard({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
      <p className="text-sm text-gray-400">{label}</p>
      <p className="mt-2 text-4xl font-bold">{value}</p>
      {sub && <p className="mt-1 text-sm text-gray-500">{sub}</p>}
    </div>
  )
}

export default async function AdminPage() {
  const { totalUsers, proUsers, totalVehicles, totalBuilds, recentUsers } = await getMetrics()

  const freeUsers = totalUsers - proUsers
  const proPercent = totalUsers > 0 ? Math.round((proUsers / totalUsers) * 100) : 0

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold">Overview</h2>
        <p className="mt-1 text-gray-400">Live metrics from the Decar database</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Users" value={totalUsers} />
        <StatCard label="PRO Subscribers" value={proUsers} sub={`${proPercent}% of users`} />
        <StatCard label="FREE Users" value={freeUsers} />
        <StatCard label="Total Vehicles" value={totalVehicles} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard label="Saved Builds" value={totalBuilds} />
        <StatCard
          label="Conversion Rate"
          value={`${proPercent}%`}
          sub={`${proUsers} PRO out of ${totalUsers} users`}
        />
      </div>

      <div>
        <h3 className="mb-4 text-lg font-semibold">Recent Sign-ups</h3>
        <div className="overflow-hidden rounded-xl border border-gray-800">
          <table className="w-full text-sm">
            <thead className="bg-gray-900 text-gray-400">
              <tr>
                <th className="px-4 py-3 text-left">Email</th>
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left">Role</th>
                <th className="px-4 py-3 text-left">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {recentUsers.map((u) => (
                <tr key={u.id} className="bg-gray-950 hover:bg-gray-900">
                  <td className="px-4 py-3 font-mono text-xs">{u.email}</td>
                  <td className="px-4 py-3">{u.name ?? '—'}</td>
                  <td className="px-4 py-3">
                    {u.isAdmin ? (
                      <span className="rounded-full bg-red-900/40 px-2 py-0.5 text-xs text-red-300">Admin</span>
                    ) : (
                      <span className="rounded-full bg-gray-800 px-2 py-0.5 text-xs text-gray-400">User</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-400">
                    {new Date(u.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
