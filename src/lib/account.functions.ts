import { createServerFn } from '@tanstack/react-start'
import { deleteCookie } from '@tanstack/react-start/server'
import { z } from 'zod'
import { and, desc, eq, gt, sql } from 'drizzle-orm'
import { db } from '../../db/index.js'
import {
  activityLog,
  cars,
  comments,
  favoriteCars,
  favorites,
  ideas,
  nodes,
  reports,
  sessions,
  users,
} from '../../db/schema.js'
import {
  dropAllSessions,
  dropOtherSessions,
  hashPassword,
  logAction,
  requireUser,
  verifyPassword,
} from '@/server/auth'
import { savedRoleplaysOf } from '@/server/roleplays'
import { getSetting } from '@/server/settings'
import { passwordProblem } from './password'
import type { Car, IdeaStatus, NodeItem } from './types'

const id = z.number().int().positive()

/** Everything shown in the personal cabinet (/me). */
export const getCabinet = createServerFn({ method: 'GET' }).handler(
  async () => {
    const session = await requireUser()
    const uid = session.userId
    const [user] = await db
      .select({
        nickname: users.nickname,
        faction: users.faction,
        serverId: users.serverId,
        bio: users.bio,
        role: users.role,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, uid))
      .limit(1)
    if (!user) throw new Error('Аккаунт не найден')

    const [
      favNodes,
      favCars,
      saved,
      myIdeas,
      myComments,
      activity,
      [{ activeSessions }],
    ] = await Promise.all([
      db
        .select({
          id: nodes.id,
          parentId: nodes.parentId,
          kind: nodes.kind,
          title: nodes.title,
          summary: nodes.summary,
          icon: nodes.icon,
          sortOrder: nodes.sortOrder,
          childCount: sql<number>`0`,
        })
        .from(favorites)
        .innerJoin(nodes, eq(nodes.id, favorites.nodeId))
        .where(eq(favorites.userId, uid))
        .orderBy(desc(favorites.createdAt)),
      db
        .select({ car: cars })
        .from(favoriteCars)
        .innerJoin(cars, eq(cars.id, favoriteCars.carId))
        .where(eq(favoriteCars.userId, uid))
        .orderBy(desc(favoriteCars.createdAt)),
      savedRoleplaysOf(uid),
      db
        .select({
          id: ideas.id,
          title: ideas.title,
          status: ideas.status,
          reviewNote: ideas.reviewNote,
          nodeId: ideas.nodeId,
          createdAt: ideas.createdAt,
        })
        .from(ideas)
        .where(eq(ideas.userId, uid))
        .orderBy(desc(ideas.createdAt))
        .limit(100),
      db
        .select({
          id: comments.id,
          text: comments.text,
          nodeId: comments.nodeId,
          nodeTitle: nodes.title,
          createdAt: comments.createdAt,
        })
        .from(comments)
        .innerJoin(nodes, eq(nodes.id, comments.nodeId))
        .where(eq(comments.userId, uid))
        .orderBy(desc(comments.createdAt))
        .limit(30),
      db
        .select({
          id: activityLog.id,
          action: activityLog.action,
          entityType: activityLog.entityType,
          entityId: activityLog.entityId,
          summary: activityLog.summary,
          createdAt: activityLog.createdAt,
        })
        .from(activityLog)
        .where(eq(activityLog.userId, uid))
        .orderBy(desc(activityLog.createdAt))
        .limit(60),
      db
        .select({ activeSessions: sql<number>`count(*)::int` })
        .from(sessions)
        .where(
          and(eq(sessions.userId, uid), gt(sessions.expiresAt, new Date())),
        ),
    ])

    const car = (r: typeof cars.$inferSelect): Car => ({
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
    })

    return {
      user: { ...user, createdAt: user.createdAt.toISOString() },
      favorites: favNodes.map((n) => ({
        ...n,
        kind: n.kind as NodeItem['kind'],
      })),
      favoriteCars: favCars.map((r) => car(r.car)),
      roleplays: saved,
      ideas: myIdeas.map((i) => ({
        ...i,
        status: i.status as IdeaStatus,
        createdAt: i.createdAt.toISOString(),
      })),
      comments: myComments.map((c) => ({
        ...c,
        createdAt: c.createdAt.toISOString(),
      })),
      activity: activity.map((a) => ({
        ...a,
        createdAt: a.createdAt.toISOString(),
      })),
      activeSessions,
    }
  },
)

// ── Favorite cars ─────────────────────────────────────────

export const listMyCarFavorites = createServerFn({ method: 'GET' }).handler(
  async (): Promise<number[] | null> => {
    const session = await requireUser().catch(() => null)
    if (!session) return null
    const rows = await db
      .select({ id: favoriteCars.carId })
      .from(favoriteCars)
      .where(eq(favoriteCars.userId, session.userId))
    return rows.map((r) => r.id)
  },
)

export const toggleFavoriteCar = createServerFn({ method: 'POST' })
  .validator(z.object({ carId: id }))
  .handler(async ({ data }) => {
    const session = await requireUser()
    const where = and(
      eq(favoriteCars.userId, session.userId),
      eq(favoriteCars.carId, data.carId),
    )
    const [existing] = await db.select().from(favoriteCars).where(where)
    if (existing) {
      await db.delete(favoriteCars).where(where)
      await logAction(session, 'Авто убрано из избранного', 'car', data.carId)
      return { saved: false }
    }
    const [car] = await db
      .select({ name: cars.name })
      .from(cars)
      .where(eq(cars.id, data.carId))
    if (!car) throw new Error('Машина не найдена')
    await db
      .insert(favoriteCars)
      .values({ userId: session.userId, carId: data.carId })
      .onConflictDoNothing()
    await logAction(session, 'Авто в избранном', 'car', data.carId, car.name)
    return { saved: true }
  })

// ── Account settings ──────────────────────────────────────

export const changePassword = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      current: z.string().min(1, 'Введите текущий пароль').max(200),
      next: z.string().max(200),
    }),
  )
  .handler(async ({ data }) => {
    const session = await requireUser()
    const [user] = await db
      .select({ hash: users.passwordHash, nickname: users.nickname })
      .from(users)
      .where(eq(users.id, session.userId))
    if (!user || !verifyPassword(data.current, user.hash))
      throw new Error('Текущий пароль указан неверно')
    const problem = passwordProblem(data.next, user.nickname)
    if (problem) throw new Error(problem)
    await db
      .update(users)
      .set({ passwordHash: hashPassword(data.next) })
      .where(eq(users.id, session.userId))
    await dropOtherSessions(session.userId, session.sessionId)
    await logAction(session, 'Пароль изменён', 'user', session.userId)
    return { ok: true }
  })

export const logoutOtherSessions = createServerFn({ method: 'POST' }).handler(
  async () => {
    const session = await requireUser()
    await dropOtherSessions(session.userId, session.sessionId)
    await logAction(
      session,
      'Выход на других устройствах',
      'user',
      session.userId,
    )
    return { ok: true }
  },
)

export const deleteAccount = createServerFn({ method: 'POST' })
  .validator(z.object({ password: z.string().min(1).max(200) }))
  .handler(async ({ data }) => {
    const session = await requireUser()
    const [user] = await db
      .select({ hash: users.passwordHash })
      .from(users)
      .where(eq(users.id, session.userId))
    if (!user || !verifyPassword(data.password, user.hash))
      throw new Error('Пароль указан неверно')
    await logAction(
      session,
      'Аккаунт удалён владельцем аккаунта',
      'user',
      session.userId,
    )
    await dropAllSessions(session.userId)
    await db.delete(users).where(eq(users.id, session.userId))
    deleteCookie('rh_session', { path: '/' })
    return { ok: true }
  })

// ── Reports (complaints) ──────────────────────────────────

export const submitReport = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      targetType: z.enum(['node', 'comment', 'idea', 'user']),
      targetId: id,
      reason: z
        .string()
        .trim()
        .min(5, 'Опишите причину — минимум 5 символов')
        .max(1000),
    }),
  )
  .handler(async ({ data }) => {
    const session = await requireUser()
    if (!(await getSetting('reportsEnabled')))
      throw new Error('Приём жалоб временно отключён')
    const [recent] = await db
      .select({ id: reports.id })
      .from(reports)
      .where(
        and(
          eq(reports.reporterId, session.userId),
          gt(reports.createdAt, new Date(Date.now() - 30_000)),
        ),
      )
      .limit(1)
    if (recent) throw new Error('Не так быстро — подождите немного')
    const [{ open }] = await db
      .select({ open: sql<number>`count(*)::int` })
      .from(reports)
      .where(
        and(eq(reports.reporterId, session.userId), eq(reports.status, 'open')),
      )
    if (open >= 20)
      throw new Error('У вас 20 жалоб на рассмотрении — дождитесь ответа')

    let title: string
    if (data.targetType === 'node') {
      const [n] = await db
        .select({ t: nodes.title })
        .from(nodes)
        .where(eq(nodes.id, data.targetId))
      title = n?.t ?? ''
    } else if (data.targetType === 'comment') {
      const [c] = await db
        .select({ t: comments.text, a: comments.authorName })
        .from(comments)
        .where(eq(comments.id, data.targetId))
      title = c ? `${c.a}: ${c.t.slice(0, 140)}` : ''
    } else if (data.targetType === 'idea') {
      const [i] = await db
        .select({ t: ideas.title })
        .from(ideas)
        .where(eq(ideas.id, data.targetId))
      title = i?.t ?? ''
    } else {
      const [u] = await db
        .select({ t: users.nickname })
        .from(users)
        .where(eq(users.id, data.targetId))
      title = u?.t ?? ''
    }
    if (!title) throw new Error('Материал не найден')
    const [row] = await db
      .insert(reports)
      .values({
        reporterId: session.userId,
        reporterName: session.label,
        targetType: data.targetType,
        targetId: data.targetId,
        targetTitle: title,
        reason: data.reason,
      })
      .returning({ id: reports.id })
    await logAction(session, 'Отправлена жалоба', 'report', row.id, title)
    return { ok: true }
  })
