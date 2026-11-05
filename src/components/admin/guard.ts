import { redirect } from '@tanstack/react-router'
import { can, type Permission } from '@/lib/permissions'
import type { SessionInfo } from '@/lib/types'

/** Route guard for admin sub-pages (UI only; server functions re-check). */
export const guard =
  (permission: Permission) =>
  ({ context }: { context: { session: SessionInfo } }) => {
    if (!can(context.session?.role, permission))
      throw redirect({ to: '/admin' })
  }
