import {
  Link,
  createFileRoute,
  useNavigate,
  useRouter,
} from '@tanstack/react-router'
import { Inbox } from 'lucide-react'
import { toast } from 'sonner'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { guard } from '@/components/admin/guard'
import {
  Chips,
  EmptyRow,
  SearchBox,
  SectionHead,
  fmtDate,
} from '@/components/admin/ui'
import { IdeaStatusBadge } from '@/components/community/idea-status'
import { ConfirmDelete } from '@/components/events/confirm-delete'
import { adminDeleteIdea, adminListPublications } from '@/lib/admin.functions'
import { deleteComment } from '@/lib/community.functions'
import { errorMessage } from '@/lib/errors'
import { allowed } from '@/lib/types'

const STATUSES = [
  { id: 'all', label: 'Все' },
  { id: 'pending', label: 'На проверке' },
  { id: 'approved', label: 'Опубликованы' },
  { id: 'rejected', label: 'Отклонены' },
] as const

export const Route = createFileRoute('/admin/publications')({
  validateSearch: z.object({
    q: z.string().max(100).optional().catch(undefined),
    status: z
      .enum(['all', 'pending', 'approved', 'rejected'])
      .optional()
      .catch(undefined),
  }),
  beforeLoad: guard('publications.review'),
  loaderDeps: ({ search }) => ({
    q: search.q ?? '',
    status: search.status ?? 'all',
  }),
  loader: ({ deps }) => adminListPublications({ data: deps }),
  component: PublicationsPage,
})

function PublicationsPage() {
  const { ideas, comments } = Route.useLoaderData()
  const { session, pendingIdeas } = Route.useRouteContext()
  const search = Route.useSearch()
  const navigate = useNavigate({ from: '/admin/publications' })
  const router = useRouter()
  const canDelete = allowed(session, 'content.moderate')

  async function run(action: () => Promise<unknown>, msg: string) {
    try {
      await action()
      toast.success(msg)
      await router.invalidate()
    } catch (err) {
      toast.error(errorMessage(err))
    }
  }

  return (
    <div className="space-y-8">
      <SectionHead
        title="Публикации сообщества"
        text="Идеи игроков и комментарии. Одобрение идей — на странице проверки."
        actions={
          <Button asChild>
            <Link to="/ideas">
              <Inbox /> Проверка идей
              {pendingIdeas > 0 ? ` (${pendingIdeas})` : ''}
            </Link>
          </Button>
        }
      />
      <div className="flex flex-wrap items-center gap-3">
        <SearchBox
          value={search.q ?? ''}
          onChange={(q) =>
            navigate({ search: (s) => ({ ...s, q: q || undefined }) })
          }
          placeholder="Название, ник, текст…"
        />
        <Chips
          label="Статус идеи"
          value={search.status ?? 'all'}
          options={STATUSES}
          onChange={(status) => navigate({ search: (s) => ({ ...s, status }) })}
        />
      </div>
      <section>
        <h3 className="mb-3 text-lg font-semibold">Идеи ({ideas.length})</h3>
        {ideas.length === 0 ? (
          <EmptyRow text="Идей не найдено." />
        ) : (
          <ul className="divide-y rounded-xl border bg-card">
            {ideas.map((i) => (
              <li
                key={i.id}
                className="flex flex-wrap items-center gap-3 px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  {i.nodeId ? (
                    <Link
                      to="/n/$id"
                      params={{ id: String(i.nodeId) }}
                      className="font-semibold hover:text-primary"
                    >
                      {i.title}
                    </Link>
                  ) : (
                    <p className="font-semibold">{i.title}</p>
                  )}
                  <p
                    className="text-xs text-muted-foreground"
                    suppressHydrationWarning
                  >
                    {i.author} · {fmtDate(i.createdAt)}
                    {i.reviewedBy && ` · проверил ${i.reviewedBy}`}
                  </p>
                </div>
                <IdeaStatusBadge status={i.status} />
                {canDelete && (
                  <ConfirmDelete
                    title={i.title}
                    onConfirm={() =>
                      run(
                        () => adminDeleteIdea({ data: { id: i.id } }),
                        'Идея удалена',
                      )
                    }
                  />
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
      <section>
        <h3 className="mb-3 text-lg font-semibold">
          Комментарии ({comments.length})
        </h3>
        {comments.length === 0 ? (
          <EmptyRow text="Комментариев не найдено." />
        ) : (
          <ul className="divide-y rounded-xl border bg-card">
            {comments.map((c) => (
              <li key={c.id} className="flex items-start gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p
                    className="text-xs text-muted-foreground"
                    suppressHydrationWarning
                  >
                    <span className="font-semibold text-foreground">
                      {c.authorName}
                    </span>{' '}
                    в{' '}
                    <Link
                      to="/n/$id"
                      params={{ id: String(c.nodeId) }}
                      className="text-primary hover:underline"
                    >
                      {c.nodeTitle}
                    </Link>{' '}
                    · {fmtDate(c.createdAt)}
                  </p>
                  <p className="mt-1 line-clamp-3 text-sm whitespace-pre-line">
                    {c.text}
                  </p>
                </div>
                {canDelete && (
                  <ConfirmDelete
                    title={`комментарий ${c.authorName}`}
                    onConfirm={() =>
                      run(
                        () => deleteComment({ data: { id: c.id } }),
                        'Комментарий удалён',
                      )
                    }
                  />
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
