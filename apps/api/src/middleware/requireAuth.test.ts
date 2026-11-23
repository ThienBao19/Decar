import { describe, it, expect, vi, beforeEach } from 'vitest'
import Fastify from 'fastify'
import jwt from '@fastify/jwt'
import type { PrismaClient } from '@prisma/client'
import type { Redis } from 'ioredis'
import { requireAuth } from './requireAuth.js'

function buildApp({
  redisGet = vi.fn().mockResolvedValue(null),
  redisSetex = vi.fn().mockResolvedValue('OK'),
  prismaFindUnique = vi.fn().mockResolvedValue(null),
} = {}) {
  const app = Fastify({ logger: false })

  void app.register(jwt, { secret: 'test-secret-32-chars-minimum-ok' })
  app.decorate('redis', { get: redisGet, setex: redisSetex } as unknown as Redis)
  app.decorate('prisma', {
    subscription: { findUnique: prismaFindUnique },
  } as unknown as PrismaClient)

  app.get('/protected', { preHandler: [requireAuth] }, (req) => ({
    userId: req.user.userId,
    tier: req.user.tier,
  }))

  return { app, redisGet, redisSetex, prismaFindUnique }
}

describe('requireAuth', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('should return 401 when no Authorization header is provided', async () => {
    const { app } = buildApp()
    await app.ready()

    const res = await app.inject({ method: 'GET', url: '/protected' })

    expect(res.statusCode).toBe(401)
    expect(res.json()).toMatchObject({ error: 'Unauthorized', statusCode: 401 })
  })

  it('should return 401 for a malformed token', async () => {
    const { app } = buildApp()
    await app.ready()

    const res = await app.inject({
      method: 'GET',
      url: '/protected',
      headers: { authorization: 'Bearer not.a.valid.jwt' },
    })

    expect(res.statusCode).toBe(401)
  })

  it('should pass through and attach user when JWT is valid and Redis has no cached tier', async () => {
    const { app } = buildApp()
    await app.ready()

    const token = app.jwt.sign({ userId: 'user_abc', tier: 'FREE' })
    const res = await app.inject({
      method: 'GET',
      url: '/protected',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toMatchObject({ userId: 'user_abc', tier: 'FREE' })
  })

  it('should override JWT tier with cached tier from Redis', async () => {
    const { app } = buildApp({ redisGet: vi.fn().mockResolvedValue('PRO') })
    await app.ready()

    const token = app.jwt.sign({ userId: 'user_abc', tier: 'FREE' })
    const res = await app.inject({
      method: 'GET',
      url: '/protected',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toMatchObject({ userId: 'user_abc', tier: 'PRO' })
  })

  it('should fetch tier from DB on Redis cache miss and populate cache', async () => {
    const redisSetex = vi.fn().mockResolvedValue('OK')
    const prismaFindUnique = vi.fn().mockResolvedValue({ tier: 'PRO' })
    const { app } = buildApp({
      redisGet: vi.fn().mockResolvedValue(null),
      redisSetex,
      prismaFindUnique,
    })
    await app.ready()

    const token = app.jwt.sign({ userId: 'user_xyz', tier: 'FREE' })
    const res = await app.inject({
      method: 'GET',
      url: '/protected',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toMatchObject({ tier: 'PRO' })
    expect(redisSetex).toHaveBeenCalledWith('user:user_xyz:tier', 300, 'PRO')
  })

  it('should keep JWT tier when DB returns no subscription', async () => {
    const { app } = buildApp({ prismaFindUnique: vi.fn().mockResolvedValue(null) })
    await app.ready()

    const token = app.jwt.sign({ userId: 'user_new', tier: 'FREE' })
    const res = await app.inject({
      method: 'GET',
      url: '/protected',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toMatchObject({ tier: 'FREE' })
  })
})
