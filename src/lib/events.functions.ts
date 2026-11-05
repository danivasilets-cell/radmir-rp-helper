import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { asc, desc, eq, sql } from 'drizzle-orm'
import { db } from '../../db/index.js'
import { eventPrizes, eventTables } from '../../db/schema.js'
import { logAction, requirePermission } from '@/server/auth'
import { serverExists, serverScope } from '@/server/servers'
import type { EventPrize, EventTable } from './types'

const cell = z.string().max(200)

const tableFields = z
  .object({
    title: z.string().trim().min(1, 'Введите название').max(150),
    description: z.string().trim().max(1000).default(''),
    columns: z
      .array(cell.trim().min(1, 'Пустой заголовок колонки'))
      .min(1)
      .max(12),
    rows: z.array(z.array(cell)).max(300),
    serverId: z.number().int().positive().nullable().default(null),
  })
  .refine((t) => t.rows.every((r) => r.length === t.columns.length), {
    message: 'Число ячеек в строке не совпадает с числом колонок',
  })

const prizeFields = z.object({
  title: z.string().trim().min(1, 'Введите название ивента').max(150),
  reward: z.string().trim().min(1, 'Укажите приз').max(200),
  description: z.string().trim().max(2000).default(''),
  eventDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .default(null),
  winner: z.string().trim().max(100).default(''),
  serverId: z.number().int().positive().nullable().default(null),
})

const idInput = z.object({ id: z.number().int().positive() })

function toTable(r: typeof eventTables.$inferSelect): EventTable {
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    columns: r.columns,
    rows: r.rows,
    serverId: r.serverId,
    createdBy: r.createdBy,
    updatedAt: r.updatedAt.toISOString(),
  }
}

function toPrize(r: typeof eventPrizes.$inferSelect): EventPrize {
  return {
    id: r.id,
    title: r.title,
    reward: r.reward,
    description: r.description,
    eventDate: r.eventDate,
    winner: r.winner,
    serverId: r.serverId,
    createdBy: r.createdBy,
  }
}

/** Today's date on Radmir's clock (Moscow), as YYYY-MM-DD. */
const moscowToday = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Moscow' }).format(
    new Date(),
  )

// ── Reading ────────────────────────────────────────────────

export const getEventsOverview = createServerFn({ method: 'GET' }).handler(
  async () => {
    const [tables, prizes] = await Promise.all([
      db
        .select()
        .from(eventTables)
        .where(serverScope(eventTables.serverId))
        .orderBy(desc(eventTables.updatedAt))
        .limit(4),
      db
        .select()
        .from(eventPrizes)
        .where(serverScope(eventPrizes.serverId))
        .orderBy(
          sql`${eventPrizes.eventDate} desc nulls last`,
          desc(eventPrizes.id),
        )
        .limit(6),
    ])
    const [{ tableCount }] = await db
      .select({ tableCount: sql<number>`count(*)::int` })
      .from(eventTables)
      .where(serverScope(eventTables.serverId))
    const [{ prizeCount }] = await db
      .select({ prizeCount: sql<number>`count(*)::int` })
      .from(eventPrizes)
      .where(serverScope(eventPrizes.serverId))
    return {
      tables: tables.map(toTable),
      prizes: prizes.map(toPrize),
      tableCount,
      prizeCount,
      today: moscowToday(),
    }
  },
)

export const listEventTables = createServerFn({ method: 'GET' }).handler(
  async () => {
    const rows = await db
      .select()
      .from(eventTables)
      .where(serverScope(eventTables.serverId))
      .orderBy(desc(eventTables.updatedAt), desc(eventTables.id))
    return rows.map(toTable)
  },
)

export const listEventPrizes = createServerFn({ method: 'GET' }).handler(
  async () => {
    const rows = await db
      .select()
      .from(eventPrizes)
      .where(serverScope(eventPrizes.serverId))
      .orderBy(
        sql`${eventPrizes.eventDate} desc nulls last`,
        asc(eventPrizes.id),
      )
    return { prizes: rows.map(toPrize), today: moscowToday() }
  },
)

// ── Writing (admin or owner) ───────────────────────────────

export const saveEventTable = createServerFn({ method: 'POST' })
  .validator(
    tableFields.and(z.object({ id: z.number().int().positive().nullable() })),
  )
  .handler(async ({ data }) => {
    const session = await requirePermission('events.manage')
    if (!(await serverExists(data.serverId)))
      throw new Error('Сервер не найден')
    const { id, ...fields } = data
    if (id === null) {
      const [row] = await db
        .insert(eventTables)
        .values({ ...fields, createdBy: session.label })
        .returning({ id: eventTables.id })
      await logAction(
        session,
        'Создана таблица ивента',
        'event',
        row.id,
        fields.title,
      )
      return row
    }
    const [row] = await db
      .update(eventTables)
      .set({ ...fields, updatedAt: new Date() })
      .where(eq(eventTables.id, id))
      .returning({ id: eventTables.id })
    if (!row) throw new Error('Таблица не найдена')
    await logAction(
      session,
      'Изменена таблица ивента',
      'event',
      row.id,
      fields.title,
    )
    return row
  })

export const deleteEventTable = createServerFn({ method: 'POST' })
  .validator(idInput)
  .handler(async ({ data }) => {
    const session = await requirePermission('events.manage')
    const [row] = await db
      .delete(eventTables)
      .where(eq(eventTables.id, data.id))
      .returning({ title: eventTables.title })
    await logAction(
      session,
      'Удалена таблица ивента',
      'event',
      data.id,
      row?.title,
    )
    return { ok: true }
  })

export const saveEventPrize = createServerFn({ method: 'POST' })
  .validator(prizeFields.extend({ id: z.number().int().positive().nullable() }))
  .handler(async ({ data }) => {
    const session = await requirePermission('events.manage')
    if (!(await serverExists(data.serverId)))
      throw new Error('Сервер не найден')
    const { id, ...fields } = data
    if (id === null) {
      const [row] = await db
        .insert(eventPrizes)
        .values({ ...fields, createdBy: session.label })
        .returning({ id: eventPrizes.id })
      await logAction(session, 'Добавлен приз', 'prize', row.id, fields.title)
      return row
    }
    const [row] = await db
      .update(eventPrizes)
      .set({ ...fields, updatedAt: new Date() })
      .where(eq(eventPrizes.id, id))
      .returning({ id: eventPrizes.id })
    if (!row) throw new Error('Приз не найден')
    await logAction(session, 'Изменён приз', 'prize', row.id, fields.title)
    return row
  })

export const deleteEventPrize = createServerFn({ method: 'POST' })
  .validator(idInput)
  .handler(async ({ data }) => {
    const session = await requirePermission('events.manage')
    const [row] = await db
      .delete(eventPrizes)
      .where(eq(eventPrizes.id, data.id))
      .returning({ title: eventPrizes.title })
    await logAction(session, 'Удалён приз', 'prize', data.id, row?.title)
    return { ok: true }
  })
