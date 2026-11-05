import { useState } from 'react'
import {
  Link,
  createFileRoute,
  useNavigate,
  useRouter,
} from '@tanstack/react-router'
import { Check, ExternalLink, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { guard } from '@/components/admin/guard'
import { Chips, EmptyRow, SectionHead, fmtDate } from '@/components/admin/ui'
import { ConfirmDelete } from '@/components/events/confirm-delete'
import { handleReport, listReports } from '@/lib/admin.functions'
import { errorMessage } from '@/lib/errors'

const STATUSES = [
  { id: 'open', label: 'Открытые' },
  { id: 'resolved', label: 'Решённые' },
  { id: 'dismissed', label: 'Отклонённые' },
] as const

const TARGET = {
  node: 'Статья',
  comment: 'Комментарий',
  idea: 'Идея',
  user: 'Пользователь',
} as Record<string, string>

export const Route = createFileRoute('/admin/reports')({
  validateSearch: z.object({
    status: z
      .enum(['open', 'resolved', 'dismissed'])
      .optional()
      .catch(undefined),
  }),
  beforeLoad: guard('reports.handle'),
  loaderDeps: ({ search }) => ({ status: search.status ?? 'open' }),
  loader: ({ deps }) => listReports({ data: deps }),
  component: ReportsPage,
})

function ReportsPage() {
  const reports = Route.useLoaderData()
  const status = Route.useSearch().status ?? 'open'
  const navigate = useNavigate({ from: '/admin/reports' })
  const router = useRouter()
  const [notes, setNotes] = useState<Record<number, string>>({})
  const [busy, setBusy] = useState<number | null>(null)

  async function act(id: number, action: 'dismiss' | 'resolve' | 'remove') {
    setBusy(id)
    try {
      await handleReport({ data: { id, action, note: notes[id] ?? '' } })
      toast.success(
        action === 'dismiss'
          ? 'Жалоба отклонена'
          : action === 'remove'
            ? 'Материал удалён, жалоба закрыта'
            : 'Жалоба решена',
      )
      await router.invalidate()
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setBusy(null)
    }
  }

  return (
    <div>
      <SectionHead
        title="Жалобы"
        text="Жалобы игроков на статьи, комментарии, идеи и пользователей."
      />
      <Chips
        label="Статус"
        value={status}
        options={STATUSES}
        onChange={(s) => navigate({ search: { status: s } })}
      />
      <div className="mt-5 space-y-3">
        {reports.length === 0 ? (
          <EmptyRow
            text={
              status === 'open' ? 'Открытых жалоб нет — всё чисто.' : 'Пусто.'
            }
          />
        ) : (
          reports.map((r) => (
            <article key={r.id} className="rounded-xl border bg-card p-4">
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="rounded-full bg-primary/15 px-2 py-0.5 font-semibold text-primary">
                  {TARGET[r.targetType] ?? r.targetType}
                </span>
                <span>от {r.reporterName || 'удалённого игрока'}</span>
                <span suppressHydrationWarning>· {fmtDate(r.createdAt)}</span>
              </div>
              <p className="mt-2 font-semibold break-words">{r.targetTitle}</p>
              <p className="mt-1 text-sm">Причина: {r.reason}</p>
              {r.status !== 'open' && (
                <p className="mt-1 text-sm text-muted-foreground">
                  {r.handledBy}: {r.resolution || 'без комментария'}
                </p>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {r.contextNodeId && (
                  <Button asChild size="sm" variant="ghost">
                    <Link to="/n/$id" params={{ id: String(r.contextNodeId) }}>
                      <ExternalLink /> Открыть
                    </Link>
                  </Button>
                )}
                {r.targetType === 'user' && (
                  <Button asChild size="sm" variant="ghost">
                    <Link to="/admin/users" search={{ q: r.targetTitle }}>
                      <ExternalLink /> К пользователю
                    </Link>
                  </Button>
                )}
                {r.status === 'open' && (
                  <>
                    <Input
                      aria-label="Комментарий к решению"
                      className="h-8 max-w-xs flex-1"
                      placeholder="Комментарий (необязательно)"
                      value={notes[r.id] ?? ''}
                      onChange={(e) =>
                        setNotes({ ...notes, [r.id]: e.target.value })
                      }
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy === r.id}
                      onClick={() => act(r.id, 'dismiss')}
                    >
                      <X /> Отклонить
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy === r.id}
                      onClick={() => act(r.id, 'resolve')}
                    >
                      <Check /> Решено
                    </Button>
                    <ConfirmDelete
                      title={r.targetTitle.slice(0, 60)}
                      actionLabel={
                        r.targetType === 'user' ? 'Заблокировать' : 'Удалить'
                      }
                      description={
                        r.targetType === 'user'
                          ? 'Пользователь будет заблокирован, жалоба закроется.'
                          : 'Материал будет удалён, жалоба закроется.'
                      }
                      trigger={
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={busy === r.id}
                        >
                          <Trash2 />{' '}
                          {r.targetType === 'user'
                            ? 'Заблокировать'
                            : 'Удалить материал'}
                        </Button>
                      }
                      onConfirm={() => act(r.id, 'remove')}
                    />
                  </>
                )}
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  )
}
