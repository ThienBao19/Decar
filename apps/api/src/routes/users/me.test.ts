import { describe, it, expect, vi, beforeEach } from 'vitest'
import Fastify from 'fastify'
import jwt from '@fastify/jwt'
import type { PrismaClient } from '@prisma/client'
import type { Redis } from 'ioredis'
import { userRoutes } from './me.js'

const BASE_USER = {
  id: 'user_1',
  email: 'test@example.com',
  name: 'Test User',
  image: null,
  subscription: {
    tier: 'FREE',
    status: 'ACTIVE',
    currentPeriodEnd: null,
  },
}

function buildApp(overrides: { userResult?: typeof BASE_USER | null } = {}) {
  const { userResult = BASE_USER } = overrides
  const mockPrisma = {
    user: { findUnique: vi.fn().mockResolvedValue(userResult) },
    subscription: { findUnique: vi.fn().mockResolvedValue({ tier: 'FREE' }) },
  }
  const mockRedis = {
    get: vi.fn().mockResolvedValue('FREE'),
    setex: vi.fn().mockResolvedValue('OK'),
  }

  const app = Fastify({ logger: false })
  void app.register(jwt, { secret: 'test-secret-32-chars-minimum-ok' })
  app.decorate('prisma', mockPrisma as unknown as PrismaClient)
  app.decorate('redis', mockRedis as unknown as Redis)
  void app.register(userRoutes, { prefix: '/users' })

  return { app, mockPrisma }
}

describe('GET /users/me', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('should return 401 when no token is provided', async () => {
    const { app } = buildApp()
    await app.ready()

    const res = await app.inject({ method: 'GET', url: '/users/me' })

    expect(res.statusCode).toBe(401)
  })

  it('should return full user profile for authenticated request', async () => {
    const { app } = buildApp()
    await app.ready()

    const token = app.jwt.sign({ userId: 'user_1', tier: 'FREE' })
    const res = await app.inject({
      method: 'GET',
      url: '/users/me',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json<{ data: typeof BASE_USER }>()
    expect(body.data.id).toBe('user_1')
    expect(body.data.email).toBe('test@example.com')
    expect(body.data.name).toBe('Test User')
    expect(body.data.subscription.tier).toBe('FREE')
    expect(body.data.subscription.status).toBe('ACTIVE')
  })

  it('should return 404 when user does not exist in DB', async () => {
    const { app } = buildApp({ userResult: null })
    await app.ready()

    const token = app.jwt.sign({ userId: 'user_ghost', tier: 'FREE' })
    const res = await app.inject({
      method: 'GET',
      url: '/users/me',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(res.statusCode).toBe(404)
    expect(res.json()).toMatchObject({ error: 'User not found' })
  })

  it('should reflect PRO tier and period end in subscription data', async () => {
    const periodEnd = new Date('2026-01-01T00:00:00.000Z')
    const { app } = buildApp({
      userResult: {
        ...BASE_USER,
        subscription: { tier: 'PRO', status: 'ACTIVE', currentPeriodEnd: periodEnd as unknown as null },
      },
    })
    await app.ready()

    const token = app.jwt.sign({ userId: 'user_1', tier: 'PRO' })
    const res = await app.inject({
      method: 'GET',
      url: '/users/me',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json<{ data: { subscription: { tier: string; currentPeriodEnd: string } } }>()
    expect(body.data.subscription.tier).toBe('PRO')
    expect(body.data.subscription.currentPeriodEnd).toBe('2026-01-01T00:00:00.000Z')
  })

  it('should return null currentPeriodEnd when subscription has no period', async () => {
    const { app } = buildApp()
    await app.ready()

    const token = app.jwt.sign({ userId: 'user_1', tier: 'FREE' })
    const res = await app.inject({
      method: 'GET',
      url: '/users/me',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json<{ data: { subscription: { currentPeriodEnd: null } } }>()
    expect(body.data.subscription.currentPeriodEnd).toBeNull()
  })
})
