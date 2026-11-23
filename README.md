# Decar — Vehicle Intelligence Platform

A production-ready SaaS platform delivering detailed vehicle data, interactive 3D viewers, side-by-side comparisons, and a full car configurator with drive simulation. Built as a monorepo with a Next.js frontend and a Fastify REST API.

---

## Features

**Free tier**
- Browse vehicle specs (body dimensions, transmission, drivetrain, fuel type)
- Search vehicles powered by Elasticsearch (falls back to Prisma `ILIKE`)
- 1 saved comparison

**Pro tier**
- Full engine specs (power kW / torque Nm)
- Unlimited comparisons
- 3D exterior & interior viewer (`<model-viewer>`)
- 360° exterior media
- PDF spec export
- REST API access
- Vehicle Builder + Drive Simulator

**Admin**
- Credential-based admin dashboard (`/admin`)
- Manage vehicles, media, and subscriptions

---

## Architecture

```
decar/
├── apps/
│   ├── web/          # Next.js 14 App Router  (Vercel)
│   └── api/          # Fastify 4 REST API      (Railway)
├── packages/
│   └── shared/       # Shared TypeScript DTOs
├── scripts/          # DB seed, ES indexer, Blender exports
└── turbo.json
```

**Frontend** — `apps/web` (port 3000)

| Layer | Technology |
|---|---|
| Framework | Next.js 14 App Router |
| UI | Tailwind CSS + Shadcn UI + Radix UI |
| Auth | NextAuth.js v4 (Google · GitHub · magic link) |
| State | Zustand |
| 3D | `<model-viewer>` (lazy loaded) / Three.js |
| Animation | Framer Motion + GSAP |
| PDF export | react-pdf |
| Testing | Vitest + Playwright |

**Backend** — `apps/api` (port 3001)

| Layer | Technology |
|---|---|
| Framework | Fastify 4 |
| ORM | Prisma 5 (PostgreSQL via Neon) |
| Cache | Redis (ioredis) — tier cache TTL 5 min |
| Search | Elasticsearch 8 |
| Payments | Stripe (checkout · portal · webhooks) |
| Storage | AWS S3 / Cloudflare R2 — presigned URLs (15 min TTL) |
| Auth | fastify-jwt + NextAuth API_INTERNAL_SECRET exchange |
| Testing | Vitest |

**Tier enforcement** is double-layered:
- Server-side: `requireTier` middleware (authoritative)
- Client-side: `<UpgradeGate>` component (UX only)

Redis `user:{id}:tier` is the authoritative tier source; Stripe webhooks invalidate immediately.

---

## Data Model (Prisma)

```
User ──── Subscription (FREE | PRO)
      ──── VehicleComparison[]
      ──── VehicleBuild[]

Vehicle ──── Engine
        ──── Exterior ──── Color[]
        ──── Interior
        ──── Media[]   (storageKey only — presigned URLs at request time)
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9+
- PostgreSQL (or a Neon connection string)
- Redis
- Elasticsearch 8 *(optional — falls back to DB search)*

### 1. Clone & install

```bash
git clone https://github.com/ThienBao19/Decar.git
cd Decar
pnpm install
```

### 2. Configure environment

```bash
# API
cp apps/api/.env.example apps/api/.env

# Web
cp apps/web/.env.example apps/web/.env.local
```

Key variables:

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (pooled) |
| `DIRECT_URL` | PostgreSQL direct connection (Prisma migrations) |
| `REDIS_URL` | Redis connection string |
| `NEXTAUTH_SECRET` | Random 32-char secret |
| `NEXTAUTH_URL` | `http://localhost:3000` in dev |
| `API_INTERNAL_SECRET` | Shared secret between web → api JWT exchange |
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `STRIPE_PRO_PRICE_ID` | Stripe Price ID for the Pro plan |
| `AWS_ACCESS_KEY_ID` | S3 / R2 credentials |
| `AWS_SECRET_ACCESS_KEY` | S3 / R2 credentials |
| `S3_BUCKET_NAME` | Bucket name |
| `S3_ENDPOINT` | Endpoint URL (set for R2) |
| `ELASTICSEARCH_URL` | ES node URL *(optional)* |
| `ADMIN_EMAIL` | Admin account email |
| `ADMIN_PASSWORD` | Admin account password (hashed on first seed) |

### 3. Migrate & seed database

```bash
cd apps/api
pnpm prisma migrate deploy
pnpm tsx prisma/seed.ts
```

### 4. Index vehicles into Elasticsearch *(optional)*

```bash
cd apps/api
pnpm tsx scripts/index-vehicles.ts
```

### 5. Start development servers

```bash
# from monorepo root — starts both web + api concurrently
pnpm dev
```

| Service | URL |
|---|---|
| Web | http://localhost:3000 |
| API | http://localhost:3001 |
| Admin | http://localhost:3000/admin |

---

## Scripts

```bash
pnpm dev           # start all apps
pnpm build         # production build (Turborepo)
pnpm test          # run all test suites
pnpm lint          # ESLint across monorepo
pnpm typecheck     # tsc --noEmit across monorepo
pnpm format        # Prettier write
```

---

## Testing

```bash
# unit + integration (Vitest)
pnpm test

# e2e (Playwright) — requires running dev servers
cd apps/web
pnpm exec playwright test
```

Coverage target: **80% overall** · 85% service layer · 90% security-critical paths.

---

## Deployment

| App | Platform | Notes |
|---|---|---|
| `apps/web` | Vercel | Auto-deploys on push to `main` |
| `apps/api` | Railway | `render.yaml` included for Render fallback |

Set all environment variables in each platform's dashboard before the first deploy.

**Stripe webhook** — register `https://<api-domain>/subscriptions/webhook` in the Stripe Dashboard. The `/subscriptions` routes keep the raw JSON bytes (`req.rawBody`) for signature verification.

---

## Vehicle Builder

The builder (`/builder`) is a universal slot-based car configurator:

- **6 base bodies** — Sedan · SUV/Crossover · Sports Coupe · Muscle · Truck · Electric Hatch
- **Parts catalog** — Wheels (10 styles) · Aero kit (25 pieces) · Exhaust · Lights · Brakes
- **Paint system** — RGB picker · OEM presets · Metallic/Matte/Carbon/Chrome/Vinyl finishes · Two-tone · Tint
- **Tier gating** — OEM & aftermarket parts free; Premium & Legendary parts require Pro
- **Save & share** — builds stored in `VehicleBuild`, shareable via URL
- **Export** — GLB export free; PDF export Pro only
- **Drive** — configured build drives directly into the simulator at `/drive`

---

## Project Structure

```
apps/api/src/
├── middleware/       requireAuth.ts · requireTier.ts
├── plugins/          prisma · redis · auth
├── routes/           auth · builds · comparisons · subscriptions · users · vehicles
├── services/         media · search · subscription · vehicle
└── server.ts

apps/web/src/
├── app/
│   ├── (auth)/       login · register
│   ├── (main)/       dashboard · pricing · vehicles · comparisons
│   ├── admin/        admin dashboard
│   ├── builder/      vehicle configurator
│   └── drive/        drive simulator
├── components/
├── lib/
└── store/            Zustand stores
```

---

## License

Private — all rights reserved.
