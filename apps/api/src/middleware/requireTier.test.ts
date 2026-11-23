import { describe, it, expect } from 'vitest'
import Fastify from 'fastify'
import type { JwtPayload } from './requireAuth.js'
import { requireTier } from './requireTier.js'

function buildApp(tier: 'FREE' | 'PRO') {
  const app = Fastify({ logger: false })

  // Inject a pre-verified user without going through JWT — tests tier logic only
  app.addHook('onRequest', (req, _reply, done) => {
    req['user'] = { userId: 'user_test', tier } as JwtPayload
    done()
  })

  app.get('/pro-only', { preHandler: [requireTier('PRO')] }, () => ({ access: 'granted' }))
  app.get('/free-ok', { preHandler: [requireTier('FREE')] }, () => ({ access: 'granted' }))

  return app
}

describe('requireTier', () => {
  it('should allow a PRO user to access a PRO-gated route', async () => {
    const app = buildApp('PRO')
    await app.ready()

    const res = await app.inject({ method: 'GET', url: '/pro-only' })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toMatchObject({ access: 'granted' })
  })

  it('should block a FREE user from a PRO-gated route with 403', async () => {
    const app = buildApp('FREE')
    await app.ready()

    const res = await app.inject({ method: 'GET', url: '/pro-only' })

    expect(res.statusCode).toBe(403)
    expect(res.json()).toMatchObject({
      error: 'PRO subscription required',
      code: 'TIER_REQUIRED',
      statusCode: 403,
    })
  })

  it('should allow a FREE user to access a FREE-gated route', async () => {
    const app = buildApp('FREE')
    await app.ready()

    const res = await app.inject({ method: 'GET', url: '/free-ok' })

    expect(res.statusCode).toBe(200)
  })

  it('should block a PRO user from a FREE-only route with 403', async () => {
    // Edge case: FREE-tier route on a PRO user (requireTier checks exact match)
    const app = buildApp('PRO')
    await app.ready()

    const res = await app.inject({ method: 'GET', url: '/free-ok' })

    expect(res.statusCode).toBe(403)
  })
})
