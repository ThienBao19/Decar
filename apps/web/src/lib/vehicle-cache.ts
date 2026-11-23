/**
 * Vehicle caching layer: NHTSA API -> Prisma (Neon PostgreSQL)
 *
 * Strategy: on-demand caching
 * 1. User searches for "Toyota Camry 2024"
 * 2. Check local DB first
 * 3. If not found, fetch from NHTSA -> save to DB -> return
 */

import { prisma } from './prisma'
import {
  getAllMakes as nhtsaGetAllMakes,
  getModelsForMakeYear,
  getModelsForMake,
  type NHTSAMake,
  type NHTSAModel,
} from './nhtsa'

// -- Slug helper --

function slugify(make: string, model: string, year: number, trim?: string | null): string {
  const parts = [make, model, String(year)]
  if (trim) parts.push(trim)
  return parts
    .join('-')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

// -- Makes cache (in-memory, refreshed every 24h) --

let cachedMakes: NHTSAMake[] = []
let makesLastFetch = 0
const MAKES_TTL = 24 * 60 * 60 * 1000

export async function getCachedMakes(): Promise<NHTSAMake[]> {
  const now = Date.now()
  if (cachedMakes.length > 0 && now - makesLastFetch < MAKES_TTL) {
    return cachedMakes
  }
  cachedMakes = await nhtsaGetAllMakes()
  makesLastFetch = now
  return cachedMakes
}

// -- Popular makes (for UI dropdown) --

const POPULAR_MAKES = [
  'Toyota', 'Honda', 'Ford', 'Chevrolet', 'BMW', 'Mercedes-Benz',
  'Audi', 'Volkswagen', 'Hyundai', 'Kia', 'Nissan', 'Mazda',
  'Subaru', 'Lexus', 'Porsche', 'Tesla', 'Volvo', 'Jeep',
  'Ram', 'GMC', 'Dodge', 'Cadillac', 'Acura', 'Infiniti',
  'Land Rover', 'Jaguar', 'Maserati', 'Alfa Romeo', 'Genesis',
  'Rivian', 'Lucid', 'Peugeot', 'Renault', 'Citroën',
  'Lamborghini', 'Ferrari', 'McLaren', 'Bugatti', 'Rolls-Royce',
  'Bentley', 'Aston Martin', 'Lotus', 'Mitsubishi', 'Suzuki',
  'Fiat', 'Mini', 'Buick', 'Lincoln', 'Chrysler',
]

export function getPopularMakes(): string[] {
  return [...POPULAR_MAKES]
}

// -- Models for a make + year --

export async function getCachedModels(
  make: string,
  year?: number,
): Promise<NHTSAModel[]> {
  if (year) {
    return getModelsForMakeYear(make, year)
  }
  return getModelsForMake(make)
}

// -- Search vehicles (local DB first, then NHTSA) --

export interface VehicleSearchResult {
  id: string
  slug: string
  make: string
  model: string
  year: number
  market: string
  trimLevel: string | null
  bodyType: string | null
  fuelType: string | null
  cached: boolean
}

export async function searchVehicles(params: {
  make?: string
  model?: string
  year?: number
  fuelType?: string
  bodyType?: string
  page?: number
  limit?: number
}): Promise<{ data: VehicleSearchResult[]; total: number; fromNHTSA: boolean }> {
  const page = params.page ?? 1
  const limit = Math.min(params.limit ?? 24, 100)
  const skip = (page - 1) * limit

  // Step 1: Search local cache
  const where: Record<string, unknown> = {}
  if (params.make) where.make = { contains: params.make, mode: 'insensitive' }
  if (params.model) where.model = { contains: params.model, mode: 'insensitive' }
  if (params.year) where.year = params.year

  const [localVehicles, localCount] = await Promise.all([
    prisma.vehicle.findMany({
      where,
      include: { engine: true, exterior: true },
      skip,
      take: limit,
      orderBy: [{ year: 'desc' }, { make: 'asc' }, { model: 'asc' }],
    }),
    prisma.vehicle.count({ where }),
  ])

  if (localCount > 0) {
    return {
      data: localVehicles.map((v) => ({
        id: v.id,
        slug: v.slug,
        make: v.make,
        model: v.model,
        year: v.year,
        market: v.market,
        trimLevel: v.trimLevel,
        bodyType: v.exterior?.bodyType ?? null,
        fuelType: v.engine?.fuelType ?? null,
        cached: true,
      })),
      total: localCount,
      fromNHTSA: false,
    }
  }

  // Step 2: Not in cache => fetch from NHTSA + cache
  if (!params.make) {
    return { data: [], total: 0, fromNHTSA: false }
  }

  const nhtsaModels = params.year
    ? await getModelsForMakeYear(params.make, params.year)
    : await getModelsForMake(params.make)

  // Filter by model name if specified
  let filtered = nhtsaModels
  if (params.model) {
    const q = params.model.toLowerCase()
    filtered = nhtsaModels.filter((m) =>
      m.Model_Name.toLowerCase().includes(q),
    )
  }

  // Cache results to DB in background (non-blocking)
  const toCache = filtered.slice(0, 50) // limit batch size
  cacheNHTSAModels(toCache, params.year ?? new Date().getFullYear()).catch(() => {
    // Silent fail for cache writes
  })

  const total = filtered.length
  const sliced = filtered.slice(skip, skip + limit)

  return {
    data: sliced.map((m) => ({
      id: `nhtsa-${m.Make_ID}-${m.Model_ID}`,
      slug: slugify(m.Make_Name, m.Model_Name, params.year ?? new Date().getFullYear()),
      make: m.Make_Name,
      model: m.Model_Name,
      year: params.year ?? new Date().getFullYear(),
      market: 'US',
      trimLevel: null,
      bodyType: null,
      fuelType: null,
      cached: false,
    })),
    total,
    fromNHTSA: true,
  }
}

// -- Cache NHTSA models to local DB --

async function cacheNHTSAModels(models: NHTSAModel[], year: number): Promise<void> {
  for (const m of models) {
    const slug = slugify(m.Make_Name, m.Model_Name, year)
    try {
      await prisma.vehicle.upsert({
        where: { slug },
        create: {
          make: m.Make_Name,
          model: m.Model_Name,
          year,
          market: 'US',
          slug,
        },
        update: {}, // no-op if exists
      })
    } catch {
      // unique constraint race - ignore
    }
  }
}

// -- Get or create vehicle by slug --

export async function getVehicleBySlug(slug: string) {
  return prisma.vehicle.findUnique({
    where: { slug },
    include: {
      engine: true,
      exterior: { include: { colors: true } },
      interior: true,
      media: true,
    },
  })
}

export async function getVehicleById(id: string) {
  // Handle NHTSA IDs (nhtsa-{makeId}-{modelId})
  if (id.startsWith('nhtsa-')) {
    return null // not cached yet
  }

  return prisma.vehicle.findUnique({
    where: { id },
    include: {
      engine: true,
      exterior: { include: { colors: true } },
      interior: true,
      media: true,
    },
  })
}

// -- Get year range for dropdowns --

export function getYearRange(): number[] {
  const currentYear = new Date().getFullYear() + 1
  const years: number[] = []
  for (let y = currentYear; y >= 1990; y--) {
    years.push(y)
  }
  return years
}