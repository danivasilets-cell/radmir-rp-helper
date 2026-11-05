import { getBlobStore } from './blob-store'

export {
  NEWS_IMAGE_KEY,
  NEWS_IMAGE_MAX_BYTES,
  NEWS_IMAGE_TYPES,
} from '@/lib/news-images'

export function newsImageStore() {
  return getBlobStore('news-images')
}

/** Removes images from object storage, ignoring keys that are already gone. */
export async function deleteNewsImages(keys: string[]) {
  const store = newsImageStore()
  await Promise.all(keys.map((k) => store.delete(k).catch(() => undefined)))
}
