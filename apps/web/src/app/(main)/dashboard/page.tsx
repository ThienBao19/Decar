import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import type { Metadata } from 'next'
import { authOptions } from '@/lib/auth'
import { apiClient } from '@/lib/api-client'
import type { UserDTO } from '@decar/shared'
import { PortalButton } from '@/components/billing/PortalButton'
import { ApplyPendingName } from '@/components/auth/ApplyPendingName'

export const metadata: Metadata = { title: 'Dashboard' }

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const user = await apiClient.get<UserDTO>('/users/me', { session })

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <ApplyPendingName hasName={Boolean(session.user.name)} />
      <h1 className="text-[28px] font-semibold tracking-tight text-[#fafafa]">Dashboard</h1>
      <p className="mt-1 text-[14px] text-[#898989]">Manage your account and subscription.</p>

      {/* Profile card */}
      <div className="mt-8 rounded-xl border border-[#2e2e2e] bg-[#1c1c1c] p-6">
        <div className="flex items-center gap-4">
          {session.user?.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={session.user.image}
              alt={session.user.name ?? 'Avatar'}
              className="h-11 w-11 rounded-full ring-2 ring-[#2e2e2e]"
            />
          ) : (
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#242424] text-[16px] font-semibold text-[#b4b4b4]">
              {(user.name ?? user.email ?? 'U')[0]?.toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-medium text-[#fafafa]">{user.name ?? 'User'}</p>
            <p className="truncate text-[13px] text-[#898989]">{user.email}</p>
          </div>
          <span
            className={`shrink-0 rounded-[9999px] px-3 py-1 text-[12px] font-medium ${
              user.subscription.tier === 'PRO'
                ? 'border border-[#3ecf8e]/40 bg-[#3ecf8e]/10 text-[#3ecf8e]'
                : 'border border-[#2e2e2e] bg-[#242424] text-[#898989]'
            }`}
          >
            {user.subscription.tier}
          </span>
        </div>

        {user.subscription.tier === 'PRO' && (
          <div className="mt-4 flex items-center justify-between border-t border-[#242424] pt-4">
            {user.subscription.currentPeriodEnd ? (
              <p className="text-[13px] text-[#4d4d4d]">
                Pro plan renews{' '}
                <span className="text-[#898989]">
                  {new Date(user.subscription.currentPeriodEnd).toLocaleDateString('en-US', {
                    month: 'long', day: 'numeric', year: 'numeric',
                  })}
                </span>
              </p>
            ) : (
              <span />
            )}
            <PortalButton />
          </div>
        )}
      </div>

      {/* Upgrade CTA (FREE only) */}
      {user.subscription.tier === 'FREE' && (
        <div className="mt-5 rounded-xl border border-[#3ecf8e]/20 bg-[#3ecf8e]/5 p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[15px] font-semibold text-[#fafafa]">Upgrade to Pro</p>
              <p className="mt-1 text-[13px] text-[#898989]">
                Unlock 3D viewer, unlimited comparisons, PDF export, and full API access.
              </p>
            </div>
            <a
              href="/pricing"
              className="shrink-0 rounded-[9999px] bg-[#3ecf8e] px-5 py-2 text-[13px] font-medium text-[#0f0f0f] transition-opacity hover:opacity-90"
            >
              View plans
            </a>
          </div>
        </div>
      )}

      {/* Quick links */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {[
          { label: 'Browse Vehicles', href: '/vehicles' },
          { label: 'Comparisons', href: '/comparisons' },
          { label: 'Pricing', href: '/pricing' },
        ].map((link) => (
          <a
            key={link.href}
            href={link.href}
            className="rounded-lg border border-[#242424] bg-[#1c1c1c] px-4 py-3 text-[13px] font-medium text-[#b4b4b4] transition-colors hover:border-[#2e2e2e] hover:text-[#fafafa]"
          >
            {link.label}
          </a>
        ))}
      </div>
    </div>
  )
}
