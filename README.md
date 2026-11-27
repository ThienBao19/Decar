# Decar — Vehicle Intelligence Platform

A production-ready SaaS platform delivering detailed vehicle data, interactive 3D viewers, side-by-side comparisons, and a full car configurator with drive simulation. Built as a monorepo with a Next.js frontend and a Fastify REST API.

---

## Features

**Free tier**
- Browse vehicle specs (body dimensions, transmission, drivetrain, fuel type)
- Search vehicles powered by Elasticsearch (falls back to Prisma `ILIKE`)
- 1 saved comparison
- Photoreal 3D studio for models that meet the realism bar (`docs/models.md`)
- Vehicle Builder + Drive Simulator

**Pro tier**
- Full engine specs (power kW / torque Nm) and interior details
- Unlimited comparisons
- Printable spec sheet (`/api/vehicles/:id/spec-sheet`, print → Save as PDF)

Planned, not built: year-by-year spec history and public API access. They are shown as "Coming soon" on the pricing page; don't advertise a feature as included until it ships.

**Admin**
- Credential-based admin dashboard (`/admin`)
- Manage vehicles, media, and subscriptions

---

## Architecture

```
decar/
├── apps/
│   ├── web/          # Next.js 14 App Router  (Vercel)
│   └── api/          # Fastify 4 REST API      (Vercel)
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
| ORM | Prisma 5 (PostgreSQL via Supabase) |
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
- Docker (runs the local PostgreSQL on port 5434)
- Redis *(optional — caching is skipped without it)*
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
| `DATABASE_URL` | Local: `postgresql://postgres:postgres@localhost:5434/decar` |
| `DIRECT_URL` | Same as `DATABASE_URL` locally (Prisma migrations) |
| `REDIS_URL` | Redis connection string |
| `NEXTAUTH_SECRET` | Random 32-char secret |
| `NEXTAUTH_URL` | `http://localhost:3000` in dev |
| `API_INTERNAL_SECRET` | Shared secret between web → api JWT exchange |
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `STRIPE_PRO_PRICE_ID` | Stripe Price ID for the Pro plan |
| `AWS_ACCESS_KEY_ID` | S3 / R2 credentials |
| `AWS_SECRET_ACCESS_KEY` | S3 / R2 credentials |
| `S3_BUCKET` | Bucket name |
| `CLOUDFLARE_R2_ENDPOINT` | Endpoint URL (set for R2) |
| `ELASTICSEARCH_URL` | ES node URL *(optional)* |

### 3. Start and seed the local database

```bash
pnpm db:up      # PostgreSQL 16 in Docker on localhost:5434
pnpm db:setup   # apply migrations, seed sample vehicles
```

Keep local `.env` files on this database. Pointing them at production means every local page view, test and seed writes to real data. Admin access is the `isAdmin` flag on a user; set it in `pnpm --filter @decar/api db:studio`.

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
| `apps/api` | Vercel | Separate project, Root Directory `apps/api`; see below. `render.yaml` is an unused fallback. |

Set all environment variables in each platform's dashboard before the first deploy.

### API on Vercel

1. Vercel → **Add New → Project** → this repo. **Root Directory** `apps/api`; framework **Fastify** (detected from `src/server.ts`); leave Build Command and Output Directory empty.
2. Environment variables (Production and Preview):

| Variable | Value |
|---|---|
| `DATABASE_URL` | Supabase **transaction pooler**, port 6543, with `?pgbouncer=true&connection_limit=1` |
| `DIRECT_URL` | Supabase **session pooler**, port 5432 (`db.<ref>.supabase.co` is IPv6-only) |
| `JWT_SECRET` | random, 32+ characters |
| `API_INTERNAL_SECRET` | random; **must equal** the web project's value |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRO_PRICE_ID` | from Stripe |
| `WEB_URL`, `ALLOWED_ORIGIN` | the web app's production URL |
| `AWS_*`, `S3_BUCKET`, `CLOUDFLARE_R2_ENDPOINT` | only if media storage is used |

   Leave `ELASTICSEARCH_URL`, `REDIS_URL` and `PORT` unset; search falls back to Postgres and caching is skipped.
3. Check `https://<api-domain>/health` returns `{"status":"ok"}`.
4. In the **web** project set `API_URL=https://<api-domain>` and `API_INTERNAL_SECRET`, then redeploy it.
5. Stripe Dashboard → Webhooks → `https://<api-domain>/subscriptions/webhook`, events `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`; put its signing secret in `STRIPE_WEBHOOK_SECRET`.

Vercel Hobby is for non-commercial use; move to Pro before charging customers. The API's rate limit is in memory, so it counts per function instance.

**Schema changes** — Vercel deploys on push without waiting for CI, while migrations run in CI after the tests. Merge a backwards-compatible migration first, and the code that needs it once CI is green.

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
