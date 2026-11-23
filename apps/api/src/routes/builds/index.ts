import type { FastifyInstance } from 'fastify'
import { requireAuth } from '../../middleware/requireAuth.js'
import type { BuildConfig, VehicleBuildDTO } from '@decar/shared'

const MAX_FREE_BUILDS = 3

interface BuildRow {
  id: string
  userId: string
  name: string
  configJson: unknown
  thumbnail: string | null
  isPublic: boolean
  createdAt: Date
  updatedAt: Date
}

function toBuildDTO(row: BuildRow, viewerId: string): VehicleBuildDTO {
  return {
    id: row.id,
    name: row.name,
    config: row.configJson as BuildConfig,
    thumbnail: row.thumbnail,
    isPublic: row.isPublic,
    isOwner: row.userId === viewerId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

export function buildRoutes(app: FastifyInstance): Promise<void> {
  app.get('/', { preHandler: [requireAuth], handler: async (req, reply) => {
    const builds = await app.prisma.vehicleBuild.findMany({
      where: { userId: req.user.userId },
      orderBy: { updatedAt: 'desc' },
    })
    return reply.status(200).send({ data: builds.map((b) => toBuildDTO(b, req.user.userId)) })
  }})

  app.get('/:id', { preHandler: [requireAuth], handler: async (req, reply) => {
    const { id } = req.params as { id: string }
    const build = await app.prisma.vehicleBuild.findUnique({ where: { id } })
    if (!build) return reply.status(404).send({ error: 'Build not found', statusCode: 404 })
    if (!build.isPublic && build.userId !== req.user.userId) {
      return reply.status(403).send({ error: 'Access denied', statusCode: 403 })
    }
    return reply.status(200).send({ data: toBuildDTO(build, req.user.userId) })
  }})

  app.post('/', { preHandler: [requireAuth], handler: async (req, reply) => {
    const body = req.body as { name?: string; config?: BuildConfig; thumbnail?: string }
    if (!body.name?.trim()) return reply.status(400).send({ error: 'name is required', statusCode: 400 })
    if (!body.config) return reply.status(400).send({ error: 'config is required', statusCode: 400 })
    if (req.user.tier === 'FREE') {
      const count = await app.prisma.vehicleBuild.count({ where: { userId: req.user.userId } })
      if (count >= MAX_FREE_BUILDS) {
        const msg = `Free tier is limited to ${MAX_FREE_BUILDS} builds. Upgrade to Pro for unlimited.`
        return reply.status(403).send({ error: msg, statusCode: 403 })
      }
    }
    const build = await app.prisma.vehicleBuild.create({
      data: { userId: req.user.userId, name: body.name.trim(), configJson: body.config as object, thumbnail: body.thumbnail ?? null },
    })
    return reply.status(201).send({ data: toBuildDTO(build, req.user.userId) })
  }})

  app.patch('/:id', { preHandler: [requireAuth], handler: async (req, reply) => {
    const { id } = req.params as { id: string }
    const body = req.body as { name?: string; config?: BuildConfig; thumbnail?: string; isPublic?: boolean }
    const existing = await app.prisma.vehicleBuild.findUnique({ where: { id } })
    if (!existing || existing.userId !== req.user.userId) {
      return reply.status(404).send({ error: 'Build not found', statusCode: 404 })
    }
    const build = await app.prisma.vehicleBuild.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name.trim() }),
        ...(body.config !== undefined && { configJson: body.config as object }),
        ...(body.thumbnail !== undefined && { thumbnail: body.thumbnail }),
        ...(body.isPublic !== undefined && { isPublic: body.isPublic }),
      },
    })
    return reply.status(200).send({ data: toBuildDTO(build, req.user.userId) })
  }})

  app.delete('/:id', { preHandler: [requireAuth], handler: async (req, reply) => {
    const { id } = req.params as { id: string }
    const existing = await app.prisma.vehicleBuild.findUnique({ where: { id } })
    if (!existing || existing.userId !== req.user.userId) {
      return reply.status(404).send({ error: 'Build not found', statusCode: 404 })
    }
    await app.prisma.vehicleBuild.delete({ where: { id } })
    return reply.status(204).send()
  }})
  return Promise.resolve()
}
