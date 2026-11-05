import { randomUUID } from 'node:crypto'
import { createFileRoute } from '@tanstack/react-router'
import { requirePermission } from '@/server/auth'
import { carImageStore } from '@/server/car-images'
import { CAR_IMAGE_MAX_BYTES, CAR_IMAGE_TYPES } from '@/lib/car-images'

/** Uploads one car photo (catalog managers). Returns its key. */
export const Route = createFileRoute('/api/car-images')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          await requirePermission('catalog.manage')
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
        if (!(CAR_IMAGE_TYPES as readonly string[]).includes(file.type))
          return Response.json(
            { error: 'Поддерживаются JPG, PNG, WebP и GIF' },
            { status: 400 },
          )
        if (file.size > CAR_IMAGE_MAX_BYTES)
          return Response.json({ error: 'Фото больше 5 МБ' }, { status: 400 })
        const key = randomUUID()
        await carImageStore().set(key, await file.arrayBuffer(), {
          metadata: { contentType: file.type },
        })
        return Response.json({ key })
      },
    },
  },
})
