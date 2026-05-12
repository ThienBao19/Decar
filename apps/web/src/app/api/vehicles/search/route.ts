import { NextResponse } from 'next/server'
import { searchVehicles } from '@/lib/vehicle-cache'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)

  const args: Record<string, string | number> = {
    page: searchParams.get('page') ? parseInt(searchParams.get('page')!, 10) : 1,
    limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 24,
  }
  if (searchParams.get('make')) args.make = searchParams.get('make')!
  if (searchParams.get('model')) args.model = searchParams.get('model')!
  if (searchParams.get('year')) args.year = parseInt(searchParams.get('year')!, 10)
  if (searchParams.get('fuelType')) args.fuelType = searchParams.get('fuelType')!
  if (searchParams.get('bodyType')) args.bodyType = searchParams.get('bodyType')!

  const result = await searchVehicles(args as Parameters<typeof searchVehicles>[0])

  return NextResponse.json({
    data: result.data,
    total: result.total,
    page: args.page,
    limit: args.limit,
    fromNHTSA: result.fromNHTSA,
  })
}