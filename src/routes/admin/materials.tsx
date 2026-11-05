import {
  Link,
  createFileRoute,
  useNavigate,
  useRouter,
} from '@tanstack/react-router'
import { ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { NodeIcon } from '@/components/app/node-icon'
import { guard } from '@/components/admin/guard'
import {
  Chips,
  EmptyRow,
  SearchBox,
  SectionHead,
  fmtDate,
} from '@/components/admin/ui'
import { ConfirmDelete } from '@/components/events/confirm-delete'
import { adminListNodes } from '@/lib/admin.functions'
import { deleteNode } from '@/lib/api.functions'
import { errorMessage } from '@/lib/errors'
import { allowed } from '@/lib/types'

const KINDS = [
  { id: 'all', label: 'Все' },
  { id: 'section', label: 'Разделы' },
  { id: 'topic', label: 'Статьи' },
] as const

export const Route = createFileRoute('/admin/materials')({
  validateSearch: z.object({
    q: z.string().max(100).optional().catch(undefined),
    kind: z.enum(['all', 'section', 'topic']).optional().catch(undefined),
  }),
  beforeLoad: guard('content.moderate'),
  loaderDeps: ({ search }) => ({
    q: search.q ?? '',
    kind: search.kind ?? 'all',
  }),
  loader: ({ deps }) => adminListNodes({ data: deps }),
  component: MaterialsPage,
})

function MaterialsPage() {
  const rows = Route.useLoaderData()
  const { session } = Route.useRouteContext()
  const search = Route.useSearch()
  const navigate = useNavigate({ from: '/admin/materials' })
  const router = useRouter()
  const manage = allowed(session, 'content.manage')

  return (
    <div>
      <SectionHead
        title="Статьи и разделы"
        text={
          manage
            ? 'Поиск по всем материалам. Создание и редактирование — прямо на страницах разделов.'
            : 'Модератор может удалять статьи, нарушающие правила. Разделы удаляет администратор.'
        }
      />
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <SearchBox
          value={search.q ?? ''}
          onChange={(q) =>
            navigate({ search: (s) => ({ ...s, q: q || undefined }) })
          }
          placeholder="Название или текст…"
        />
        <Chips
          label="Тип"
          value={search.kind ?? 'all'}
          options={KINDS}
          onChange={(kind) => navigate({ search: (s) => ({ ...s, kind }) })}
        />
      </div>
      {rows.length === 0 ? (
        <EmptyRow text="Ничего не найдено." />
      ) : (
        <ul className="divide-y rounded-xl border bg-card">
          {rows.map((n) => {
            const deletable = manage || n.kind === 'topic'
            return (
              <li key={n.id} className="flex items-center gap-3 px-4 py-3">
                <NodeIcon
                  icon={n.icon}
                  kind={n.kind}
                  className="size-5 shrink-0 text-primary"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{n.title}</p>
                  <p
                    className="truncate text-xs text-muted-foreground"
                    suppressHydrationWarning
                  >
                    {n.kind === 'section' ? 'Раздел' : 'Статья'}
                    {n.parentTitle && ` · в «${n.parentTitle}»`}
                    {n.server && ` · ${n.server}`} · {n.createdBy || '—'} ·{' '}
                    {fmtDate(n.updatedAt)}
                  </p>
                </div>
                <Button
                  asChild
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Открыть ${n.title}`}
                >
                  <Link to="/n/$id" params={{ id: String(n.id) }}>
                    <ExternalLink />
                  </Link>
                </Button>
                {deletable && (
                  <ConfirmDelete
                    title={n.title}
                    description={
                      n.children > 0
                        ? `Внутри ${n.children} вложенных пунктов — они тоже будут удалены.`
                        : 'Это действие нельзя отменить.'
                    }
                    confirmText={
                      n.kind === 'section' || n.children > 0
                        ? n.title
                        : undefined
                    }
                    onConfirm={async () => {
                      try {
                        await deleteNode({ data: { id: n.id } })
                        toast.success('Удалено')
                        await router.invalidate()
                      } catch (err) {
                        toast.error(errorMessage(err))
                      }
                    }}
                  />
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
