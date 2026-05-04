import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { PrismaClient } from '@prisma/client'
import type { Redis } from 'ioredis'
import Stripe from 'stripe'

// ---------------------------------------------------------------------------
// Hoisted Stripe mock — vi.hoisted runs before vi.mock hoisting
// ---------------------------------------------------------------------------
const {
  mockCustomerCreate,
  mockCheckoutCreate,
  mockPortalCreate,
} = vi.hoisted(() => ({
  mockCustomerCreate: vi.fn().mockResolvedValue({ id: 'cus_new_123' }),
  mockCheckoutCreate: vi.fn().mockResolvedValue({ url: 'https://checkout.stripe.com/session_abc' }),
  mockPortalCreate:   vi.fn().mockResolvedValue({ url: 'https://billing.stripe.com/portal_abc' }),
}))

vi.mock('stripe', () => ({
  default: vi.fn().mockImplementation(() => ({
    customers:     { create: mockCustomerCreate },
    checkout:      { sessions: { create: mockCheckoutCreate } },
    billingPortal: { sessions: { create: mockPortalCreate } },
  })),
}))

import {
  handleWebhookEvent,
  createCheckoutSession,
  getBillingPortalUrl,
} from './subscription.service.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makePrisma(overrides: Record<string, unknown> = {}) {
  return {
    subscription: {
      findFirst:  vi.fn().mockResolvedValue({ userId: 'user_1' }),
      findUnique: vi.fn().mockResolvedValue({ stripeCustomerId: 'cus_123' }),
      update:     vi.fn().mockResolvedValue({}),
    },
    user: {
      findUnique: vi.fn().mockResolvedValue({ email: 'user@example.com', name: 'Test User' }),
    },
    ...overrides,
  } as unknown as PrismaClient
}

function makeRedis() {
  return {
    del:   vi.fn().mockResolvedValue(1),
    setex: vi.fn().mockResolvedValue('OK'),
    get:   vi.fn().mockResolvedValue(null),
  } as unknown as Redis
}

function makeEvent(type: string, data: unknown): Stripe.Event {
  return {
    id: 'evt_test_1',
    type,
    created: Math.floor(Date.now() / 1000),
    data: { object: data },
    object: 'event',
    api_version: '2024-06-20',
    livemode: false,
    pending_webhooks: 0,
    request: null,
  } as Stripe.Event
}

// ---------------------------------------------------------------------------
// createCheckoutSession
// ---------------------------------------------------------------------------
describe('createCheckoutSession', () => {
  beforeEach(() => vi.clearAllMocks())

  it('should throw when no subscription record found', async () => {
    const prisma = makePrisma({
      subscription: {
        findUnique: vi.fn().mockResolvedValue(null),
        update: vi.fn(),
        findFirst: vi.fn(),
      },
    })
    await expect(
      createCheckoutSession(prisma, 'user_1', 'https://success.example.com', 'https://cancel.example.com'),
    ).rejects.toThrow('No subscription record found')
  })

  it('should create a new Stripe customer when customerId starts with pending_', async () => {
    const prisma = makePrisma({
      subscription: {
        findUnique: vi.fn().mockResolvedValue({ stripeCustomerId: 'pending_user_1' }),
        update:     vi.fn().mockResolvedValue({}),
        findFirst:  vi.fn(),
      },
    })

    await createCheckoutSession(prisma, 'user_1', 'https://success.example.com', 'https://cancel.example.com')

    expect(mockCustomerCreate).toHaveBeenCalledWith(
      expect.objectContaining({ metadata: { userId: 'user_1' } }),
    )
    expect(prisma.subscription.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { stripeCustomerId: 'cus_new_123' } }),
    )
  })

  it('should use existing customerId without creating a new Stripe customer', async () => {
    const prisma = makePrisma()

    await createCheckoutSession(prisma, 'user_1', 'https://success.example.com', 'https://cancel.example.com')

    expect(mockCustomerCreate).not.toHaveBeenCalled()
    expect(mockCheckoutCreate).toHaveBeenCalledWith(
      expect.objectContaining({ customer: 'cus_123', mode: 'subscription' }),
    )
  })

  it('should return the Stripe checkout session URL', async () => {
    const prisma = makePrisma()

    const url = await createCheckoutSession(
      prisma, 'user_1', 'https://success.example.com', 'https://cancel.example.com',
    )

    expect(url).toBe('https://checkout.stripe.com/session_abc')
  })

  it('should embed userId in session metadata', async () => {
    const prisma = makePrisma()

    await createCheckoutSession(prisma, 'user_1', 'https://success.example.com', 'https://cancel.example.com')

    expect(mockCheckoutCreate).toHaveBeenCalledWith(
      expect.objectContaining({ metadata: { userId: 'user_1' } }),
    )
  })
})

// ---------------------------------------------------------------------------
// getBillingPortalUrl
// ---------------------------------------------------------------------------
describe('getBillingPortalUrl', () => {
  beforeEach(() => vi.clearAllMocks())

  it('should throw when subscription not found', async () => {
    const prisma = makePrisma({
      subscription: {
        findUnique: vi.fn().mockResolvedValue(null),
        update: vi.fn(),
        findFirst: vi.fn(),
      },
    })

    await expect(
      getBillingPortalUrl(prisma, 'user_1', 'https://dashboard.example.com'),
    ).rejects.toThrow('Subscription not found')
  })

  it('should return the billing portal URL', async () => {
    const prisma = makePrisma()

    const url = await getBillingPortalUrl(prisma, 'user_1', 'https://dashboard.example.com')

    expect(url).toBe('https://billing.stripe.com/portal_abc')
    expect(mockPortalCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        customer:   'cus_123',
        return_url: 'https://dashboard.example.com',
      }),
    )
  })
})

// ---------------------------------------------------------------------------
// handleWebhookEvent
// ---------------------------------------------------------------------------
describe('handleWebhookEvent', () => {
  beforeEach(() => vi.clearAllMocks())

  it('should upgrade user to PRO on checkout.session.completed', async () => {
    const prisma = makePrisma()
    const redis  = makeRedis()

    const event = makeEvent('checkout.session.completed', {
      metadata: { userId: 'user_1' },
      subscription: 'sub_123',
    })

    await handleWebhookEvent(prisma, redis, event)

    expect(prisma.subscription.update).toHaveBeenCalledWith({
      where: { userId: 'user_1' },
      data: { stripeSubscriptionId: 'sub_123', tier: 'PRO', status: 'ACTIVE' },
    })
    expect(redis.del).toHaveBeenCalledWith('user:user_1:tier')
  })

  it('should keep PRO when subscription status is active on subscription.updated', async () => {
    const prisma = makePrisma()
    const redis  = makeRedis()

    const event = makeEvent('customer.subscription.updated', {
      customer:           'cus_123',
      status:             'active',
      current_period_end: Math.floor(Date.now() / 1000),
    })

    await handleWebhookEvent(prisma, redis, event)

    expect(prisma.subscription.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ tier: 'PRO', status: 'ACTIVE' }),
      }),
    )
  })

  it('should set tier to FREE when subscription status is past_due on subscription.updated', async () => {
    const prisma = makePrisma()
    const redis  = makeRedis()

    const event = makeEvent('customer.subscription.updated', {
      customer:           'cus_123',
      status:             'past_due',
      current_period_end: Math.floor(Date.now() / 1000),
    })

    await handleWebhookEvent(prisma, redis, event)

    expect(prisma.subscription.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ tier: 'FREE', status: 'PAST_DUE' }),
      }),
    )
  })

  it('should downgrade to FREE on customer.subscription.deleted', async () => {
    const prisma = makePrisma()
    const redis  = makeRedis()

    const event = makeEvent('customer.subscription.deleted', {
      customer:           'cus_123',
      status:             'canceled',
      current_period_end: Math.floor(Date.now() / 1000),
    })

    await handleWebhookEvent(prisma, redis, event)

    expect(prisma.subscription.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ tier: 'FREE', status: 'CANCELED' }),
      }),
    )
    expect(redis.del).toHaveBeenCalledWith('user:user_1:tier')
  })

  it('should set PAST_DUE status on invoice.payment_failed', async () => {
    const prisma = makePrisma()
    const redis  = makeRedis()

    const event = makeEvent('invoice.payment_failed', { customer: 'cus_123' })
    await handleWebhookEvent(prisma, redis, event)

    expect(prisma.subscription.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'PAST_DUE' }) }),
    )
  })

  it('should ignore unknown event types without throwing', async () => {
    const prisma = makePrisma()
    const redis  = makeRedis()

    const event = makeEvent('payment_intent.created', {})
    await expect(handleWebhookEvent(prisma, redis, event)).resolves.toBeUndefined()
    expect(prisma.subscription.update).not.toHaveBeenCalled()
  })

  it('should do nothing when checkout.session.completed has no userId in metadata', async () => {
    const prisma = makePrisma()
    const redis  = makeRedis()

    const event = makeEvent('checkout.session.completed', {
      metadata: {},
      subscription: 'sub_123',
    })

    await handleWebhookEvent(prisma, redis, event)
    expect(prisma.subscription.update).not.toHaveBeenCalled()
  })
})