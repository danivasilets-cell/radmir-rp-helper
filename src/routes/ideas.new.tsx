import { useState, type FormEvent } from 'react'
import { isPlayer } from '@/lib/types'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { CheckCircle2, Lightbulb, Loader2, Send } from 'lucide-react'
import { toast } from 'sonner'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PageShell } from '@/components/app/page-shell'
import { ContentEditor } from '@/components/app/content-editor'
import { RichText } from '@/components/app/rich-text'
import { getIdeaSections, submitIdea } from '@/lib/community.functions'
import { errorMessage } from '@/lib/errors'

export const Route = createFileRoute('/ideas/new')({
  validateSearch: z.object({
    section: z.number().int().positive().optional().catch(undefined),
  }),
  loader: () => getIdeaSections(),
  head: () => ({ meta: [{ title: 'Предложить RP-идею — Radmir Helper' }] }),
  component: NewIdeaPage,
})

const TEMPLATE = `## Суть
Коротко: что происходит и кто участвует.

## Как отыграть
/me ...
/do ...
/try ...

## Советы
- ...`

function NewIdeaPage() {
  const { session } = Route.useRouteContext()
  const sections = Route.useLoaderData()
  const { section } = Route.useSearch()
  const player = isPlayer(session)

  return (
    <PageShell session={session}>
      <div className="bg-grid border-b border-border/70">
        <div className="mx-auto max-w-content px-4 py-10 sm:px-6">
          <p className="text-sm font-semibold tracking-wider text-primary uppercase">
            Сообщество
          </p>
          <h1 className="mt-2 flex items-center gap-3 text-3xl sm:text-4xl">
            <Lightbulb className="size-8 text-primary" aria-hidden /> Предложить
            RP-идею
          </h1>
          <p className="mt-2 max-w-reading text-muted-foreground">
            Придумали интересную ситуацию для отыгровки? Опишите её — модераторы
            проверят идею и опубликуют в нужном разделе с вашим ником.
          </p>
        </div>
      </div>
      <div className="mx-auto max-w-content px-4 py-10 sm:px-6">
        {player ? (
          <IdeaForm sections={sections} initialSection={section} />
        ) : (
          <div className="max-w-reading rounded-xl border bg-card p-6">
            <p className="font-semibold">
              {session
                ? 'Идеи предлагают игроки.'
                : 'Чтобы предложить идею, нужен аккаунт игрока.'}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {session
                ? 'Команда сайта добавляет темы напрямую в разделах. Проверить идеи игроков можно в очереди.'
                : 'Регистрация занимает полминуты — достаточно ника и пароля.'}
            </p>
            <Button asChild className="mt-4">
              {session ? (
                <Link to="/ideas">Идеи на проверке</Link>
              ) : (
                <Link to="/login" search={{ tab: 'player' }}>
                  Войти или зарегистрироваться
                </Link>
              )}
            </Button>
          </div>
        )}
      </div>
    </PageShell>
  )
}

function IdeaForm({
  sections,
  initialSection,
}: {
  sections: { id: number; label: string }[]
  initialSection?: number
}) {
  const navigate = useNavigate()
  const { session } = Route.useRouteContext()
  const [sectionId, setSectionId] = useState(
    initialSection && sections.some((s) => s.id === initialSection)
      ? String(initialSection)
      : '',
  )
  const [title, setTitle] = useState('')
  const [summary, setSummary] = useState('')
  const [content, setContent] = useState('')
  const [preview, setPreview] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [done, setDone] = useState(false)
  const [uploading, setUploading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (title.trim().length < 3) return setError('Введите название идеи')
    if (content.trim().length < 20)
      return setError('Опишите идею подробнее — минимум 20 символов')
    setPending(true)
    setError(null)
    try {
      await submitIdea({
        data: {
          sectionId: sectionId ? Number(sectionId) : null,
          title,
          summary,
          content,
        },
      })
      toast.success('Идея отправлена на проверку')
      setDone(true)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setPending(false)
    }
  }

  if (done)
    return (
      <div className="max-w-reading rounded-xl border bg-card p-8 text-center">
        <CheckCircle2 className="mx-auto size-12 text-chart-3" aria-hidden />
        <h2 className="mt-4 text-2xl">Спасибо! Идея на проверке</h2>
        <p className="mt-2 text-muted-foreground">
          Статус можно отслеживать в профиле. После одобрения тема появится на
          сайте с вашим ником.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setDone(false)
              setTitle('')
              setSummary('')
              setContent('')
            }}
          >
            Предложить ещё
          </Button>
          {session && (
            <Button
              onClick={() =>
                navigate({
                  to: '/u/$nickname',
                  params: { nickname: session.label },
                })
              }
            >
              В профиль
            </Button>
          )}
        </div>
      </div>
    )

  return (
    <form
      onSubmit={handleSubmit}
      className="grid gap-6 lg:grid-cols-[1fr_18rem]"
      noValidate
    >
      <div className="space-y-5 rounded-xl border bg-card p-5 sm:p-6">
        <div className="space-y-2">
          <Label htmlFor="i-section">Раздел</Label>
          <select
            id="i-section"
            value={sectionId}
            onChange={(e) => setSectionId(e.target.value)}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">Не знаю — пусть решит модератор</option>
            {sections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="i-title">Название</Label>
          <Input
            id="i-title"
            value={title}
            maxLength={150}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Например: Погоня за угнанным авто"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="i-summary">Кратко (необязательно)</Label>
          <Input
            id="i-summary"
            value={summary}
            maxLength={300}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Одна строка — о чём идея"
          />
        </div>
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Label htmlFor="i-content">Описание и отыгровка</Label>
            <div className="flex gap-1">
              {!content && (
                <Button
                  type="button"
                  size="xs"
                  variant="secondary"
                  onClick={() => setContent(TEMPLATE)}
                >
                  Вставить шаблон
                </Button>
              )}
              <Button
                type="button"
                size="xs"
                variant="outline"
                aria-pressed={preview}
                onClick={() => setPreview((p) => !p)}
              >
                {preview ? 'Редактировать' : 'Предпросмотр'}
              </Button>
            </div>
          </div>
          {preview ? (
            <div className="min-h-48 rounded-md border bg-background p-4">
              {content.trim() ? (
                <RichText text={content} />
              ) : (
                <p className="text-sm text-muted-foreground">Пока пусто</p>
              )}
            </div>
          ) : (
            <ContentEditor
              id="i-content"
              rows={12}
              maxLength={20000}
              value={content}
              onChange={setContent}
              onBusyChange={setUploading}
              placeholder="Опишите ситуацию, роли участников и примеры команд /me, /do, /try"
            />
          )}
        </div>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <Button type="submit" size="lg" disabled={pending || uploading}>
          {pending ? (
            <Loader2 className="animate-spin motion-reduce:animate-none" />
          ) : (
            <Send />
          )}
          Отправить на проверку
        </Button>
      </div>
      <aside className="h-fit space-y-3 rounded-xl border bg-muted/40 p-5 text-sm">
        <h2 className="text-base">Как пишется хорошая идея</h2>
        <ul className="space-y-2 text-muted-foreground">
          <li>• Понятно, кто участвует и где всё происходит.</li>
          <li>• Есть примеры команд /me, /do, /try.</li>
          <li>• Не нарушает правила сервера (ДМ, МГ, ПГ).</li>
          <li>
            • Выделите текст и нажмите «Жирный» (Ctrl+B), фото — кнопкой «Фото»
            или вставкой из буфера.
          </li>
        </ul>
      </aside>
    </form>
  )
}
