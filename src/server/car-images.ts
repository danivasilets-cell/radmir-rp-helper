import { getBlobStore } from './blob-store'

export function carImageStore() {
  return getBlobStore('car-images')
}

/** Removes a photo from object storage, ignoring keys that are already gone. */
export async function deleteCarImage(key: string) {
  if (!key) return
  await carImageStore().delete(key).catch(() => undefined)
}
