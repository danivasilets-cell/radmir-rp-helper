import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { and, desc, eq, inArray } from 'drizzle-orm'
import { db } from '../../db/index.js'
import { activityLog } from '../../db/schema.js'
import {
  countOwnerSessions,
  dropOtherOwnerSessions,
  logAction,
  ownerPasswordInfo,
  requireRole,
  setOwnerPassword,
} from '@/server/auth'
import { passwordProblem } from './password'

/** Owner security card: password status, open owner sessions, recent sign-ins. */
export const getOwnerSecurity = createServerFn({ method: 'GET' }).handler(
  async () => {
    const session = await requireRole('owner')
    const passwordLogin =
      session.userId === null && session.moderatorId === null
    const [info, sessionCount, logins] = await Promise.all([
      ownerPasswordInfo(),
      countOwnerSessions(),
      db
        .select({
          action: activityLog.action,
          createdAt: activityLog.createdAt,
        })
        .from(activityLog)
        .where(
          and(
            eq(activityLog.actorRole, 'owner'),
            inArray(activityLog.action, [
              'Вход владельца',
              'Смена пароля владельца',
            ]),
          ),
        )
        .orderBy(desc(activityLog.createdAt))
        .limit(5),
    ])
    return {
      passwordLogin,
      ...info,
      sessionCount,
      logins: logins.map((l) => ({
        action: l.action,
        createdAt: l.createdAt.toISOString(),
      })),
    }
  },
)

export const changeOwnerPassword = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      current: z.string().min(1).max(200),
      next: z.string().min(1).max(200),
      logoutOthers: z.boolean().default(true),
    }),
  )
  .handler(async ({ data }) => {
    const session = await requireRole('owner')
    if (session.userId !== null || session.moderatorId !== null)
      throw new Error('Пароль владельца меняется только во входе владельца')
    const problem = passwordProblem(data.next)
    if (problem) throw new Error(problem)
    if (data.next === data.current)
      throw new Error('Новый пароль совпадает с текущим')
    await setOwnerPassword(data.current, data.next)
    if (data.logoutOthers) await dropOtherOwnerSessions(session.sessionId)
    await logAction(session, 'Смена пароля владельца', 'settings')
    return { ok: true }
  })

export const endOtherOwnerSessions = createServerFn({ method: 'POST' }).handler(
  async () => {
    const session = await requireRole('owner')
    await dropOtherOwnerSessions(session.sessionId)
    await logAction(session, 'Завершены другие сеансы владельца', 'settings')
    return { ok: true }
  },
)
