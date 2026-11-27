import type { FastifyInstance } from 'fastify'
import { requireAuth } from '../../middleware/requireAuth.js'
import { getVehicle } from '../../services/vehicle.service.js'
import { parseSearchParams, searchVehicles } from '../../services/search.service.js'
import { getVehicleMedia } from '../../services/media.service.js'
import { exportRoutes } from './export.js'
import type { MediaType } from '@decar/shared'

export async function vehicleRoutes(app: FastifyInstance) {
  // GET /vehicles — public search (rate-limited)
  app.get('/', {
    config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
    handler: async (req, reply) => {
      const params = parseSearchParams(req.query as Record<string, string | undefined>)
      const result = await searchVehicles(app.prisma, app.redis, params)
      return reply.status(200).send({ data: result.data, total: result.total })
    },
  })

  // GET /vehicles/:id — public for basic data, tier-masked
  app.get('/:id', {
    handler: async (req, reply) => {
      const { id } = req.params as { id: string }

      // Determine tier: anonymous = FREE, JWT bearer = real tier
      let tier: 'FREE' | 'PRO' = 'FREE'
      try {
        await req.jwtVerify()
        tier = (req.user as { tier: 'FREE' | 'PRO' }).tier
      } catch {
        // No valid JWT — serve as FREE
      }

      const vehicle = await getVehicle(app.prisma, app.redis, id, tier)
      if (!vehicle) {
        return reply.status(404).send({ error: 'Vehicle not found', statusCode: 404 })
      }

      return reply.status(200).send({ data: vehicle })
    },
  })

  // GET /vehicles/:id/media?type= — signed URLs; Pro required for 3D types
  app.get('/:id/media', {
    preHandler: [requireAuth],
    handler: async (req, reply) => {
      const { id } = req.params as { id: string }
      const { type } = req.query as { type?: string }

      if (!type) {
        return reply.status(400).send({ error: 'type query param required', statusCode: 400 })
      }

      const validTypes: MediaType[] = [
        'EXTERIOR_IMAGE', 'INTERIOR_IMAGE', 'ENGINE_IMAGE',
        'EXTERIOR_3D', 'INTERIOR_3D', 'ENGINE_3D',
      ]
      if (!validTypes.includes(type as MediaType)) {
        return reply.status(400).send({ error: 'Invalid media type', statusCode: 400 })
      }

      try {
        const media = await getVehicleMedia(
          app.prisma,
          id,
          type as MediaType,
          req.user.tier,
        )
        return reply.status(200).send({ data: media })
      } catch (err) {
        if (err instanceof Error && err.message === 'PRO_REQUIRED') {
          return reply.status(403).send({ error: 'PRO subscription required', statusCode: 403 })
        }
        throw err
      }
    },
  })

  // Sub-router: GET /vehicles/:id/export/pdf
  await app.register(exportRoutes)
}
