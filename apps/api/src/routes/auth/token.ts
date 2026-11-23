import type { FastifyInstance } from 'fastify'
import { z } from 'zod'

const bodySchema = z.object({
  secret: z.string(),
  userId: z.string().min(1),
})

export function authRoutes(app: FastifyInstance): Promise<void> {
  app.post('/token', {
    config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
    handler: async (req, reply) => {
      const result = bodySchema.safeParse(req.body)
      if (!result.success) {
        return reply.status(400).send({ error: 'Invalid request body', statusCode: 400 })
      }

      const { secret, userId } = result.data

      // Verify internal shared secret — prevents external token minting
      if (secret !== process.env.API_INTERNAL_SECRET) {
        return reply.status(401).send({ error: 'Unauthorized', statusCode: 401 })
      }

      const subscription = await app.prisma.subscription.findUnique({
        where: { userId },
        select: { tier: true, status: true },
      })

      const tier = subscription?.tier ?? 'FREE'

      const accessToken = app.jwt.sign({ userId, tier }, { expiresIn: '15m' })

      return reply.status(200).send({
        data: { accessToken, expiresIn: 900 },
      })
    },
  })
  return Promise.resolve()
}
