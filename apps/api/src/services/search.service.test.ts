import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Client as EsClient } from '@elastic/elasticsearch'
import type { Redis } from 'ioredis'
import { searchVehicles } from './search.service.js'

const HIT = {
  _source: {
    id: 'veh_1',
    slug: 'toyota-camry-2024-xse-us',
    make: 'Toyota',
    model: 'Camry',
    year: 2024,
    market: 'US',
    trimLevel: 'XSE V6',
    bodyType: 'Sedan',
  },
}

function makeEs(total = 1): EsClient {
  return {
    search: vi.fn().mockResolvedValue({
      hits: {
        total: { value: total, relation: 'eq' },
        hits: Array(total).fill(HIT),
      },
    }),
  } as unknown as EsClient
}

function makeRedis(cached: string | null = null): Redis {
  return {
    get: vi.fn().mockResolvedValue(cached),
    setex: vi.fn().mockResolvedValue('OK'),
  } as unknown as Redis
}

describe('searchVehicles', () => {
  beforeEach(() => vi.clearAllMocks())

  it('should return paginated results from Elasticsearch', async () => {
    const es = makeEs(2)
    const redis = makeRedis()

    const result = await searchVehicles(es, redis, { make: 'Toyota', page: 1, limit: 10 })

    expect(result.data).toHaveLength(2)
    expect(result.total).toBe(2)
    expect(result.page).toBe(1)
    expect(result.limit).toBe(10)
    expect(result.hasMore).toBe(false)
  })

  it('should map ES hits to VehicleListItemDTO correctly', async () => {
    const es = makeEs(1)
    const redis = makeRedis()

    const result = await searchVehicles(es, redis, {})

    const item = result.data[0]!
    expect(item.id).toBe('veh_1')
    expect(item.make).toBe('Toyota')
    expect(item.model).toBe('Camry')
    expect(item.bodyType).toBe('Sedan')
    expect(item.thumbnailUrl).toBeNull()
  })

  it('should return cached result and skip ES on cache hit', async () => {
    const es = makeEs()
    const cached = JSON.stringify({ data: [], total: 99, page: 1, limit: 24, hasMore: false })
    const redis = makeRedis(cached)

    const result = await searchVehicles(es, redis, {})

    expect(result.total).toBe(99)
    expect(es.search).not.toHaveBeenCalled()
  })

  it('should cache the ES result for 5 minutes', async () => {
    const es = makeEs(1)
    const redis = makeRedis()

    await searchVehicles(es, redis, { make: 'BMW' })

    expect(redis.setex).toHaveBeenCalledWith(
      expect.stringMatching(/^search:/),
      300,
      expect.any(String),
    )
  })

  it('should build correct bool query with all filters', async () => {
    const es = makeEs()
    const redis = makeRedis()

    await searchVehicles(es, redis, {
      make: 'Toyota', model: 'Camry', year: 2024,
      fuelType: 'PETROL', bodyType: 'Sedan', market: 'US',
    })

    const call = (es.search as ReturnType<typeof vi.fn>).mock.calls[0]![0]
    expect(call.query.bool.must).toHaveLength(6)
  })

  it('should use match_all query when no filters provided', async () => {
    const es = makeEs()
    const redis = makeRedis()

    await searchVehicles(es, redis, {})

    const call = (es.search as ReturnType<typeof vi.fn>).mock.calls[0]![0]
    expect(call.query).toMatchObject({ match_all: {} })
  })

  it('should cap limit at 100', async () => {
    const es = makeEs()
    const redis = makeRedis()

    await searchVehicles(es, redis, { limit: 500 })

    const call = (es.search as ReturnType<typeof vi.fn>).mock.calls[0]![0]
    expect(call.size).toBe(100)
  })

  it('should correctly compute hasMore', async () => {
    const es = makeEs(50)
    const redis = makeRedis()

    const result = await searchVehicles(es, redis, { page: 1, limit: 24 })

    expect(result.hasMore).toBe(true)
  })
})
