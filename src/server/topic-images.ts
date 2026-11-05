import { getBlobStore } from './blob-store'

/** Photos embedded in topic / idea text (Cloudflare R2). */
export function topicImageStore() {
  return getBlobStore('topic-images')
}
