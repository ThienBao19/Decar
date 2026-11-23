import Stripe from 'stripe'
import type { PrismaClient } from '@prisma/client'
import type { Redis } from 'ioredis'

export function getStripe(): Stripe {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' })
}

export async function createCheckoutSession(
  prisma: PrismaClient,
  userId: string,
  successUrl: string,
  cancelUrl: string,
): Promise<string> {
  const stripe = getStripe()

  const subscription = await prisma.subscription.findUnique({
    where: { userId },
    select: { stripeCustomerId: true },
  })

  if (!subscription) throw new Error('No subscription record found')

  let customerId = subscription.stripeCustomerId

  // If placeholder (created before Stripe customer was made), create real customer
  if (customerId.startsWith('pending_')) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, name: true } })
    const customer = await stripe.customers.create({
      ...(user?.email ? { email: user.email } : {}),
      ...(user?.name ? { name: user.name } : {}),
      metadata: { userId },
    })
    customerId = customer.id
    await prisma.subscription.update({
      where: { userId },
      data: { stripeCustomerId: customerId },
    })
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: process.env.STRIPE_PRO_PRICE_ID!, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: { userId },
  })

  return session.url!
}

export async function getBillingPortalUrl(
  prisma: PrismaClient,
  userId: string,
  returnUrl: string,
): Promise<string> {
  const stripe = getStripe()
  const sub = await prisma.subscription.findUnique({
    where: { userId },
    select: { stripeCustomerId: true },
  })
  if (!sub) throw new Error('Subscription not found')

  const session = await stripe.billingPortal.sessions.create({
    customer: sub.stripeCustomerId,
    return_url: returnUrl,
  })
  return session.url
}

export async function handleWebhookEvent(
  prisma: PrismaClient,
  redis: Redis | null,
  event: Stripe.Event,
): Promise<void> {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object
      const userId = session.metadata?.userId
      if (!userId || !session.subscription) break

      await prisma.subscription.update({
        where: { userId },
        data: {
          stripeSubscriptionId: session.subscription as string,
          tier: 'PRO',
          status: 'ACTIVE',
        },
      })
      await redis?.del(`user:${userId}:tier`)
      break
    }

    case 'customer.subscription.updated': {
      const sub = event.data.object
      const userId = await resolveUserId(prisma, sub.customer as string)
      if (!userId) break

      const isActive = sub.status === 'active' || sub.status === 'trialing'
      await prisma.subscription.update({
        where: { userId },
        data: {
          tier: isActive ? 'PRO' : 'FREE',
          status: mapStripeStatus(sub.status),
          currentPeriodEnd: new Date(sub.current_period_end * 1000),
        },
      })
      await redis?.del(`user:${userId}:tier`)
      break
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object
      const userId = await resolveUserId(prisma, sub.customer as string)
      if (!userId) break

      await prisma.subscription.update({
        where: { userId },
        data: { tier: 'FREE', status: 'CANCELED', stripeSubscriptionId: null },
      })
      await redis?.del(`user:${userId}:tier`)
      break
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object
      const userId = await resolveUserId(prisma, invoice.customer as string)
      if (!userId) break

      await prisma.subscription.update({
        where: { userId },
        data: { status: 'PAST_DUE' },
      })
      await redis?.del(`user:${userId}:tier`)
      break
    }
  }
}

async function resolveUserId(prisma: PrismaClient, stripeCustomerId: string): Promise<string | null> {
  const sub = await prisma.subscription.findFirst({
    where: { stripeCustomerId },
    select: { userId: true },
  })
  return sub?.userId ?? null
}

function mapStripeStatus(
  status: Stripe.Subscription.Status,
): 'ACTIVE' | 'PAST_DUE' | 'UNPAID' | 'CANCELED' | 'TRIALING' {
  const map: Record<string, 'ACTIVE' | 'PAST_DUE' | 'UNPAID' | 'CANCELED' | 'TRIALING'> = {
    active: 'ACTIVE',
    trialing: 'TRIALING',
    past_due: 'PAST_DUE',
    unpaid: 'UNPAID',
    canceled: 'CANCELED',
    incomplete: 'PAST_DUE',
    incomplete_expired: 'CANCELED',
    paused: 'CANCELED',
  }
  return map[status] ?? 'CANCELED'
}
