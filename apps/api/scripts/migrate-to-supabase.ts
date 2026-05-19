import { PrismaClient } from '@prisma/client'
import { writeFileSync } from 'fs'

const neon = new PrismaClient({
  datasources: { db: { url: process.env.NEON_DATABASE_URL! } }
})

function esc(s: string | null | undefined): string {
  if (s === null || s === undefined) return 'NULL'
  return `'${s.replace(/'/g, "''")}'`
}

function writeSql(idx: number, sql: string): void {
  writeFileSync(`E:/tmp/batch_${idx}.sql`, sql)
}

async function main() {
  console.log('Fetching vehicles...')
  const vehicles = await neon.vehicle.findMany({ orderBy: { createdAt: 'asc' } })
  console.log(`Got ${vehicles.length} vehicles`)

  const engines = await neon.engine.findMany()
  const exteriors = await neon.exterior.findMany()
  const colors = await neon.color.findMany()
  const interiors = await neon.interior.findMany()

  const counts = [
    `Engines: ${engines.length}`,
    `Exteriors: ${exteriors.length}`,
    `Colors: ${colors.length}`,
    `Interiors: ${interiors.length}`,
  ].join(', ')
  console.log(counts)

  const BATCH = 200
  let fileIdx = 1

  // Vehicle batches
  for (let i = 0; i < vehicles.length; i += BATCH) {
    const batch = vehicles.slice(i, i + BATCH)
    const vals = batch.map((v) => {
      const cols = [esc(v.id), esc(v.make), esc(v.model), v.year,
        esc(v.market), esc(v.trimLevel), esc(v.slug), 'NOW()']
      return `(${cols.join(',')})`
    }).join(',\n')
    const cols = '"id","make","model","year","market","trimLevel","slug","updatedAt"'
    const sql = `INSERT INTO "Vehicle" (${cols}) VALUES\n${vals}\n`
      + 'ON CONFLICT ("slug") DO NOTHING;\n'
    writeSql(fileIdx++, sql)
  }

  // Engines
  if (engines.length > 0) {
    const vals = engines.map((e) => {
      const cols = [esc(e.id), esc(e.vehicleId), e.displacement, e.cylinders,
        `'${e.fuelType}'`, e.powerKw, e.torqueNm, esc(e.transmission), esc(e.drivetrain)]
      return `(${cols.join(',')})`
    }).join(',\n')
    const cols = '"id","vehicleId","displacement","cylinders","fuelType",'
      + '"powerKw","torqueNm","transmission","drivetrain"'
    writeSql(fileIdx++,
      `INSERT INTO "Engine" (${cols}) VALUES\n${vals}\n`
      + 'ON CONFLICT ("vehicleId") DO NOTHING;\n')
  }

  // Exteriors
  if (exteriors.length > 0) {
    const vals = exteriors.map((e) => {
      const cols = [esc(e.id), esc(e.vehicleId), esc(e.bodyType),
        e.lengthMm, e.widthMm, e.heightMm, e.wheelbaseMm]
      return `(${cols.join(',')})`
    }).join(',\n')
    const cols = '"id","vehicleId","bodyType","lengthMm","widthMm","heightMm","wheelbaseMm"'
    writeSql(fileIdx++,
      `INSERT INTO "Exterior" (${cols}) VALUES\n${vals}\n`
      + 'ON CONFLICT ("vehicleId") DO NOTHING;\n')
  }

  // Colors
  if (colors.length > 0) {
    const vals = colors.map((c) => {
      const cols = [esc(c.id), esc(c.exteriorId), esc(c.name), esc(c.hexCode), c.isPrimary]
      return `(${cols.join(',')})`
    }).join(',\n')
    const cols = '"id","exteriorId","name","hexCode","isPrimary"'
    writeSql(fileIdx++,
      `INSERT INTO "Color" (${cols}) VALUES\n${vals}\nON CONFLICT DO NOTHING;\n`)
  }

  // Interiors
  if (interiors.length > 0) {
    const vals = interiors.map((i) => {
      const techArr = `ARRAY[${i.techFeatures.map((t) => esc(t)).join(',')}]`
      const cols = [esc(i.id), esc(i.vehicleId), esc(i.seatMaterial),
        i.seatRows, i.seatCount, esc(i.dashboard), techArr]
      return `(${cols.join(',')})`
    }).join(',\n')
    const cols = '"id","vehicleId","seatMaterial","seatRows","seatCount","dashboard","techFeatures"'
    writeSql(fileIdx++,
      `INSERT INTO "Interior" (${cols}) VALUES\n${vals}\n`
      + 'ON CONFLICT ("vehicleId") DO NOTHING;\n')
  }

  console.log(`Generated ${fileIdx - 1} batch files in E:/tmp/batch_*.sql`)
  await neon.$disconnect()
}
main()
