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

const { getVehicle } = await import('../../services/vehicle.service.js')
const { exportRoutes } = await import('./export.js')

const FULL_VEHICLE = {
  id: 'veh_1',
  slug: 'toyota-camry-2024-xse-us',
  make: 'Toyota',
  model: 'Camry',
  year: 2024,
  market: 'US',
  trimLevel: 'XSE V6',
  engine: {
    displacement: 3.5,
    cylinders: 6,
    fuelType: 'PETROL',
    powerKw: 220,
    torqueNm: 350,
    transmission: '8-speed automatic',
    drivetrain: 'FWD',
  },
  exterior: {
    bodyType: 'Sedan',
    lengthMm: 4885,
    widthMm: 1840,
    heightMm: 1445,
    wheelbaseMm: 2825,
    colors: [
      { id: 'col_1', name: 'Midnight Black', hexCode: '#1a1a1a', isPrimary: true },
    ],
  },
  interior: {
    seatMaterial: 'Leather',
    seatRows: 2,
    seatCount: 5,
    dashboard: 'Digital cluster',
    techFeatures: ['Apple CarPlay', 'Android Auto'],
  },
  media: [],
}

function buildApp() {
  const mockPrisma = {
    subscription: { findUnique: vi.fn().mockResolvedValue({ tier: 'PRO' }) },
  } as unknown as PrismaClient
  const mockRedis = {
    get:   vi.fn().mockResolvedValue('PRO'),
    setex: vi.fn().mockResolvedValue('OK'),
    del:   vi.fn().mockResolvedValue(1),
  } as unknown as Redis

  const app = Fastify({ logger: false })
  app.register(rateLimit, { max: 1000, timeWindow: '1 minute' })
  app.register(jwt, { secret: 'test-secret-32-chars-minimum-ok!' })
  app.decorate('prisma', mockPrisma)
  app.decorate('redis', mockRedis)
  // Register with /vehicles prefix — mirrors production where exportRoutes is
  // a sub-plugin of vehicleRoutes which is registered at prefix /vehicles
  app.register(exportRoutes, { prefix: '/vehicles' })
  return { app }
}

describe('GET /vehicles/:id/export/pdf', () => {
  beforeEach(() => vi.clearAllMocks())

  it('should return 401 for unauthenticated requests', async () => {
    const { app } = buildApp()
    await app.ready()

    const res = await app.inject({ method: 'GET', url: '/vehicles/veh_1/export/pdf' })
    expect(res.statusCode).toBe(401)
  })

  it('should return 403 for FREE tier users', async () => {
    const mockPrisma = {
      subscription: { findUnique: vi.fn().mockResolvedValue({ tier: 'FREE' }) },
    } as unknown as PrismaClient
    const mockRedis = {
      get: vi.fn().mockResolvedValue('FREE'),
      setex: vi.fn(),
      del: vi.fn(),
    } as unknown as Redis

    const app = Fastify({ logger: false })
    app.register(rateLimit, { max: 1000, timeWindow: '1 minute' })
    app.register(jwt, { secret: 'test-secret-32-chars-minimum-ok!' })
    app.decorate('prisma', mockPrisma)
    app.decorate('redis', mockRedis)
    app.register(exportRoutes, { prefix: '/vehicles' })
    await app.ready()

    const token = app.jwt.sign({ userId: 'user_1', tier: 'FREE' })
    const res = await app.inject({
      method: 'GET',
      url: '/vehicles/veh_1/export/pdf',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(res.statusCode).toBe(403)
  })

  it('should return 404 when vehicle not found', async () => {
    vi.mocked(getVehicle).mockResolvedValueOnce(null)
    const { app } = buildApp()
    await app.ready()

    const token = app.jwt.sign({ userId: 'user_1', tier: 'PRO' })
    const res = await app.inject({
      method: 'GET',
      url: '/vehicles/nonexistent/export/pdf',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(res.statusCode).toBe(404)
  })

  it('should return HTML spec sheet for PRO users', async () => {
    vi.mocked(getVehicle).mockResolvedValueOnce(FULL_VEHICLE as never)
    const { app } = buildApp()
    await app.ready()

    const token = app.jwt.sign({ userId: 'user_1', tier: 'PRO' })
    const res = await app.inject({
      method: 'GET',
      url: '/vehicles/veh_1/export/pdf',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(res.statusCode).toBe(200)
    expect(res.headers['content-type']).toMatch(/text\/html/)
    expect(res.body).toContain('Toyota')
    expect(res.body).toContain('Camry')
    expect(res.body).toContain('2024')
  })

  it('should include engine specs in the HTML output', async () => {
    vi.mocked(getVehicle).mockResolvedValueOnce(FULL_VEHICLE as never)
    const { app } = buildApp()
    await app.ready()

    const token = app.jwt.sign({ userId: 'user_1', tier: 'PRO' })
    const res = await app.inject({
      method: 'GET',
      url: '/vehicles/veh_1/export/pdf',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(res.body).toContain('220')   // powerKw
    expect(res.body).toContain('350')   // torqueNm
    expect(res.body).toContain('3.5')   // displacement
    expect(res.body).toContain('PETROL')
  })

  it('should include exterior dimensions in the HTML output', async () => {
    vi.mocked(getVehicle).mockResolvedValueOnce(FULL_VEHICLE as never)
    const { app } = buildApp()
    await app.ready()

    const token = app.jwt.sign({ userId: 'user_1', tier: 'PRO' })
    const res = await app.inject({
      method: 'GET',
      url: '/vehicles/veh_1/export/pdf',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(res.body).toContain('4885')  // lengthMm
    expect(res.body).toContain('Sedan')
    expect(res.body).toContain('Midnight Black')
  })

  it('should set Cache-Control: private, no-store', async () => {
    vi.mocked(getVehicle).mockResolvedValueOnce(FULL_VEHICLE as never)
    const { app } = buildApp()
    await app.ready()

    const token = app.jwt.sign({ userId: 'user_1', tier: 'PRO' })
    const res = await app.inject({
      method: 'GET',
      url: '/vehicles/veh_1/export/pdf',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(res.headers['cache-control']).toContain('no-store')
  })
})