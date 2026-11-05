import { createFileRoute } from '@tanstack/react-router'
import { NEWS_IMAGE_KEY, newsImageStore } from '@/server/news-images'

/** Serves a news photo from Cloudflare R2. */
export const Route = createFileRoute('/api/news-images/$key')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        if (!NEWS_IMAGE_KEY.test(params.key))
          return new Response('Not found', { status: 404 })
        const result = await newsImageStore().getWithMetadata(params.key, {
          type: 'arrayBuffer',
        })
        if (!result) return new Response('Not found', { status: 404 })
        const type = result.metadata.contentType
        return new Response(result.data, {
          headers: {
            'Content-Type': typeof type === 'string' ? type : 'image/jpeg',
            // Keys are never reused, so the file can be cached for good.
            'Cache-Control': 'public, max-age=31536000, immutable',
          },
        })
      },
    },
  },
})
