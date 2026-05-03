import type { Client } from '@elastic/elasticsearch'
import type { Redis } from 'ioredis'
import { createHash } from 'crypto'
import type { VehicleSearchParams, VehicleListItemDTO, PaginatedResult } from '@decar/shared'

const SEARCH_CACHE_TTL = 300 // 5 min

interface EsVehicleHit {
  id: string
  slug: string
  make: string
  model: string
  year: number
  market: string
  trimLevel: string | null
  bodyType: string | null
}

export async function searchVehicles(
  es: Client,
  redis: Redis,
  params: VehicleSearchParams,
): Promise<PaginatedResult<VehicleListItemDTO>> {
  const page = params.page ?? 1
  const limit = Math.min(params.limit ?? 24, 100)

  // Cache key from search params hash
  const paramsHash = createHash('md5').update(JSON.stringify(params)).digest('hex')
  const cacheKey = `search:${paramsHash}`

  const cached = await redis.get(cacheKey)
  if (cached) {
    return JSON.parse(cached) as PaginatedResult<VehicleListItemDTO>
  }

  const must: object[] = []

  if (params.make) must.push({ match: { make: { query: params.make, operator: 'and' } } })
  if (params.model) must.push({ match: { model: { query: params.model, operator: 'and' } } })
  if (params.year) must.push({ term: { year: params.year } })
  if (params.fuelType) must.push({ term: { fuelType: params.fuelType } })
  if (params.bodyType) must.push({ term: { bodyType: params.bodyType } })
  if (params.market) must.push({ term: { market: params.market } })

  const response = await es.search<EsVehicleHit>({
    index: 'vehicles',
    from: (page - 1) * limit,
    size: limit,
    query: must.length > 0 ? { bool: { must } } : { match_all: {} },
    sort: [{ make: 'asc' }, { model: 'asc' }, { year: 'desc' }],
  })

  const total =
    typeof response.hits.total === 'number'
      ? response.hits.total
      : response.hits.total?.value ?? 0

  const data: VehicleListItemDTO[] = response.hits.hits.map((hit) => ({
    id: hit._source!.id,
    slug: hit._source!.slug,
    make: hit._source!.make,
    model: hit._source!.model,
    year: hit._source!.year,
    market: hit._source!.market,
    trimLevel: hit._source!.trimLevel ?? null,
    bodyType: hit._source!.bodyType ?? null,
    thumbnailUrl: null,
  }))

  const result: PaginatedResult<VehicleListItemDTO> = {
    data,
    total,
    page,
    limit,
    hasMore: page * limit < total,
  }

  await redis.setex(cacheKey, SEARCH_CACHE_TTL, JSON.stringify(result))

  return result
}
