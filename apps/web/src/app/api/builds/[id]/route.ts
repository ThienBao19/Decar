import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { apiClient } from '@/lib/api-client'
import type { UpdateBuildRequest, VehicleBuildDTO } from '@decar/shared'

interface Ctx { params: { id: string } }

export async function GET(_req: Request, { params }: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const data = await apiClient.get<VehicleBuildDTO>('/builds/' + params.id, { session })
    return NextResponse.json({ data })
  } catch {
    return NextResponse.json({ error: 'Build not found' }, { status: 404 })
  }
}

export async function PATCH(req: Request, { params }: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const body = (await req.json()) as UpdateBuildRequest
    const data = await apiClient.patch<VehicleBuildDTO>('/builds/' + params.id, body, { session })
    return NextResponse.json({ data })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    await apiClient.del('/builds/' + params.id, { session })
    return new NextResponse(null, { status: 204 })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}