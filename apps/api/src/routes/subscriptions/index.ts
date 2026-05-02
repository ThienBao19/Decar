import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import Stripe from 'stripe'
import { requireAuth } from '../../middleware/requireAuth.js'
import {
  createCheckoutSession,
  getBillingPortalUrl,
  handleWebhookEvent,
  getStripe,
} from '../../services/subscription.service.js'

const WEB_URL = process.env.WEB_URL ?? 'http://localhost:3000'

export async function subscriptionRoutes(app: FastifyInstance) {
  // POST /subscriptions/checkout
  app.post('/checkout', {
    preHandler: [requireAuth],
    handler: async (req, reply) => {
      const { userId } = req.user

      try {
        const url = await createCheckoutSession(
          app.prisma,
          userId,
          `${WEB_URL}/dashboard?upgraded=true`,
          `${WEB_URL}/pricing?canceled=true`,
        )
        return reply.status(200).send({ data: { url } })
      } catch (err) {
        app.log.error(err, 'Checkout session creation failed')
        return reply.status(500).send({ error: 'Failed to create checkout session', statusCode: 500 })
      }
    },
  })

  // POST /subscriptions/portal
  app.post('/portal', {
    preHandler: [requireAuth],
    handler: async (req, reply) => {
      const { userId } = req.user
      try {
        const url = await getBillingPortalUrl(app.prisma, userId, `${WEB_URL}/dashboard`)
        return reply.status(200).send({ data: { url } })
      } catch {
        return reply.status(500).send({ error: 'Failed to create portal session', statusCode: 500 })
      }
    },
  })

  // POST /subscriptions/webhook
  // IMPORTANT: raw body must be preserved — Stripe signature verification requires the raw Buffer
  app.post('/webhook', {
    config: {
      // Disable the default JSON body parser for this route
      rawBody: true,
    },
    handler: async (req: FastifyRequest & { rawBody?: Buffer }, reply: FastifyReply) => {
      const sig = req.headers['stripe-signature']
      if (!sig || typeof sig !== 'string') {
        return reply.status(400).send({ error: 'Missing stripe-signature header' })
      }

      let event: Stripe.Event
      try {
        event = getStripe().webhooks.constructEvent(
          req.rawBody ?? Buffer.from(JSON.stringify(req.body)),
          sig,
          process.env.STRIPE_WEBHOOK_SECRET!,
        )
      } catch (err) {
        app.log.warn({ err }, 'Stripe webhook signature verification failed')
        return reply.status(400).send({ error: 'Webhook signature invalid' })
      }

      try {
        await handleWebhookEvent(app.prisma, app.redis, event)
      } catch (err) {
        app.log.error({ err, eventId: event.id, eventType: event.type }, 'Webhook handler error')
        // Return 200 so Stripe doesn't retry — log the failure for manual investigation
      }

      return reply.status(200).send({ received: true })
    },
  })
}
