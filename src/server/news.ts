import { desc } from 'drizzle-orm'
import { db } from '../../db/index.js'
import { news } from '../../db/schema.js'
import { serverScope } from '@/server/servers'
import type { NewsItem } from '@/lib/types'

/** Latest news for the selected server, pinned first. */
export async function listNews(limit = 20): Promise<NewsItem[]> {
  const rows = await db
    .select()
    .from(news)
    .where(serverScope(news.serverId))
    .orderBy(desc(news.pinned), desc(news.createdAt), desc(news.id))
    .limit(limit)
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    body: r.body,
    pinned: r.pinned,
    serverId: r.serverId,
    authorLabel: r.authorLabel,
    images: r.images,
    createdAt: r.createdAt.toISOString(),
  }))
}
