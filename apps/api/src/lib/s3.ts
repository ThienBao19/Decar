import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl as awsGetSignedUrl } from '@aws-sdk/s3-request-presigner'

export const SIGNED_URL_TTL = 900 // 15 minutes

let _client: S3Client | null = null

export function getS3Client(): S3Client {
  if (_client) return _client

  const config = {
    region: process.env.AWS_REGION ?? 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  }

  _client = process.env.CLOUDFLARE_R2_ENDPOINT
    ? new S3Client({ ...config, endpoint: process.env.CLOUDFLARE_R2_ENDPOINT })
    : new S3Client(config)

  return _client
}

/** Generate a presigned GET URL for a private S3/R2 object. */
export async function getPresignedUrl(storageKey: string, ttl = SIGNED_URL_TTL): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: process.env.S3_BUCKET!,
    Key: storageKey,
  })
  return awsGetSignedUrl(getS3Client(), command, { expiresIn: ttl })
}

/** Upload a media file to S3/R2. Keys follow: vehicles/{vehicleId}/{type}/{filename} */
export async function uploadMedia(
  storageKey: string,
  body: Buffer,
  contentType: string,
): Promise<void> {
  const command = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET!,
    Key: storageKey,
    Body: body,
    ContentType: contentType,
  })
  await getS3Client().send(command)
}

/** Canonical storage key for a vehicle media file. */
export function buildStorageKey(vehicleId: string, mediaType: string, filename: string): string {
  return `vehicles/${vehicleId}/${mediaType.toLowerCase()}/${filename}`
}
