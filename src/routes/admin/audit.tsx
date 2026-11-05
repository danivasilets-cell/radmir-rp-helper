import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { guard } from '@/components/admin/guard'
import {
  Chips,
  EmptyRow,
  SearchBox,
  SectionHead,
  fmtDate,
} from '@/components/admin/ui'
import { getAuditLog } from '@/lib/admin.functions'
import { ROLE_LABELS, asRole } from '@/lib/permissions'

const ACTORS = [
  { id: 'all', label: 'Все' },
  { id: 'team', label: 'Команда' },
  { id: 'players', label: 'Игроки' },
] as const

export const Route = createFileRoute('/admin/audit')({
  validateSearch: z.object({
    q: z.string().max(100).optional().catch(undefined),
    actor: z.enum(['all', 'team', 'players']).optional().catch(undefined),
    page: z.number().int().min(1).optional().catch(undefined),
  }),
  beforeLoad: guard('audit.view'),
  loaderDeps: ({ search }) => ({
    q: search.q ?? '',
    actor: search.actor ?? 'all',
    page: search.page ?? 1,
  }),
  loader: ({ deps }) => getAuditLog({ data: deps }),
  component: AuditPage,
})

function AuditPage() {
  const { rows, total, pages } = Route.useLoaderData()
  const search = Route.useSearch()
  const page = search.page ?? 1
  const navigate = useNavigate({ from: '/admin/audit' })

  return (
    <div>
      <SectionHead
        title="Журнал действий"
        text={`Все изменения данных, входы и действия пользователей. Записей: ${total}.`}
      />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SearchBox
          value={search.q ?? ''}
          onChange={(q) =>
            navigate({
              search: (s) => ({ ...s, q: q || undefined, page: undefined }),
            })
          }
          placeholder="Действие, ник, объект…"
        />
        <Chips
          label="Кто"
          value={search.actor ?? 'all'}
          options={ACTORS}
          onChange={(actor) =>
            navigate({ search: (s) => ({ ...s, actor, page: undefined }) })
          }
        />
      </div>
      {rows.length === 0 ? (
        <EmptyRow text="Записей не найдено." />
      ) : (
        <div className="rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Когда</TableHead>
                <TableHead>Кто</TableHead>
                <TableHead>Действие</TableHead>
                <TableHead>Объект</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell
                    className="text-xs text-muted-foreground"
                    suppressHydrationWarning
                  >
                    {fmtDate(r.createdAt)}
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">{r.actorLabel}</span>
                    <span className="block text-xs text-muted-foreground">
                      {r.actorRole === 'guest'
                        ? 'Гость'
                        : ROLE_LABELS[asRole(r.actorRole)]}
                    </span>
                  </TableCell>
                  <TableCell>{r.action}</TableCell>
                  <TableCell
                    className="max-w-md truncate text-sm text-muted-foreground"
                    title={r.summary}
                  >
                    {r.summary ||
                      (r.entityType
                        ? `${r.entityType} #${r.entityId ?? ''}`
                        : '—')}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      {pages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-3">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() =>
              navigate({ search: (s) => ({ ...s, page: page - 1 }) })
            }
          >
            Назад
          </Button>
          <span className="text-sm text-muted-foreground">
            {page} / {pages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= pages}
            onClick={() =>
              navigate({ search: (s) => ({ ...s, page: page + 1 }) })
            }
          >
            Дальше
          </Button>
        </div>
      )}
    </div>
  )
}
