/**
 * Batch-enrich vehicles with specs from fueleconomy.gov.
 * Run: npx tsx scripts/enrich-vehicles.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const FE_BASE = 'https://www.fueleconomy.gov/ws/rest/vehicle'

interface FEOption { text: string; value: string }
interface FEVehicle {
  displ: string; cylinders: string; drive: string
  fuelType: string; fuelType1: string; trany: string; VClass: string
  [key: string]: string
}

function mapFuel(fuel: string): 'PETROL' | 'DIESEL' | 'ELECTRIC' | 'HYBRID' | 'HYDROGEN' {
  if (!fuel) return 'PETROL'
  const l = fuel.toLowerCase()
  if (l.includes('diesel')) return 'DIESEL'
  if (l.includes('electricity') && !l.includes('gasoline')) return 'ELECTRIC'
  if (l.includes('electricity') && l.includes('gasoline')) return 'HYBRID'
  if (l.includes('hydrogen')) return 'HYDROGEN'
  return 'PETROL'
}

async function fetchJSON<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' } })
    if (!res.ok) return null
    return (await res.json()) as T
  } catch { return null }
}

async function enrichOne(vehicleId: string, make: string, model: string, year: number): Promise<boolean> {
  // Get options
  const optData = await fetchJSON<{ menuItem: FEOption | FEOption[] }>(
    `${FE_BASE}/menu/options?make=${encodeURIComponent(make)}&model=${encodeURIComponent(model)}&year=${year}`
  )
  if (!optData?.menuItem) return false
  const options = Array.isArray(optData.menuItem) ? optData.menuItem : [optData.menuItem]
  const first = options[0]
  if (!first) return false

  // Get specs
  const specs = await fetchJSON<FEVehicle>(`${FE_BASE}/${first.value}`)
  if (!specs) return false

  // Save engine
  try {
    await prisma.engine.upsert({
      where: { vehicleId },
      create: {
        vehicleId,
        displacement: specs.displ ? parseFloat(specs.displ) : 0,
        cylinders: specs.cylinders ? parseInt(specs.cylinders, 10) : 0,
        fuelType: mapFuel(specs.fuelType1 || specs.fuelType),
        powerKw: 0,
        torqueNm: 0,
        transmission: specs.trany || 'Unknown',
        drivetrain: specs.drive || 'Unknown',
      },
      update: {},
    })
  } catch { /* skip */ }

  // Save exterior (body type)
  if (specs.VClass) {
    try {
      await prisma.exterior.upsert({
        where: { vehicleId },
        create: {
          vehicleId,
          bodyType: specs.VClass,
          lengthMm: 0, widthMm: 0, heightMm: 0, wheelbaseMm: 0,
        },
        update: {},
      })
    } catch { /* skip */ }
  }

  return true
}

async function main() {
  // Get all vehicles without engine data
  const vehicles = await prisma.vehicle.findMany({
    where: { engine: null },
    select: { id: true, make: true, model: true, year: true },
    take: 200,
  })

  console.log(`Found ${vehicles.length} vehicles without specs. Enriching...\n`)

  let success = 0
  let fail = 0

  for (const v of vehicles) {
    process.stdout.write(`  ${v.year} ${v.make} ${v.model}... `)
    const ok = await enrichOne(v.id, v.make, v.model, v.year)
    if (ok) {
      success++
      console.log('OK')
    } else {
      fail++
      console.log('no data')
    }
    // Rate limit
    await new Promise((r) => setTimeout(r, 150))
  }

  console.log(`\nDone! Enriched: ${success}, No data: ${fail}`)
  await prisma.$disconnect()
}

main().catch((e) => { console.error(e); process.exit(1) })