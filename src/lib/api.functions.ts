import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { and, asc, desc, eq, ilike, isNull, or, sql } from 'drizzle-orm'
import { db } from '../../db/index.js'
import {
  eventPrizes,
  gameServers,
  ideas,
  moderators,
  nodes,
  reports,
  users,
} from '../../db/schema.js'
import {
  currentSession,
  logAction,
  loginModerator,
  loginOwner,
  loginUser,
  logout,
  registerUser,
  randomToken,
  requirePermission,
  sha256,
} from '@/server/auth'
import { listNews } from '@/server/news'
import { listQuickLinks } from '@/server/quick-links'
import { getAllSettings } from '@/server/settings'
import {
  listServers,
  rememberServer,
  selectedServerId,
  serverExists,
  serverScope,
} from '@/server/servers'
import { can } from './permissions'
import { siteModeOf } from './settings'
import { passwordProblem } from './password'
import type {
  NodeFull,
  NodeItem,
  NodeKind,
  NavSection,
  SessionInfo,
} from './types'

const childCount = sql<number>`(select count(*)::int from "nodes" c where c.parent_id = "nodes"."id")`

const itemColumns = {
  id: nodes.id,
  parentId: nodes.parentId,
  kind: nodes.kind,
  title: nodes.title,
  summary: nodes.summary,
  icon: nodes.icon,
  sortOrder: nodes.sortOrder,
  serverId: nodes.serverId,
  childCount,
}

type ItemRow = Omit<NodeItem, 'kind'> & { kind: string }
const toItem = (r: ItemRow): NodeItem => ({ ...r, kind: r.kind as NodeKind })

async function listChildren(parentId: number | null) {
  const rows = await db
    .select(itemColumns)
    .from(nodes)
    .where(
      and(
        parentId === null
          ? isNull(nodes.parentId)
          : eq(nodes.parentId, parentId),
        serverScope(nodes.serverId),
      ),
    )
    .orderBy(asc(nodes.sortOrder), asc(nodes.id))
  return rows.map(toItem)
}

async function findNode(id: number) {
  const [row] = await db.select().from(nodes).where(eq(nodes.id, id)).limit(1)
  return row ?? null
}

// ── Session ────────────────────────────────────────────────

export const getSession = createServerFn({ method: 'GET' }).handler(
  async (): Promise<SessionInfo> => {
    const s = await currentSession()
    return s ? { role: s.role, label: s.label, userId: s.userId } : null
  },
)

/**
 * Everything the layout needs on each page: session, menu, servers,
 * announcement and team counters — in one request.
 */
export const getBootstrap = createServerFn({ method: 'GET' }).handler(
  async () => {
    const s = await currentSession()
    const session: SessionInfo = s
      ? { role: s.role, label: s.label, userId: s.userId }
      : null
    const [servers, settings] = await Promise.all([
      listServers(),
      getAllSettings(),
    ])
    let serverId = selectedServerId()
    if (serverId !== null && !servers.some((sv) => sv.id === serverId))
      serverId = null
    const navSections = await db
      .select({ id: nodes.id, title: nodes.title, icon: nodes.icon })
      .from(nodes)
      .where(and(isNull(nodes.parentId), serverScope(nodes.serverId)))
      .orderBy(asc(nodes.sortOrder), asc(nodes.id))
    let pendingIdeas = 0
    let openReports = 0
    if (can(s?.role, 'publications.review')) {
      const [counts] = await db
        .select({
          ideas: sql<number>`(select count(*)::int from ${ideas} where ${ideas.status} = 'pending')`,
          reports: sql<number>`(select count(*)::int from ${reports} where ${reports.status} = 'open')`,
        })
        .from(sql`(select 1) as one`)
      pendingIdeas = counts.ideas
      openReports = counts.reports
    }
    // Site stub: tech works let the team in, a disabled site — only the owner.
    const siteMode = siteModeOf(settings)
    const siteLocked =
      (siteMode === 'maintenance' && !can(s?.role, 'publications.review')) ||
      (siteMode === 'disabled' && s?.role !== 'owner')
    return {
      session,
      navSections,
      servers,
      serverId,
      siteMode,
      siteLocked,
      announcement: settings.announcement,
      settings,
      pendingIdeas,
      openReports,
    }
  },
)

export const signIn = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      mode: z.enum(['owner', 'moderator']),
      secret: z.string().min(1).max(200),
    }),
  )
  .handler(async ({ data }) => {
    if (data.mode === 'owner') await loginOwner(data.secret)
    else await loginModerator(data.secret)
    return { ok: true }
  })

const nickname = z
  .string()
  .trim()
  .min(3, 'Ник — минимум 3 символа')
  .max(32, 'Ник — максимум 32 символа')
  .regex(
    /^[A-Za-zА-Яа-яЁё0-9_]+$/,
    'Ник: только буквы, цифры и _ (например, Ivan_Petrov)',
  )

export const playerAuth = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      mode: z.enum(['login', 'register']),
      nickname,
      password: z.string().min(6, 'Пароль — минимум 6 символов').max(200),
      serverId: z.number().int().positive().nullable().default(null),
      /** Honeypot: real people leave it empty. */
      website: z.string().max(200).default(''),
    }),
  )
  .handler(async ({ data }) => {
    if (data.website) throw new Error('Не удалось выполнить запрос')
    if (data.mode === 'register') {
      const problem = passwordProblem(data.password, data.nickname)
      if (problem) throw new Error(problem)
      if (!(await serverExists(data.serverId)))
        throw new Error('Сервер не найден')
      await registerUser(data.nickname, data.password, data.serverId)
      if (data.serverId) rememberServer(data.serverId)
    } else {
      await loginUser(data.nickname, data.password)
      const [u] = await db
        .select({ serverId: users.serverId })
        .from(users)
        .where(sql`lower(${users.nickname}) = lower(${data.nickname})`)
        .limit(1)
      if (u?.serverId) rememberServer(u.serverId)
    }
    return { ok: true }
  })

export const signOut = createServerFn({ method: 'POST' }).handler(async () => {
  const session = await currentSession()
  if (session) await logAction(session, 'Выход')
  await logout()
  return { ok: true }
})

// ── Reading ────────────────────────────────────────────────

export const getHome = createServerFn({ method: 'GET' }).handler(async () => {
  const sections = await listChildren(null)
  const [{ topics }] = await db
    .select({ topics: sql<number>`count(*)::int` })
    .from(nodes)
    .where(and(eq(nodes.kind, 'topic'), serverScope(nodes.serverId)))
  const recent = await db
    .select(itemColumns)
    .from(nodes)
    .where(and(eq(nodes.kind, 'topic'), serverScope(nodes.serverId)))
    .orderBy(desc(nodes.createdAt), desc(nodes.id))
    .limit(6)
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Moscow',
  }).format(new Date())
  // Nearest upcoming prize without a winner, for the home banner.
  const [nextPrize] = await db
    .select({
      id: eventPrizes.id,
      title: eventPrizes.title,
      reward: eventPrizes.reward,
      eventDate: eventPrizes.eventDate,
    })
    .from(eventPrizes)
    .where(
      and(
        eq(eventPrizes.winner, ''),
        sql`${eventPrizes.eventDate} >= ${today}::date`,
        serverScope(eventPrizes.serverId),
      ),
    )
    .orderBy(asc(eventPrizes.eventDate))
    .limit(1)
  return {
    sections,
    topicCount: topics,
    recent: recent.map(toItem),
    nextPrize: nextPrize ?? null,
    today,
    quickLinks: await listQuickLinks(),
    news: await listNews(),
  }
})

/** Top-level sections for the header menu. */
export const getNavSections = createServerFn({ method: 'GET' }).handler(
  async (): Promise<NavSection[]> =>
    db
      .select({ id: nodes.id, title: nodes.title, icon: nodes.icon })
      .from(nodes)
      .where(and(isNull(nodes.parentId), serverScope(nodes.serverId)))
      .orderBy(asc(nodes.sortOrder), asc(nodes.id)),
)

/** A random topic with text — for the «Случайная идея» button. */
export const getRandomTopic = createServerFn({ method: 'GET' }).handler(
  async () => {
    const [row] = await db
      .select({ id: nodes.id })
      .from(nodes)
      .where(
        and(
          eq(nodes.kind, 'topic'),
          sql`length(${nodes.content}) > 0`,
          serverScope(nodes.serverId),
        ),
      )
      .orderBy(sql`random()`)
      .limit(1)
    return row ?? null
  },
)

export const getNode = createServerFn({ method: 'GET' })
  .validator(z.object({ id: z.number().int().positive() }))
  .handler(async ({ data }) => {
    const row = await findNode(data.id)
    if (!row) return null
    const children = await listChildren(row.id)

    const crumbs: { id: number; title: string }[] = []
    let parentId = row.parentId
    for (let i = 0; parentId !== null && i < 20; i++) {
      const p = await findNode(parentId)
      if (!p) break
      crumbs.unshift({ id: p.id, title: p.title })
      parentId = p.parentId
    }

    const node: NodeFull = {
      id: row.id,
      parentId: row.parentId,
      kind: row.kind as NodeKind,
      title: row.title,
      summary: row.summary,
      icon: row.icon,
      sortOrder: row.sortOrder,
      childCount: children.length,
      serverId: row.serverId,
      content: row.content,
      createdBy: row.createdBy,
      updatedAt: row.updatedAt.toISOString(),
    }
    let serverName: string | null = null
    if (row.serverId !== null) {
      const [sv] = await db
        .select({ name: gameServers.name })
        .from(gameServers)
        .where(eq(gameServers.id, row.serverId))
        .limit(1)
      serverName = sv?.name ?? null
    }
    return { node, children, crumbs, serverName }
  })

export const searchNodes = createServerFn({ method: 'GET' })
  .validator(z.object({ q: z.string().trim().min(2).max(100) }))
  .handler(async ({ data }) => {
    const pattern = `%${data.q.replace(/[%_\\]/g, (c) => '\\' + c)}%`
    const rows = await db
      .select(itemColumns)
      .from(nodes)
      .where(
        and(
          or(
            ilike(nodes.title, pattern),
            ilike(nodes.summary, pattern),
            ilike(nodes.content, pattern),
          ),
          serverScope(nodes.serverId),
        ),
      )
      .orderBy(asc(nodes.kind), asc(nodes.title))
      .limit(30)
    return rows.map(toItem)
  })

/** All sections, for the "move to" picker in owner mode. */
export const getSectionTree = createServerFn({ method: 'GET' }).handler(
  async () => {
    await requirePermission('content.manage')
    return db
      .select({
        id: nodes.id,
        parentId: nodes.parentId,
        title: nodes.title,
        kind: nodes.kind,
      })
      .from(nodes)
      .orderBy(asc(nodes.sortOrder), asc(nodes.id))
  },
)

// ── Writing ────────────────────────────────────────────────

const nodeFields = z.object({
  kind: z.enum(['section', 'topic']),
  title: z.string().trim().min(1, 'Введите название').max(150),
  summary: z.string().trim().max(300).default(''),
  content: z.string().max(20000).default(''),
  icon: z.string().trim().max(40).default(''),
  serverId: z.number().int().positive().nullable().default(null),
})

export const createNode = createServerFn({ method: 'POST' })
  .validator(
    nodeFields.extend({ parentId: z.number().int().positive().nullable() }),
  )
  .handler(async ({ data }) => {
    const session = await requirePermission('content.manage')
    if (!(await serverExists(data.serverId)))
      throw new Error('Сервер не найден')
    if (data.parentId !== null && !(await findNode(data.parentId)))
      throw new Error('Родительский раздел не найден')

    const [{ next }] = await db
      .select({
        next: sql<number>`coalesce(max(${nodes.sortOrder}) + 1, 0)::int`,
      })
      .from(nodes)
      .where(
        data.parentId === null
          ? isNull(nodes.parentId)
          : eq(nodes.parentId, data.parentId),
      )

    const [row] = await db
      .insert(nodes)
      .values({ ...data, sortOrder: next, createdBy: session.label })
      .returning({ id: nodes.id })
    await logAction(
      session,
      data.kind === 'section' ? 'Создан раздел' : 'Создана тема',
      'node',
      row.id,
      data.title,
    )
    return row
  })

export const updateNode = createServerFn({ method: 'POST' })
  .validator(nodeFields.extend({ id: z.number().int().positive() }))
  .handler(async ({ data }) => {
    const session = await requirePermission('content.manage')
    if (!(await serverExists(data.serverId)))
      throw new Error('Сервер не найден')
    const { id, ...fields } = data
    await db
      .update(nodes)
      .set({ ...fields, updatedAt: new Date() })
      .where(eq(nodes.id, id))
    await logAction(session, 'Изменён материал', 'node', id, data.title)
    return { ok: true }
  })

export const deleteNode = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.number().int().positive() }))
  .handler(async ({ data }) => {
    const session = await requirePermission('content.moderate')
    const row = await findNode(data.id)
    if (!row) throw new Error('Запись не найдена')
    if (!can(session.role, 'content.manage')) {
      if (row.kind !== 'topic')
        throw new Error('Модератор не может удалять разделы')
      const [{ sections }] = await db
        .select({ sections: sql<number>`count(*)::int` })
        .from(nodes)
        .where(and(eq(nodes.parentId, row.id), eq(nodes.kind, 'section')))
      if (sections > 0)
        throw new Error(
          'Внутри темы есть разделы — удалить может только администратор',
        )
    }
    await db.delete(nodes).where(eq(nodes.id, row.id))
    await logAction(
      session,
      row.kind === 'section' ? 'Удалён раздел' : 'Удалена тема',
      'node',
      row.id,
      row.title,
    )
    return { parentId: row.parentId }
  })

export const moveNode = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      id: z.number().int().positive(),
      direction: z.enum(['up', 'down']),
    }),
  )
  .handler(async ({ data }) => {
    await requirePermission('content.manage')
    const row = await findNode(data.id)
    if (!row) throw new Error('Запись не найдена')
    const siblings = await listChildren(row.parentId)
    const index = siblings.findIndex((s) => s.id === row.id)
    const swapWith = siblings[data.direction === 'up' ? index - 1 : index + 1]
    if (!swapWith) return { ok: true }
    // Normalise order, then swap the two neighbours.
    const order = siblings.map((s) => s.id)
    order[index] = swapWith.id
    order[siblings.indexOf(swapWith)] = row.id
    for (const [i, id] of order.entries()) {
      await db.update(nodes).set({ sortOrder: i }).where(eq(nodes.id, id))
    }
    return { ok: true }
  })

export const reparentNode = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      id: z.number().int().positive(),
      parentId: z.number().int().positive().nullable(),
    }),
  )
  .handler(async ({ data }) => {
    const session = await requirePermission('content.manage')
    // Prevent moving a node into itself or its own descendants.
    let cursor = data.parentId
    for (let i = 0; cursor !== null && i < 50; i++) {
      if (cursor === data.id)
        throw new Error('Нельзя переместить раздел внутрь самого себя')
      cursor = (await findNode(cursor))?.parentId ?? null
    }
    await db
      .update(nodes)
      .set({ parentId: data.parentId, sortOrder: 9999, updatedAt: new Date() })
      .where(eq(nodes.id, data.id))
    await logAction(session, 'Материал перемещён', 'node', data.id)
    return { ok: true }
  })

// ── Access keys for the team (owner only) ─────────────────

export const listModerators = createServerFn({ method: 'GET' }).handler(
  async () => {
    await requirePermission('roles.manage')
    const rows = await db
      .select({
        id: moderators.id,
        name: moderators.name,
        role: moderators.role,
        createdAt: moderators.createdAt,
      })
      .from(moderators)
      .orderBy(asc(moderators.id))
    return rows.map((r) => ({
      ...r,
      role: r.role === 'admin' ? ('admin' as const) : ('moderator' as const),
      createdAt: r.createdAt.toISOString(),
    }))
  },
)

const keyRole = z.enum(['moderator', 'admin'])

export const addModerator = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      name: z.string().trim().min(1, 'Введите ник').max(60),
      role: keyRole.default('moderator'),
    }),
  )
  .handler(async ({ data }) => {
    const session = await requirePermission('roles.manage')
    const key = randomToken(data.role === 'admin' ? 'adm_' : 'mod_')
    const [row] = await db
      .insert(moderators)
      .values({ name: data.name, role: data.role, keyHash: sha256(key) })
      .returning({ id: moderators.id })
    await logAction(
      session,
      'Выдан ключ доступа',
      'key',
      row.id,
      `${data.name} — ${data.role === 'admin' ? 'администратор' : 'модератор'}`,
    )
    // The key is shown once to the owner and never stored in plain text.
    return { key }
  })

export const setModeratorRole = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.number().int().positive(), role: keyRole }))
  .handler(async ({ data }) => {
    const session = await requirePermission('roles.manage')
    const [row] = await db
      .update(moderators)
      .set({ role: data.role })
      .where(eq(moderators.id, data.id))
      .returning({ name: moderators.name })
    if (!row) throw new Error('Ключ не найден')
    await logAction(
      session,
      'Изменена роль ключа',
      'key',
      data.id,
      `${row.name} → ${data.role === 'admin' ? 'администратор' : 'модератор'}`,
    )
    return { ok: true }
  })

export const removeModerator = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.number().int().positive() }))
  .handler(async ({ data }) => {
    const session = await requirePermission('roles.manage')
    const [row] = await db
      .delete(moderators)
      .where(eq(moderators.id, data.id))
      .returning({ name: moderators.name })
    await logAction(session, 'Отозван ключ доступа', 'key', data.id, row?.name)
    return { ok: true }
  })
