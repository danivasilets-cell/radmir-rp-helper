import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { and, asc, eq, sql } from 'drizzle-orm'
import { db } from '../../db/index.js'
import {
  gameCommands,
  gameServers,
  organizations,
  roleplays,
  savedRoleplays,
} from '../../db/schema.js'
import {
  currentSession,
  logAction,
  requirePermission,
  requireUser,
} from '@/server/auth'
import {
  listServers,
  rememberServer,
  serverExists,
  serverScope,
} from '@/server/servers'
import { users } from '../../db/schema.js'
import { rpColumns, toRoleplay } from '@/server/roleplays'
import type { GameCommand, Organization } from './types'

const id = z.number().int().positive()
const serverId = id.nullable().default(null)

// ── Game servers ──────────────────────────────────────────

/** The visitor picks a server; players also get it saved in the profile. */
export const setServer = createServerFn({ method: 'POST' })
  .validator(z.object({ serverId: id.nullable() }))
  .handler(async ({ data }) => {
    if (!(await serverExists(data.serverId)))
      throw new Error('Сервер не найден')
    rememberServer(data.serverId)
    const session = await currentSession()
    if (session?.userId) {
      await db
        .update(users)
        .set({ serverId: data.serverId })
        .where(eq(users.id, session.userId))
      await logAction(session, 'Выбран сервер', 'server', data.serverId)
    }
    return { ok: true }
  })

export const adminListServers = createServerFn({ method: 'GET' }).handler(
  async () => {
    await requirePermission('servers.manage')
    const rows = await listServers(true)
    const counts = await db
      .select({
        serverId: users.serverId,
        players: sql<number>`count(*)::int`,
      })
      .from(users)
      .groupBy(users.serverId)
    return rows.map((r) => ({
      ...r,
      players: counts.find((c) => c.serverId === r.id)?.players ?? 0,
    }))
  },
)

export const saveServer = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      id: id.nullable(),
      name: z.string().trim().min(1, 'Введите название').max(60),
      description: z.string().trim().max(300).default(''),
      sortOrder: z.number().int().min(0).max(10000).default(0),
      active: z.boolean().default(true),
    }),
  )
  .handler(async ({ data }) => {
    const session = await requirePermission('servers.manage')
    const { id: rowId, ...fields } = data
    if (rowId === null) {
      const [row] = await db
        .insert(gameServers)
        .values(fields)
        .returning({ id: gameServers.id })
      await logAction(session, 'Добавлен сервер', 'server', row.id, fields.name)
      return row
    }
    const [row] = await db
      .update(gameServers)
      .set(fields)
      .where(eq(gameServers.id, rowId))
      .returning({ id: gameServers.id })
    if (!row) throw new Error('Сервер не найден')
    await logAction(session, 'Изменён сервер', 'server', rowId, fields.name)
    return row
  })

export const deleteServer = createServerFn({ method: 'POST' })
  .validator(z.object({ id }))
  .handler(async ({ data }) => {
    const session = await requirePermission('servers.manage')
    const [row] = await db
      .delete(gameServers)
      .where(eq(gameServers.id, data.id))
      .returning({ name: gameServers.name })
    await logAction(session, 'Удалён сервер', 'server', data.id, row?.name)
    return { ok: true }
  })

// ── Organizations ─────────────────────────────────────────

const toOrg = (r: typeof organizations.$inferSelect): Organization => ({
  id: r.id,
  name: r.name,
  kind: r.kind,
  description: r.description,
  leader: r.leader,
  serverId: r.serverId,
  sortOrder: r.sortOrder,
})

export const listOrganizations = createServerFn({ method: 'GET' })
  .validator(z.object({ all: z.boolean().default(false) }).optional())
  .handler(async ({ data }) => {
    const rows = await db
      .select()
      .from(organizations)
      .where(data?.all ? undefined : serverScope(organizations.serverId))
      .orderBy(asc(organizations.sortOrder), asc(organizations.name))
    return rows.map(toOrg)
  })

export const saveOrganization = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      id: id.nullable(),
      name: z.string().trim().min(1, 'Введите название').max(80),
      kind: z.enum(['gov', 'crime', 'other']),
      description: z.string().trim().max(2000).default(''),
      leader: z.string().trim().max(60).default(''),
      serverId,
      sortOrder: z.number().int().min(0).max(10000).default(0),
    }),
  )
  .handler(async ({ data }) => {
    const session = await requirePermission('orgs.manage')
    if (!(await serverExists(data.serverId)))
      throw new Error('Сервер не найден')
    const { id: rowId, ...fields } = data
    if (rowId === null) {
      const [row] = await db
        .insert(organizations)
        .values(fields)
        .returning({ id: organizations.id })
      await logAction(
        session,
        'Добавлена организация',
        'org',
        row.id,
        fields.name,
      )
      return row
    }
    const [row] = await db
      .update(organizations)
      .set({ ...fields, updatedAt: new Date() })
      .where(eq(organizations.id, rowId))
      .returning({ id: organizations.id })
    if (!row) throw new Error('Организация не найдена')
    await logAction(session, 'Изменена организация', 'org', rowId, fields.name)
    return row
  })

export const deleteOrganization = createServerFn({ method: 'POST' })
  .validator(z.object({ id }))
  .handler(async ({ data }) => {
    const session = await requirePermission('orgs.manage')
    const [row] = await db
      .delete(organizations)
      .where(eq(organizations.id, data.id))
      .returning({ name: organizations.name })
    await logAction(session, 'Удалена организация', 'org', data.id, row?.name)
    return { ok: true }
  })

// ── Game commands ─────────────────────────────────────────

const toCommand = (r: typeof gameCommands.$inferSelect): GameCommand => ({
  id: r.id,
  command: r.command,
  description: r.description,
  usage: r.usage,
  category: r.category,
  serverId: r.serverId,
})

export const listCommands = createServerFn({ method: 'GET' })
  .validator(z.object({ all: z.boolean().default(false) }).optional())
  .handler(async ({ data }) => {
    const rows = await db
      .select()
      .from(gameCommands)
      .where(data?.all ? undefined : serverScope(gameCommands.serverId))
      .orderBy(asc(gameCommands.category), asc(gameCommands.command))
    return rows.map(toCommand)
  })

export const saveCommand = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      id: id.nullable(),
      command: z
        .string()
        .trim()
        .min(2, 'Введите команду')
        .max(60)
        .regex(/^\//, 'Команда начинается с /'),
      description: z.string().trim().min(1, 'Опишите команду').max(500),
      usage: z.string().trim().max(300).default(''),
      category: z.string().trim().max(40).default(''),
      serverId,
    }),
  )
  .handler(async ({ data }) => {
    const session = await requirePermission('catalog.manage')
    if (!(await serverExists(data.serverId)))
      throw new Error('Сервер не найден')
    const { id: rowId, ...fields } = data
    if (rowId === null) {
      const [row] = await db
        .insert(gameCommands)
        .values(fields)
        .returning({ id: gameCommands.id })
      await logAction(
        session,
        'Добавлена команда',
        'command',
        row.id,
        fields.command,
      )
      return row
    }
    const [row] = await db
      .update(gameCommands)
      .set({ ...fields, updatedAt: new Date() })
      .where(eq(gameCommands.id, rowId))
      .returning({ id: gameCommands.id })
    if (!row) throw new Error('Команда не найдена')
    await logAction(
      session,
      'Изменена команда',
      'command',
      rowId,
      fields.command,
    )
    return row
  })

export const deleteCommand = createServerFn({ method: 'POST' })
  .validator(z.object({ id }))
  .handler(async ({ data }) => {
    const session = await requirePermission('catalog.manage')
    const [row] = await db
      .delete(gameCommands)
      .where(eq(gameCommands.id, data.id))
      .returning({ command: gameCommands.command })
    await logAction(
      session,
      'Удалена команда',
      'command',
      data.id,
      row?.command,
    )
    return { ok: true }
  })

// ── Roleplays (отыгровки) and RP scenarios ────────────────

export const listRoleplays = createServerFn({ method: 'GET' })
  .validator(
    z
      .object({
        kind: z.enum(['action', 'scenario']).nullable().default(null),
        all: z.boolean().default(false),
      })
      .optional(),
  )
  .handler(async ({ data }) => {
    const rows = await db
      .select(rpColumns)
      .from(roleplays)
      .leftJoin(organizations, eq(organizations.id, roleplays.organizationId))
      .where(
        and(
          data?.kind ? eq(roleplays.kind, data.kind) : undefined,
          data?.all ? undefined : serverScope(roleplays.serverId),
        ),
      )
      .orderBy(asc(roleplays.category), asc(roleplays.title))
    const session = await currentSession()
    const saved = session?.userId
      ? (
          await db
            .select({ id: savedRoleplays.roleplayId })
            .from(savedRoleplays)
            .where(eq(savedRoleplays.userId, session.userId))
        ).map((r) => r.id)
      : []
    return { items: rows.map(toRoleplay), saved }
  })

export const saveRoleplay = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      id: id.nullable(),
      kind: z.enum(['action', 'scenario']),
      title: z.string().trim().min(2, 'Введите название').max(150),
      category: z.string().trim().max(60).default(''),
      content: z.string().trim().min(5, 'Добавьте текст').max(20000),
      organizationId: id.nullable().default(null),
      serverId,
    }),
  )
  .handler(async ({ data }) => {
    const session = await requirePermission('catalog.manage')
    if (!(await serverExists(data.serverId)))
      throw new Error('Сервер не найден')
    const { id: rowId, ...fields } = data
    const label = fields.kind === 'action' ? 'отыгровка' : 'RP-сценарий'
    if (rowId === null) {
      const [row] = await db
        .insert(roleplays)
        .values({ ...fields, createdBy: session.label })
        .returning({ id: roleplays.id })
      await logAction(
        session,
        `Добавлена ${label}`,
        'roleplay',
        row.id,
        fields.title,
      )
      return row
    }
    const [row] = await db
      .update(roleplays)
      .set({ ...fields, updatedAt: new Date() })
      .where(eq(roleplays.id, rowId))
      .returning({ id: roleplays.id })
    if (!row) throw new Error('Запись не найдена')
    await logAction(
      session,
      `Изменена ${label}`,
      'roleplay',
      rowId,
      fields.title,
    )
    return row
  })

export const deleteRoleplay = createServerFn({ method: 'POST' })
  .validator(z.object({ id }))
  .handler(async ({ data }) => {
    const session = await requirePermission('catalog.manage')
    const [row] = await db
      .delete(roleplays)
      .where(eq(roleplays.id, data.id))
      .returning({ title: roleplays.title })
    await logAction(
      session,
      'Удалена отыгровка',
      'roleplay',
      data.id,
      row?.title,
    )
    return { ok: true }
  })

/** Save / unsave an отыгровка or scenario in the player's cabinet. */
export const toggleSavedRoleplay = createServerFn({ method: 'POST' })
  .validator(z.object({ id }))
  .handler(async ({ data }) => {
    const session = await requireUser()
    const where = and(
      eq(savedRoleplays.userId, session.userId),
      eq(savedRoleplays.roleplayId, data.id),
    )
    const [existing] = await db.select().from(savedRoleplays).where(where)
    if (existing) {
      await db.delete(savedRoleplays).where(where)
      await logAction(
        session,
        'Отыгровка убрана из сохранённых',
        'roleplay',
        data.id,
      )
      return { saved: false }
    }
    const [rp] = await db
      .select({ title: roleplays.title })
      .from(roleplays)
      .where(eq(roleplays.id, data.id))
    if (!rp) throw new Error('Запись не найдена')
    await db
      .insert(savedRoleplays)
      .values({ userId: session.userId, roleplayId: data.id })
      .onConflictDoNothing()
    await logAction(
      session,
      'Отыгровка сохранена',
      'roleplay',
      data.id,
      rp.title,
    )
    return { saved: true }
  })
