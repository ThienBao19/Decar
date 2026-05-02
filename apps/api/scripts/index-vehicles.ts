import { PrismaClient } from '@prisma/client'
import { Client as EsClient } from '@elastic/elasticsearch'

const prisma = new PrismaClient()
const es = new EsClient({ node: process.env.ELASTICSEARCH_URL ?? 'http://localhost:9200' })

const INDEX_NAME = 'vehicles'

const mappings = {
  properties: {
    id: { type: 'keyword' },
    slug: { type: 'keyword' },
    make: { type: 'keyword' },
    model: { type: 'keyword' },
    year: { type: 'integer' },
    market: { type: 'keyword' },
    trimLevel: { type: 'keyword' },
    bodyType: { type: 'keyword' },
    fuelType: { type: 'keyword' },
    // Full-text search fields
    makeModel: { type: 'text', analyzer: 'standard' },
  },
}

async function main() {
  // Create or recreate index
  const exists = await es.indices.exists({ index: INDEX_NAME })
  if (exists) {
    await es.indices.delete({ index: INDEX_NAME })
    console.log('Deleted existing index')
  }

  await es.indices.create({
    index: INDEX_NAME,
    mappings,
  })
  console.log('Created index with mappings')

  // Fetch all vehicles with relations
  const vehicles = await prisma.vehicle.findMany({
    include: {
      engine: { select: { fuelType: true } },
      exterior: { select: { bodyType: true } },
    },
  })

  if (vehicles.length === 0) {
    console.log('No vehicles to index. Run seed first.')
    return
  }

  // Bulk index
  const operations = vehicles.flatMap((v) => [
    { index: { _index: INDEX_NAME, _id: v.id } },
    {
      id: v.id,
      slug: v.slug,
      make: v.make,
      model: v.model,
      year: v.year,
      market: v.market,
      trimLevel: v.trimLevel,
      bodyType: v.exterior?.bodyType ?? null,
      fuelType: v.engine?.fuelType ?? null,
      makeModel: `${v.make} ${v.model}`,
    },
  ])

  const { errors, items } = await es.bulk({ operations })

  if (errors) {
    const failed = items.filter((i) => i.index?.error)
    console.error(`${failed.length} documents failed to index`)
    console.error(JSON.stringify(failed[0], null, 2))
  } else {
    console.log(`Successfully indexed ${vehicles.length} vehicles`)
  }
}

main()
  .catch(console.error)
  .finally(() => Promise.all([prisma.$disconnect(), es.close()]))
