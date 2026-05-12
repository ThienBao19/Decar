/**
 * Seed script: fetch popular vehicles from NHTSA and cache to Neon DB.
 * Run: npx tsx scripts/seed-vehicles.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const BASE = 'https://vpic.nhtsa.dot.gov/api/vehicles'

interface NHTSAModel {
  Make_ID: number
  Make_Name: string
  Model_ID: number
  Model_Name: string
}

interface NHTSAResponse {
  Results: NHTSAModel[]
}

function slugify(make: string, model: string, year: number): string {
  return [make, model, String(year)]
    .join('-')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

const SEED_MAKES = [
  'Toyota', 'Honda', 'BMW', 'Mercedes-Benz', 'Porsche',
  'Tesla', 'Ford', 'Chevrolet', 'Audi', 'Hyundai',
  'Kia', 'Nissan', 'Mazda', 'Volkswagen', 'Lexus',
  'McLaren', 'Ferrari', 'Lamborghini', 'Subaru', 'Volvo',
]

const YEARS = [2024, 2025, 2023]

async function fetchModels(make: string, year: number): Promise<NHTSAModel[]> {
  const url = `${BASE}/GetModelsForMakeYear/make/${encodeURIComponent(make)}/modelyear/${year}?format=json`
  const res = await fetch(url)
  if (!res.ok) return []
  const json = (await res.json()) as NHTSAResponse
  return json.Results ?? []
}

async function main() {
  console.log('Seeding vehicles from NHTSA...\n')

  let total = 0

  for (const make of SEED_MAKES) {
    for (const year of YEARS) {
      console.log(`  Fetching ${make} ${year}...`)
      const models = await fetchModels(make, year)

      for (const m of models) {
        const slug = slugify(m.Make_Name, m.Model_Name, year)
        try {
          await prisma.vehicle.upsert({
            where: { slug },
            create: {
              make: m.Make_Name,
              model: m.Model_Name,
              year,
              market: 'US',
              slug,
            },
            update: {},
          })
          total++
        } catch {
          // duplicate - skip
        }
      }

      // Rate limit: 200ms between requests
      await new Promise((r) => setTimeout(r, 200))
    }
  }

  console.log(`\nDone! Seeded ${total} vehicles.`)
  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})