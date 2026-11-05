import { asc } from 'drizzle-orm'
import { db } from '../../db/index.js'
import { quickLinks } from '../../db/schema.js'
import type { QuickLink } from '@/lib/types'

/** Home page shortcut buttons in display order. */
export async function listQuickLinks(): Promise<QuickLink[]> {
  return db
    .select({
      id: quickLinks.id,
      title: quickLinks.title,
      text: quickLinks.text,
      url: quickLinks.url,
      icon: quickLinks.icon,
    })
    .from(quickLinks)
    .orderBy(asc(quickLinks.sortOrder), asc(quickLinks.id))
}
