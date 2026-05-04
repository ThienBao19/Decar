import { describe, it, expect, vi, beforeEach } from 'vitest'
import Fastify from 'fastify'
import jwt from '@fastify/jwt'
import rateLimit from '@fastify/rate-limit'
import type { PrismaClient } from '@prisma/client'
import type { Redis } from 'ioredis'

vi.mock('../../services/vehicle.service.js', () => ({
  getVehicle: vi.fn(),
  listVehicles: vi.fn(),
}))

vi.mock('../../services/search.service.js', () => ({
  searchVehicles: vi.fn(),
}))

vi.mock('../../services/media.service.js', () => ({
  getVehicleMedia: vi.fn(),
}))

vi.mock('@elastic/elasticsearch', () => ({
  Client: vi.fn().mockImplementation(() => ({})),
}))

const { getVehicle, listVehicles } = await import('../../services/vehicle.service.js')
const { searchVehicles }           = await import('../../services/search.service.js')
const { getVehicleMedia }          = await import('../../services/media.service.js')
const { vehicleRoutes }            = await import('./index.js')

const VEHICLE_DETAIL = {
  id: 'veh_1', slug: 'toyota-camry-2024-us', make: 'Toyota', model: 'Camry',
  year: 2024, market: 'US', trimLevel: 'XSE', engine: null,
  exterior: null, interior: null, media: [],
}

const SEARCH_RESULT = {
  data: [{ id: 'veh_1', slug: 'toyota-camry-2024-us', make: 'Toyota', model: 'Camry',
           year: 2024, market: 'US', trimLevel: null, bodyType: 'Sedan', thumbnailUrl: null }],
  total: 1, page: 1, limit: 24, hasMore: false,
}

function buildApp() {
  const mockPrisma = {
    subscription: { findUnique: vi.fn().mockResolvedValue({ tier: 'FREE' }) },
  }
  const mockRedis = {
    get: vi.fn().mockResolvedValue('FREE'),
    setex: vi.fn(),
  }
  const app = Fastify({ logger: false })
  app.register(rateLimit, { max: 1000, timeWindow: '1 minute' })
  app.register(jwt, { secret: 'test-secret-32-chars-minimum-ok' })
  app.decorate('prisma', mockPrisma as unknown as PrismaClient)
  app.decorate('redis', mockRedis as unknown as Redis)
  app.register(vehicleRoutes, { prefix: '/vehicles' })
  return { app, mockPrisma, mockRedis }
}

describe('GET /vehicles', () => {
  beforeEach(() => vi.clearAllMocks())

  it('should return search results from Elasticsearch', async () => {
    vi.mocked(searchVehicles).mockResolvedValue(SEARCH_RESULT)
    const { app } = buildApp()
    await app.ready()

    const res = await app.inject({ method: 'GET', url: '/vehicles' })

    expect(res.statusCode).toBe(200)
    const body = res.json() as { data: unknown[]; total: number }
    expect(body.data).toHaveLength(1)
    expect(body.total).toBe(1)
  })

  it('should fall back to DB list when Elasticsearch throws', async () => {
    vi.mocked(searchVehicles).mockRejectedValue(new Error('ES unavailable'))
    vi.mocked(listVehicles).mockResolvedValue({ data: SEARCH_RESULT.data, total: 1 })
    const { app } = buildApp()
    await app.ready()

    const res = await app.inject({ method: 'GET', url: '/vehicles?make=Toyota' })

    expect(res.statusCode).toBe(200)
    expect(listVehicles).toHaveBeenCalled()
  })

  it('should pass query filters to searchVehicles', async () => {
    vi.mocked(searchVehicles).mockResolvedValue(SEARCH_RESULT)
    const { app } = buildApp()
    await app.ready()

    await app.inject({ method: 'GET', url: '/vehicles?make=Toyota&model=Camry&year=2024&fuelType=PETROL' })

    const call = vi.mocked(searchVehicles).mock.calls[0]![2]
    expect(call.make).toBe('Toyota')
    expect(call.model).toBe('Camry')
    expect(call.year).toBe(2024)
    expect(call.fuelType).toBe('PETROL')
  })
})

describe('GET /vehicles/:id', () => {
  beforeEach(() => vi.clearAllMocks())

  it('should return vehicle data for anonymous FREE request', async () => {
    vi.mocked(getVehicle).mockResolvedValue(VEHICLE_DETAIL)
    const { app } = buildApp()
    await app.ready()

    const res = await app.inject({ method: 'GET', url: '/vehicles/veh_1' })

    expect(res.statusCode).toBe(200)
    const body = res.json() as { data: typeof VEHICLE_DETAIL }
    expect(body.data.id).toBe('veh_1')
    expect(getVehicle).toHaveBeenCalledWith(expect.anything(), expect.anything(), 'veh_1', 'FREE')
  })

  it('should use PRO tier when valid JWT is provided', async () => {
    vi.mocked(getVehicle).mockResolvedValue(VEHICLE_DETAIL)
    const { app } = buildApp()
    await app.ready()

    const token = app.jwt.sign({ userId: 'user_1', tier: 'PRO' })
    await app.inject({
      method: 'GET', url: '/vehicles/veh_1',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(getVehicle).toHaveBeenCalledWith(expect.anything(), expect.anything(), 'veh_1', 'PRO')
  })

  it('should return 404 when vehicle does not exist', async () => {
    vi.mocked(getVehicle).mockResolvedValue(null)
    const { app } = buildApp()
    await app.ready()

    const res = await app.inject({ method: 'GET', url: '/vehicles/nonexistent' })

    expect(res.statusCode).toBe(404)
    expect(res.json()).toMatchObject({ error: 'Vehicle not found' })
  })
})

describe('GET /vehicles/:id/media', () => {
  beforeEach(() => vi.clearAllMocks())

  it('should return 401 when no token is provided', async () => {
    const { app } = buildApp()
    await app.ready()

    const res = await app.inject({ method: 'GET', url: '/vehicles/veh_1/media?type=EXTERIOR_IMAGE' })

    expect(res.statusCode).toBe(401)
  })

  it('should return 400 when type query param is missing', async () => {
    const { app } = buildApp()
    await app.ready()

    const token = app.jwt.sign({ userId: 'user_1', tier: 'FREE' })
    const res = await app.inject({
      method: 'GET', url: '/vehicles/veh_1/media',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(res.statusCode).toBe(400)
    expect(res.json()).toMatchObject({ error: 'type query param required' })
  })

  it('should return 400 for an invalid media type value', async () => {
    const { app } = buildApp()
    await app.ready()

    const token = app.jwt.sign({ userId: 'user_1', tier: 'FREE' })
    const res = await app.inject({
      method: 'GET', url: '/vehicles/veh_1/media?type=INVALID',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(res.statusCode).toBe(400)
    expect(res.json()).toMatchObject({ error: 'Invalid media type' })
  })

  it('should return signed URLs for a valid authenticated request', async () => {
    const signedMedia = [{ url: 'https://s3.example.com/key.jpg', expiresAt: '2026-01-01T00:00:00.000Z' }]
    vi.mocked(getVehicleMedia).mockResolvedValue(signedMedia)
    const { app } = buildApp()
    await app.ready()

    const token = app.jwt.sign({ userId: 'user_1', tier: 'FREE' })
    const res = await app.inject({
      method: 'GET', url: '/vehicles/veh_1/media?type=EXTERIOR_IMAGE',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json() as { data: typeof signedMedia }
    expect(body.data[0]!.url).toMatch(/^https:\/\//)
  })

  it('should return 403 when FREE user requests 3D media', async () => {
    vi.mocked(getVehicleMedia).mockRejectedValue(new Error('PRO_REQUIRED'))
    const { app } = buildApp()
    await app.ready()

    const token = app.jwt.sign({ userId: 'user_1', tier: 'FREE' })
    const res = await app.inject({
      method: 'GET', url: '/vehicles/veh_1/media?type=ENGINE_3D',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(res.statusCode).toBe(403)
    expect(res.json()).toMatchObject({ error: 'PRO subscription required' })
  })
})