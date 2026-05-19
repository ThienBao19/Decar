import { PrismaClient } from '@prisma/client'

const neon = new PrismaClient({
  datasources: { db: { url: process.env.NEON_DATABASE_URL! } }
})

async function main() {
  const tables = [
    ['Vehicle', neon.vehicle.count()],
    ['Engine', neon.engine.count()],
    ['Exterior', neon.exterior.count()],
    ['Color', neon.color.count()],
    ['Interior', neon.interior.count()],
    ['User', neon.user.count()],
    ['VehicleBuild', neon.vehicleBuild.count()],
    ['VehicleComparison', neon.vehicleComparison.count()],
  ]
  for (const [name, p] of tables) {
    console.log(`${name}: ${await p}`)
  }
  await neon.$disconnect()
}
main()
