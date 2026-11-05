import { createFileRoute } from '@tanstack/react-router'
import { NEWS_IMAGE_KEY } from '@/lib/news-images'
import { topicImageStore } from '@/server/topic-images'

/** Serves a topic photo from Cloudflare R2. */
export const Route = createFileRoute('/api/topic-images/$key')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        if (!NEWS_IMAGE_KEY.test(params.key))
          return new Response('Not found', { status: 404 })
        const result = await topicImageStore().getWithMetadata(params.key, {
          type: 'arrayBuffer',
        })
        if (!result) return new Response('Not found', { status: 404 })
        const type = result.metadata.contentType
        return new Response(result.data, {
          headers: {
            'Content-Type': typeof type === 'string' ? type : 'image/jpeg',
            'X-Content-Type-Options': 'nosniff',
            'Cache-Control': 'public, max-age=31536000, immutable',
          },
        })
      },
    },
  },
})
