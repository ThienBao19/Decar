import fp from 'fastify-plugin'
import type { FastifyInstance } from 'fastify'
import { Redis } from 'ioredis'

declare module 'fastify' {
  interface FastifyInstance {
    redis: Redis | null
  }
}

export const redisPlugin = fp(async (app: FastifyInstance) => {
  const url = process.env.REDIS_URL
  if (!url) {
    app.log.warn('REDIS_URL not set — running without Redis cache')
    app.decorate('redis', null)
    return
  }

  const redis = new Redis(url, { lazyConnect: true, maxRetriesPerRequest: 1, connectTimeout: 3000 })

  try {
    await redis.connect()
    app.decorate('redis', redis)
    app.addHook('onClose', async () => {
      await redis.quit()
    })
    app.log.info('Redis connected')
  } catch {
    app.log.warn('Redis connection failed — running without cache')
    redis.disconnect()
    app.decorate('redis', null)
  }
})
