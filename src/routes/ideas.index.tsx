import { useState } from 'react'
import {
  Link,
  createFileRoute,
  redirect,
  useRouter,
} from '@tanstack/react-router'
import { Check, ChevronDown, Inbox, Loader2, X } from 'lucide-react'
import { toast } from 'sonner'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PageShell } from '@/components/app/page-shell'
import { RichText } from '@/components/app/rich-text'
import { IdeaStatusBadge } from '@/components/community/idea-status'
import { AuthorName, Avatar, timeAgo } from '@/components/community/user-link'
import {
  getIdeaSections,
  listIdeas,
  reviewIdea,
} from '@/lib/community.functions'
import { errorMessage } from '@/lib/errors'
import { allowed, type IdeaItem } from '@/lib/types'
import { cn } from '@/lib/utils'

const STATUSES = [
  { id: 'pending', label: 'На проверке' },
  { id: 'approved', label: 'Одобренные' },
  { id: 'rejected', label: 'Отклонённые' },
] as const

export const Route = createFileRoute('/ideas/')({
  validateSearch: z.object({
    status: z
      .enum(['pending', 'approved', 'rejected'])
      .optional()
      .catch(undefined),
  }),
  beforeLoad: ({ context }) => {
    if (!allowed(context.session, 'publications.review'))
      throw redirect({ to: '/login', search: { tab: 'team' } })
  },
  loaderDeps: ({ search }) => ({ status: search.status ?? 'pending' }),
  loader: async ({ deps }) => {
    const [data, sections] = await Promise.all([
      listIdeas({ data: { status: deps.status } }),
      getIdeaSections(),
    ])
    return { ...data, sections }
  },
  head: () => ({ meta: [{ title: 'Идеи на проверке — Radmir Helper' }] }),
  component: IdeasQueue,
})

function IdeasQueue() {
  const { session } = Route.useRouteContext()
  const { ideas, pending, sections } = Route.useLoaderData()
  const status = Route.useSearch().status ?? 'pending'

  return (
    <PageShell session={session}>
      <div className="mx-auto max-w-content px-4 py-10 sm:px-6">
        <h1 className="flex items-center gap-3 text-3xl">
          <Inbox className="size-7 text-primary" aria-hidden /> Идеи игроков
        </h1>
        <p className="mt-2 text-muted-foreground">
          Одобренная идея сразу становится темой в выбранном разделе, автор —
          ник игрока.
        </p>

        <nav
          aria-label="Статус"
          className="mt-6 flex gap-1 overflow-x-auto border-b"
        >
          {STATUSES.map((s) => (
            <Link
              key={s.id}
              to="/ideas"
              search={{ status: s.id }}
              className={cn(
                'inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors motion-reduce:transition-none',
                status === s.id
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {s.label}
              {s.id === 'pending' && pending > 0 && (
                <span className="rounded-full bg-primary px-1.5 text-xs text-primary-foreground">
                  {pending}
                </span>
              )}
            </Link>
          ))}
        </nav>

        {ideas.length === 0 ? (
          <div className="mt-8 rounded-xl border border-dashed p-10 text-center text-muted-foreground">
            {status === 'pending'
              ? 'Новых идей нет — всё проверено.'
              : 'Здесь пока пусто.'}
          </div>
        ) : (
          <ul className="mt-6 space-y-4">
            {ideas.map((idea) => (
              <IdeaCard key={idea.id} idea={idea} sections={sections} />
            ))}
          </ul>
        )}
      </div>
    </PageShell>
  )
}

function IdeaCard({
  idea,
  sections,
}: {
  idea: IdeaItem
  sections: { id: number; label: string }[]
}) {
  const router = useRouter()
  const [open, setOpen] = useState(idea.status === 'pending')
  const [sectionId, setSectionId] = useState(
    idea.sectionId ? String(idea.sectionId) : '',
  )
  const [note, setNote] = useState('')
  const [pending, setPending] = useState<'approve' | 'reject' | null>(null)

  async function review(action: 'approve' | 'reject') {
    if (action === 'approve' && !sectionId) {
      toast.error('Выберите раздел для публикации')
      return
    }
    setPending(action)
    try {
      await reviewIdea({
        data: {
          id: idea.id,
          action,
          note,
          sectionId: sectionId ? Number(sectionId) : null,
        },
      })
      toast.success(
        action === 'approve' ? 'Идея опубликована' : 'Идея отклонена',
      )
      await router.invalidate()
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setPending(null)
    }
  }

  return (
    <li className="rounded-xl border bg-card">
      <div className="flex flex-wrap items-start gap-3 p-4 sm:p-5">
        <Avatar name={idea.author} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <AuthorName name={idea.author} role="user" />
            <span
              className="text-xs text-muted-foreground"
              suppressHydrationWarning
            >
              {timeAgo(idea.createdAt)}
            </span>
            <IdeaStatusBadge status={idea.status} />
          </div>
          <h2 className="mt-1 text-lg">{idea.title}</h2>
          {idea.summary && (
            <p className="text-sm text-muted-foreground">{idea.summary}</p>
          )}
          <p className="mt-1 text-xs text-muted-foreground">
            Раздел: {idea.sectionTitle ?? 'не выбран'}
            {idea.reviewedBy && <> · Проверил: {idea.reviewedBy}</>}
            {idea.reviewNote && <> · «{idea.reviewNote}»</>}
          </p>
        </div>
        {idea.nodeId && (
          <Button asChild size="sm" variant="outline">
            <Link to="/n/$id" params={{ id: String(idea.nodeId) }}>
              Открыть тему
            </Link>
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon-sm"
          aria-expanded={open}
          aria-label={open ? 'Свернуть' : 'Показать текст'}
          onClick={() => setOpen((o) => !o)}
        >
          <ChevronDown
            className={cn(
              'transition-transform motion-reduce:transition-none',
              open && 'rotate-180',
            )}
          />
        </Button>
      </div>
      {open && (
        <div className="border-t p-4 sm:p-5">
          <RichText text={idea.content} />
        </div>
      )}
      {idea.status === 'pending' && (
        <div className="grid gap-3 border-t bg-muted/30 p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end sm:p-5">
          <div className="space-y-1.5">
            <Label htmlFor={`sec-${idea.id}`}>Раздел для публикации</Label>
            <select
              id={`sec-${idea.id}`}
              value={sectionId}
              onChange={(e) => setSectionId(e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">— выберите —</option>
              {sections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`note-${idea.id}`}>Комментарий автору</Label>
            <Input
              id={`note-${idea.id}`}
              value={note}
              maxLength={500}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Необязательно"
              className="h-9"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              disabled={pending !== null}
              onClick={() => review('reject')}
            >
              {pending === 'reject' ? (
                <Loader2 className="animate-spin motion-reduce:animate-none" />
              ) : (
                <X />
              )}
              Отклонить
            </Button>
            <Button
              disabled={pending !== null}
              onClick={() => review('approve')}
            >
              {pending === 'approve' ? (
                <Loader2 className="animate-spin motion-reduce:animate-none" />
              ) : (
                <Check />
              )}
              Одобрить
            </Button>
          </div>
        </div>
      )}
    </li>
  )
}
