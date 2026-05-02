import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { PrismaClient } from '@prisma/client'
import type Redis from 'ioredis'
import { getVehicle } from './vehicle.service.js'

const mockVehicle = {
  id: 'veh_1',
  slug: 'toyota-camry-2024-xse-us',
  make: 'Toyota',
  model: 'Camry',
  year: 2024,
  market: 'US',
  trimLevel: 'XSE V6',
  createdAt: new Date(),
  updatedAt: new Date(),
  engine: {
    id: 'eng_1',
    vehicleId: 'veh_1',
    displacement: 3.5,
    cylinders: 6,
    fuelType: 'PETROL',
    powerKw: 203,
    torqueNm: 362,
    transmission: '8-speed Automatic',
    drivetrain: 'FWD',
  },
  exterior: {
    id: 'ext_1',
    vehicleId: 'veh_1',
    bodyType: 'Sedan',
    lengthMm: 4885,
    widthMm: 1840,
    heightMm: 1445,
    wheelbaseMm: 2825,
    colors: [{ id: 'col_1', name: 'Blueprint', hexCode: '#2E4A7A', isPrimary: true, exteriorId: 'ext_1' }],
  },
  interior: {
    id: 'int_1',
    vehicleId: 'veh_1',
    seatMaterial: 'SofTex Leather',
    seatRows: 2,
    seatCount: 5,
    dashboard: '9" touchscreen',
    techFeatures: ['Apple CarPlay'],
  },
  media: [],
}

function makePrisma() {
  return {
    vehicle: {
      findUnique: vi.fn().mockResolvedValue(mockVehicle),
    },
  } as unknown as PrismaClient
}

function makeRedis(cached: string | null = null) {
  return {
    get: vi.fn().mockResolvedValue(cached),
    setex: vi.fn().mockResolvedValue('OK'),
  } as unknown as Redis
}

describe('getVehicle', () => {
  it('returns FREE-masked data for FREE tier', async () => {
    const prisma = makePrisma()
    const redis = makeRedis()

    const result = await getVehicle(prisma, redis, 'veh_1', 'FREE')

    expect(result).not.toBeNull()
    expect(result!.engine!.powerKw).toBe(0)
    expect(result!.engine!.torqueNm).toBe(0)
    expect(result!.engine!.transmission).toBe('Upgrade to Pro')
    expect(result!.interior).toBeNull()
  })

  it('returns full data for PRO tier', async () => {
    const prisma = makePrisma()
    const redis = makeRedis()

    const result = await getVehicle(prisma, redis, 'veh_1', 'PRO')

    expect(result).not.toBeNull()
    expect(result!.engine!.powerKw).toBe(203)
    expect(result!.engine!.torqueNm).toBe(362)
    expect(result!.engine!.transmission).toBe('8-speed Automatic')
    expect(result!.interior).not.toBeNull()
    expect(result!.interior!.seatCount).toBe(5)
  })

  it('uses Redis cache on second call', async () => {
    const prisma = makePrisma()
    const redis = makeRedis(JSON.stringify(mockVehicle))

    await getVehicle(prisma, redis, 'veh_1', 'PRO')

    expect(redis.get).toHaveBeenCalledWith('vehicle:veh_1')
    expect(prisma.vehicle.findUnique).not.toHaveBeenCalled()
  })

  it('returns null for unknown vehicle', async () => {
    const prisma = {
      vehicle: { findUnique: vi.fn().mockResolvedValue(null) },
    } as unknown as PrismaClient
    const redis = makeRedis()

    const result = await getVehicle(prisma, redis, 'nonexistent', 'FREE')
    expect(result).toBeNull()
  })

  it('caches the DB result in Redis', async () => {
    const prisma = makePrisma()
    const redis = makeRedis(null)

    await getVehicle(prisma, redis, 'veh_1', 'FREE')

    expect(redis.setex).toHaveBeenCalledWith('vehicle:veh_1', 3600, expect.any(String))
  })
})
