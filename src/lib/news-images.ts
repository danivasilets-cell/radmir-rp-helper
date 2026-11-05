/** Shared limits for news photos (client and server). */
export const NEWS_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
] as const
export const NEWS_IMAGE_MAX_BYTES = 5 * 1024 * 1024
export const NEWS_MAX_IMAGES = 6
export const NEWS_IMAGE_KEY = /^[a-f0-9-]{36}$/

export const newsImageUrl = (key: string) => `/api/news-images/${key}`
