/** Car photos live in the `car-images` Blobs store; limits match news photos. */
export {
  NEWS_IMAGE_KEY as CAR_IMAGE_KEY,
  NEWS_IMAGE_MAX_BYTES as CAR_IMAGE_MAX_BYTES,
  NEWS_IMAGE_TYPES as CAR_IMAGE_TYPES,
} from './news-images'

export const carImageUrl = (key: string) => `/api/car-images/${key}`
