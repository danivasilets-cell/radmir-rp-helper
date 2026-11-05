import { randomUUID } from 'node:crypto'
import { createFileRoute } from '@tanstack/react-router'
import { currentSession } from '@/server/auth'
import { NEWS_IMAGE_MAX_BYTES, NEWS_IMAGE_TYPES } from '@/lib/news-images'
import { topicImageStore } from '@/server/topic-images'

/** Uploads one photo for topic or idea text (any signed-in account). */
export const Route = createFileRoute('/api/topic-images')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const session = await currentSession()
        if (!session)
          return Response.json(
            { error: 'Войдите, чтобы загружать фото' },
            { status: 403 },
          )
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
        await topicImageStore().set(key, await file.arrayBuffer(), {
          metadata: { contentType: file.type, sessionId: session.sessionId },
        })
        return Response.json({ key, url: `/api/topic-images/${key}` })
      },
    },
  },
})
