import { NextResponse } from 'next/server'
import { getVehicleBySlug, getVehicleById } from '@/lib/vehicle-cache'

export async function GET(
  _req: Request,
  { params }: { params: { slug: string } },
) {
  // Try by slug first, then by ID
  const vehicle =
    (await getVehicleBySlug(params.slug)) ??
    (await getVehicleById(params.slug))

  if (!vehicle) {
    return NextResponse.json(
      { error: 'Vehicle not found' },
      { status: 404 },
    )
  }

  return NextResponse.json({ data: vehicle })
}