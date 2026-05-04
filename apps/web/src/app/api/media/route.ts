import { getServerSession } from 'next-auth'
import { type NextRequest, NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { apiClient } from '@/lib/api-client'
import type { SignedMediaResponse } from '@decar/shared'

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = request.nextUrl
  const vehicleId = searchParams.get('vehicleId')
  const type = searchParams.get('type')

  if (!vehicleId || !type) {
    return NextResponse.json({ error: 'Missing vehicleId or type' }, { status: 400 })
  }

  try {
    const data = await apiClient.get<SignedMediaResponse[]>(
      `/vehicles/${vehicleId}/media?type=${type}`,
      { session },
    )
    return NextResponse.json({ data })
  } catch {
    // No media for this type — return empty, viewers fall back to placeholder
    return NextResponse.json({ data: [] })
  }
}
