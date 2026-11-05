import {
  createHash,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from 'node:crypto'
import { and, eq, gt, lt, ne, sql } from 'drizzle-orm'
import {
  deleteCookie,
  getCookie,
  getRequestHeader,
  getRequestIP,
  setCookie,
} from '@tanstack/react-start/server'
import { db } from '../../db/index.js'
import {
  activityLog,
  authAttempts,
  moderators,
  sessions,
  settings,
  users,
} from '../../db/schema.js'
import {
  asRole,
  can,
  hasRole,
  type Permission,
  type Role,
} from '@/lib/permissions'
import { getSetting } from './settings'

export type { Role }
export type Session = {
  sessionId: number
  role: Role
  label: string
  moderatorId: number | null
  /** Set when signed in with a player account (any role). */
  userId: number | null
  serverId: number | null
}

const COOKIE = 'rh_session'
const SESSION_DAYS = 30

export const sha256 = (value: string) =>
  createHash('sha256').update(value).digest('hex')

export const randomToken = (prefix = '') =>
  prefix + randomBytes(24).toString('base64url')

function safeEqual(a: string, b: string) {
  const ha = Buffer.from(sha256(a), 'hex')
  const hb = Buffer.from(sha256(b), 'hex')
  return timingSafeEqual(ha, hb)
}

/**
 * Resolves the session cookie. Roles are read live from the account or the
 * access key, so a role change or a ban applies immediately.
 */
export async function currentSession(): Promise<Session | null> {
  const token = getCookie(COOKIE)
  if (!token) return null
  const [row] = await db
    .select({
      id: sessions.id,
      role: sessions.role,
      label: sessions.label,
      moderatorId: sessions.moderatorId,
      userId: sessions.userId,
      userRole: users.role,
      nickname: users.nickname,
      bannedAt: users.bannedAt,
      serverId: users.serverId,
      lastSeenAt: users.lastSeenAt,
      keyRole: moderators.role,
      keyName: moderators.name,
    })
    .from(sessions)
    .leftJoin(users, eq(users.id, sessions.userId))
    .leftJoin(moderators, eq(moderators.id, sessions.moderatorId))
    .where(
      and(
        eq(sessions.tokenHash, sha256(token)),
        gt(sessions.expiresAt, new Date()),
      ),
    )
    .limit(1)
  if (!row) return null

  if (row.userId !== null) {
    if (row.nickname === null || row.bannedAt !== null) return null
    // Touch "last seen" at most every 10 minutes.
    if (!row.lastSeenAt || Date.now() - row.lastSeenAt.getTime() > 600_000)
      await db
        .update(users)
        .set({ lastSeenAt: new Date() })
        .where(eq(users.id, row.userId))
    return {
      sessionId: row.id,
      role: asRole(row.userRole ?? 'user'),
      label: row.nickname,
      moderatorId: null,
      userId: row.userId,
      serverId: row.serverId,
    }
  }
  if (row.moderatorId !== null) {
    if (row.keyName === null) return null
    const role = asRole(row.keyRole ?? 'moderator')
    return {
      sessionId: row.id,
      role: role === 'admin' ? 'admin' : 'moderator',
      label: row.keyName,
      moderatorId: row.moderatorId,
      userId: null,
      serverId: null,
    }
  }
  if (row.role !== 'owner') return null
  return {
    sessionId: row.id,
    role: 'owner',
    label: row.label,
    moderatorId: null,
    userId: null,
    serverId: null,
  }
}

/** Checks the session has at least the given role (user < moderator < admin < owner). */
export async function requireRole(minimum: Role): Promise<Session> {
  const session = await currentSession()
  if (!session) throw new Error('Нужно войти в систему')
  if (!hasRole(session.role, minimum))
    throw new Error(
      minimum === 'owner'
        ? 'Действие доступно только владельцу'
        : 'Недостаточно прав для этого действия',
    )
  return session
}

export async function requirePermission(
  permission: Permission,
): Promise<Session> {
  const session = await currentSession()
  if (!session) throw new Error('Нужно войти в систему')
  if (!can(session.role, permission))
    throw new Error('Недостаточно прав для этого действия')
  return session
}

/** Signed in with a player account (any role). */
export async function requireUser(): Promise<Session & { userId: number }> {
  const session = await currentSession()
  if (!session || session.userId === null)
    throw new Error('Войдите или зарегистрируйтесь как игрок')
  return session as Session & { userId: number }
}

// ── Audit log ─────────────────────────────────────────────

export async function logAction(
  session: Session | null,
  action: string,
  entityType = '',
  entityId: number | null = null,
  summary = '',
) {
  try {
    await db.insert(activityLog).values({
      actorRole: session?.role ?? 'guest',
      actorLabel: session?.label ?? 'Гость',
      userId: session?.userId ?? null,
      action,
      entityType,
      entityId,
      summary: summary.slice(0, 300),
    })
  } catch (err) {
    console.error('activity log failed', err)
  }
}

// ── Rate limiting ─────────────────────────────────────────

export function clientIp() {
  return (
    getRequestHeader('x-nf-client-connection-ip') ??
    getRequestIP({ xForwardedFor: true }) ??
    'unknown'
  )
}

async function tooManyAttempts(key: string, max: number, windowMs: number) {
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(authAttempts)
    .where(
      and(
        eq(authAttempts.key, key),
        gt(authAttempts.createdAt, new Date(Date.now() - windowMs)),
      ),
    )
  return count >= max
}

async function recordAttempt(key: string) {
  await db.insert(authAttempts).values({ key })
  // Housekeeping: drop attempts older than a day.
  await db
    .delete(authAttempts)
    .where(lt(authAttempts.createdAt, new Date(Date.now() - 86400_000)))
}

const LOGIN_WINDOW = 15 * 60_000
const LOCK_MESSAGE =
  'Слишком много попыток входа. Подождите 15 минут и попробуйте снова.'

async function guardLogin(scope: string, name = '') {
  const ip = sha256(clientIp())
  const keys = [`${scope}:ip:${ip}`]
  if (name) keys.push(`${scope}:name:${name.toLowerCase()}`)
  for (const key of keys)
    if (await tooManyAttempts(key, 10, LOGIN_WINDOW))
      throw new Error(LOCK_MESSAGE)
  return async () => {
    for (const key of keys) await recordAttempt(key)
  }
}

// ── Player passwords ──────────────────────────────────────

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 64).toString('hex')
  return `scrypt:${salt}:${hash}`
}

export function verifyPassword(password: string, stored: string) {
  const [scheme, salt, hash] = stored.split(':')
  if (scheme !== 'scrypt' || !salt || !hash) return false
  const expected = Buffer.from(hash, 'hex')
  const actual = scryptSync(password, salt, expected.length)
  return timingSafeEqual(expected, actual)
}

export async function registerUser(
  nickname: string,
  password: string,
  serverId: number | null,
) {
  if (!(await getSetting('registrationOpen')))
    throw new Error('Регистрация временно закрыта владельцем сайта')
  const ipKey = `register:ip:${sha256(clientIp())}`
  if (await tooManyAttempts(ipKey, 5, 3600_000))
    throw new Error(
      'Слишком много регистраций с вашего адреса. Попробуйте позже.',
    )
  const [taken] = await db
    .select({ id: users.id })
    .from(users)
    .where(sql`lower(${users.nickname}) = lower(${nickname})`)
    .limit(1)
  if (taken) throw new Error('Этот ник уже занят')
  await recordAttempt(ipKey)
  const [user] = await db
    .insert(users)
    .values({ nickname, passwordHash: hashPassword(password), serverId })
    .returning({ id: users.id, nickname: users.nickname })
  await startSession('user', user.nickname, null, user.id)
  await logAction(
    {
      sessionId: 0,
      role: 'user',
      label: user.nickname,
      moderatorId: null,
      userId: user.id,
      serverId,
    },
    'Регистрация',
    'user',
    user.id,
  )
}

export async function loginUser(nickname: string, password: string) {
  const fail = await guardLogin('login', nickname)
  const [user] = await db
    .select()
    .from(users)
    .where(sql`lower(${users.nickname}) = lower(${nickname})`)
    .limit(1)
  if (!user || !verifyPassword(password, user.passwordHash)) {
    await fail()
    throw new Error('Неверный ник или пароль')
  }
  if (user.bannedAt)
    throw new Error(
      `Аккаунт заблокирован${user.banReason ? `: ${user.banReason}` : ''}`,
    )
  await startSession('user', user.nickname, null, user.id)
  await logAction(
    {
      sessionId: 0,
      role: asRole(user.role),
      label: user.nickname,
      moderatorId: null,
      userId: user.id,
      serverId: user.serverId,
    },
    'Вход в аккаунт',
    'user',
    user.id,
  )
}

async function startSession(
  role: Role,
  label: string,
  moderatorId: number | null,
  userId: number | null = null,
) {
  const token = randomToken()
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400_000)
  await db.delete(sessions).where(lt(sessions.expiresAt, new Date()))
  // Replace the current session (if any) instead of leaving it behind.
  const old = getCookie(COOKIE)
  if (old) await db.delete(sessions).where(eq(sessions.tokenHash, sha256(old)))
  await db.insert(sessions).values({
    tokenHash: sha256(token),
    role,
    label,
    moderatorId,
    userId,
    expiresAt,
  })
  setCookie(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  })
}

// ── Owner password ────────────────────────────────────────

const OWNER_KEY = 'ownerPassword'

type OwnerPasswordRecord = {
  hash: string
  /** sha256 of OWNER_PASSWORD at the time of the change. */
  envFingerprint: string
  changedAt: string
}

/**
 * The owner's own password (set from the admin panel). It is used only while
 * OWNER_PASSWORD on the server stays the same, so changing that variable in
 * Netlify works as an emergency reset.
 */
async function ownerPasswordRecord(): Promise<OwnerPasswordRecord | null> {
  const [row] = await db
    .select()
    .from(settings)
    .where(eq(settings.key, OWNER_KEY))
    .limit(1)
  const v = row?.value as Partial<OwnerPasswordRecord> | undefined
  if (!v || typeof v.hash !== 'string' || typeof v.envFingerprint !== 'string')
    return null
  if (v.envFingerprint !== sha256(process.env.OWNER_PASSWORD ?? '')) return null
  return v as OwnerPasswordRecord
}

function ownerPasswordMatches(
  password: string,
  record: OwnerPasswordRecord | null,
) {
  if (record) return verifyPassword(password, record.hash)
  const expected = process.env.OWNER_PASSWORD
  return !!expected && safeEqual(password, expected)
}

export async function ownerPasswordInfo() {
  const record = await ownerPasswordRecord()
  return {
    custom: record !== null,
    changedAt: record?.changedAt ?? null,
  }
}

export async function setOwnerPassword(current: string, next: string) {
  const record = await ownerPasswordRecord()
  const fail = await guardLogin('owner-change')
  if (!ownerPasswordMatches(current, record)) {
    await fail()
    throw new Error('Текущий пароль указан неверно')
  }
  const value: OwnerPasswordRecord = {
    hash: hashPassword(next),
    envFingerprint: sha256(process.env.OWNER_PASSWORD ?? ''),
    changedAt: new Date().toISOString(),
  }
  await db
    .insert(settings)
    .values({ key: OWNER_KEY, value })
    .onConflictDoUpdate({
      target: settings.key,
      set: { value, updatedAt: new Date() },
    })
}

/** Owner sessions (signed in with the owner password, not a player account). */
const ownerSessions = and(
  eq(sessions.role, 'owner'),
  sql`${sessions.userId} is null`,
  sql`${sessions.moderatorId} is null`,
)

export async function countOwnerSessions() {
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(sessions)
    .where(and(ownerSessions, gt(sessions.expiresAt, new Date())))
  return count
}

export async function dropOtherOwnerSessions(keepId: number) {
  await db.delete(sessions).where(and(ownerSessions, ne(sessions.id, keepId)))
}

export async function loginOwner(password: string) {
  const record = await ownerPasswordRecord()
  if (!record && !process.env.OWNER_PASSWORD)
    throw new Error('Пароль владельца не настроен на сервере')
  const fail = await guardLogin('owner')
  if (!ownerPasswordMatches(password, record)) {
    await fail()
    throw new Error('Неверный пароль')
  }
  await startSession('owner', 'Владелец', null)
  await logAction(
    {
      sessionId: 0,
      role: 'owner',
      label: 'Владелец',
      moderatorId: null,
      userId: null,
      serverId: null,
    },
    'Вход владельца',
  )
}

export async function loginModerator(key: string) {
  const fail = await guardLogin('key')
  const [mod] = await db
    .select()
    .from(moderators)
    .where(eq(moderators.keyHash, sha256(key.trim())))
    .limit(1)
  if (!mod) {
    await fail()
    throw new Error('Неверный ключ доступа')
  }
  const role = mod.role === 'admin' ? 'admin' : 'moderator'
  await startSession(role, mod.name, mod.id)
  await logAction(
    {
      sessionId: 0,
      role,
      label: mod.name,
      moderatorId: mod.id,
      userId: null,
      serverId: null,
    },
    'Вход по ключу',
  )
}

export async function logout() {
  const token = getCookie(COOKIE)
  if (token)
    await db.delete(sessions).where(eq(sessions.tokenHash, sha256(token)))
  deleteCookie(COOKIE, { path: '/' })
}

/** Ends every other session of a player (after a password change etc.). */
export async function dropOtherSessions(userId: number, keepId: number) {
  await db
    .delete(sessions)
    .where(and(eq(sessions.userId, userId), ne(sessions.id, keepId)))
}

export async function dropAllSessions(userId: number) {
  await db.delete(sessions).where(eq(sessions.userId, userId))
}
