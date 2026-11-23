import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import Fastify from 'fastify'
import jwt from '@fastify/jwt'
import rateLimit from '@fastify/rate-limit'
import type { PrismaClient } from '@prisma/client'
import { authRoutes } from './token.js'

const INTERNAL_SECRET = 'test-internal-secret'
const originalEnv = { ...process.env }

function buildApp(overrides: { subscriptionResult?: { tier: string } | null } = {}) {
  const { subscriptionResult = { tier: 'FREE' } } = overrides
  const mockPrisma = {
    subscription: {
      findUnique: vi.fn().mockResolvedValue(subscriptionResult),
    },
  }

  const app = Fastify({ logger: false })
  void app.register(rateLimit, { max: 200, timeWindow: '1 minute' })
  void app.register(jwt, { secret: 'test-jwt-secret-32-chars-minimum' })
  app.decorate('prisma', mockPrisma as unknown as PrismaClient)
  void app.register(authRoutes, { prefix: '/auth' })

  return { app, mockPrisma }
}

describe('POST /auth/token', () => {
  beforeEach(() => {
    process.env['API_INTERNAL_SECRET'] = INTERNAL_SECRET
  })

  afterEach(() => {
    process.env = { ...originalEnv }
    vi.clearAllMocks()
  })

  it('should return 400 when body is empty', async () => {
    const { app } = buildApp()
    await app.ready()

    const res = await app.inject({
      method: 'POST',
      url: '/auth/token',
      payload: {},
    })

    expect(res.statusCode).toBe(400)
    expect(res.json()).toMatchObject({ error: 'Invalid request body' })
  })

  it('should return 400 when userId is missing', async () => {
    const { app } = buildApp()
    await app.ready()

    const res = await app.inject({
      method: 'POST',
      url: '/auth/token',
      payload: { secret: INTERNAL_SECRET },
    })

    expect(res.statusCode).toBe(400)
  })

  it('should return 401 when secret is wrong', async () => {
    const { app } = buildApp()
    await app.ready()

    const res = await app.inject({
      method: 'POST',
      url: '/auth/token',
      payload: { secret: 'wrong-secret', userId: 'user_1' },
    })

    expect(res.statusCode).toBe(401)
    expect(res.json()).toMatchObject({ error: 'Unauthorized' })
  })

  it('should return a signed JWT with correct claims for valid request', async () => {
    const { app } = buildApp()
    await app.ready()

    const res = await app.inject({
      method: 'POST',
      url: '/auth/token',
      payload: { secret: INTERNAL_SECRET, userId: 'user_1' },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json<{ data: { accessToken: string; expiresIn: number } }>()
    expect(body.data.accessToken).toBeTruthy()
    expect(body.data.expiresIn).toBe(900)

    const decoded = app.jwt.verify<{ userId: string; tier: string }>(body.data.accessToken)
    expect(decoded.userId).toBe('user_1')
    expect(decoded.tier).toBe('FREE')
  })

  it('should embed PRO tier when subscription is PRO', async () => {
    const { app } = buildApp({ subscriptionResult: { tier: 'PRO' } })
    await app.ready()

    const res = await app.inject({
      method: 'POST',
      url: '/auth/token',
      payload: { secret: INTERNAL_SECRET, userId: 'user_pro' },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json<{ data: { accessToken: string } }>()
    const decoded = app.jwt.verify<{ tier: string }>(body.data.accessToken)
    expect(decoded.tier).toBe('PRO')
  })

  it('should default to FREE tier when user has no subscription record', async () => {
    const { app } = buildApp({ subscriptionResult: null })
    await app.ready()

    const res = await app.inject({
      method: 'POST',
      url: '/auth/token',
      payload: { secret: INTERNAL_SECRET, userId: 'user_new' },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json<{ data: { accessToken: string } }>()
    const decoded = app.jwt.verify<{ tier: string }>(body.data.accessToken)
    expect(decoded.tier).toBe('FREE')
  })
})
