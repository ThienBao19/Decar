import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import type { Metadata } from 'next'
import { authOptions } from '@/lib/auth'
import { apiClient } from '@/lib/api-client'
import type { UserDTO } from '@decar/shared'

export const metadata: Metadata = { title: 'Dashboard' }

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const user = await apiClient.get<UserDTO>('/users/me', { session })

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>

      <div className="mt-8 rounded-xl border border-gray-100 p-6 shadow-sm">
        <div className="flex items-center gap-4">
          {session.user?.image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={session.user.image}
              alt={session.user.name ?? 'Avatar'}
              className="h-12 w-12 rounded-full"
            />
          )}
          <div>
            <p className="font-semibold text-gray-900">{user.name ?? 'User'}</p>
            <p className="text-sm text-gray-500">{user.email}</p>
          </div>
          <span
            className={`ml-auto rounded-full px-3 py-1 text-sm font-medium ${
              user.subscription.tier === 'PRO'
                ? 'bg-brand-100 text-brand-700'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            {user.subscription.tier}
          </span>
        </div>
      </div>

      {user.subscription.tier === 'FREE' && (
        <div className="mt-6 rounded-xl bg-brand-50 p-6">
          <p className="font-semibold text-brand-900">Upgrade to Pro</p>
          <p className="mt-1 text-sm text-brand-700">
            Unlock 3D viewer, unlimited comparisons, PDF export, and more.
          </p>
          <a
            href="/pricing"
            className="mt-4 inline-block rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-700"
          >
            View plans
          </a>
        </div>
      )}
    </div>
  )
}
