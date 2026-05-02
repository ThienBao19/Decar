import type { FastifyRequest, FastifyReply } from 'fastify'
import type { SubscriptionTier } from '@decar/shared'

export function requireTier(tier: SubscriptionTier) {
  return async function (req: FastifyRequest, reply: FastifyReply): Promise<void> {
    const user = req.user
    if (!user || user.tier !== tier) {
      return reply.status(403).send({
        error: `${tier} subscription required`,
        code: 'TIER_REQUIRED',
        statusCode: 403,
      })
    }
  }
}
