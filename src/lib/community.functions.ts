import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { and, asc, desc, eq, gt, inArray, isNull, sql } from 'drizzle-orm'
import { db } from '../../db/index.js'
import {
  comments,
  favorites,
  gameServers,
  ideas,
  nodes,
  ratings,
  users,
} from '../../db/schema.js'
import {
  currentSession,
  logAction,
  requirePermission,
  requireUser,
} from '@/server/auth'
import { getSetting } from '@/server/settings'
import { rememberServer, serverExists } from '@/server/servers'
import { can } from './permissions'
import type { CommentItem, IdeaItem, IdeaStatus, NodeItem } from './types'

const id = z.number().int().positive()

const toComment = (r: typeof comments.$inferSelect): CommentItem => ({
  id: r.id,
  text: r.text,
  authorName: r.authorName,
  authorRole: r.authorRole,
  userId: r.userId,
  createdAt: r.createdAt.toISOString(),
})

// ── Comments, ratings, favorites on a node ────────────────

export const getNodeCommunity = createServerFn({ method: 'GET' })
  .validator(z.object({ nodeId: id }))
  .handler(async ({ data }) => {
    const session = await currentSession()
    const userId = session?.userId ?? null

    const [list, [stats], mine, fav] = await Promise.all([
      db
        .select()
        .from(comments)
        .where(eq(comments.nodeId, data.nodeId))
        .orderBy(asc(comments.createdAt))
        .limit(300),
      db
        .select({
          avg: sql<number>`coalesce(avg(${ratings.value}), 0)::float`,
          count: sql<number>`count(*)::int`,
        })
        .from(ratings)
        .where(eq(ratings.nodeId, data.nodeId)),
      userId
        ? db
            .select({ value: ratings.value })
            .from(ratings)
            .where(
              and(eq(ratings.nodeId, data.nodeId), eq(ratings.userId, userId)),
            )
        : Promise.resolve([]),
      userId
        ? db
            .select({ nodeId: favorites.nodeId })
            .from(favorites)
            .where(
              and(
                eq(favorites.nodeId, data.nodeId),
                eq(favorites.userId, userId),
              ),
            )
        : Promise.resolve([]),
    ])

    return {
      comments: list.map(toComment),
      rating: {
        avg: Math.round(stats.avg * 10) / 10,
        count: stats.count,
        mine: mine[0]?.value ?? 0,
      },
      isFavorite: fav.length > 0,
    }
  })

export const addComment = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      nodeId: id,
      text: z
        .string()
        .trim()
        .min(2, 'Комментарий слишком короткий')
        .max(2000, 'Максимум 2000 символов'),
    }),
  )
  .handler(async ({ data }) => {
    const session = await currentSession()
    if (!session) throw new Error('Войдите, чтобы оставить комментарий')
    if (!(await getSetting('commentsEnabled')) && session.role === 'user')
      throw new Error('Комментарии временно отключены')
    const [node] = await db
      .select({ id: nodes.id, title: nodes.title })
      .from(nodes)
      .where(eq(nodes.id, data.nodeId))
      .limit(1)
    if (!node) throw new Error('Тема не найдена')

    if (session.role === 'user' && session.userId !== null) {
      // Simple flood protection: one comment per 20 seconds.
      const [recent] = await db
        .select({ id: comments.id })
        .from(comments)
        .where(
          and(
            eq(comments.userId, session.userId),
            gt(comments.createdAt, new Date(Date.now() - 20_000)),
          ),
        )
        .limit(1)
      if (recent) throw new Error('Не так быстро — подождите несколько секунд')
    }

    const [row] = await db
      .insert(comments)
      .values({
        nodeId: data.nodeId,
        userId: session.userId,
        authorName: session.label,
        authorRole: session.role,
        text: data.text,
      })
      .returning()
    await logAction(session, 'Комментарий', 'node', node.id, node.title)
    return toComment(row)
  })

export const deleteComment = createServerFn({ method: 'POST' })
  .validator(z.object({ id }))
  .handler(async ({ data }) => {
    const session = await currentSession()
    if (!session) throw new Error('Нужно войти в систему')
    const [row] = await db
      .select()
      .from(comments)
      .where(eq(comments.id, data.id))
      .limit(1)
    if (!row) return { ok: true }
    const own = row.userId !== null && row.userId === session.userId
    if (!own && !can(session.role, 'content.moderate'))
      throw new Error('Можно удалять только свои комментарии')
    await db.delete(comments).where(eq(comments.id, data.id))
    await logAction(
      session,
      own ? 'Удалён свой комментарий' : 'Удалён комментарий (модерация)',
      'comment',
      row.id,
      `${row.authorName}: ${row.text.slice(0, 120)}`,
    )
    return { ok: true }
  })

export const rateNode = createServerFn({ method: 'POST' })
  .validator(z.object({ nodeId: id, value: z.number().int().min(0).max(5) }))
  .handler(async ({ data }) => {
    const session = await requireUser()
    if (data.value === 0) {
      await db
        .delete(ratings)
        .where(
          and(
            eq(ratings.nodeId, data.nodeId),
            eq(ratings.userId, session.userId),
          ),
        )
    } else {
      await db
        .insert(ratings)
        .values({
          nodeId: data.nodeId,
          userId: session.userId,
          value: data.value,
        })
        .onConflictDoUpdate({
          target: [ratings.nodeId, ratings.userId],
          set: { value: data.value, createdAt: new Date() },
        })
    }
    await logAction(
      session,
      data.value ? `Оценка ${data.value}/5` : 'Оценка убрана',
      'node',
      data.nodeId,
    )
    return { ok: true }
  })

// ── Favorites for players ─────────────────────────────────

export const toggleFavorite = createServerFn({ method: 'POST' })
  .validator(z.object({ nodeId: id }))
  .handler(async ({ data }) => {
    const session = await requireUser()
    const where = and(
      eq(favorites.userId, session.userId),
      eq(favorites.nodeId, data.nodeId),
    )
    const [existing] = await db.select().from(favorites).where(where).limit(1)
    if (existing) {
      await db.delete(favorites).where(where)
      await logAction(session, 'Убрано из избранного', 'node', data.nodeId)
      return { saved: false }
    }
    await db
      .insert(favorites)
      .values({ userId: session.userId, nodeId: data.nodeId })
      .onConflictDoNothing()
    await logAction(session, 'Добавлено в избранное', 'node', data.nodeId)
    return { saved: true }
  })

const favItem = {
  id: nodes.id,
  parentId: nodes.parentId,
  kind: nodes.kind,
  title: nodes.title,
  summary: nodes.summary,
  icon: nodes.icon,
  sortOrder: nodes.sortOrder,
  childCount: sql<number>`0`,
}

export const listMyFavorites = createServerFn({ method: 'GET' }).handler(
  async (): Promise<NodeItem[] | null> => {
    const session = await currentSession()
    if (!session || session.userId === null) return null
    const rows = await db
      .select(favItem)
      .from(favorites)
      .innerJoin(nodes, eq(nodes.id, favorites.nodeId))
      .where(eq(favorites.userId, session.userId))
      .orderBy(desc(favorites.createdAt))
    return rows.map((r) => ({ ...r, kind: r.kind as NodeItem['kind'] }))
  },
)

/** Moves favorites saved in the browser into the player's account. */
export const importFavorites = createServerFn({ method: 'POST' })
  .validator(z.object({ ids: z.array(id).max(200) }))
  .handler(async ({ data }) => {
    const session = await requireUser()
    if (data.ids.length === 0) return { imported: 0 }
    const existing = await db
      .select({ id: nodes.id })
      .from(nodes)
      .where(inArray(nodes.id, data.ids))
    if (existing.length === 0) return { imported: 0 }
    await db
      .insert(favorites)
      .values(existing.map((n) => ({ userId: session.userId, nodeId: n.id })))
      .onConflictDoNothing()
    return { imported: existing.length }
  })

// ── RP ideas ──────────────────────────────────────────────

/** Sections a player can suggest an idea for (indented list). */
export const getIdeaSections = createServerFn({ method: 'GET' }).handler(
  async () => {
    const rows = await db
      .select({ id: nodes.id, parentId: nodes.parentId, title: nodes.title })
      .from(nodes)
      .where(eq(nodes.kind, 'section'))
      .orderBy(asc(nodes.sortOrder), asc(nodes.id))
    const byParent = new Map<number | null, typeof rows>()
    for (const r of rows) {
      const list = byParent.get(r.parentId) ?? []
      list.push(r)
      byParent.set(r.parentId, list)
    }
    const out: { id: number; label: string }[] = []
    const walk = (parent: number | null, depth: number) => {
      for (const r of byParent.get(parent) ?? []) {
        out.push({ id: r.id, label: `${'— '.repeat(depth)}${r.title}` })
        walk(r.id, depth + 1)
      }
    }
    walk(null, 0)
    return out
  },
)

const ideaFields = z.object({
  sectionId: id.nullable(),
  title: z.string().trim().min(3, 'Название — минимум 3 символа').max(150),
  summary: z.string().trim().max(300).default(''),
  content: z
    .string()
    .trim()
    .min(20, 'Опишите идею подробнее — минимум 20 символов')
    .max(20000),
})

export const submitIdea = createServerFn({ method: 'POST' })
  .validator(ideaFields)
  .handler(async ({ data }) => {
    const session = await requireUser()
    if (!(await getSetting('ideasEnabled')))
      throw new Error('Приём идей временно закрыт')
    const [{ pending }] = await db
      .select({ pending: sql<number>`count(*)::int` })
      .from(ideas)
      .where(and(eq(ideas.userId, session.userId), eq(ideas.status, 'pending')))
    if (pending >= 10)
      throw new Error(
        'У вас уже 10 идей на проверке — дождитесь решения модераторов',
      )
    const [row] = await db
      .insert(ideas)
      .values({ ...data, userId: session.userId })
      .returning({ id: ideas.id })
    await logAction(session, 'Отправлена идея', 'idea', row.id, data.title)
    return row
  })

const sectionAlias = sql`(select n.title from "nodes" n where n.id = ${ideas.sectionId})`

const ideaColumns = {
  id: ideas.id,
  title: ideas.title,
  summary: ideas.summary,
  content: ideas.content,
  status: ideas.status,
  reviewNote: ideas.reviewNote,
  reviewedBy: ideas.reviewedBy,
  nodeId: ideas.nodeId,
  sectionId: ideas.sectionId,
  sectionTitle: sql<string | null>`${sectionAlias}`,
  author: users.nickname,
  createdAt: ideas.createdAt,
}

type IdeaRow = Omit<IdeaItem, 'status' | 'createdAt'> & {
  status: string
  createdAt: Date
}
const toIdea = (r: IdeaRow): IdeaItem => ({
  ...r,
  status: r.status as IdeaStatus,
  createdAt: r.createdAt.toISOString(),
})

export const listIdeas = createServerFn({ method: 'GET' })
  .validator(z.object({ status: z.enum(['pending', 'approved', 'rejected']) }))
  .handler(async ({ data }) => {
    await requirePermission('publications.review')
    const rows = await db
      .select(ideaColumns)
      .from(ideas)
      .innerJoin(users, eq(users.id, ideas.userId))
      .where(eq(ideas.status, data.status))
      .orderBy(
        data.status === 'pending'
          ? asc(ideas.createdAt)
          : desc(ideas.createdAt),
      )
      .limit(100)
    const [{ pending }] = await db
      .select({ pending: sql<number>`count(*)::int` })
      .from(ideas)
      .where(eq(ideas.status, 'pending'))
    return { ideas: rows.map(toIdea), pending }
  })

export const countPendingIdeas = createServerFn({ method: 'GET' }).handler(
  async () => {
    const session = await currentSession()
    if (!can(session?.role, 'publications.review')) return 0
    const [{ pending }] = await db
      .select({ pending: sql<number>`count(*)::int` })
      .from(ideas)
      .where(eq(ideas.status, 'pending'))
    return pending
  },
)

export const reviewIdea = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      id,
      action: z.enum(['approve', 'reject']),
      note: z.string().trim().max(500).default(''),
      sectionId: id.nullable(),
    }),
  )
  .handler(async ({ data }) => {
    const session = await requirePermission('publications.review')
    const [idea] = await db
      .select(ideaColumns)
      .from(ideas)
      .innerJoin(users, eq(users.id, ideas.userId))
      .where(eq(ideas.id, data.id))
      .limit(1)
    if (!idea) throw new Error('Идея не найдена')
    if (idea.status !== 'pending') throw new Error('Идея уже рассмотрена')

    if (data.action === 'reject') {
      await db
        .update(ideas)
        .set({
          status: 'rejected',
          reviewNote: data.note,
          reviewedBy: session.label,
        })
        .where(eq(ideas.id, data.id))
      await logAction(session, 'Идея отклонена', 'idea', data.id, idea.title)
      return { nodeId: null }
    }

    if (data.sectionId === null)
      throw new Error('Выберите раздел, куда добавить тему')
    const [section] = await db
      .select({ id: nodes.id })
      .from(nodes)
      .where(eq(nodes.id, data.sectionId))
      .limit(1)
    if (!section) throw new Error('Раздел не найден')

    const [{ next }] = await db
      .select({
        next: sql<number>`coalesce(max(${nodes.sortOrder}) + 1, 0)::int`,
      })
      .from(nodes)
      .where(eq(nodes.parentId, data.sectionId))
    const [node] = await db
      .insert(nodes)
      .values({
        parentId: data.sectionId,
        kind: 'topic',
        title: idea.title,
        summary: idea.summary,
        content: idea.content,
        icon: 'lightbulb',
        sortOrder: next,
        createdBy: idea.author,
      })
      .returning({ id: nodes.id })
    await db
      .update(ideas)
      .set({
        status: 'approved',
        reviewNote: data.note,
        reviewedBy: session.label,
        nodeId: node.id,
        sectionId: data.sectionId,
      })
      .where(eq(ideas.id, data.id))
    await logAction(session, 'Идея одобрена', 'idea', data.id, idea.title)
    return { nodeId: node.id }
  })

// ── Profiles ──────────────────────────────────────────────

export const getProfile = createServerFn({ method: 'GET' })
  .validator(z.object({ nickname: z.string().trim().min(1).max(32) }))
  .handler(async ({ data }) => {
    const [user] = await db
      .select({
        id: users.id,
        nickname: users.nickname,
        faction: users.faction,
        server: sql<string>`coalesce(${gameServers.name}, ${users.server})`,
        serverId: users.serverId,
        bio: users.bio,
        role: users.role,
        banned: sql<boolean>`${users.bannedAt} is not null`,
        createdAt: users.createdAt,
      })
      .from(users)
      .leftJoin(gameServers, eq(gameServers.id, users.serverId))
      .where(sql`lower(${users.nickname}) = lower(${data.nickname})`)
      .limit(1)
    if (!user) return null

    const session = await currentSession()
    const own = session?.userId === user.id

    const [userIdeas, recentComments, [stats]] = await Promise.all([
      db
        .select(ideaColumns)
        .from(ideas)
        .innerJoin(users, eq(users.id, ideas.userId))
        .where(
          own
            ? eq(ideas.userId, user.id)
            : and(eq(ideas.userId, user.id), eq(ideas.status, 'approved')),
        )
        .orderBy(desc(ideas.createdAt))
        .limit(50),
      db
        .select({
          id: comments.id,
          text: comments.text,
          createdAt: comments.createdAt,
          nodeId: comments.nodeId,
          nodeTitle: nodes.title,
        })
        .from(comments)
        .innerJoin(nodes, eq(nodes.id, comments.nodeId))
        .where(eq(comments.userId, user.id))
        .orderBy(desc(comments.createdAt))
        .limit(10),
      db
        .select({
          approved: sql<number>`(select count(*)::int from "ideas" where user_id = ${user.id} and status = 'approved')`,
          comments: sql<number>`(select count(*)::int from "comments" where user_id = ${user.id})`,
          ratings: sql<number>`(select count(*)::int from "ratings" where user_id = ${user.id})`,
        })
        .from(sql`(select 1) as one`),
    ])

    return {
      user: { ...user, createdAt: user.createdAt.toISOString() },
      own,
      stats,
      ideas: userIdeas.map(toIdea),
      comments: recentComments.map((c) => ({
        ...c,
        createdAt: c.createdAt.toISOString(),
      })),
    }
  })

export const updateProfile = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      faction: z.string().trim().max(60).default(''),
      serverId: z.number().int().positive().nullable().default(null),
      bio: z.string().trim().max(600).default(''),
    }),
  )
  .handler(async ({ data }) => {
    const session = await requireUser()
    if (!(await serverExists(data.serverId)))
      throw new Error('Сервер не найден')
    await db.update(users).set(data).where(eq(users.id, session.userId))
    rememberServer(data.serverId)
    await logAction(session, 'Профиль обновлён', 'user', session.userId)
    return { ok: true }
  })

/** Most active players — for the community page. */
export const getCommunity = createServerFn({ method: 'GET' }).handler(
  async () => {
    const top = await db
      .select({
        nickname: users.nickname,
        faction: users.faction,
        approved: sql<number>`(select count(*)::int from "ideas" i where i.user_id = ${users.id} and i.status = 'approved')`,
        comments: sql<number>`(select count(*)::int from "comments" c where c.user_id = ${users.id})`,
      })
      .from(users)
      .where(isNull(users.bannedAt))
      .orderBy(
        desc(
          sql`(select count(*) from "ideas" i where i.user_id = ${users.id} and i.status = 'approved') * 5 + (select count(*) from "comments" c where c.user_id = ${users.id})`,
        ),
        asc(users.id),
      )
      .limit(10)
    const latestIdeas = await db
      .select(ideaColumns)
      .from(ideas)
      .innerJoin(users, eq(users.id, ideas.userId))
      .where(eq(ideas.status, 'approved'))
      .orderBy(desc(ideas.createdAt))
      .limit(6)
    const [{ players }] = await db
      .select({ players: sql<number>`count(*)::int` })
      .from(users)
    return { top, latestIdeas: latestIdeas.map(toIdea), players }
  },
)
