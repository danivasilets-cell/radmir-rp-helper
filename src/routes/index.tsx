import { useState } from 'react'
import { allowed } from '@/lib/types'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import {
  ArrowRight,
  Lightbulb,
  Loader2,
  Plus,
  Search,
  Sparkles,
  History,
  Trophy,
} from 'lucide-react'
import { NewsPanel } from '@/components/app/news-panel'
import { OnlineWidget } from '@/components/app/online-widget'
import { NodeIcon } from '@/components/app/node-icon'
import { useRecentlyViewed } from '@/lib/recent'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NodeEditor, type EditorState } from '@/components/app/node-editor'
import { NodeGrid } from '@/components/app/node-grid'
import { PageShell } from '@/components/app/page-shell'
import { QuickLinks } from '@/components/app/quick-links'
import { RoleBadge } from '@/components/app/site-header'
import { getHome } from '@/lib/api.functions'
import { useRandomTopic } from '@/lib/use-random-topic'

export const Route = createFileRoute('/')({
  loader: () => getHome(),
  component: Home,
})

const QUICK_TAGS = ['Задержание', 'ДТП', 'Собеседование', 'Лекция', 'Жалоба']

function Home() {
  const { sections, topicCount, recent, nextPrize, today, quickLinks, news } =
    Route.useLoaderData()
  const { session, navSections } = Route.useRouteContext()
  const ideasSection = navSections.find(
    (s) => s.title.trim().toLowerCase() === 'идеи для рп',
  )
  const navigate = useNavigate()
  const random = useRandomTopic()
  const [query, setQuery] = useState('')
  const [editor, setEditor] = useState<EditorState | null>(null)
  const owner = allowed(session, 'content.manage')

  return (
    <PageShell session={session}>
      <section className="bg-grid relative overflow-hidden border-b border-border/70">
        <div className="mx-auto grid max-w-wide items-center gap-10 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[1fr_auto]">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold tracking-wider text-primary uppercase">
              <Sparkles className="size-3.5" aria-hidden /> Радмир РП · помощник
              игрока
            </p>
            <h1 className="mt-4 max-w-3xl text-4xl leading-tight sm:text-5xl">
              Идеи для РП, отыгровки и гайды —{' '}
              <span className="bg-gradient-to-r from-primary to-chart-5 bg-clip-text text-transparent">
                в одном месте
              </span>
            </h1>
            <p className="mt-4 max-w-reading text-lg text-muted-foreground">
              Выберите раздел, найдите сценарий для своей организации и
              отыграйте его на сервере. Следите за ивентами, таблицами и
              призами.
            </p>

            <form
              className="mt-8 flex max-w-2xl flex-wrap gap-2"
              role="search"
              onSubmit={(e) => {
                e.preventDefault()
                void navigate({ to: '/search', search: { q: query.trim() } })
              }}
            >
              <label htmlFor="home-search" className="sr-only">
                Поиск по темам
              </label>
              <div className="relative min-w-48 flex-1">
                <Input
                  id="home-search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Например: задержание, ДТП, сходка…"
                  className="h-12 bg-card pr-10 shadow-sm"
                />
                <kbd className="pointer-events-none absolute top-1/2 right-3 hidden -translate-y-1/2 rounded border bg-muted px-1.5 text-xs text-muted-foreground sm:block">
                  /
                </kbd>
              </div>
              <Button type="submit" size="lg" className="h-12">
                <Search /> Найти
              </Button>
              {ideasSection ? (
                <Button asChild variant="secondary" size="lg" className="h-12">
                  <Link to="/n/$id" params={{ id: String(ideasSection.id) }}>
                    <Lightbulb /> Идеи для РП
                  </Link>
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="secondary"
                  size="lg"
                  className="h-12"
                  onClick={() => void random.go()}
                  disabled={random.pending}
                >
                  {random.pending ? (
                    <Loader2 className="animate-spin motion-reduce:animate-none" />
                  ) : (
                    <Lightbulb />
                  )}
                  Идеи для РП
                </Button>
              )}
            </form>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {QUICK_TAGS.map((t) => (
                <Link
                  key={t}
                  to="/search"
                  search={{ q: t.toLowerCase() }}
                  className="rounded-full border bg-card/70 px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/60 hover:text-foreground motion-reduce:transition-none"
                >
                  {t}
                </Link>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <dl className="flex gap-6 text-sm">
                <div>
                  <dt className="text-muted-foreground">Разделов</dt>
                  <dd className="font-display text-2xl text-foreground">
                    {sections.length}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Тем</dt>
                  <dd className="font-display text-2xl text-foreground">
                    {topicCount}
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          <div aria-hidden className="relative hidden lg:block">
            <div className="absolute inset-0 rounded-full bg-primary/30 blur-3xl" />
            <img
              src="/logo.png"
              alt=""
              width={260}
              height={260}
              className="relative size-64 object-contain drop-shadow-2xl"
            />
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-wide gap-8 px-4 pt-12 sm:px-6 xl:grid-cols-[minmax(0,1fr)_24rem] xl:grid-rows-[auto_1fr]">
        <section className="min-w-0 space-y-6 xl:col-start-1 xl:row-start-1">
          <OnlineWidget />
          {nextPrize && <NextEvent prize={nextPrize} today={today} />}
          <RecentlyViewed />
          <QuickLinks
            links={quickLinks}
            owner={allowed(session, 'settings.manage')}
          />
        </section>

        <NewsPanel
          items={news}
          canManage={allowed(session, 'news.manage')}
          className="xl:sticky xl:top-20 xl:col-start-2 xl:row-span-2 xl:row-start-1 xl:max-h-[calc(100vh-6rem)] xl:self-start"
        />
        <section className="min-w-0 pb-12 xl:col-start-1 xl:row-start-2">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl">Разделы</h2>
              <RoleBadge session={session} />
            </div>
            {owner && (
              <Button
                onClick={() =>
                  setEditor({
                    mode: 'create',
                    parentId: null,
                    kind: 'section',
                    allowKindChoice: true,
                  })
                }
              >
                <Plus /> Новый раздел
              </Button>
            )}
          </div>

          {sections.length === 0 ? (
            <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">
              Разделов пока нет.{owner ? ' Добавьте первый раздел.' : ''}
            </div>
          ) : (
            <NodeGrid items={sections} session={session} large />
          )}
        </section>
      </div>

      {recent.length > 0 && (
        <section className="border-t border-border/70 bg-muted/30">
          <div className="mx-auto max-w-wide px-4 py-8 sm:px-6">
            <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-muted-foreground">
              <History className="size-4" aria-hidden /> Недавно добавлено
            </h2>
            <ul className="grid gap-x-4 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
              {recent.map((n) => (
                <li key={n.id}>
                  <Link
                    to="/n/$id"
                    params={{ id: String(n.id) }}
                    className="group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-accent motion-reduce:transition-none"
                  >
                    <NodeIcon
                      icon={n.icon}
                      kind={n.kind}
                      className="size-4 shrink-0 text-primary"
                    />
                    <span className="truncate group-hover:text-foreground">
                      {n.title}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <NodeEditor state={editor} onClose={() => setEditor(null)} />
    </PageShell>
  )
}

function daysLabel(days: number) {
  if (days === 0) return 'Сегодня!'
  const m10 = days % 10
  const m100 = days % 100
  const word =
    m10 === 1 && m100 !== 11
      ? 'день'
      : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)
        ? 'дня'
        : 'дней'
  return `Через ${days} ${word}`
}

function NextEvent({
  prize,
  today,
}: {
  prize: { title: string; reward: string; eventDate: string | null }
  today: string
}) {
  const days = prize.eventDate
    ? Math.round((Date.parse(prize.eventDate) - Date.parse(today)) / 86_400_000)
    : null
  return (
    <Link
      to="/events/prizes"
      className="group relative flex flex-wrap items-center gap-4 overflow-hidden rounded-xl border border-primary/40 bg-gradient-to-r from-primary/20 via-primary/5 to-transparent p-5 transition-colors hover:border-primary motion-reduce:transition-none"
    >
      <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/30">
        <Trophy className="size-6" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-semibold tracking-wider text-primary uppercase">
          Ближайший ивент{days !== null && <> · {daysLabel(days)}</>}
        </span>
        <span className="block font-display text-lg">{prize.title}</span>
        <span className="block text-sm text-muted-foreground">
          Приз:{' '}
          <span className="font-semibold text-foreground">{prize.reward}</span>
        </span>
      </span>
      <span className="inline-flex items-center gap-1 text-sm font-semibold text-primary">
        Подробнее{' '}
        <ArrowRight className="size-4 transition-transform group-hover:translate-x-1 motion-reduce:transition-none" />
      </span>
    </Link>
  )
}

function RecentlyViewed() {
  const items = useRecentlyViewed()
  if (items.length === 0) return null
  return (
    <div>
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold tracking-wider text-muted-foreground uppercase">
        <History className="size-4" aria-hidden /> Вы недавно смотрели
      </h2>
      <ul className="flex gap-2 overflow-x-auto pb-1">
        {items.map((f) => (
          <li key={f.id} className="shrink-0">
            <Link
              to="/n/$id"
              params={{ id: String(f.id) }}
              className="flex max-w-64 items-center gap-2 rounded-full border bg-card px-3 py-1.5 text-sm transition-colors hover:border-primary/60 motion-reduce:transition-none"
            >
              <NodeIcon
                icon={f.icon}
                kind={f.kind}
                className="size-4 text-primary"
              />
              <span className="truncate">{f.title}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
