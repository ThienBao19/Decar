import { getServerSession } from 'next-auth'
import type { Session } from 'next-auth'

import { authOptions } from './auth'

export const ADMIN_PAGE_SIZE = 25

// Server actions are public endpoints, so every admin action must call this itself
export async function requireAdmin(): Promise<Session> {
  const session = await getServerSession(authOptions)
  if (!session?.user.isAdmin) throw new Error('Forbidden')
  return session
}

export function parsePage(raw: string | undefined): number {
  const n = Number(raw)
  return Number.isInteger(n) && n > 0 ? n : 1
}
