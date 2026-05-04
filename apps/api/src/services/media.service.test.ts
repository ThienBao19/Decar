import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { PrismaClient } from '@prisma/client'

// Mock AWS SDK modules before importing the service
vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn().mockImplementation(() => ({})),
  GetObjectCommand: vi.fn().mockImplementation((params) => params),
}))

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn().mockResolvedValue('https://s3.example.com/vehicles/veh_1/key.jpg?X-Amz-Signature=abc'),
}))

// Import AFTER mocks are set up
const { getVehicleMedia } = await import('./media.service.js')
const { getSignedUrl: mockGetSignedUrl } = await import('@aws-sdk/s3-request-presigner')

interface MediaItem { id: string; vehicleId: string; storageKey: string; type: string; isPro: boolean; sortOrder: number; createdAt: Date }

const EXT_MEDIA: MediaItem = { id: 'med_1', vehicleId: 'veh_1', storageKey: 'vehicles/veh_1/ext/front.jpg', type: 'EXTERIOR_IMAGE', isPro: false, sortOrder: 0, createdAt: new Date() }
const ENG_3D_MEDIA: MediaItem = { id: 'med_2', vehicleId: 'veh_1', storageKey: 'vehicles/veh_1/eng/3d.glb', type: 'ENGINE_3D', isPro: true, sortOrder: 0, createdAt: new Date() }

function makePrisma(mediaItems: MediaItem[] = [EXT_MEDIA, ENG_3D_MEDIA]) {
  return {
    media: {
      findMany: vi.fn().mockResolvedValue(mediaItems),
    },
  } as unknown as PrismaClient
}

describe('getVehicleMedia', () => {
  beforeEach(() => vi.clearAllMocks())

  it('should return signed URLs for FREE media items', async () => {
    const prisma = makePrisma([EXT_MEDIA])
    const result = await getVehicleMedia(prisma, 'veh_1', 'EXTERIOR_IMAGE', 'FREE')

    expect(result).toHaveLength(1)
    expect(result[0]!.url).toMatch(/^https:\/\//)
    expect(result[0]!.expiresAt).toBeTruthy()
  })

  it('should throw PRO_REQUIRED for 3D types when tier is FREE', async () => {
    const prisma = makePrisma()

    await expect(
      getVehicleMedia(prisma, 'veh_1', 'ENGINE_3D', 'FREE'),
    ).rejects.toThrow('PRO_REQUIRED')
  })

  it('should throw PRO_REQUIRED for EXTERIOR_3D when tier is FREE', async () => {
    const prisma = makePrisma()

    await expect(
      getVehicleMedia(prisma, 'veh_1', 'EXTERIOR_3D', 'FREE'),
    ).rejects.toThrow('PRO_REQUIRED')
  })

  it('should throw PRO_REQUIRED for INTERIOR_3D when tier is FREE', async () => {
    const prisma = makePrisma()

    await expect(
      getVehicleMedia(prisma, 'veh_1', 'INTERIOR_3D', 'FREE'),
    ).rejects.toThrow('PRO_REQUIRED')
  })

  it('should allow PRO user to fetch 3D media', async () => {
    const prisma = makePrisma([ENG_3D_MEDIA])
    const result = await getVehicleMedia(prisma, 'veh_1', 'ENGINE_3D', 'PRO')

    expect(result).toHaveLength(1)
    expect(result[0]!.url).toMatch(/^https:\/\//)
  })

  it('should generate one signed URL per media item', async () => {
    const items: MediaItem[] = [EXT_MEDIA, { ...EXT_MEDIA, id: 'med_3', storageKey: 'vehicles/veh_1/ext/side.jpg' }]
    const prisma = makePrisma(items)

    const result = await getVehicleMedia(prisma, 'veh_1', 'EXTERIOR_IMAGE', 'FREE')

    expect(result).toHaveLength(2)
    expect(mockGetSignedUrl).toHaveBeenCalledTimes(2)
  })

  it('should set expiresAt ~15 minutes in the future', async () => {
    const prisma = makePrisma([EXT_MEDIA])
    const before = Date.now()
    const result = await getVehicleMedia(prisma, 'veh_1', 'EXTERIOR_IMAGE', 'FREE')
    const after = Date.now()

    const expiresMs = new Date(result[0]!.expiresAt).getTime()
    expect(expiresMs).toBeGreaterThan(before + 14 * 60 * 1000)
    expect(expiresMs).toBeLessThan(after  + 16 * 60 * 1000)
  })

  it('should filter isPro media for FREE users on non-3D types', async () => {
    const mixedMedia = [
      { ...EXT_MEDIA, id: 'free_img', isPro: false },
      { ...EXT_MEDIA, id: 'pro_img',  isPro: true  },
    ]
    const prisma = makePrisma(mixedMedia)

    await getVehicleMedia(prisma, 'veh_1', 'EXTERIOR_IMAGE', 'FREE')

    const call = (prisma.media.findMany as ReturnType<typeof vi.fn>).mock.calls[0]![0]
    expect(call.where.isPro).toBe(false)
  })

  it('should not filter isPro for PRO users', async () => {
    const prisma = makePrisma([EXT_MEDIA])

    await getVehicleMedia(prisma, 'veh_1', 'EXTERIOR_IMAGE', 'PRO')

    const call = (prisma.media.findMany as ReturnType<typeof vi.fn>).mock.calls[0]![0]
    expect(call.where.isPro).toBeUndefined()
  })
})
