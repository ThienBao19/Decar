/**
 * Vehicle enrichment: auto-fetch specs from fueleconomy.gov
 * and save to the database when a vehicle detail page is viewed.
 */

import { prisma } from './prisma'
import { getVehicleSpecs, parseSpecs } from './fueleconomy'

/**
 * Enrich a vehicle with specs from fueleconomy.gov if missing.
 * Called on vehicle detail page — runs once, then cached in DB forever.
 */
export async function enrichVehicleIfNeeded(vehicleId: string): Promise<void> {
  // Check if engine data already exists
  const existing = await prisma.engine.findUnique({
    where: { vehicleId },
  })
  if (existing) return // already enriched

  // Get vehicle basic info
  const vehicle = await prisma.vehicle.findUnique({
    where: { id: vehicleId },
    select: { make: true, model: true, year: true },
  })
  if (!vehicle) return

  // Fetch from fueleconomy.gov
  const feSpecs = await getVehicleSpecs(vehicle.make, vehicle.model, vehicle.year)
  if (!feSpecs) return

  const parsed = parseSpecs(feSpecs)

  // Save engine specs
  try {
    await prisma.engine.create({
      data: {
        vehicleId,
        displacement: parsed.displacement ?? 0,
        cylinders: parsed.cylinders ?? 0,
        fuelType: parsed.fuelType,
        powerKw: parsed.horsepower ? Math.round(parsed.horsepower * 0.7457) : 0,
        torqueNm: 0, // not available from fueleconomy.gov
        transmission: parsed.transmission ?? 'Unknown',
        drivetrain: parsed.drivetrain ?? 'Unknown',
      },
    })
  } catch {
    // Unique constraint — another request already created it
  }

  // Save exterior specs (body type)
  if (parsed.bodyType) {
    try {
      await prisma.exterior.create({
        data: {
          vehicleId,
          bodyType: parsed.bodyType,
          lengthMm: 0,
          widthMm: 0,
          heightMm: 0,
          wheelbaseMm: 0,
        },
      })
    } catch {
      // Already exists
    }
  }
}

/**
 * Batch enrich multiple vehicles (for seed script).
 */
export async function enrichBatch(vehicleIds: string[]): Promise<number> {
  let enriched = 0
  for (const id of vehicleIds) {
    try {
      await enrichVehicleIfNeeded(id)
      enriched++
      // Rate limit: 100ms between requests
      await new Promise((r) => setTimeout(r, 100))
    } catch {
      // Skip failed ones
    }
  }
  return enriched
}