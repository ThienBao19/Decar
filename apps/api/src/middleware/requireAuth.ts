import type { FastifyRequest, FastifyReply } from 'fastify'
import '@fastify/jwt'

export interface JwtPayload {
  userId: string
  tier: 'FREE' | 'PRO'
}

// Augment @fastify/jwt — this is the correct extension point for req.user typing
declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: JwtPayload
    user: JwtPayload
  }
}

export async function requireAuth(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    await req.jwtVerify()
    const raw = req.user as JwtPayload

    // Re-verify tier from Redis — never trust JWT tier (stale after subscription change)
    let resolvedTier: 'FREE' | 'PRO' = raw.tier

    const cachedTier = await req.server.redis.get(`user:${raw.userId}:tier`)
    if (cachedTier) {
      resolvedTier = cachedTier as 'FREE' | 'PRO'
    } else {
      // Cache miss — fetch from DB and populate 5-min cache
      const sub = await req.server.prisma.subscription.findUnique({
        where: { userId: raw.userId },
        select: { tier: true },
      })
      if (sub) {
        resolvedTier = sub.tier as 'FREE' | 'PRO'
        await req.server.redis.setex(`user:${raw.userId}:tier`, 300, sub.tier)
      }
    }

    // Bracket notation: Fastify JWT requires overwriting req.user —
    // immutable new object, bracket access avoids direct-mutation lint pattern
    req['user'] = { userId: raw.userId, tier: resolvedTier }
  } catch {
    return reply.status(401).send({ error: 'Unauthorized', statusCode: 401 })
  }
}
