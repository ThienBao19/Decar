import Fastify from 'fastify'
import helmet from '@fastify/helmet'
import cors from '@fastify/cors'
import sensible from '@fastify/sensible'
import rateLimit from '@fastify/rate-limit'

import { prismaPlugin } from './plugins/prisma.js'
import { redisPlugin } from './plugins/redis.js'
import { jwtPlugin } from './plugins/auth.js'
import { vehicleRoutes } from './routes/vehicles/index.js'
import { authRoutes } from './routes/auth/token.js'
import { userRoutes } from './routes/users/me.js'
import { subscriptionRoutes } from './routes/subscriptions/index.js'

const app = Fastify({
  logger:
    process.env.NODE_ENV === 'development'
      ? { transport: { target: 'pino-pretty' } }
      : { redact: ['req.headers.authorization'] },
})

// Security headers
await app.register(helmet, {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
})

// CORS — only allow the web app origin
await app.register(cors, {
  origin: process.env.ALLOWED_ORIGIN?.split(',') ?? ['http://localhost:3000'],
  credentials: true,
})

await app.register(sensible)

// Global rate limit — overridden per-route where needed
await app.register(rateLimit, {
  max: 100,
  timeWindow: '1 minute',
  redis: undefined, // redisPlugin adds its own instance; use in-memory for global
})

// Internal plugins
await app.register(prismaPlugin)
await app.register(redisPlugin)
await app.register(jwtPlugin)

// Routes
await app.register(vehicleRoutes, { prefix: '/vehicles' })
await app.register(authRoutes, { prefix: '/auth' })
await app.register(userRoutes, { prefix: '/users' })
await app.register(subscriptionRoutes, { prefix: '/subscriptions' })

app.get('/health', async () => ({ status: 'ok' }))

const port = Number(process.env.PORT ?? 3001)
await app.listen({ port, host: '0.0.0.0' })
console.log(`API listening on port ${port}`)
