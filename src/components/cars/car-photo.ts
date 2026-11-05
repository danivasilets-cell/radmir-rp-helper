import { CAR_IMAGE_MAX_BYTES, CAR_IMAGE_TYPES } from '@/lib/car-images'
import type { CarClassId, FUEL_TYPE_IDS } from '@/lib/cars'
import type { Car } from '@/lib/types'

/** Returns an error text if the file can't be used as a car photo. */
export function checkCarImage(file: File): string | null {
  if (!(CAR_IMAGE_TYPES as readonly string[]).includes(file.type))
    return 'Поддерживаются JPG, PNG, WebP и GIF'
  if (file.size > CAR_IMAGE_MAX_BYTES) return 'Фото больше 5 МБ'
  return null
}

/** Uploads a photo to the car photo store and returns its key. */
export async function uploadCarImage(file: File): Promise<string> {
  const body = new FormData()
  body.append('file', file)
  const res = await fetch('/api/car-images', { method: 'POST', body })
  const json = (await res.json().catch(() => ({}))) as {
    key?: string
    error?: string
  }
  if (!res.ok || !json.key)
    throw new Error(json.error ?? 'Не удалось загрузить фото')
  return json.key
}

/** The current car as `saveCar` input (to change a single field). */
export function carInput(car: Car) {
  return {
    id: car.id,
    modelId: car.modelId,
    name: car.name,
    carClass: car.carClass as CarClassId,
    price: car.price,
    dealership: car.dealership,
    maxSpeed: car.maxSpeed,
    acceleration: car.acceleration,
    seats: car.seats,
    trunk: car.trunk,
    fuelTank: car.fuelTank,
    drive: car.drive as '' | 'FWD' | 'RWD' | 'AWD',
    fuelType: car.fuelType as (typeof FUEL_TYPE_IDS)[number],
    description: car.description,
    image: car.image,
    serverId: car.serverId ?? null,
  }
}
