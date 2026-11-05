import { randomUUID } from 'node:crypto'
import { createFileRoute } from '@tanstack/react-router'
import { requirePermission } from '@/server/auth'
import {
  NEWS_IMAGE_MAX_BYTES,
  NEWS_IMAGE_TYPES,
  newsImageStore,
} from '@/server/news-images'

/** Uploads one news photo (moderator and above). Returns its key. */
export const Route = createFileRoute('/api/news-images')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          await requirePermission('news.manage')
        } catch (err) {
          return Response.json(
            { error: err instanceof Error ? err.message : 'Нет доступа' },
            { status: 403 },
          )
        }
        const form = await request.formData().catch(() => null)
        const file = form?.get('file')
        if (!(file instanceof File))
          return Response.json({ error: 'Файл не выбран' }, { status: 400 })
        if (!(NEWS_IMAGE_TYPES as readonly string[]).includes(file.type))
          return Response.json(
            { error: 'Поддерживаются JPG, PNG, WebP и GIF' },
            { status: 400 },
          )
        if (file.size > NEWS_IMAGE_MAX_BYTES)
          return Response.json({ error: 'Фото больше 5 МБ' }, { status: 400 })
        const key = randomUUID()
        await newsImageStore().set(key, await file.arrayBuffer(), {
          metadata: { contentType: file.type },
        })
        return Response.json({ key })
      },
    },
  },
})
