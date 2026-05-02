import type { FastifyRequest, FastifyReply } from 'fastify'

export interface JwtPayload {
  userId: string
  tier: 'FREE' | 'PRO'
}

declare module 'fastify' {
  interface FastifyRequest {
    user: JwtPayload
  }
}

export async function requireAuth(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    await req.jwtVerify()
    const payload = req.user as JwtPayload

    // Re-verify tier from Redis to guard against stale JWT tier claims
    const cachedTier = await req.server.redis.get(`user:${payload.userId}:tier`)
    if (cachedTier) {
      payload.tier = cachedTier as 'FREE' | 'PRO'
    } else {
      // Cache miss — fetch from DB and cache for 5 min
      const sub = await req.server.prisma.subscription.findUnique({
        where: { userId: payload.userId },
        select: { tier: true },
      })
      if (sub) {
        payload.tier = sub.tier as 'FREE' | 'PRO'
        await req.server.redis.setex(`user:${payload.userId}:tier`, 300, sub.tier)
      }
    }

    req.user = payload
  } catch {
    return reply.status(401).send({ error: 'Unauthorized', statusCode: 401 })
  }
}
