import type { Prisma, PrismaClient } from '@prisma/client'
import type { Redis } from 'ioredis'
import { createHash } from 'crypto'
import type { FuelType, PaginatedResult, VehicleListItemDTO, VehicleSearchParams } from '@decar/shared'

const SEARCH_CACHE_TTL = 300 // 5 min
const DEFAULT_LIMIT = 24
const MAX_LIMIT = 100
const MAX_TEXT_LENGTH = 80
const FUEL_TYPES: readonly FuelType[] = ['PETROL', 'DIESEL', 'ELECTRIC', 'HYBRID', 'HYDROGEN']

function text(value: string | undefined): string | undefined {
  const trimmed = value?.trim().slice(0, MAX_TEXT_LENGTH)
  return trimmed ? trimmed : undefined
}

function integer(value: string | undefined): number | undefined {
  const n = Number(value)
  return value !== undefined && Number.isInteger(n) ? n : undefined
}

// Query strings are untrusted: keep only well-formed values, clamp pagination
export function parseSearchParams(query: Record<string, string | undefined>): VehicleSearchParams {
  const make = text(query['make'])
  const model = text(query['model'])
  const bodyType = text(query['bodyType'])
  const market = text(query['market'])
  const year = integer(query['year'])
  const fuelType = FUEL_TYPES.find((f) => f === query['fuelType'])
  const limit = integer(query['limit'])
  return {
    ...(make && { make }),
    ...(model && { model }),
    ...(year !== undefined && { year }),
    ...(fuelType && { fuelType }),
    ...(bodyType && { bodyType }),
    ...(market && { market }),
    page: Math.max(1, integer(query['page']) ?? 1),
    limit: Math.min(MAX_LIMIT, Math.max(1, limit ?? DEFAULT_LIMIT)),
  }
}

// Make is matched exactly (the UI links to /vehicles?make=BMW); model is a partial match
function buildWhere(params: VehicleSearchParams): Prisma.VehicleWhereInput {
  const mode = 'insensitive'
  return {
    ...(params.make && { make: { equals: params.make, mode } }),
    ...(params.model && { model: { contains: params.model, mode } }),
    ...(params.year !== undefined && { year: params.year }),
    ...(params.market && { market: { equals: params.market, mode } }),
    ...(params.fuelType && { engine: { is: { fuelType: params.fuelType } } }),
    ...(params.bodyType && { exterior: { is: { bodyType: { equals: params.bodyType, mode } } } }),
  }
}

export async function searchVehicles(
  prisma: PrismaClient,
  redis: Redis | null,
  params: VehicleSearchParams,
): Promise<PaginatedResult<VehicleListItemDTO>> {
  const page = params.page ?? 1
  const limit = Math.min(params.limit ?? DEFAULT_LIMIT, MAX_LIMIT)

  const hash = createHash('md5').update(JSON.stringify({ ...params, page, limit })).digest('hex')
  const cacheKey = `search:${hash}`
  const cached = await redis?.get(cacheKey)
  if (cached) return JSON.parse(cached) as PaginatedResult<VehicleListItemDTO>

  const where = buildWhere(params)
  const [rows, total] = await Promise.all([
    prisma.vehicle.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true, slug: true, make: true, model: true, year: true, market: true, trimLevel: true,
        exterior: { select: { bodyType: true } },
      },
      orderBy: [{ make: 'asc' }, { model: 'asc' }, { year: 'desc' }],
    }),
    prisma.vehicle.count({ where }),
  ])

  const result: PaginatedResult<VehicleListItemDTO> = {
    data: rows.map((v) => ({
      id: v.id,
      slug: v.slug,
      make: v.make,
      model: v.model,
      year: v.year,
      market: v.market,
      trimLevel: v.trimLevel,
      bodyType: v.exterior?.bodyType ?? null,
      thumbnailUrl: null, // signed URLs come from the media service at request time
    })),
    total,
    page,
    limit,
    hasMore: page * limit < total,
  }

  await redis?.setex(cacheKey, SEARCH_CACHE_TTL, JSON.stringify(result))
  return result
}