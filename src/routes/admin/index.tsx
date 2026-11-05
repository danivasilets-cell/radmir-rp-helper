import { Link, createFileRoute } from '@tanstack/react-router'
import {
  CarFront,
  FileText,
  Flag,
  Lightbulb,
  MessageSquare,
  Theater,
  UserPlus,
  Users,
} from 'lucide-react'
import { EmptyRow, SectionHead, fmtDate } from '@/components/admin/ui'
import { getAdminOverview } from '@/lib/admin.functions'
import { allowed } from '@/lib/types'

export const Route = createFileRoute('/admin/')({
  loader: () => getAdminOverview(),
  component: Overview,
})

function Tile({
  icon,
  label,
  value,
  hint,
  to,
}: {
  icon: React.ReactNode
  label: string
  value: number
  hint?: string
  to?: string
}) {
  const body = (
    <>
      <p className="flex items-center gap-2 text-xs text-muted-foreground [&_svg]:size-4 [&_svg]:text-primary">
        {icon} {label}
      </p>
      <p className="mt-1 font-display text-3xl tabular-nums">
        {value.toLocaleString('ru-RU')}
      </p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </>
  )
  const cls = 'block rounded-xl border bg-card p-4'
  return to ? (
    <Link
      to={to}
      className={
        cls +
        ' transition-colors hover:border-primary/60 motion-reduce:transition-none'
      }
    >
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  )
}

function Overview() {
  const { counts, days, topPaths, recent } = Route.useLoaderData()
  const { session } = Route.useRouteContext()
  const maxVisitors = Math.max(1, ...days.map((d) => d.visitors))
  const totalViews = days.reduce((s, d) => s + d.views, 0)
  const totalVisitors = days.reduce((s, d) => s + d.visitors, 0)
  const publications = counts.topics + counts.ideasTotal + counts.comments

  return (
    <div className="space-y-10">
      <section>
        <SectionHead title="Обзор" text="Ключевые показатели сайта." />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Tile
            icon={<Users />}
            label="Пользователей"
            value={counts.users}
            hint={`+${counts.newUsers} за 7 дней`}
            to={allowed(session, 'users.manage') ? '/admin/users' : undefined}
          />
          <Tile
            icon={<FileText />}
            label="Публикаций всего"
            value={publications}
            hint={`${counts.topics} статей · ${counts.ideasTotal} идей · ${counts.comments} комм.`}
          />
          <Tile
            icon={<Lightbulb />}
            label="Идей на проверке"
            value={counts.ideasPending}
            to="/admin/publications"
          />
          <Tile
            icon={<Flag />}
            label="Открытых жалоб"
            value={counts.reportsOpen}
            to="/admin/reports"
          />
          <Tile icon={<CarFront />} label="Автомобилей" value={counts.cars} />
          <Tile
            icon={<Theater />}
            label="Отыгровок и сценариев"
            value={counts.roleplays}
          />
          <Tile
            icon={<MessageSquare />}
            label="Комментариев"
            value={counts.comments}
          />
          <Tile
            icon={<UserPlus />}
            label="Заблокировано"
            value={counts.banned}
          />
        </div>
      </section>

      <section aria-labelledby="visits-title">
        <h2 id="visits-title" className="text-xl">
          Посещения за 14 дней
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Уникальные посетители по дням (Москва). Всего:{' '}
          {totalVisitors.toLocaleString('ru-RU')} посетителей,{' '}
          {totalViews.toLocaleString('ru-RU')} просмотров.
        </p>
        <div className="mt-4 rounded-xl border bg-card p-4">
          <div className="flex h-44 items-end gap-1.5" aria-hidden>
            {days.map((d) => (
              <div
                key={d.day}
                className="group flex h-full flex-1 flex-col justify-end"
                title={`${d.day}: ${d.visitors} посетителей, ${d.views} просмотров`}
              >
                <span className="mb-1 text-center text-[0.65rem] text-muted-foreground tabular-nums opacity-0 group-hover:opacity-100">
                  {d.visitors}
                </span>
                <div
                  className="rounded-t-[4px] bg-primary"
                  style={{
                    height: `${Math.max(d.visitors ? 3 : 0.5, (d.visitors / maxVisitors) * 100)}%`,
                  }}
                />
              </div>
            ))}
          </div>
          <div
            className="mt-2 flex gap-1.5 text-[0.65rem] text-muted-foreground"
            aria-hidden
          >
            {days.map((d, i) => (
              <span key={d.day} className="flex-1 text-center tabular-nums">
                {i % 2 === 0 ? d.day.slice(8) + '.' + d.day.slice(5, 7) : ''}
              </span>
            ))}
          </div>
          <table className="sr-only">
            <caption>Посещения по дням</caption>
            <thead>
              <tr>
                <th>День</th>
                <th>Посетители</th>
                <th>Просмотры</th>
              </tr>
            </thead>
            <tbody>
              {days.map((d) => (
                <tr key={d.day}>
                  <td>{d.day}</td>
                  <td>{d.visitors}</td>
                  <td>{d.views}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid gap-8 xl:grid-cols-2">
        <section>
          <h2 className="mb-3 text-xl">Популярные страницы (7 дней)</h2>
          {topPaths.length === 0 ? (
            <EmptyRow text="Данных пока нет." />
          ) : (
            <ol className="divide-y rounded-xl border bg-card">
              {topPaths.map((p) => (
                <li
                  key={p.path}
                  className="flex justify-between gap-3 px-4 py-2.5 text-sm"
                >
                  <span className="truncate font-mono">{p.path}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {p.views}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>
        {allowed(session, 'users.manage') && (
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xl">Последние действия</h2>
              {allowed(session, 'audit.view') && (
                <Link
                  to="/admin/audit"
                  className="text-sm text-primary hover:underline"
                >
                  Весь журнал
                </Link>
              )}
            </div>
            {recent.length === 0 ? (
              <EmptyRow text="Действий пока нет." />
            ) : (
              <ol className="divide-y rounded-xl border bg-card">
                {recent.map((a) => (
                  <li key={a.id} className="px-4 py-2.5 text-sm">
                    <p>
                      <span className="font-semibold">{a.actorLabel}</span> —{' '}
                      {a.action}
                      {a.summary && (
                        <span className="text-muted-foreground">
                          {' '}
                          · {a.summary}
                        </span>
                      )}
                    </p>
                    <p
                      className="text-xs text-muted-foreground"
                      suppressHydrationWarning
                    >
                      {fmtDate(a.createdAt)}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </section>
        )}
      </div>
    </div>
  )
}
