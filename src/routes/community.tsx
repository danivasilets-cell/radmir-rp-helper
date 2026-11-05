import { Link, createFileRoute } from '@tanstack/react-router'
import { Lightbulb, MessagesSquare, Trophy, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageShell } from '@/components/app/page-shell'
import { Avatar } from '@/components/community/user-link'
import { getCommunity } from '@/lib/community.functions'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/community')({
  loader: () => getCommunity(),
  head: () => ({ meta: [{ title: 'Сообщество — Radmir Helper' }] }),
  component: CommunityPage,
})

const PLACE = ['text-chart-5', 'text-muted-foreground', 'text-primary']

function CommunityPage() {
  const { session } = Route.useRouteContext()
  const { top, latestIdeas, players } = Route.useLoaderData()

  return (
    <PageShell session={session}>
      <section className="bg-grid border-b border-border/70">
        <div className="mx-auto flex max-w-content flex-wrap items-end justify-between gap-6 px-4 py-12 sm:px-6">
          <div>
            <p className="text-sm font-semibold tracking-wider text-primary uppercase">
              Сообщество
            </p>
            <h1 className="mt-2 flex items-center gap-3 text-3xl sm:text-4xl">
              <MessagesSquare className="size-8 text-primary" aria-hidden />{' '}
              Игроки и их идеи
            </h1>
            <p className="mt-2 max-w-reading text-muted-foreground">
              Предлагайте RP-идеи, обсуждайте темы в комментариях и оценивайте
              материалы. Уже{' '}
              <span className="font-semibold text-foreground">{players}</span>{' '}
              игроков с нами.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild size="lg">
              <Link to="/ideas/new">
                <Lightbulb /> Предложить идею
              </Link>
            </Button>
            {!session && (
              <Button asChild size="lg" variant="outline">
                <Link to="/login" search={{ tab: 'player' }}>
                  Регистрация
                </Link>
              </Button>
            )}
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-content gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_22rem]">
        <section>
          <h2 className="mb-4 text-2xl">Новые идеи от игроков</h2>
          {latestIdeas.length === 0 ? (
            <p className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">
              Опубликованных идей пока нет. Ваша может стать первой!
            </p>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {latestIdeas.map((i) => (
                <li key={i.id}>
                  <Link
                    to={i.nodeId ? '/n/$id' : '/u/$nickname'}
                    params={
                      i.nodeId
                        ? { id: String(i.nodeId) }
                        : { nickname: i.author }
                    }
                    className="flex h-full flex-col rounded-xl border bg-card p-4 transition-colors hover:border-primary/60 motion-reduce:transition-none"
                  >
                    <span className="font-semibold">{i.title}</span>
                    {i.summary && (
                      <span className="mt-1 text-sm text-muted-foreground">
                        {i.summary}
                      </span>
                    )}
                    <span className="mt-auto flex items-center gap-2 pt-3 text-xs text-muted-foreground">
                      <Avatar
                        name={i.author}
                        className="size-5 text-[0.6rem]"
                      />{' '}
                      {i.author}
                      {i.sectionTitle && <> · {i.sectionTitle}</>}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <aside>
          <h2 className="mb-4 flex items-center gap-2 text-2xl">
            <Trophy className="size-6 text-chart-5" aria-hidden /> Активные
            игроки
          </h2>
          {top.length === 0 ? (
            <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
              <Users className="mx-auto mb-2 size-6" aria-hidden />
              Пока никто не зарегистрировался.
            </p>
          ) : (
            <ol className="divide-y rounded-xl border bg-card">
              {top.map((u, i) => (
                <li key={u.nickname}>
                  <Link
                    to="/u/$nickname"
                    params={{ nickname: u.nickname }}
                    className="flex items-center gap-3 p-3 transition-colors hover:bg-accent/50 motion-reduce:transition-none"
                  >
                    <span
                      className={cn(
                        'w-5 text-center font-display',
                        PLACE[i] ?? 'text-muted-foreground',
                      )}
                    >
                      {i + 1}
                    </span>
                    <Avatar name={u.nickname} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">
                        {u.nickname}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {u.approved} идей · {u.comments} комм.
                        {u.faction && <> · {u.faction}</>}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </aside>
      </div>
    </PageShell>
  )
}
