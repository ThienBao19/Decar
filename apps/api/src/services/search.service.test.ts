import { describe, it, expect, vi } from 'vitest'
import type { PrismaClient } from '@prisma/client'
import type { Redis } from 'ioredis'
import { parseSearchParams, searchVehicles } from './search.service.js'

const ROW = {
  id: 'veh_1', slug: 'toyota-camry-2024-xse-us', make: 'Toyota', model: 'Camry', year: 2024,
  market: 'US', trimLevel: 'XSE V6', exterior: { bodyType: 'Sedan' },
}

function makePrisma(rows = [ROW], total = rows.length) {
  const findMany = vi.fn().mockResolvedValue(rows)
  const count = vi.fn().mockResolvedValue(total)
  return { prisma: { vehicle: { findMany, count } } as unknown as PrismaClient, findMany, count }
}

function makeRedis(cached: string | null = null) {
  const get = vi.fn().mockResolvedValue(cached)
  const setex = vi.fn().mockResolvedValue('OK')
  return { redis: { get, setex } as unknown as Redis, get, setex }
}

describe('searchVehicles', () => {
  it('returns paginated DTOs from the database', async () => {
    const { prisma } = makePrisma([ROW], 30)
    const result = await searchVehicles(prisma, null, { page: 1, limit: 24 })
    expect(result).toEqual({
      data: [{
        id: 'veh_1', slug: 'toyota-camry-2024-xse-us', make: 'Toyota', model: 'Camry', year: 2024,
        market: 'US', trimLevel: 'XSE V6', bodyType: 'Sedan', thumbnailUrl: null,
      }],
      total: 30, page: 1, limit: 24, hasMore: true,
    })
  })

  it('builds a case-insensitive where clause from every filter', async () => {
    const { prisma, findMany, count } = makePrisma()
    await searchVehicles(prisma, null, {
      make: 'toyota', model: 'cam', year: 2024, fuelType: 'PETROL', bodyType: 'sedan', market: 'us',
      page: 2, limit: 10,
    })
    const where = {
      make: { equals: 'toyota', mode: 'insensitive' },
      model: { contains: 'cam', mode: 'insensitive' },
      year: 2024,
      market: { equals: 'us', mode: 'insensitive' },
      engine: { is: { fuelType: 'PETROL' } },
      exterior: { is: { bodyType: { equals: 'sedan', mode: 'insensitive' } } },
    }
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where, skip: 10, take: 10 }))
    expect(count).toHaveBeenCalledWith({ where })
  })

  it('uses an empty where clause without filters', async () => {
    const { prisma, findMany } = makePrisma()
    await searchVehicles(prisma, null, {})
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: {}, skip: 0, take: 24 }))
  })

  it('returns the cached result and skips the database on a hit', async () => {
    const cached = { data: [], total: 0, page: 1, limit: 24, hasMore: false }
    const { prisma, findMany } = makePrisma()
    const { redis } = makeRedis(JSON.stringify(cached))
    expect(await searchVehicles(prisma, redis, {})).toEqual(cached)
    expect(findMany).not.toHaveBeenCalled()
  })

  it('caches a fresh result for 5 minutes', async () => {
    const { prisma } = makePrisma()
    const { redis, setex } = makeRedis()
    await searchVehicles(prisma, redis, { make: 'Toyota' })
    expect(setex).toHaveBeenCalledWith(expect.stringMatching(/^search:/), 300, expect.any(String))
  })

  it('returns hasMore false on the last page', async () => {
    const { prisma } = makePrisma([ROW], 25)
    expect((await searchVehicles(prisma, null, { page: 2, limit: 24 })).hasMore).toBe(false)
  })
})

describe('parseSearchParams', () => {
  it('returns filters and pagination parsed from the query string', () => {
    expect(parseSearchParams({ make: ' BMW ', model: 'M4', year: '2021', fuelType: 'PETROL', page: '3', limit: '12' }))
      .toEqual({ make: 'BMW', model: 'M4', year: 2021, fuelType: 'PETROL', page: 3, limit: 12 })
  })

  it('returns limit clamped to 1..100 and page to at least 1', () => {
    expect(parseSearchParams({ limit: '500', page: '0' })).toEqual({ page: 1, limit: 100 })
    expect(parseSearchParams({ limit: '-5' })).toEqual({ page: 1, limit: 1 })
  })

  it('returns defaults when values are not valid', () => {
    expect(parseSearchParams({ year: 'abc', page: 'x', limit: 'y', fuelType: 'STEAM', make: '   ' }))
      .toEqual({ page: 1, limit: 24 })
  })
})
