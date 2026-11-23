import { describe, it, expect, vi, beforeEach } from 'vitest'
import Fastify from 'fastify'
import jwt from '@fastify/jwt'
import rateLimit from '@fastify/rate-limit'
import type { PrismaClient } from '@prisma/client'
import type { Redis } from 'ioredis'

// ---------------------------------------------------------------------------
// Mock the service and Stripe
// ---------------------------------------------------------------------------
const { mockConstructEvent } = vi.hoisted(() => ({
  mockConstructEvent: vi.fn(),
}))

vi.mock('../../services/subscription.service.js', () => ({
  createCheckoutSession: vi.fn().mockResolvedValue('https://checkout.stripe.com/pay/test_session'),
  getBillingPortalUrl:   vi.fn().mockResolvedValue('https://billing.stripe.com/session/test_portal'),
  handleWebhookEvent:    vi.fn().mockResolvedValue(undefined),
  getStripe: vi.fn().mockReturnValue({
    webhooks: { constructEvent: mockConstructEvent },
  }),
}))

const { createCheckoutSession, getBillingPortalUrl, handleWebhookEvent } =
  await import('../../services/subscription.service.js')
const { subscriptionRoutes } = await import('./index.js')

// ---------------------------------------------------------------------------
// App builder
// ---------------------------------------------------------------------------
function buildApp() {
  const mockPrisma = {
    subscription: {
      findUnique: vi.fn().mockResolvedValue({ tier: 'FREE' }),
    },
  } as unknown as PrismaClient

  const mockRedis = {
    get:   vi.fn().mockResolvedValue('FREE'),
    setex: vi.fn().mockResolvedValue('OK'),
    del:   vi.fn().mockResolvedValue(1),
  } as unknown as Redis

  const app = Fastify({ logger: false })
  void app.register(rateLimit, { max: 1000, timeWindow: '1 minute' })
  void app.register(jwt, { secret: 'test-secret-32-chars-minimum-ok!' })
  app.decorate('prisma', mockPrisma)
  app.decorate('redis',  mockRedis)
  void app.register(subscriptionRoutes, { prefix: '/subscriptions' })
  return { app }
}

// ---------------------------------------------------------------------------
// POST /subscriptions/checkout
// ---------------------------------------------------------------------------
describe('POST /subscriptions/checkout', () => {
  beforeEach(() => vi.clearAllMocks())

  it('should return 401 when not authenticated', async () => {
    const { app } = buildApp()
    await app.ready()

    const res = await app.inject({ method: 'POST', url: '/subscriptions/checkout' })
    expect(res.statusCode).toBe(401)
  })

  it('should return checkout URL for authenticated user', async () => {
    const { app } = buildApp()
    await app.ready()

    const token = app.jwt.sign({ userId: 'user_1', tier: 'FREE' })
    const res = await app.inject({
      method: 'POST',
      url: '/subscriptions/checkout',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json<{ data: { url: string } }>()
    expect(body.data.url).toBe('https://checkout.stripe.com/pay/test_session')
    expect(createCheckoutSession).toHaveBeenCalledWith(
      expect.anything(),
      'user_1',
      expect.stringContaining('upgraded=true'),
      expect.stringContaining('canceled=true'),
    )
  })

  it('should return 500 when service throws', async () => {
    vi.mocked(createCheckoutSession).mockRejectedValueOnce(new Error('Stripe error'))
    const { app } = buildApp()
    await app.ready()

    const token = app.jwt.sign({ userId: 'user_1', tier: 'FREE' })
    const res = await app.inject({
      method: 'POST',
      url: '/subscriptions/checkout',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(res.statusCode).toBe(500)
  })
})

// ---------------------------------------------------------------------------
// POST /subscriptions/portal
// ---------------------------------------------------------------------------
describe('POST /subscriptions/portal', () => {
  beforeEach(() => vi.clearAllMocks())

  it('should return 401 when not authenticated', async () => {
    const { app } = buildApp()
    await app.ready()

    const res = await app.inject({ method: 'POST', url: '/subscriptions/portal' })
    expect(res.statusCode).toBe(401)
  })

  it('should return portal URL for authenticated user', async () => {
    const { app } = buildApp()
    await app.ready()

    const token = app.jwt.sign({ userId: 'user_1', tier: 'PRO' })
    const res = await app.inject({
      method: 'POST',
      url: '/subscriptions/portal',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json<{ data: { url: string } }>()
    expect(body.data.url).toBe('https://billing.stripe.com/session/test_portal')
    expect(getBillingPortalUrl).toHaveBeenCalledWith(
      expect.anything(),
      'user_1',
      expect.stringContaining('dashboard'),
    )
  })

  it('should return 500 when service throws', async () => {
    vi.mocked(getBillingPortalUrl).mockRejectedValueOnce(new Error('Stripe error'))
    const { app } = buildApp()
    await app.ready()

    const token = app.jwt.sign({ userId: 'user_1', tier: 'PRO' })
    const res = await app.inject({
      method: 'POST',
      url: '/subscriptions/portal',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(res.statusCode).toBe(500)
  })
})

// ---------------------------------------------------------------------------
// POST /subscriptions/webhook
// ---------------------------------------------------------------------------
describe('POST /subscriptions/webhook', () => {
  beforeEach(() => vi.clearAllMocks())

  it('should return 400 when stripe-signature header is missing', async () => {
    const { app } = buildApp()
    await app.ready()

    const res = await app.inject({
      method: 'POST',
      url: '/subscriptions/webhook',
      payload: '{}',
      headers: { 'content-type': 'application/json' },
    })

    expect(res.statusCode).toBe(400)
    const body = res.json<{ error: string }>()
    expect(body.error).toMatch(/stripe-signature/i)
  })

  it('should return 400 when signature verification fails', async () => {
    mockConstructEvent.mockImplementationOnce(() => {
      throw new Error('Webhook Error: No signatures found matching the expected signature for payload')
    })

    const { app } = buildApp()
    await app.ready()

    const res = await app.inject({
      method: 'POST',
      url: '/subscriptions/webhook',
      payload: '{}',
      headers: {
        'content-type': 'application/json',
        'stripe-signature': 't=invalid,v1=badsig',
      },
    })

    expect(res.statusCode).toBe(400)
    const body = res.json<{ error: string }>()
    expect(body.error).toMatch(/invalid/i)
  })

  it('should return 200 and process a valid event', async () => {
    const fakeEvent = {
      id: 'evt_1',
      type: 'checkout.session.completed',
      data: { object: { metadata: { userId: 'user_1' }, subscription: 'sub_1' } },
    }
    mockConstructEvent.mockReturnValueOnce(fakeEvent)

    const { app } = buildApp()
    await app.ready()

    const res = await app.inject({
      method: 'POST',
      url: '/subscriptions/webhook',
      payload: JSON.stringify(fakeEvent),
      headers: {
        'content-type': 'application/json',
        'stripe-signature': 't=1234,v1=validhash',
      },
    })

    expect(res.statusCode).toBe(200)
    expect(handleWebhookEvent).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      fakeEvent,
    )
  })

  it('should verify the signature against the exact raw request bytes', async () => {
    mockConstructEvent.mockReturnValueOnce({ id: 'evt_3', type: 'ping', data: { object: {} } })
    // Whitespace that JSON.stringify(JSON.parse(...)) would not reproduce
    const payload = '{\n  "id": "evt_3",  "type": "ping"\n}'

    const { app } = buildApp()
    await app.ready()

    await app.inject({
      method: 'POST',
      url: '/subscriptions/webhook',
      payload,
      headers: { 'content-type': 'application/json', 'stripe-signature': 't=1,v1=x' },
    })

    const rawArg = mockConstructEvent.mock.calls[0]?.[0] as Buffer
    expect(rawArg.toString('utf8')).toBe(payload)
  })

  it('should return 200 even when handleWebhookEvent throws (prevents Stripe retries)', async () => {
    const fakeEvent = { id: 'evt_2', type: 'invoice.payment_failed', data: { object: {} } }
    mockConstructEvent.mockReturnValueOnce(fakeEvent)
    vi.mocked(handleWebhookEvent).mockRejectedValueOnce(new Error('DB error'))

    const { app } = buildApp()
    await app.ready()

    const res = await app.inject({
      method: 'POST',
      url: '/subscriptions/webhook',
      payload: JSON.stringify(fakeEvent),
      headers: {
        'content-type': 'application/json',
        'stripe-signature': 't=1234,v1=validhash',
      },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json<{ received: boolean }>()
    expect(body.received).toBe(true)
  })
})