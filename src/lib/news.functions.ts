import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db } from '../../db/index.js'
import { news } from '../../db/schema.js'
import { logAction, requirePermission } from '@/server/auth'
import { serverExists } from '@/server/servers'
import { deleteNewsImages } from '@/server/news-images'
import { NEWS_IMAGE_KEY, NEWS_MAX_IMAGES } from '@/lib/news-images'

const newsInput = z.object({
  id: z.number().int().positive().nullable(),
  title: z.string().trim().min(1, 'Введите заголовок').max(120),
  body: z.string().trim().max(4000).default(''),
  pinned: z.boolean().default(false),
  serverId: z.number().int().positive().nullable().default(null),
  images: z
    .array(z.string().regex(NEWS_IMAGE_KEY))
    .max(NEWS_MAX_IMAGES, `Не больше ${NEWS_MAX_IMAGES} фото`)
    .default([]),
})

/** Creates or updates a news post (moderator and above). */
export const saveNews = createServerFn({ method: 'POST' })
  .validator(newsInput)
  .handler(async ({ data }) => {
    const session = await requirePermission('news.manage')
    if (!(await serverExists(data.serverId)))
      throw new Error('Сервер не найден')
    const { id, ...fields } = data
    if (id === null) {
      const [row] = await db
        .insert(news)
        .values({ ...fields, authorLabel: session.label })
        .returning({ id: news.id })
      await logAction(
        session,
        'Опубликована новость',
        'news',
        row.id,
        fields.title,
      )
      return row
    }
    const [old] = await db
      .select({ images: news.images })
      .from(news)
      .where(eq(news.id, id))
    if (!old) throw new Error('Новость не найдена')
    const [row] = await db
      .update(news)
      .set({ ...fields, updatedAt: new Date() })
      .where(eq(news.id, id))
      .returning({ id: news.id })
    if (!row) throw new Error('Новость не найдена')
    await deleteNewsImages(old.images.filter((k) => !fields.images.includes(k)))
    await logAction(session, 'Изменена новость', 'news', row.id, fields.title)
    return row
  })

export const deleteNews = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.number().int().positive() }))
  .handler(async ({ data }) => {
    const session = await requirePermission('news.manage')
    const [row] = await db
      .delete(news)
      .where(eq(news.id, data.id))
      .returning({ title: news.title, images: news.images })
    if (row) await deleteNewsImages(row.images)
    await logAction(session, 'Удалена новость', 'news', data.id, row?.title)
    return { ok: true }
  })
