import type { FastifyInstance } from 'fastify'
import { requireAuth } from '../../middleware/requireAuth.js'

export async function comparisonRoutes(app: FastifyInstance) {
  // GET /comparisons — list current user's saved comparisons
  app.get('/', {
    preHandler: [requireAuth],
    handler: async (req, reply) => {
      const comparisons = await app.prisma.vehicleComparison.findMany({
        where: { userId: req.user.userId },
        include: {
          vehicleA: { include: { engine: true, exterior: { include: { colors: true } }, interior: true } },
          vehicleB: { include: { engine: true, exterior: { include: { colors: true } }, interior: true } },
        },
        orderBy: { createdAt: 'desc' },
      })
      return reply.status(200).send({ data: comparisons })
    },
  })

  // POST /comparisons — save a new comparison (FREE: max 1, PRO: unlimited)
  app.post('/', {
    preHandler: [requireAuth],
    handler: async (req, reply) => {
      const body = req.body as { vehicleAId?: string; vehicleBId?: string }
      if (!body.vehicleAId || !body.vehicleBId) {
        return reply.status(400).send({ error: 'vehicleAId and vehicleBId are required', statusCode: 400 })
      }
      if (body.vehicleAId === body.vehicleBId) {
        return reply.status(400).send({ error: 'Cannot compare a vehicle with itself', statusCode: 400 })
      }

      if (req.user.tier === 'FREE') {
        const count = await app.prisma.vehicleComparison.count({ where: { userId: req.user.userId } })
        if (count >= 1) {
          return reply.status(403).send({ error: 'Free tier is limited to 1 saved comparison. Upgrade to Pro for unlimited.', statusCode: 403 })
        }
      }

      const [vA, vB] = await Promise.all([
        app.prisma.vehicle.findUnique({ where: { id: body.vehicleAId } }),
        app.prisma.vehicle.findUnique({ where: { id: body.vehicleBId } }),
      ])
      if (!vA || !vB) {
        return reply.status(404).send({ error: 'One or both vehicles not found', statusCode: 404 })
      }

      const comparison = await app.prisma.vehicleComparison.create({
        data: { userId: req.user.userId, vehicleAId: body.vehicleAId, vehicleBId: body.vehicleBId },
        include: {
          vehicleA: { include: { engine: true, exterior: { include: { colors: true } }, interior: true } },
          vehicleB: { include: { engine: true, exterior: { include: { colors: true } }, interior: true } },
        },
      })
      return reply.status(201).send({ data: comparison })
    },
  })

  // DELETE /comparisons/:id — remove a saved comparison (owner only)
  app.delete('/:id', {
    preHandler: [requireAuth],
    handler: async (req, reply) => {
      const { id } = req.params as { id: string }
      const comparison = await app.prisma.vehicleComparison.findUnique({ where: { id } })
      if (!comparison || comparison.userId !== req.user.userId) {
        return reply.status(404).send({ error: 'Comparison not found', statusCode: 404 })
      }
      await app.prisma.vehicleComparison.delete({ where: { id } })
      return reply.status(204).send()
    },
  })
}
