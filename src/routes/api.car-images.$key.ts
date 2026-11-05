import { createFileRoute } from '@tanstack/react-router'
import { carImageStore } from '@/server/car-images'
import { CAR_IMAGE_KEY } from '@/lib/car-images'

/** Serves a car photo from Cloudflare R2. */
export const Route = createFileRoute('/api/car-images/$key')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        if (!CAR_IMAGE_KEY.test(params.key))
          return new Response('Not found', { status: 404 })
        const result = await carImageStore().getWithMetadata(params.key, {
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
