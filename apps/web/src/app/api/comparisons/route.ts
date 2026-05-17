import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { apiClient } from '@/lib/api-client'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const data = await apiClient.get('/comparisons', { session })
    return NextResponse.json({ data })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const body = (await req.json()) as unknown
    const data = await apiClient.post('/comparisons', body, { session })
    return NextResponse.json({ data }, { status: 201 })
  } catch (err) {
    const msg = (err as Error).message
    const status = msg.includes('limited') ? 403 : 500
    return NextResponse.json({ error: msg }, { status })
  }
}
