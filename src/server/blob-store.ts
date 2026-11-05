import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3'

export type BlobMetadata = Record<string, string | number | boolean | null | undefined>

function client() {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID
  const accessKeyId = process.env.R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY
  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error('Cloudflare R2 is not configured: set CLOUDFLARE_ACCOUNT_ID, R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY')
  }
  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  })
}

function bucketFor(storeName: string) {
  const key = storeName === 'car-images'
    ? 'R2_CAR_IMAGES_BUCKET'
    : storeName === 'news-images'
      ? 'R2_NEWS_IMAGES_BUCKET'
      : 'R2_TOPIC_IMAGES_BUCKET'
  const bucket = process.env[key]
  if (!bucket) throw new Error(`${key} is not configured`)
  return bucket
}

export function getBlobStore(storeName: string) {
  const s3 = client()
  const bucket = bucketFor(storeName)
  return {
    async set(key: string, value: ArrayBuffer | Uint8Array | Buffer, options?: { metadata?: BlobMetadata }) {
      const metadata = options?.metadata ?? {}
      const contentType = typeof metadata.contentType === 'string' ? metadata.contentType : 'application/octet-stream'
      const custom = Object.fromEntries(
        Object.entries(metadata)
          .filter(([name, val]) => name !== 'contentType' && val != null)
          .map(([name, val]) => [name.toLowerCase(), String(val)]),
      )
      await s3.send(new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: Buffer.from(value),
        ContentType: contentType,
        Metadata: custom,
      }))
    },
    async getWithMetadata(key: string, _options?: { type?: 'arrayBuffer' }) {
      try {
        const result = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }))
        if (!result.Body) return null
        const bytes = await result.Body.transformToByteArray()
        return {
          data: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
          metadata: {
            ...(result.Metadata ?? {}),
            contentType: result.ContentType ?? 'application/octet-stream',
          },
        }
      } catch (error) {
        if ((error as { name?: string }).name === 'NoSuchKey' || (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode === 404) return null
        throw error
      }
    },
    async delete(key: string) {
      await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }))
    },
  }
}
