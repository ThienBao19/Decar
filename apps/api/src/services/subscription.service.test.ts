import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { PrismaClient } from '@prisma/client'
import type Redis from 'ioredis'
import Stripe from 'stripe'
import { handleWebhookEvent } from './subscription.service.js'

function makePrisma(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    subscription: {
      findFirst: vi.fn().mockResolvedValue({ userId: 'user_1' }),
      update: vi.fn().mockResolvedValue({}),
      findUnique: vi.fn().mockResolvedValue({ stripeCustomerId: 'cus_123' }),
    },
    user: {
      findUnique: vi.fn().mockResolvedValue({ email: 'user@test.com', name: 'Test User' }),
    },
    ...overrides,
  } as unknown as PrismaClient
}

function makeRedis() {
  return {
    del: vi.fn().mockResolvedValue(1),
    setex: vi.fn().mockResolvedValue('OK'),
    get: vi.fn().mockResolvedValue(null),
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

describe('handleWebhookEvent', () => {
  it('upgrades user to PRO on checkout.session.completed', async () => {
    const prisma = makePrisma()
    const redis = makeRedis()

    const event = makeEvent('checkout.session.completed', {
      metadata: { userId: 'user_1' },
      subscription: 'sub_123',
    })

    await handleWebhookEvent(prisma, redis, event)

    expect(prisma.subscription.update).toHaveBeenCalledWith({
      where: { userId: 'user_1' },
      data: {
        stripeSubscriptionId: 'sub_123',
        tier: 'PRO',
        status: 'ACTIVE',
      },
    })
    expect(redis.del).toHaveBeenCalledWith('user:user_1:tier')
  })

  it('downgrades to FREE on customer.subscription.deleted', async () => {
    const prisma = makePrisma()
    const redis = makeRedis()

    const event = makeEvent('customer.subscription.deleted', {
      customer: 'cus_123',
      status: 'canceled',
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

  it('sets PAST_DUE on invoice.payment_failed', async () => {
    const prisma = makePrisma()
    const redis = makeRedis()

    const event = makeEvent('invoice.payment_failed', { customer: 'cus_123' })
    await handleWebhookEvent(prisma, redis, event)

    expect(prisma.subscription.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'PAST_DUE' }) }),
    )
  })

  it('ignores unknown event types without throwing', async () => {
    const prisma = makePrisma()
    const redis = makeRedis()

    const event = makeEvent('payment_intent.created', {})
    await expect(handleWebhookEvent(prisma, redis, event)).resolves.toBeUndefined()
    expect(prisma.subscription.update).not.toHaveBeenCalled()
  })
})
