import {
  Link,
  Outlet,
  createFileRoute,
  redirect,
  useRouterState,
} from '@tanstack/react-router'
import {
  Activity,
  BarChart3,
  Building2,
  CarFront,
  FileText,
  Flag,
  KeyRound,
  MessagesSquare,
  PartyPopper,
  ScrollText,
  Server,
  Settings,
  Terminal,
  Theater,
  Users,
} from 'lucide-react'
import { PageShell } from '@/components/app/page-shell'
import { RoleBadge } from '@/components/app/site-header'
import { can, type Permission } from '@/lib/permissions'
import { allowed } from '@/lib/types'
import { cn } from '@/lib/utils'

export const ADMIN_SECTIONS = [
  {
    to: '/admin',
    label: 'Обзор',
    icon: BarChart3,
    perm: 'publications.review',
  },
  { to: '/admin/reports', label: 'Жалобы', icon: Flag, perm: 'reports.handle' },
  {
    to: '/admin/publications',
    label: 'Публикации',
    icon: MessagesSquare,
    perm: 'publications.review',
  },
  {
    to: '/admin/materials',
    label: 'Статьи',
    icon: FileText,
    perm: 'content.moderate',
  },
  {
    to: '/admin/users',
    label: 'Пользователи',
    icon: Users,
    perm: 'users.manage',
  },
  {
    to: '/admin/roles',
    label: 'Роли и доступ',
    icon: KeyRound,
    perm: 'roles.manage',
  },
  {
    to: '/admin/orgs',
    label: 'Организации',
    icon: Building2,
    perm: 'orgs.manage',
  },
  {
    to: '/admin/cars',
    label: 'Автомобили',
    icon: CarFront,
    perm: 'catalog.manage',
  },
  {
    to: '/admin/commands',
    label: 'Игровые команды',
    icon: Terminal,
    perm: 'catalog.manage',
  },
  {
    to: '/admin/roleplays',
    label: 'RP-отыгровки',
    icon: Theater,
    perm: 'catalog.manage',
  },
  {
    to: '/admin/events',
    label: 'Мероприятия и призы',
    icon: PartyPopper,
    perm: 'events.manage',
  },
  {
    to: '/admin/servers',
    label: 'Серверы',
    icon: Server,
    perm: 'servers.manage',
  },
  {
    to: '/admin/settings',
    label: 'Настройки',
    icon: Settings,
    perm: 'settings.manage',
  },
  {
    to: '/admin/audit',
    label: 'Журнал действий',
    icon: ScrollText,
    perm: 'audit.view',
  },
] as const satisfies readonly {
  to: string
  label: string
  icon: unknown
  perm: Permission
}[]

export const Route = createFileRoute('/admin')({
  beforeLoad: ({ context }) => {
    if (!context.session)
      throw redirect({ to: '/login', search: { tab: 'team' } })
    if (!allowed(context.session, 'publications.review'))
      throw redirect({ to: '/me' })
  },
  head: () => ({ meta: [{ title: 'Панель управления — Radmir Helper' }] }),
  component: AdminLayout,
})

function AdminLayout() {
  const { session, pendingIdeas, openReports } = Route.useRouteContext()
  const path = useRouterState({ select: (s) => s.location.pathname })
  const sections = ADMIN_SECTIONS.filter((s) => can(session?.role, s.perm))
  const badge = (to: string) =>
    to === '/admin/reports'
      ? openReports
      : to === '/admin/publications'
        ? pendingIdeas
        : 0

  return (
    <PageShell session={session}>
      <div className="border-b border-border/70 bg-card/40">
        <div className="mx-auto flex max-w-content flex-wrap items-center gap-3 px-4 py-6 sm:px-6">
          <Activity className="size-7 text-primary" aria-hidden />
          <h1 className="text-2xl sm:text-3xl">Панель управления</h1>
          <RoleBadge session={session} />
          <p className="w-full text-sm text-muted-foreground">
            Доступны разделы вашей роли. Все права дополнительно проверяются на
            сервере.
          </p>
        </div>
      </div>
      <div className="mx-auto grid max-w-content gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[230px_1fr]">
        <nav
          aria-label="Разделы панели"
          className="-mx-1 flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible"
        >
          {sections.map((s) => {
            const active =
              s.to === '/admin'
                ? path === '/admin' || path === '/admin/'
                : path.startsWith(s.to)
            const n = badge(s.to)
            return (
              <Link
                key={s.to}
                to={s.to}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors motion-reduce:transition-none',
                  active
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                )}
              >
                <s.icon className="size-4" /> {s.label}
                {n > 0 && (
                  <span
                    className={cn(
                      'ml-auto rounded-full px-1.5 text-xs font-bold',
                      active
                        ? 'bg-primary-foreground text-primary'
                        : 'bg-primary text-primary-foreground',
                    )}
                  >
                    {n}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>
        <div className="min-w-0">
          <Outlet />
        </div>
      </div>
    </PageShell>
  )
}
