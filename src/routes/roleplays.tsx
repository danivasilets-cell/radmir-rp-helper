import { useMemo, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Plus, Search, Theater } from 'lucide-react'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PageShell } from '@/components/app/page-shell'
import { RoleplayEditor, type EditState } from '@/components/admin/editors'
import { RoleplayCard } from '@/components/roleplay/roleplay-card'
import { listOrganizations, listRoleplays } from '@/lib/catalog.functions'
import { allowed, isPlayer, type Roleplay } from '@/lib/types'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/roleplays')({
  validateSearch: z.object({
    kind: z.enum(['action', 'scenario']).optional().catch(undefined),
    org: z.number().int().positive().optional().catch(undefined),
  }),
  loader: async () => {
    const [rp, organizations] = await Promise.all([
      listRoleplays({ data: {} }),
      listOrganizations({ data: {} }),
    ])
    return { ...rp, organizations }
  },
  head: () => ({
    meta: [
      { title: 'Отыгровки и RP-сценарии — Radmir Helper' },
      {
        name: 'description',
        content:
          'Готовые отыгровки /me, /do и сценарии RP-ситуаций для организаций Радмир РП.',
      },
    ],
  }),
  component: RoleplaysPage,
})

function RoleplaysPage() {
  const { session } = Route.useRouteContext()
  const { items, saved, organizations } = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = useNavigate({ from: '/roleplays' })
  const [q, setQ] = useState('')
  const [editor, setEditor] = useState<EditState<Roleplay>>(null)
  const canEdit = allowed(session, 'catalog.manage')
  const player = isPlayer(session)

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return items.filter(
      (r) =>
        (!search.kind || r.kind === search.kind) &&
        (!search.org || r.organizationId === search.org) &&
        (!needle ||
          r.title.toLowerCase().includes(needle) ||
          r.category.toLowerCase().includes(needle) ||
          r.content.toLowerCase().includes(needle)),
    )
  }, [items, q, search.kind, search.org])

  const chip = (active: boolean) =>
    cn(
      'rounded-full border px-3 py-1 text-sm font-medium transition-colors motion-reduce:transition-none',
      active
        ? 'border-primary bg-primary text-primary-foreground'
        : 'hover:border-primary/60',
    )

  return (
    <PageShell session={session}>
      <section className="bg-grid border-b border-border/70">
        <div className="mx-auto max-w-content px-4 py-10 sm:px-6">
          <h1 className="flex items-center gap-3 text-3xl">
            <Theater className="size-7 text-primary" aria-hidden /> Отыгровки и
            RP-сценарии
          </h1>
          <p className="mt-2 max-w-reading text-muted-foreground">
            Готовые строки для чата и планы RP-ситуаций. Сохраняйте нужные в
            личном кабинете
            {player ? '' : ' — для этого войдите как игрок'}.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <div className="relative min-w-60 flex-1 sm:max-w-sm">
              <Search
                className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                aria-label="Поиск по отыгровкам"
                className="pl-9"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Поиск: наручники, ДТП…"
              />
            </div>
            {canEdit && (
              <Button onClick={() => setEditor({ item: null })}>
                <Plus /> Добавить
              </Button>
            )}
          </div>
          <div
            className="mt-4 flex flex-wrap gap-2"
            role="group"
            aria-label="Тип"
          >
            {([undefined, 'action', 'scenario'] as const).map((k) => (
              <button
                key={k ?? 'all'}
                type="button"
                aria-pressed={search.kind === k}
                className={chip(search.kind === k)}
                onClick={() => navigate({ search: (s) => ({ ...s, kind: k }) })}
              >
                {k === 'action'
                  ? 'Отыгровки'
                  : k === 'scenario'
                    ? 'Сценарии'
                    : 'Все'}
              </button>
            ))}
            <span className="mx-1 w-px bg-border" aria-hidden />
            {organizations.map((o) => (
              <button
                key={o.id}
                type="button"
                aria-pressed={search.org === o.id}
                className={chip(search.org === o.id)}
                onClick={() =>
                  navigate({
                    search: (s) => ({
                      ...s,
                      org: s.org === o.id ? undefined : o.id,
                    }),
                  })
                }
              >
                {o.name}
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-content px-4 py-8 sm:px-6">
        {list.length === 0 ? (
          <p className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">
            {items.length === 0
              ? 'Записей пока нет.'
              : 'Ничего не найдено — измените фильтры.'}
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {list.map((r) => (
              <RoleplayCard
                key={r.id}
                item={r}
                saved={player ? saved.includes(r.id) : null}
                canEdit={canEdit}
                onEdit={(item) => setEditor({ item })}
              />
            ))}
          </div>
        )}
      </div>
      {canEdit && (
        <RoleplayEditor
          state={editor}
          onClose={() => setEditor(null)}
          organizations={organizations}
          defaultKind={search.kind ?? 'action'}
        />
      )}
    </PageShell>
  )
}
