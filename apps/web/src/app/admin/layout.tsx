import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import type { Session } from 'next-auth'

import { AdminNav } from './_components/AdminNav'

export const metadata = { title: 'Admin — Decar' }

type AdminUser = Session['user'] & { isAdmin?: boolean }

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  const user = session?.user as AdminUser | undefined

  if (!user?.isAdmin) redirect('/login')

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-gray-800 bg-gray-900 px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-6">
            <h1 className="text-xl font-bold tracking-tight">Decar Admin</h1>
            <AdminNav />
          </div>
          <span className="text-sm text-gray-400">{user.email}</span>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
    </div>
  )
}
