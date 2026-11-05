import { createServerFn } from '@tanstack/react-start'
import { getCookie, setCookie } from '@tanstack/react-start/server'
import { z } from 'zod'
import {
  and,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  isNotNull,
  ne,
  or,
  sql,
} from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import { db } from '../../db/index.js'
import {
  activityLog,
  cars,
  comments,
  dailyVisitors,
  eventPrizes,
  eventTables,
  gameCommands,
  gameServers,
  ideas,
  nodes,
  organizations,
  pageViews,
  reports,
  roleplays,
  settings,
  users,
} from '../../db/schema.js'
import {
  dropAllSessions,
  logAction,
  randomToken,
  requirePermission,
  sha256,
  type Session,
} from '@/server/auth'
import { getAllSettings } from '@/server/settings'
import { ASSIGNABLE_ROLES, ROLE_RANK, asRole, can } from './permissions'
import type { IdeaStatus } from './types'

const id = z.number().int().positive()
const count = sql<number>`count(*)::int`

const like = (q: string) => `%${q.replace(/[%_\\]/g, (c) => '\\' + c)}%`

const moscowDay = (offsetDays = 0) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Moscow' }).format(
    new Date(Date.now() - offsetDays * 86400_000),
  )

// ── Visit statistics ──────────────────────────────────────

/** Counts a page view. Anonymous: only a hash of a random cookie is kept. */
export const trackVisit = createServerFn({ method: 'POST' })
  .validator(z.object({ path: z.string().max(300) }))
  .handler(async ({ data }) => {
    const path = data.path.split('?')[0].slice(0, 200) || '/'
    if (path.startsWith('/admin')) return { ok: true }
    // Group dynamic pages so the table stays small.
    const group = path
      .replace(/^\/n\/\d+$/, '/n/:id')
      .replace(/^\/u\/[^/]+$/, '/u/:nickname')
    const day = moscowDay()
    let vid = getCookie('rh_vid')
    if (!vid || vid.length > 64) {
      vid = randomToken()
      setCookie('rh_vid', vid, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 365 * 86400,
      })
    }
    await db
      .insert(pageViews)
      .values({ day, path: group, views: 1 })
      .onConflictDoUpdate({
        target: [pageViews.day, pageViews.path],
        set: { views: sql`${pageViews.views} + 1` },
      })
    await db
      .insert(dailyVisitors)
      .values({ day, visitorHash: sha256(vid) })
      .onConflictDoNothing()
    return { ok: true }
  })

// ── Overview ──────────────────────────────────────────────

export const getAdminOverview = createServerFn({ method: 'GET' }).handler(
  async () => {
    const session = await requirePermission('publications.review')
    const since = moscowDay(13)
    const weekAgo = new Date(Date.now() - 7 * 86400_000)
    const [counts] = await db
      .select({
        users: sql<number>`(select count(*)::int from ${users})`,
        newUsers: sql<number>`(select count(*)::int from ${users} where ${users.createdAt} >= ${weekAgo})`,
        banned: sql<number>`(select count(*)::int from ${users} where ${users.bannedAt} is not null)`,
        topics: sql<number>`(select count(*)::int from ${nodes} where ${nodes.kind} = 'topic')`,
        sections: sql<number>`(select count(*)::int from ${nodes} where ${nodes.kind} = 'section')`,
        ideasApproved: sql<number>`(select count(*)::int from ${ideas} where ${ideas.status} = 'approved')`,
        ideasPending: sql<number>`(select count(*)::int from ${ideas} where ${ideas.status} = 'pending')`,
        ideasTotal: sql<number>`(select count(*)::int from ${ideas})`,
        comments: sql<number>`(select count(*)::int from ${comments})`,
        reportsOpen: sql<number>`(select count(*)::int from ${reports} where ${reports.status} = 'open')`,
        cars: sql<number>`(select count(*)::int from ${cars})`,
        orgs: sql<number>`(select count(*)::int from ${organizations})`,
        commands: sql<number>`(select count(*)::int from ${gameCommands})`,
        roleplays: sql<number>`(select count(*)::int from ${roleplays})`,
        events: sql<number>`(select count(*)::int from ${eventTables})`,
        prizes: sql<number>`(select count(*)::int from ${eventPrizes})`,
        servers: sql<number>`(select count(*)::int from ${gameServers})`,
      })
      .from(sql`(select 1) as one`)

    const [views, visitors, topPaths] = await Promise.all([
      db
        .select({
          day: pageViews.day,
          views: sql<number>`sum(${pageViews.views})::int`,
        })
        .from(pageViews)
        .where(gte(pageViews.day, since))
        .groupBy(pageViews.day),
      db
        .select({ day: dailyVisitors.day, visitors: count })
        .from(dailyVisitors)
        .where(gte(dailyVisitors.day, since))
        .groupBy(dailyVisitors.day),
      db
        .select({
          path: pageViews.path,
          views: sql<number>`sum(${pageViews.views})::int`,
        })
        .from(pageViews)
        .where(gte(pageViews.day, moscowDay(6)))
        .groupBy(pageViews.path)
        .orderBy(desc(sql`sum(${pageViews.views})`))
        .limit(8),
    ])
    const days = Array.from({ length: 14 }, (_, i) => {
      const day = moscowDay(13 - i)
      return {
        day,
        views: views.find((v) => v.day === day)?.views ?? 0,
        visitors: visitors.find((v) => v.day === day)?.visitors ?? 0,
      }
    })

    const recent = can(session.role, 'users.manage')
      ? (
          await db
            .select()
            .from(activityLog)
            .orderBy(desc(activityLog.createdAt))
            .limit(15)
        ).map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }))
      : []

    return { counts, days, topPaths, recent }
  },
)

// ── Users ─────────────────────────────────────────────────

export const adminListUsers = createServerFn({ method: 'GET' })
  .validator(
    z.object({
      q: z.string().trim().max(60).default(''),
      filter: z.enum(['all', 'staff', 'banned']).default('all'),
    }),
  )
  .handler(async ({ data }) => {
    await requirePermission('users.manage')
    const rows = await db
      .select({
        id: users.id,
        nickname: users.nickname,
        role: users.role,
        faction: users.faction,
        server: gameServers.name,
        createdAt: users.createdAt,
        lastSeenAt: users.lastSeenAt,
        bannedAt: users.bannedAt,
        banReason: users.banReason,
        ideas: sql<number>`(select count(*)::int from ${ideas} where ${ideas.userId} = ${users.id})`,
        comments: sql<number>`(select count(*)::int from ${comments} where ${comments.userId} = ${users.id})`,
      })
      .from(users)
      .leftJoin(gameServers, eq(gameServers.id, users.serverId))
      .where(
        and(
          data.q ? ilike(users.nickname, like(data.q)) : undefined,
          data.filter === 'staff' ? ne(users.role, 'user') : undefined,
          data.filter === 'banned' ? isNotNull(users.bannedAt) : undefined,
        ),
      )
      .orderBy(desc(users.createdAt))
      .limit(200)
    return rows.map((r) => ({
      ...r,
      role: asRole(r.role),
      createdAt: r.createdAt.toISOString(),
      lastSeenAt: r.lastSeenAt?.toISOString() ?? null,
      bannedAt: r.bannedAt?.toISOString() ?? null,
    }))
  })

/** Staff can only act on accounts with a lower role than their own. */
async function loadTarget(session: Session, userId: number) {
  const [target] = await db
    .select({ id: users.id, nickname: users.nickname, role: users.role })
    .from(users)
    .where(eq(users.id, userId))
  if (!target) throw new Error('Пользователь не найден')
  if (target.id === session.userId)
    throw new Error('Нельзя применить это действие к своему аккаунту')
  if (ROLE_RANK[asRole(target.role)] >= ROLE_RANK[session.role])
    throw new Error(
      'Нельзя управлять пользователем с такой же или более высокой ролью',
    )
  return target
}

export const setUserBan = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      id,
      banned: z.boolean(),
      reason: z.string().trim().max(300).default(''),
    }),
  )
  .handler(async ({ data }) => {
    const session = await requirePermission('users.manage')
    const target = await loadTarget(session, data.id)
    await db
      .update(users)
      .set({
        bannedAt: data.banned ? new Date() : null,
        banReason: data.banned ? data.reason : '',
      })
      .where(eq(users.id, target.id))
    if (data.banned) await dropAllSessions(target.id)
    await logAction(
      session,
      data.banned ? 'Пользователь заблокирован' : 'Пользователь разблокирован',
      'user',
      target.id,
      `${target.nickname}${data.reason ? ` — ${data.reason}` : ''}`,
    )
    return { ok: true }
  })

export const setUserRole = createServerFn({ method: 'POST' })
  .validator(z.object({ id, role: z.enum(ASSIGNABLE_ROLES) }))
  .handler(async ({ data }) => {
    const session = await requirePermission('roles.manage')
    const target = await loadTarget(session, data.id)
    await db
      .update(users)
      .set({ role: data.role })
      .where(eq(users.id, target.id))
    await logAction(
      session,
      'Изменена роль',
      'user',
      target.id,
      `${target.nickname}: ${target.role} → ${data.role}`,
    )
    return { ok: true }
  })

export const adminDeleteUser = createServerFn({ method: 'POST' })
  .validator(z.object({ id }))
  .handler(async ({ data }) => {
    const session = await requirePermission('users.manage')
    const target = await loadTarget(session, data.id)
    await logAction(
      session,
      'Пользователь удалён',
      'user',
      target.id,
      target.nickname,
    )
    await dropAllSessions(target.id)
    await db.delete(users).where(eq(users.id, target.id))
    return { ok: true }
  })

// ── Materials (articles / sections) ───────────────────────

const parent = alias(nodes, 'parent')

export const adminListNodes = createServerFn({ method: 'GET' })
  .validator(
    z.object({
      q: z.string().trim().max(100).default(''),
      kind: z.enum(['all', 'section', 'topic']).default('all'),
    }),
  )
  .handler(async ({ data }) => {
    await requirePermission('content.moderate')
    const rows = await db
      .select({
        id: nodes.id,
        kind: nodes.kind,
        title: nodes.title,
        icon: nodes.icon,
        parentTitle: parent.title,
        server: gameServers.name,
        createdBy: nodes.createdBy,
        updatedAt: nodes.updatedAt,
        children: sql<number>`(select count(*)::int from "nodes" c where c.parent_id = ${nodes.id})`,
      })
      .from(nodes)
      .leftJoin(parent, eq(parent.id, nodes.parentId))
      .leftJoin(gameServers, eq(gameServers.id, nodes.serverId))
      .where(
        and(
          data.q
            ? or(
                ilike(nodes.title, like(data.q)),
                ilike(nodes.content, like(data.q)),
              )
            : undefined,
          data.kind === 'all' ? undefined : eq(nodes.kind, data.kind),
        ),
      )
      .orderBy(desc(nodes.updatedAt))
      .limit(200)
    return rows.map((r) => ({
      ...r,
      kind: r.kind as 'section' | 'topic',
      updatedAt: r.updatedAt.toISOString(),
    }))
  })

// ── Community publications ────────────────────────────────

export const adminListPublications = createServerFn({ method: 'GET' })
  .validator(
    z.object({
      q: z.string().trim().max(100).default(''),
      status: z.enum(['all', 'pending', 'approved', 'rejected']).default('all'),
    }),
  )
  .handler(async ({ data }) => {
    await requirePermission('publications.review')
    const [ideaRows, commentRows] = await Promise.all([
      db
        .select({
          id: ideas.id,
          title: ideas.title,
          status: ideas.status,
          author: users.nickname,
          nodeId: ideas.nodeId,
          reviewedBy: ideas.reviewedBy,
          createdAt: ideas.createdAt,
        })
        .from(ideas)
        .innerJoin(users, eq(users.id, ideas.userId))
        .where(
          and(
            data.status === 'all' ? undefined : eq(ideas.status, data.status),
            data.q
              ? or(
                  ilike(ideas.title, like(data.q)),
                  ilike(users.nickname, like(data.q)),
                )
              : undefined,
          ),
        )
        .orderBy(desc(ideas.createdAt))
        .limit(150),
      db
        .select({
          id: comments.id,
          text: comments.text,
          authorName: comments.authorName,
          nodeId: comments.nodeId,
          nodeTitle: nodes.title,
          createdAt: comments.createdAt,
        })
        .from(comments)
        .innerJoin(nodes, eq(nodes.id, comments.nodeId))
        .where(
          data.q
            ? or(
                ilike(comments.text, like(data.q)),
                ilike(comments.authorName, like(data.q)),
              )
            : undefined,
        )
        .orderBy(desc(comments.createdAt))
        .limit(100),
    ])
    return {
      ideas: ideaRows.map((r) => ({
        ...r,
        status: r.status as IdeaStatus,
        createdAt: r.createdAt.toISOString(),
      })),
      comments: commentRows.map((r) => ({
        ...r,
        createdAt: r.createdAt.toISOString(),
      })),
    }
  })

export const adminDeleteIdea = createServerFn({ method: 'POST' })
  .validator(z.object({ id }))
  .handler(async ({ data }) => {
    const session = await requirePermission('content.moderate')
    const [row] = await db
      .delete(ideas)
      .where(eq(ideas.id, data.id))
      .returning({ title: ideas.title })
    await logAction(
      session,
      'Удалена идея (модерация)',
      'idea',
      data.id,
      row?.title,
    )
    return { ok: true }
  })

// ── Reports ───────────────────────────────────────────────

export const listReports = createServerFn({ method: 'GET' })
  .validator(z.object({ status: z.enum(['open', 'resolved', 'dismissed']) }))
  .handler(async ({ data }) => {
    await requirePermission('reports.handle')
    const rows = await db
      .select()
      .from(reports)
      .where(eq(reports.status, data.status))
      .orderBy(
        data.status === 'open' ? reports.createdAt : desc(reports.createdAt),
      )
      .limit(200)
    // Resolve comment → topic, so moderators can open the context.
    const commentIds = rows
      .filter((r) => r.targetType === 'comment')
      .map((r) => r.targetId)
    const commentNodes = commentIds.length
      ? await db
          .select({ id: comments.id, nodeId: comments.nodeId })
          .from(comments)
          .where(inArray(comments.id, commentIds))
      : []
    return rows.map((r) => ({
      ...r,
      contextNodeId:
        r.targetType === 'node'
          ? r.targetId
          : (commentNodes.find((c) => c.id === r.targetId)?.nodeId ?? null),
      createdAt: r.createdAt.toISOString(),
      handledAt: r.handledAt?.toISOString() ?? null,
    }))
  })

export const handleReport = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      id,
      action: z.enum(['dismiss', 'resolve', 'remove']),
      note: z.string().trim().max(500).default(''),
    }),
  )
  .handler(async ({ data }) => {
    const session = await requirePermission('reports.handle')
    const [report] = await db
      .select()
      .from(reports)
      .where(eq(reports.id, data.id))
    if (!report) throw new Error('Жалоба не найдена')

    let note = data.note
    if (data.action === 'remove') {
      const t = report.targetType
      if (t === 'comment') {
        await db.delete(comments).where(eq(comments.id, report.targetId))
      } else if (t === 'idea') {
        await db.delete(ideas).where(eq(ideas.id, report.targetId))
      } else if (t === 'node') {
        const [n] = await db
          .select({ kind: nodes.kind })
          .from(nodes)
          .where(eq(nodes.id, report.targetId))
        if (n && n.kind === 'section' && !can(session.role, 'content.manage'))
          throw new Error('Разделы удаляет администратор')
        if (n) await db.delete(nodes).where(eq(nodes.id, report.targetId))
      } else if (t === 'user') {
        if (!can(session.role, 'users.manage'))
          throw new Error('Блокировать пользователей может администратор')
        const target = await loadTarget(session, report.targetId)
        await db
          .update(users)
          .set({ bannedAt: new Date(), banReason: data.note || report.reason })
          .where(eq(users.id, target.id))
        await dropAllSessions(target.id)
      }
      note = note || 'Материал удалён'
    }
    await db
      .update(reports)
      .set({
        status: data.action === 'dismiss' ? 'dismissed' : 'resolved',
        resolution: note,
        handledBy: session.label,
        handledAt: new Date(),
      })
      .where(eq(reports.id, data.id))
    // Close duplicate open reports about the same removed target.
    if (data.action === 'remove')
      await db
        .update(reports)
        .set({
          status: 'resolved',
          resolution: note,
          handledBy: session.label,
          handledAt: new Date(),
        })
        .where(
          and(
            eq(reports.status, 'open'),
            eq(reports.targetType, report.targetType),
            eq(reports.targetId, report.targetId),
          ),
        )
    await logAction(
      session,
      data.action === 'dismiss'
        ? 'Жалоба отклонена'
        : data.action === 'remove'
          ? 'Жалоба: материал удалён'
          : 'Жалоба решена',
      'report',
      report.id,
      report.targetTitle,
    )
    return { ok: true }
  })

// ── Platform settings ─────────────────────────────────────

export const getPlatformSettings = createServerFn({ method: 'GET' }).handler(
  async () => {
    await requirePermission('settings.manage')
    return getAllSettings()
  },
)

export const savePlatformSettings = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      registrationOpen: z.boolean(),
      commentsEnabled: z.boolean(),
      ideasEnabled: z.boolean(),
      reportsEnabled: z.boolean(),
      announcement: z.string().trim().max(300),
      siteMode: z.enum(['online', 'maintenance', 'disabled']),
      siteModeMessage: z.string().trim().max(500),
    }),
  )
  .handler(async ({ data }) => {
    const session = await requirePermission('settings.manage')
    for (const [key, value] of Object.entries(data))
      await db
        .insert(settings)
        .values({ key, value })
        .onConflictDoUpdate({
          target: settings.key,
          set: { value, updatedAt: new Date() },
        })
    await logAction(session, 'Изменены настройки платформы', 'settings')
    return { ok: true }
  })

// ── Audit log ─────────────────────────────────────────────

const PAGE = 50

export const getAuditLog = createServerFn({ method: 'GET' })
  .validator(
    z.object({
      q: z.string().trim().max(100).default(''),
      actor: z.enum(['all', 'team', 'players']).default('all'),
      page: z.number().int().min(1).max(1000).default(1),
    }),
  )
  .handler(async ({ data }) => {
    await requirePermission('audit.view')
    const where = and(
      data.q
        ? or(
            ilike(activityLog.action, like(data.q)),
            ilike(activityLog.summary, like(data.q)),
            ilike(activityLog.actorLabel, like(data.q)),
          )
        : undefined,
      data.actor === 'team'
        ? sql`${activityLog.actorRole} in ('moderator','admin','owner')`
        : data.actor === 'players'
          ? eq(activityLog.actorRole, 'user')
          : undefined,
    )
    const [rows, [{ total }]] = await Promise.all([
      db
        .select()
        .from(activityLog)
        .where(where)
        .orderBy(desc(activityLog.createdAt), desc(activityLog.id))
        .limit(PAGE)
        .offset((data.page - 1) * PAGE),
      db.select({ total: count }).from(activityLog).where(where),
    ])
    return {
      rows: rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })),
      total,
      pages: Math.max(1, Math.ceil(total / PAGE)),
    }
  })
