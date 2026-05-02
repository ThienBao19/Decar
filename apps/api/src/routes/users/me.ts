import type { FastifyInstance } from 'fastify'
import { requireAuth } from '../../middleware/requireAuth.js'

export async function userRoutes(app: FastifyInstance) {
  app.get('/me', {
    preHandler: [requireAuth],
    handler: async (req, reply) => {
      const { userId } = req.user

      const user = await app.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          image: true,
          subscription: {
            select: {
              tier: true,
              status: true,
              currentPeriodEnd: true,
            },
          },
        },
      })

      if (!user) {
        return reply.status(404).send({ error: 'User not found', statusCode: 404 })
      }

      return reply.status(200).send({
        data: {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          subscription: {
            tier: user.subscription?.tier ?? 'FREE',
            status: user.subscription?.status ?? 'ACTIVE',
            currentPeriodEnd: user.subscription?.currentPeriodEnd?.toISOString() ?? null,
          },
        },
      })
    },
  })
}
