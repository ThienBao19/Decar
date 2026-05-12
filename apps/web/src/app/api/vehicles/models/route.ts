import { NextResponse } from 'next/server'
import { getCachedModels } from '@/lib/vehicle-cache'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const make = searchParams.get('make')
  const yearStr = searchParams.get('year')

  if (!make) {
    return NextResponse.json(
      { error: 'make parameter is required' },
      { status: 400 },
    )
  }

  const year = yearStr ? parseInt(yearStr, 10) : undefined
  const models = await getCachedModels(make, year)

  const names = [...new Set(models.map((m) => m.Model_Name))].sort()

  return NextResponse.json({ data: names, total: names.length })
}