import type { PrismaClient } from '@prisma/client'
import type { MediaType, SignedMediaResponse, SubscriptionTier } from '@decar/shared'
import { getPresignedUrl, SIGNED_URL_TTL } from '../lib/s3.js'

export { getPresignedUrl as getSignedUrl }

export async function getVehicleMedia(
  prisma: PrismaClient,
  vehicleId: string,
  type: MediaType,
  tier: SubscriptionTier,
): Promise<SignedMediaResponse[]> {
  const isProType = type === 'ENGINE_3D' || type === 'INTERIOR_3D' || type === 'EXTERIOR_3D'

  if (isProType && tier !== 'PRO') {
    throw new Error('PRO_REQUIRED')
  }

  const mediaItems = await prisma.media.findMany({
    where: {
      vehicleId,
      type,
      ...(tier !== 'PRO' ? { isPro: false } : {}),
    },
    orderBy: { sortOrder: 'asc' },
  })

  const expiresAt = new Date(Date.now() + SIGNED_URL_TTL * 1000).toISOString()

  return Promise.all(
    mediaItems.map(async (item) => ({
      url: await getPresignedUrl(item.storageKey),
      expiresAt,
    })),
  )
}
