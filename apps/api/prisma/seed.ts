import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding vehicles...')

  const vehicles = [
    {
      make: 'Toyota',
      model: 'Camry',
      year: 2024,
      market: 'US',
      trimLevel: 'XSE V6',
      slug: 'toyota-camry-2024-xse-v6-us',
      engine: {
        displacement: 3.5,
        cylinders: 6,
        fuelType: 'PETROL' as const,
        powerKw: 203,
        torqueNm: 362,
        transmission: '8-speed Automatic',
        drivetrain: 'FWD',
      },
      exterior: {
        bodyType: 'Sedan',
        lengthMm: 4885,
        widthMm: 1840,
        heightMm: 1445,
        wheelbaseMm: 2825,
        colors: [
          { name: 'Blueprint', hexCode: '#2E4A7A', isPrimary: true },
          { name: 'Midnight Black', hexCode: '#1A1A1A', isPrimary: false },
          { name: 'Supersonic Red', hexCode: '#C0392B', isPrimary: false },
          { name: 'Lunar Rock', hexCode: '#B8B4A8', isPrimary: false },
          { name: 'Ice Cap', hexCode: '#F5F5F0', isPrimary: false },
        ],
      },
      interior: {
        seatMaterial: 'SofTex Leather',
        seatRows: 2,
        seatCount: 5,
        dashboard: 'Dual-zone climate, 9" touchscreen',
        techFeatures: ['Apple CarPlay', 'Android Auto', 'Wireless Charging', 'JBL Sound', 'HUD'],
      },
    },
    {
      make: 'BMW',
      model: 'M3',
      year: 2024,
      market: 'EU',
      trimLevel: 'Competition',
      slug: 'bmw-m3-2024-competition-eu',
      engine: {
        displacement: 3.0,
        cylinders: 6,
        fuelType: 'PETROL' as const,
        powerKw: 375,
        torqueNm: 650,
        transmission: '8-speed M Steptronic',
        drivetrain: 'RWD',
      },
      exterior: {
        bodyType: 'Sedan',
        lengthMm: 4794,
        widthMm: 1903,
        heightMm: 1433,
        wheelbaseMm: 2857,
        colors: [
          { name: 'Isle of Man Green', hexCode: '#2D5F3C', isPrimary: true },
          { name: 'Frozen Portimao Blue', hexCode: '#1F3A5F', isPrimary: false },
          { name: 'Toronto Red', hexCode: '#8B1A1A', isPrimary: false },
          { name: 'Alpine White', hexCode: '#F8F8F4', isPrimary: false },
        ],
      },
      interior: {
        seatMaterial: 'Full Merino Leather',
        seatRows: 2,
        seatCount: 5,
        dashboard: 'iDrive 8, 14.9" Curved Display',
        techFeatures: ['M Traction Control', 'Launch Control', 'M Drive Professional', 'Harman Kardon'],
      },
    },
    {
      make: 'Tesla',
      model: 'Model 3',
      year: 2024,
      market: 'US',
      trimLevel: 'Long Range AWD',
      slug: 'tesla-model3-2024-lr-awd-us',
      engine: {
        displacement: 0,
        cylinders: 0,
        fuelType: 'ELECTRIC' as const,
        powerKw: 366,
        torqueNm: 559,
        transmission: 'Single-speed',
        drivetrain: 'AWD',
      },
      exterior: {
        bodyType: 'Sedan',
        lengthMm: 4720,
        widthMm: 1849,
        heightMm: 1441,
        wheelbaseMm: 2875,
        colors: [
          { name: 'Stealth Grey', hexCode: '#5C5E60', isPrimary: true },
          { name: 'Pearl White Multi-Coat', hexCode: '#F2F2F0', isPrimary: false },
          { name: 'Midnight Cherry Red', hexCode: '#6B1414', isPrimary: false },
          { name: 'Ultra Red', hexCode: '#C0392B', isPrimary: false },
          { name: 'Quicksilver', hexCode: '#A8A9AA', isPrimary: false },
        ],
      },
      interior: {
        seatMaterial: 'Vegan Leather',
        seatRows: 2,
        seatCount: 5,
        dashboard: '15.4" Touchscreen, no instrument cluster',
        techFeatures: ['Autopilot', 'Over-the-Air Updates', 'Sentry Mode', 'Gaming', 'HEPA Filter'],
      },
    },
    {
      make: 'Honda',
      model: 'Civic',
      year: 2024,
      market: 'VN',
      trimLevel: 'RS',
      slug: 'honda-civic-2024-rs-vn',
      engine: {
        displacement: 1.5,
        cylinders: 4,
        fuelType: 'PETROL' as const,
        powerKw: 134,
        torqueNm: 240,
        transmission: 'CVT',
        drivetrain: 'FWD',
      },
      exterior: {
        bodyType: 'Sedan',
        lengthMm: 4674,
        widthMm: 1802,
        heightMm: 1415,
        wheelbaseMm: 2735,
        colors: [
          { name: 'Sonic Grey Pearl', hexCode: '#8A8C8E', isPrimary: true },
          { name: 'Crystal Black Pearl', hexCode: '#1C1C1C', isPrimary: false },
          { name: 'Platinum White Pearl', hexCode: '#EBEBEB', isPrimary: false },
          { name: 'Radiant Red Metallic', hexCode: '#A52020', isPrimary: false },
        ],
      },
      interior: {
        seatMaterial: 'Cloth/Leather-trimmed',
        seatRows: 2,
        seatCount: 5,
        dashboard: '9" Honda Sensing Display',
        techFeatures: ['Honda Sensing', 'Apple CarPlay', 'Android Auto', 'Remote Start'],
      },
    },
    {
      make: 'Toyota',
      model: 'Land Cruiser',
      year: 2024,
      market: 'VN',
      trimLevel: 'GR Sport',
      slug: 'toyota-landcruiser-2024-grsport-vn',
      engine: {
        displacement: 3.3,
        cylinders: 6,
        fuelType: 'DIESEL' as const,
        powerKw: 227,
        torqueNm: 700,
        transmission: '10-speed Automatic',
        drivetrain: 'AWD',
      },
      exterior: {
        bodyType: 'SUV',
        lengthMm: 4950,
        widthMm: 1980,
        heightMm: 1870,
        wheelbaseMm: 2850,
        colors: [
          { name: 'Precious Black', hexCode: '#0A0A0A', isPrimary: true },
          { name: 'Glacier White', hexCode: '#F8F8F5', isPrimary: false },
          { name: 'Precious Silver', hexCode: '#A9ADB0', isPrimary: false },
          { name: 'Dark Red Mica', hexCode: '#6E1A1A', isPrimary: false },
        ],
      },
      interior: {
        seatMaterial: 'Semi-aniline Leather',
        seatRows: 3,
        seatCount: 7,
        dashboard: '12.3" Multi-information Display + 12.3" Navigation',
        techFeatures: ['Multi-terrain Select', 'Kinetic Dynamic Suspension', 'Panoramic Roof', 'JBL 14-speaker'],
      },
    },
  ]

  for (const data of vehicles) {
    const vehicle = await prisma.vehicle.upsert({
      where: { slug: data.slug },
      create: {
        make: data.make,
        model: data.model,
        year: data.year,
        market: data.market,
        trimLevel: data.trimLevel,
        slug: data.slug,
        engine: { create: data.engine },
        exterior: {
          create: {
            bodyType: data.exterior.bodyType,
            lengthMm: data.exterior.lengthMm,
            widthMm: data.exterior.widthMm,
            heightMm: data.exterior.heightMm,
            wheelbaseMm: data.exterior.wheelbaseMm,
            colors: { create: data.exterior.colors },
          },
        },
        interior: { create: data.interior },
      },
      update: {},
    })
    console.log(`  ✓ ${vehicle.year} ${vehicle.make} ${vehicle.model} (${vehicle.slug})`)
  }

  console.log(`\nSeeded ${vehicles.length} vehicles.`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
