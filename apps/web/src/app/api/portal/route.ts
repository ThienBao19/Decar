import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { apiClient } from '@/lib/api-client'

export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await apiClient.post<{ url: string }>(
      '/subscriptions/portal',
      {},
      { session },
    )
    return NextResponse.json({ url: result.url })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create portal session'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
