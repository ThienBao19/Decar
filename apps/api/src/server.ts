import 'dotenv/config'

// Runtime only: startup failures are handled in start() and exit the process
process.on('unhandledRejection', (reason) => {
  console.error('[server] unhandledRejection:', reason)
})

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
import { comparisonRoutes } from './routes/comparisons/index.js'
import { buildRoutes } from './routes/builds/index.js'

const app = Fastify({
  logger:
    process.env.NODE_ENV === 'development'
      ? { transport: { target: 'pino-pretty' } }
      : { redact: ['req.headers.authorization'] },
})

// If a step hangs without throwing (e.g. an unreachable database), fail with its name
// instead of leaving the platform to time the request out
const STARTUP_TIMEOUT_MS = 20_000
let stage = 'starting'

async function registerPlugins() {
  stage = 'security plugins'
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
  await app.register(rateLimit, { max: 100, timeWindow: '1 minute' })

  stage = 'database (prisma)'
  await app.register(prismaPlugin)
  stage = 'redis'
  await app.register(redisPlugin)
  stage = 'jwt'
  await app.register(jwtPlugin)
}

async function registerRoutes() {
  stage = 'routes'
  await app.register(vehicleRoutes, { prefix: '/vehicles' })
  await app.register(authRoutes, { prefix: '/auth' })
  await app.register(userRoutes, { prefix: '/users' })
  await app.register(subscriptionRoutes, { prefix: '/subscriptions' })
  await app.register(comparisonRoutes, { prefix: '/comparisons' })
  await app.register(buildRoutes, { prefix: '/builds' })
  app.get('/health', () => ({ status: 'ok' }))
}

async function start() {
  const timer = setTimeout(() => {
    console.error(`[server] startup timed out after ${STARTUP_TIMEOUT_MS / 1000}s during: ${stage}`)
    process.exit(1)
  }, STARTUP_TIMEOUT_MS)
  try {
    await registerPlugins()
    await registerRoutes()
    stage = 'listen'
    const port = Number(process.env.PORT ?? 3001)
    await app.listen({ port, host: '0.0.0.0' })
    app.log.info(`API listening on port ${port}`)
  } catch (err) {
    console.error(`[server] startup failed during: ${stage}`, err)
    process.exit(1)
  } finally {
    clearTimeout(timer)
  }
}

await start()