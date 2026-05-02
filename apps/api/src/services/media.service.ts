import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl as awsGetSignedUrl } from '@aws-sdk/s3-request-presigner'
import type { PrismaClient } from '@prisma/client'
import type { MediaType, SignedMediaResponse, SubscriptionTier } from '@decar/shared'

const SIGNED_URL_TTL = 900 // 15 minutes

function getS3Client(): S3Client {
  const config = {
    region: process.env.AWS_REGION ?? 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  }

  // Support Cloudflare R2 (S3-compatible)
  if (process.env.CLOUDFLARE_R2_ENDPOINT) {
    return new S3Client({ ...config, endpoint: process.env.CLOUDFLARE_R2_ENDPOINT })
  }

  return new S3Client(config)
}

const s3 = getS3Client()

export async function getSignedUrl(storageKey: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: process.env.S3_BUCKET!,
    Key: storageKey,
  })
  return awsGetSignedUrl(s3, command, { expiresIn: SIGNED_URL_TTL })
}

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
      url: await getSignedUrl(item.storageKey),
      expiresAt,
    })),
  )
}
