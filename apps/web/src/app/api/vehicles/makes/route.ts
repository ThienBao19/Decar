import { NextResponse } from 'next/server'
import { getPopularMakes, getCachedMakes } from '@/lib/vehicle-cache'

export const revalidate = 86400 // 24h

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const all = searchParams.get('all') === 'true'

  if (all) {
    // Full NHTSA makes list (~10K entries)
    const makes = await getCachedMakes()
    const names = makes
      .map((m) => m.Make_Name)
      .filter(Boolean)
      .sort()
    return NextResponse.json({ data: names, total: names.length })
  }

  // Popular makes (fast, no API call)
  const popular = getPopularMakes()
  return NextResponse.json({ data: popular, total: popular.length })
}