import type { FastifyInstance } from 'fastify'
import { Client as EsClient } from '@elastic/elasticsearch'
import { requireAuth } from '../../middleware/requireAuth.js'
import { getVehicle, listVehicles } from '../../services/vehicle.service.js'
import { searchVehicles } from '../../services/search.service.js'
import { getVehicleMedia } from '../../services/media.service.js'
import { exportRoutes } from './export.js'
import type { MediaType } from '@decar/shared'

let esClient: EsClient | null = null

function getEs(): EsClient {
  if (!esClient) {
    esClient = new EsClient({ node: process.env.ELASTICSEARCH_URL ?? 'http://localhost:9200' })
  }
  return esClient
}

export async function vehicleRoutes(app: FastifyInstance) {
  // GET /vehicles — public search (rate-limited)
  app.get('/', {
    config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
    handler: async (req, reply) => {
      const query = req.query as Record<string, string>

      // Try Elasticsearch first; fall back to DB list on ES failure
      try {
        // Build params without undefined values — exactOptionalPropertyTypes disallows key: undefined
        const result = await searchVehicles(getEs(), app.redis, {
          page: query['page'] ? Number(query['page']) : 1,
          limit: query['limit'] ? Number(query['limit']) : 24,
          ...(query['make'] ? { make: query['make'] } : {}),
          ...(query['model'] ? { model: query['model'] } : {}),
          ...(query['year'] ? { year: Number(query['year']) } : {}),
          ...(query['fuelType'] ? { fuelType: query['fuelType'] as never } : {}),
          ...(query['bodyType'] ? { bodyType: query['bodyType'] } : {}),
          ...(query['market'] ? { market: query['market'] } : {}),
        })
        return reply.status(200).send({ data: result.data, total: result.total })
      } catch {
        app.log.warn('Elasticsearch unavailable, falling back to DB')
        const page = query['page'] ? Number(query['page']) : 1
        const limit = query['limit'] ? Number(query['limit']) : 24
        const result = await listVehicles(app.prisma, page, limit)
        return reply.status(200).send(result)
      }
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
