import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { inArray } from 'drizzle-orm'
import { db } from '../../db/index.js'
import { quickLinks } from '../../db/schema.js'
import { logAction, requirePermission } from '@/server/auth'
import { listQuickLinks } from '@/server/quick-links'

const linkInput = z.object({
  title: z.string().trim().min(1, 'Введите название кнопки').max(40),
  text: z.string().trim().max(80).default(''),
  url: z
    .string()
    .trim()
    .max(500)
    .refine(
      (v) =>
        (v.startsWith('/') && !v.startsWith('//')) || /^https?:\/\//i.test(v),
      'Ссылка должна начинаться с / или https://',
    ),
  icon: z.string().trim().max(40).default(''),
})

/** Replaces the whole set of home page buttons (owner only). */
export const saveQuickLinks = createServerFn({ method: 'POST' })
  .validator(z.object({ links: z.array(linkInput).max(20) }))
  .handler(async ({ data }) => {
    const session = await requirePermission('settings.manage')
    // Insert the new set first, then drop the old rows, so a failed insert
    // never leaves the home page without buttons.
    const old = await db.select({ id: quickLinks.id }).from(quickLinks)
    if (data.links.length > 0)
      await db
        .insert(quickLinks)
        .values(data.links.map((l, i) => ({ ...l, sortOrder: i })))
    if (old.length > 0)
      await db.delete(quickLinks).where(
        inArray(
          quickLinks.id,
          old.map((r) => r.id),
        ),
      )
    await logAction(session, 'Изменены кнопки главной', 'settings')
    return listQuickLinks()
  })
