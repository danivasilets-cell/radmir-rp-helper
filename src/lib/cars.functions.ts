import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { and, asc, eq, ne } from 'drizzle-orm'
import { db } from '../../db/index.js'
import { cars } from '../../db/schema.js'
import { logAction, requirePermission } from '@/server/auth'
import { serverExists, serverScope } from '@/server/servers'
import { deleteCarImage } from '@/server/car-images'
import { CAR_IMAGE_KEY } from './car-images'
import { CAR_CLASS_IDS, FUEL_TYPE_IDS } from './cars'
import type { Car } from './types'

const carFields = z.object({
  modelId: z.number().int().min(0).max(100_000),
  name: z.string().trim().min(1, 'Введите название').max(100),
  carClass: z.enum(CAR_CLASS_IDS),
  price: z.number().int().min(0).max(100_000_000_000).nullable(),
  dealership: z.string().trim().max(60).default(''),
  maxSpeed: z.number().int().min(0).max(1000),
  acceleration: z.number().min(0).max(100),
  seats: z.number().int().min(1).max(50),
  trunk: z.number().int().min(0).max(1000),
  fuelTank: z.number().int().min(0).max(1000),
  drive: z.enum(['', 'FWD', 'RWD', 'AWD']),
  fuelType: z.enum(FUEL_TYPE_IDS).default(''),
  description: z.string().trim().max(1000).default(''),
  image: z
    .string()
    .refine((v) => v === '' || CAR_IMAGE_KEY.test(v), 'Неверное фото')
    .default(''),
  serverId: z.number().int().positive().nullable().default(null),
})

function toCar(r: typeof cars.$inferSelect): Car {
  return {
    id: r.id,
    modelId: r.modelId,
    name: r.name,
    carClass: r.carClass,
    price: r.price,
    dealership: r.dealership,
    maxSpeed: r.maxSpeed,
    acceleration: r.acceleration,
    seats: r.seats,
    trunk: r.trunk,
    fuelTank: r.fuelTank,
    drive: r.drive,
    fuelType: r.fuelType,
    description: r.description,
    image: r.image,
    serverId: r.serverId,
  }
}

export const listCars = createServerFn({ method: 'GET' }).handler(async () => {
  const rows = await db
    .select()
    .from(cars)
    .where(serverScope(cars.serverId))
    .orderBy(asc(cars.price), asc(cars.modelId))
  return rows.map(toCar)
})

export const saveCar = createServerFn({ method: 'POST' })
  .validator(carFields.extend({ id: z.number().int().positive().nullable() }))
  .handler(async ({ data }) => {
    const session = await requirePermission('catalog.manage')
    if (!(await serverExists(data.serverId)))
      throw new Error('Сервер не найден')
    const { id, ...fields } = data
    // One vehicle may be listed under several classes/sources, but not twice in the same one.
    const same = and(
      eq(cars.modelId, fields.modelId),
      eq(cars.name, fields.name),
      eq(cars.carClass, fields.carClass),
      eq(cars.dealership, fields.dealership),
    )
    const [taken] = await db
      .select({ id: cars.id })
      .from(cars)
      .where(id === null ? same : and(same, ne(cars.id, id)))
      .limit(1)
    if (taken)
      throw new Error(
        `«${fields.name}» (ID ${fields.modelId}) уже есть в этом разделе`,
      )
    if (id === null) {
      const [row] = await db
        .insert(cars)
        .values({ ...fields, createdBy: session.label })
        .returning({ id: cars.id })
      await logAction(
        session,
        'Добавлен автомобиль',
        'car',
        row.id,
        fields.name,
      )
      return row
    }
    const [old] = await db
      .select({ image: cars.image })
      .from(cars)
      .where(eq(cars.id, id))
    if (!old) throw new Error('Машина не найдена')
    const [row] = await db
      .update(cars)
      .set({ ...fields, updatedAt: new Date() })
      .where(eq(cars.id, id))
      .returning({ id: cars.id })
    if (!row) throw new Error('Машина не найдена')
    if (old.image && old.image !== fields.image) await deleteCarImage(old.image)
    await logAction(session, 'Изменён автомобиль', 'car', row.id, fields.name)
    return row
  })

export const deleteCar = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.number().int().positive() }))
  .handler(async ({ data }) => {
    const session = await requirePermission('catalog.manage')
    const [row] = await db
      .delete(cars)
      .where(eq(cars.id, data.id))
      .returning({ name: cars.name, image: cars.image })
    if (row?.image) await deleteCarImage(row.image)
    await logAction(session, 'Удалён автомобиль', 'car', data.id, row?.name)
    return { ok: true }
  })
