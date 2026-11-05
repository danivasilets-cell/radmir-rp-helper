import { asc, eq, isNull, or, type AnyColumn, type SQL } from 'drizzle-orm'
import { getCookie, setCookie } from '@tanstack/react-start/server'
import { db } from '../../db/index.js'
import { gameServers } from '../../db/schema.js'

export const SERVER_COOKIE = 'rh_server'

/** Server the visitor picked (cookie, mirrored to the profile for players). */
export function selectedServerId(): number | null {
  const raw = getCookie(SERVER_COOKIE)
  const id = raw ? Number(raw) : NaN
  return Number.isInteger(id) && id > 0 ? id : null
}

export function rememberServer(serverId: number | null) {
  setCookie(SERVER_COOKIE, serverId ? String(serverId) : '', {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: serverId ? 365 * 86400 : 0,
  })
}

/**
 * Rows for the selected server plus rows shared by all servers
 * (`server_id is null`). No selection → everything.
 */
export function serverScope(column: AnyColumn): SQL | undefined {
  const id = selectedServerId()
  if (id === null) return undefined
  return or(isNull(column), eq(column, id))
}

export async function listServers(includeHidden = false) {
  const rows = await db
    .select()
    .from(gameServers)
    .orderBy(asc(gameServers.sortOrder), asc(gameServers.id))
  return rows
    .filter((r) => includeHidden || r.active)
    .map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      active: r.active,
      sortOrder: r.sortOrder,
    }))
}

export async function serverExists(id: number | null) {
  if (id === null) return true
  const [row] = await db
    .select({ id: gameServers.id })
    .from(gameServers)
    .where(eq(gameServers.id, id))
    .limit(1)
  return !!row
}
