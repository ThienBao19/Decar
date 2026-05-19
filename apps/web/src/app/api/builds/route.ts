import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { apiClient } from '@/lib/api-client'
import type { CreateBuildRequest, VehicleBuildDTO } from '@decar/shared'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const data = await apiClient.get<VehicleBuildDTO[]>('/builds', { session })
    return NextResponse.json({ data })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const body = (await req.json()) as CreateBuildRequest
    const data = await apiClient.post<VehicleBuildDTO>('/builds', body, { session })
    return NextResponse.json({ data }, { status: 201 })
  } catch (err) {
    const msg = (err as Error).message
    const status = msg.includes('limited') ? 403 : 400
    return NextResponse.json({ error: msg }, { status })
  }
}