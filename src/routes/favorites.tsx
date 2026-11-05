import { useState } from 'react'
import { Link, createFileRoute, useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'
import { listMyFavorites, toggleFavorite } from '@/lib/community.functions'
import { errorMessage } from '@/lib/errors'
import { Heart, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { NodeIcon } from '@/components/app/node-icon'
import { PageShell } from '@/components/app/page-shell'
import { useFavorites } from '@/lib/favorites'

export const Route = createFileRoute('/favorites')({
  loader: () => listMyFavorites(),
  head: () => ({ meta: [{ title: 'Избранное — Radmir Helper' }] }),
  component: FavoritesPage,
})

function FavoritesPage() {
  const { session } = Route.useRouteContext()
  const router = useRouter()
  const serverList = Route.useLoaderData()
  const local = useFavorites()
  const [removing, setRemoving] = useState<number | null>(null)
  const inAccount = serverList !== null
  const list = serverList ?? local.list

  async function remove(id: number) {
    if (!inAccount) return local.remove(id)
    setRemoving(id)
    try {
      await toggleFavorite({ data: { nodeId: id } })
      await router.invalidate()
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setRemoving(null)
    }
  }
  return (
    <PageShell session={session}>
      <div className="mx-auto max-w-content px-4 py-10 sm:px-6">
        <h1 className="flex items-center gap-3 text-3xl">
          <Heart className="size-7 text-primary" aria-hidden /> Избранное
        </h1>
        <p className="mt-2 text-muted-foreground">
          {inAccount
            ? 'Темы, которые вы сохранили. Список хранится в вашем аккаунте и доступен с любого устройства.'
            : 'Темы, которые вы сохранили. Список хранится в этом браузере — войдите как игрок, чтобы он был доступен везде.'}
        </p>
        {list.length === 0 ? (
          <div className="mt-8 rounded-xl border border-dashed p-10 text-center text-muted-foreground">
            Пока пусто. Откройте любую тему и нажмите{' '}
            <span className="font-semibold text-foreground">«В избранное»</span>
            .
          </div>
        ) : (
          <ul className="mt-8 grid gap-3 sm:grid-cols-2">
            {list.map((f) => (
              <li key={f.id} className="relative">
                <Link
                  to="/n/$id"
                  params={{ id: String(f.id) }}
                  className="flex h-full items-start gap-4 rounded-xl border bg-card p-4 pr-12 transition-colors hover:border-primary/60 hover:bg-accent/60 motion-reduce:transition-none"
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">
                    <NodeIcon icon={f.icon} kind={f.kind} className="size-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-semibold">{f.title}</span>
                    {f.summary && (
                      <span className="mt-1 block text-sm text-muted-foreground">
                        {f.summary}
                      </span>
                    )}
                  </span>
                </Link>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="absolute top-3 right-3"
                  aria-label={`Убрать из избранного: ${f.title}`}
                  disabled={removing === f.id}
                  onClick={() => remove(f.id)}
                >
                  <X />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </PageShell>
  )
}
