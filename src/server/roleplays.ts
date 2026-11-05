import { desc, eq } from 'drizzle-orm'
import { db } from '../../db/index.js'
import { organizations, roleplays, savedRoleplays } from '../../db/schema.js'
import type { Roleplay, RoleplayKind } from '@/lib/types'

export const rpColumns = {
  id: roleplays.id,
  kind: roleplays.kind,
  title: roleplays.title,
  category: roleplays.category,
  content: roleplays.content,
  organizationId: roleplays.organizationId,
  organizationName: organizations.name,
  serverId: roleplays.serverId,
  createdBy: roleplays.createdBy,
}

type RpRow = Omit<Roleplay, 'kind'> & { kind: string }
export const toRoleplay = (r: RpRow): Roleplay => ({
  ...r,
  kind: r.kind as RoleplayKind,
})

export async function savedRoleplaysOf(userId: number) {
  const rows = await db
    .select(rpColumns)
    .from(savedRoleplays)
    .innerJoin(roleplays, eq(roleplays.id, savedRoleplays.roleplayId))
    .leftJoin(organizations, eq(organizations.id, roleplays.organizationId))
    .where(eq(savedRoleplays.userId, userId))
    .orderBy(desc(savedRoleplays.createdAt))
  return rows.map(toRoleplay)
}
