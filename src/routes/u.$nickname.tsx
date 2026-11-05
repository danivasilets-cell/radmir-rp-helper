import { Link, createFileRoute, notFound } from '@tanstack/react-router'
import {
  CalendarDays,
  Heart,
  Lightbulb,
  MessageSquare,
  Pencil,
  Server,
  Shield,
  Star,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageShell } from '@/components/app/page-shell'
import { IdeaStatusBadge } from '@/components/community/idea-status'
import { Avatar, timeAgo } from '@/components/community/user-link'
import { getProfile } from '@/lib/community.functions'
import { ROLE_LABELS, asRole } from '@/lib/permissions'

export const Route = createFileRoute('/u/$nickname')({
  loader: async ({ params }) => {
    const data = await getProfile({
      data: { nickname: params.nickname.slice(0, 32) },
    })
    if (!data) throw notFound()
    return data
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [{ title: `${loaderData.user.nickname} — профиль · Radmir Helper` }]
      : [],
  }),
  component: ProfilePage,
})

function rank(points: number) {
  if (points >= 100) return 'Легенда сообщества'
  if (points >= 40) return 'Мастер РП'
  if (points >= 15) return 'Опытный игрок'
  if (points >= 3) return 'Активный участник'
  return 'Новичок'
}

function ProfilePage() {
  const { session } = Route.useRouteContext()
  const { user, own, stats, ideas, comments } = Route.useLoaderData()
  const points = stats.approved * 10 + stats.comments + stats.ratings
  const published = ideas.filter((i) => i.status === 'approved')
  const others = ideas.filter((i) => i.status !== 'approved')

  return (
    <PageShell session={session}>
      <section className="bg-grid border-b border-border/70">
        <div className="mx-auto flex max-w-content flex-wrap items-center gap-6 px-4 py-10 sm:px-6">
          <Avatar name={user.nickname} className="size-24 text-4xl shadow-xl" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold tracking-wider text-primary uppercase">
              {rank(points)}
            </p>
            <h1 className="mt-1 text-3xl break-all sm:text-4xl">
              {user.nickname}
            </h1>
            {user.role !== 'user' && (
              <p className="mt-1 text-sm font-semibold text-chart-2">
                {ROLE_LABELS[asRole(user.role)]} сайта
              </p>
            )}
            {user.banned && (
              <p className="mt-1 text-sm font-semibold text-destructive">
                Аккаунт заблокирован
              </p>
            )}
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {user.faction && (
                <span className="inline-flex items-center gap-1.5">
                  <Shield className="size-4" aria-hidden /> {user.faction}
                </span>
              )}
              {user.server && (
                <span className="inline-flex items-center gap-1.5">
                  <Server className="size-4" aria-hidden />{' '}
                  {/^\d+$/.test(user.server)
                    ? `Сервер ${user.server}`
                    : user.server}
                </span>
              )}
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="size-4" aria-hidden /> С нами с{' '}
                {new Date(user.createdAt).toLocaleDateString('ru-RU', {
                  month: 'long',
                  year: 'numeric',
                })}
              </span>
            </div>
            {user.bio && (
              <p className="mt-3 max-w-reading whitespace-pre-line">
                {user.bio}
              </p>
            )}
          </div>
          {own && (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" asChild>
                <Link to="/me" search={{ tab: 'profile' }}>
                  <Pencil /> Личный кабинет
                </Link>
              </Button>
              <Button asChild>
                <Link to="/ideas/new">
                  <Lightbulb /> Предложить идею
                </Link>
              </Button>
            </div>
          )}
        </div>
      </section>

      <div className="mx-auto max-w-content space-y-10 px-4 py-10 sm:px-6">
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat
            icon={<Lightbulb />}
            label="Идей опубликовано"
            value={stats.approved}
          />
          <Stat
            icon={<MessageSquare />}
            label="Комментариев"
            value={stats.comments}
          />
          <Stat
            icon={<Star />}
            label="Оценок поставлено"
            value={stats.ratings}
          />
          <Stat icon={<Heart />} label="Очки репутации" value={points} />
        </dl>

        {own && (
          <p className="rounded-xl border bg-muted/40 p-4 text-sm text-muted-foreground">
            Это ваш публичный профиль. Избранное, сохранённые отыгровки, историю
            и настройки ищите в{' '}
            <Link
              to="/me"
              className="font-semibold text-primary hover:underline"
            >
              личном кабинете
            </Link>
            . Отклонённые и ожидающие идеи видите только вы.
          </p>
        )}

        <section>
          <h2 className="mb-4 text-2xl">Опубликованные идеи</h2>
          {published.length === 0 ? (
            <p className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
              {own
                ? 'Пока нет — предложите первую идею!'
                : 'Пока нет опубликованных идей.'}
            </p>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {published.map((i) => (
                <li key={i.id}>
                  <Link
                    to={i.nodeId ? '/n/$id' : '/u/$nickname'}
                    params={
                      i.nodeId
                        ? { id: String(i.nodeId) }
                        : { nickname: user.nickname }
                    }
                    className="flex h-full items-start gap-3 rounded-xl border bg-card p-4 transition-colors hover:border-primary/60 motion-reduce:transition-none"
                  >
                    <Lightbulb
                      className="mt-0.5 size-5 shrink-0 text-primary"
                      aria-hidden
                    />
                    <span className="min-w-0">
                      <span className="block font-semibold">{i.title}</span>
                      <span className="block text-xs text-muted-foreground">
                        {i.sectionTitle ?? 'Без раздела'}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {own && others.length > 0 && (
          <section>
            <h2 className="mb-4 text-2xl">Мои заявки</h2>
            <ul className="space-y-2">
              {others.map((i) => (
                <li
                  key={i.id}
                  className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-4"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{i.title}</span>
                    {i.reviewNote && (
                      <span className="block text-sm text-muted-foreground">
                        Ответ модератора: «{i.reviewNote}»
                      </span>
                    )}
                  </span>
                  <IdeaStatusBadge status={i.status} />
                </li>
              ))}
            </ul>
          </section>
        )}

        <section>
          <h2 className="mb-4 text-2xl">Последние комментарии</h2>
          {comments.length === 0 ? (
            <p className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
              Комментариев пока нет.
            </p>
          ) : (
            <ul className="space-y-2">
              {comments.map((c) => (
                <li key={c.id} className="rounded-xl border bg-card p-4">
                  <p className="text-xs text-muted-foreground">
                    <Link
                      to="/n/$id"
                      params={{ id: String(c.nodeId) }}
                      className="font-semibold text-primary hover:underline"
                    >
                      {c.nodeTitle}
                    </Link>{' '}
                    ·{' '}
                    <span suppressHydrationWarning>{timeAgo(c.createdAt)}</span>
                  </p>
                  <p className="mt-1 line-clamp-3 text-sm whitespace-pre-line">
                    {c.text}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </PageShell>
  )
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: number
}) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <dt className="flex items-center gap-2 text-xs text-muted-foreground [&_svg]:size-4 [&_svg]:text-primary">
        {icon} {label}
      </dt>
      <dd className="mt-1 font-display text-2xl">{value}</dd>
    </div>
  )
}
