import { useState, type FormEvent } from 'react'
import {
  Link,
  createFileRoute,
  redirect,
  useNavigate,
  useRouter,
} from '@tanstack/react-router'
import {
  Activity,
  Bookmark,
  CarFront,
  ExternalLink,
  FileText,
  Heart,
  KeyRound,
  Lightbulb,
  Loader2,
  LogOut,
  MessageSquare,
  Save,
  Settings,
  ShieldAlert,
  Theater,
  UserRound,
} from 'lucide-react'
import { toast } from 'sonner'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { NodeIcon } from '@/components/app/node-icon'
import { PageShell } from '@/components/app/page-shell'
import { ServerSelect, useServerName } from '@/components/app/server-select'
import { FavoriteCarButton } from '@/components/cars/car-card'
import { IdeaStatusBadge } from '@/components/community/idea-status'
import { Avatar, timeAgo } from '@/components/community/user-link'
import { ConfirmDelete } from '@/components/events/confirm-delete'
import { RoleplayCard } from '@/components/roleplay/roleplay-card'
import {
  changePassword,
  deleteAccount,
  getCabinet,
  logoutOtherSessions,
} from '@/lib/account.functions'
import { formatPrice, carClassLabel } from '@/lib/cars'
import { toggleFavorite, updateProfile } from '@/lib/community.functions'
import { errorMessage } from '@/lib/errors'
import { passwordProblem } from '@/lib/password'
import { ROLE_LABELS, asRole } from '@/lib/permissions'
import { isPlayer } from '@/lib/types'
import { cn } from '@/lib/utils'

const TABS = [
  { id: 'profile', label: 'Профиль', icon: UserRound },
  { id: 'favorites', label: 'Избранные статьи', icon: Heart },
  { id: 'cars', label: 'Избранные авто', icon: CarFront },
  { id: 'actions', label: 'Отыгровки', icon: Bookmark },
  { id: 'scenarios', label: 'RP-сценарии', icon: Theater },
  { id: 'publications', label: 'Мои публикации', icon: FileText },
  { id: 'activity', label: 'История', icon: Activity },
  { id: 'settings', label: 'Настройки', icon: Settings },
] as const
type TabId = (typeof TABS)[number]['id']

export const Route = createFileRoute('/me')({
  validateSearch: z.object({
    tab: z
      .enum(TABS.map((t) => t.id) as [TabId, ...TabId[]])
      .optional()
      .catch(undefined),
  }),
  beforeLoad: ({ context }) => {
    if (!isPlayer(context.session)) {
      if (context.session) throw redirect({ to: '/admin' })
      throw redirect({ to: '/login', search: { tab: 'player' } })
    }
  },
  loader: () => getCabinet(),
  head: () => ({ meta: [{ title: 'Личный кабинет — Radmir Helper' }] }),
  component: CabinetPage,
})

type Cabinet = Awaited<ReturnType<typeof getCabinet>>

function CabinetPage() {
  const { session } = Route.useRouteContext()
  const data = Route.useLoaderData()
  const tab = Route.useSearch().tab ?? 'profile'
  const serverName = useServerName()
  const role = asRole(data.user.role)
  const counts: Partial<Record<TabId, number>> = {
    favorites: data.favorites.length,
    cars: data.favoriteCars.length,
    actions: data.roleplays.filter((r) => r.kind === 'action').length,
    scenarios: data.roleplays.filter((r) => r.kind === 'scenario').length,
    publications: data.ideas.length + data.comments.length,
  }

  return (
    <PageShell session={session}>
      <section className="bg-grid border-b border-border/70">
        <div className="mx-auto flex max-w-content flex-wrap items-center gap-5 px-4 py-8 sm:px-6">
          <Avatar name={data.user.nickname} className="size-16 text-2xl" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold tracking-wider text-primary uppercase">
              Личный кабинет · {ROLE_LABELS[role]}
            </p>
            <h1 className="mt-1 text-3xl break-all">{data.user.nickname}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {serverName(data.user.serverId) ?? 'Сервер не выбран'}
              {data.user.faction && ` · ${data.user.faction}`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link to="/u/$nickname" params={{ nickname: data.user.nickname }}>
                <ExternalLink /> Публичный профиль
              </Link>
            </Button>
            {role !== 'user' && (
              <Button asChild>
                <Link to="/admin">
                  <ShieldAlert /> Панель управления
                </Link>
              </Button>
            )}
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-content gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[220px_1fr]">
        <nav
          aria-label="Разделы кабинета"
          className="-mx-1 flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible"
        >
          {TABS.map((t) => (
            <Link
              key={t.id}
              to="/me"
              search={{ tab: t.id }}
              aria-current={tab === t.id ? 'page' : undefined}
              className={cn(
                'flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors motion-reduce:transition-none',
                tab === t.id
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground',
              )}
            >
              <t.icon className="size-4" /> {t.label}
              {counts[t.id] ? (
                <span className="ml-auto text-xs opacity-80">
                  {counts[t.id]}
                </span>
              ) : null}
            </Link>
          ))}
        </nav>

        <div className="min-w-0">
          {tab === 'profile' && <ProfileTab data={data} />}
          {tab === 'favorites' && <FavoritesTab data={data} />}
          {tab === 'cars' && <CarsTab data={data} />}
          {(tab === 'actions' || tab === 'scenarios') && (
            <RoleplaysTab
              data={data}
              kind={tab === 'actions' ? 'action' : 'scenario'}
            />
          )}
          {tab === 'publications' && <PublicationsTab data={data} />}
          {tab === 'activity' && <ActivityTab data={data} />}
          {tab === 'settings' && <SettingsTab data={data} />}
        </div>
      </div>
    </PageShell>
  )
}

function Panel({
  title,
  text,
  children,
}: {
  title: string
  text?: string
  children: React.ReactNode
}) {
  return (
    <section>
      <h2 className="text-2xl">{title}</h2>
      {text && <p className="mt-1 text-sm text-muted-foreground">{text}</p>}
      <div className="mt-5">{children}</div>
    </section>
  )
}

function Empty({ text, action }: { text: string; action?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
      <p>{text}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

function ProfileTab({ data }: { data: Cabinet }) {
  const router = useRouter()
  const [form, setForm] = useState({
    faction: data.user.faction,
    serverId: data.user.serverId,
    bio: data.user.bio,
  })
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setPending(true)
    setError(null)
    try {
      await updateProfile({ data: form })
      toast.success('Профиль сохранён')
      await router.invalidate()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setPending(false)
    }
  }

  return (
    <Panel
      title="Профиль"
      text={`Аккаунт создан ${new Date(data.user.createdAt).toLocaleDateString('ru-RU')}. Эти данные видны в публичном профиле.`}
    >
      <form
        onSubmit={handleSubmit}
        className="max-w-reading space-y-4 rounded-xl border bg-card p-5"
      >
        <div className="space-y-2">
          <Label htmlFor="me-server">Игровой сервер</Label>
          <ServerSelect
            id="me-server"
            value={form.serverId}
            onChange={(serverId) => setForm({ ...form, serverId })}
            allLabel="Не выбран (показывать все серверы)"
          />
          <p className="text-xs text-muted-foreground">
            Сайт будет показывать материалы для этого сервера на любом
            устройстве после входа.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="me-faction">Организация / фракция</Label>
          <Input
            id="me-faction"
            value={form.faction}
            maxLength={60}
            onChange={(e) => setForm({ ...form, faction: e.target.value })}
            placeholder="Например: МВД, 3 ранг"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="me-bio">О себе</Label>
          <Textarea
            id="me-bio"
            rows={4}
            maxLength={600}
            value={form.bio}
            onChange={(e) => setForm({ ...form, bio: e.target.value })}
          />
        </div>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <Button type="submit" disabled={pending}>
          {pending ? (
            <Loader2 className="animate-spin motion-reduce:animate-none" />
          ) : (
            <Save />
          )}
          Сохранить
        </Button>
      </form>
    </Panel>
  )
}

function FavoritesTab({ data }: { data: Cabinet }) {
  const router = useRouter()
  const [removing, setRemoving] = useState<number | null>(null)
  async function remove(id: number) {
    setRemoving(id)
    try {
      await toggleFavorite({ data: { nodeId: id } })
      await router.invalidate()
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setRemoving(null)
    }
  }
  return (
    <Panel
      title="Избранные статьи"
      text="Темы и разделы, сохранённые кнопкой «В избранное»."
    >
      {data.favorites.length === 0 ? (
        <Empty
          text="Вы пока ничего не сохранили."
          action={
            <Button asChild variant="outline">
              <Link to="/">Перейти к разделам</Link>
            </Button>
          }
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {data.favorites.map((n) => (
            <li
              key={n.id}
              className="flex items-start gap-3 rounded-xl border bg-card p-4"
            >
              <NodeIcon
                icon={n.icon}
                kind={n.kind}
                className="mt-0.5 size-5 shrink-0 text-primary"
              />
              <Link
                to="/n/$id"
                params={{ id: String(n.id) }}
                className="min-w-0 flex-1 hover:text-primary"
              >
                <span className="block font-semibold">{n.title}</span>
                {n.summary && (
                  <span className="line-clamp-2 text-sm text-muted-foreground">
                    {n.summary}
                  </span>
                )}
              </Link>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Убрать из избранного: ${n.title}`}
                disabled={removing === n.id}
                onClick={() => remove(n.id)}
              >
                <Heart className="fill-current text-primary" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}

function CarsTab({ data }: { data: Cabinet }) {
  return (
    <Panel
      title="Избранные автомобили"
      text="Машины, отмеченные сердечком в каталоге."
    >
      {data.favoriteCars.length === 0 ? (
        <Empty
          text="В избранном пока нет машин."
          action={
            <Button asChild variant="outline">
              <Link to="/cars">Открыть каталог авто</Link>
            </Button>
          }
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {data.favoriteCars.map((c) => (
            <li
              key={c.id}
              className="flex items-start gap-3 rounded-xl border bg-card p-4"
            >
              <CarFront
                className="mt-0.5 size-5 shrink-0 text-primary"
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{c.name}</p>
                <p className="text-sm text-muted-foreground">
                  {carClassLabel(c.carClass)} · ID {c.modelId} ·{' '}
                  {formatPrice(c.price)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {c.maxSpeed} км/ч · {c.seats} мест
                </p>
              </div>
              <FavoriteCarButton car={c} favorite />
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}

function RoleplaysTab({
  data,
  kind,
}: {
  data: Cabinet
  kind: 'action' | 'scenario'
}) {
  const list = data.roleplays.filter((r) => r.kind === kind)
  const action = kind === 'action'
  return (
    <Panel
      title={action ? 'Сохранённые отыгровки' : 'Сохранённые RP-сценарии'}
      text="Сохраняйте записи на странице «Отыгровки», чтобы держать их под рукой."
    >
      {list.length === 0 ? (
        <Empty
          text={
            action ? 'Сохранённых отыгровок нет.' : 'Сохранённых сценариев нет.'
          }
          action={
            <Button asChild variant="outline">
              <Link to="/roleplays" search={{ kind }}>
                Открыть каталог
              </Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {list.map((r) => (
            <RoleplayCard key={r.id} item={r} saved />
          ))}
        </div>
      )}
    </Panel>
  )
}

function PublicationsTab({ data }: { data: Cabinet }) {
  return (
    <Panel title="Мои публикации" text="Предложенные идеи и ваши комментарии.">
      <div className="space-y-8">
        <div>
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 text-lg font-semibold">
              <Lightbulb className="size-5 text-primary" aria-hidden /> Идеи
            </h3>
            <Button asChild size="sm">
              <Link to="/ideas/new">Предложить идею</Link>
            </Button>
          </div>
          {data.ideas.length === 0 ? (
            <Empty text="Вы ещё не предлагали идей." />
          ) : (
            <ul className="space-y-2">
              {data.ideas.map((i) => (
                <li
                  key={i.id}
                  className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-4"
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
                      {timeAgo(i.createdAt)}
                      {i.reviewNote && ` · ответ модератора: «${i.reviewNote}»`}
                    </p>
                  </div>
                  <IdeaStatusBadge status={i.status} />
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold">
            <MessageSquare className="size-5 text-primary" aria-hidden />{' '}
            Комментарии
          </h3>
          {data.comments.length === 0 ? (
            <Empty text="Комментариев пока нет." />
          ) : (
            <ul className="space-y-2">
              {data.comments.map((c) => (
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
        </div>
      </div>
    </Panel>
  )
}

function ActivityTab({ data }: { data: Cabinet }) {
  return (
    <Panel
      title="История активности"
      text="Последние 60 действий в вашем аккаунте."
    >
      {data.activity.length === 0 ? (
        <Empty text="Пока пусто." />
      ) : (
        <ol className="divide-y rounded-xl border bg-card">
          {data.activity.map((a) => (
            <li
              key={a.id}
              className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-4 py-3 text-sm"
            >
              <span className="font-medium">{a.action}</span>
              {a.summary && (
                <span className="min-w-0 flex-1 truncate text-muted-foreground">
                  {a.summary}
                </span>
              )}
              {a.entityType === 'node' && a.entityId && (
                <Link
                  to="/n/$id"
                  params={{ id: String(a.entityId) }}
                  className="text-xs text-primary hover:underline"
                >
                  открыть
                </Link>
              )}
              <time
                dateTime={a.createdAt}
                className="ml-auto text-xs text-muted-foreground"
                suppressHydrationWarning
              >
                {new Date(a.createdAt).toLocaleString('ru-RU', {
                  dateStyle: 'short',
                  timeStyle: 'short',
                })}
              </time>
            </li>
          ))}
        </ol>
      )}
    </Panel>
  )
}

function SettingsTab({ data }: { data: Cabinet }) {
  const router = useRouter()
  const navigate = useNavigate()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [next2, setNext2] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [deletePassword, setDeletePassword] = useState('')

  async function handlePassword(e: FormEvent) {
    e.preventDefault()
    const problem = passwordProblem(next, data.user.nickname)
    if (problem) return setError(problem)
    if (next !== next2) return setError('Пароли не совпадают')
    setPending(true)
    setError(null)
    try {
      await changePassword({ data: { current, next } })
      toast.success('Пароль изменён. Другие устройства вышли из аккаунта.')
      setCurrent('')
      setNext('')
      setNext2('')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setPending(false)
    }
  }

  return (
    <Panel title="Настройки аккаунта">
      <div className="max-w-reading space-y-6">
        <form
          onSubmit={handlePassword}
          className="space-y-4 rounded-xl border bg-card p-5"
          noValidate
        >
          <h3 className="flex items-center gap-2 font-semibold">
            <KeyRound className="size-4 text-primary" aria-hidden /> Смена
            пароля
          </h3>
          <input
            type="text"
            autoComplete="username"
            value={data.user.nickname}
            readOnly
            hidden
          />
          <div className="space-y-2">
            <Label htmlFor="pw-current">Текущий пароль</Label>
            <Input
              id="pw-current"
              type="password"
              autoComplete="current-password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="pw-next">Новый пароль</Label>
              <Input
                id="pw-next"
                type="password"
                autoComplete="new-password"
                value={next}
                onChange={(e) => setNext(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pw-next2">Повторите</Label>
              <Input
                id="pw-next2"
                type="password"
                autoComplete="new-password"
                value={next2}
                onChange={(e) => setNext2(e.target.value)}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Минимум 8 символов, буквы и цифры, без ника.
          </p>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <Button type="submit" disabled={pending}>
            {pending && (
              <Loader2 className="animate-spin motion-reduce:animate-none" />
            )}
            Изменить пароль
          </Button>
        </form>

        <div className="space-y-3 rounded-xl border bg-card p-5">
          <h3 className="flex items-center gap-2 font-semibold">
            <LogOut className="size-4 text-primary" aria-hidden /> Сеансы
          </h3>
          <p className="text-sm text-muted-foreground">
            Активных входов: {data.activeSessions}. Если вы входили с чужого
            устройства — завершите остальные сеансы.
          </p>
          <Button
            variant="outline"
            onClick={async () => {
              try {
                await logoutOtherSessions()
                toast.success('Остальные сеансы завершены')
                await router.invalidate()
              } catch (err) {
                toast.error(errorMessage(err))
              }
            }}
          >
            Выйти на других устройствах
          </Button>
        </div>

        <div className="space-y-3 rounded-xl border border-destructive/50 bg-destructive/5 p-5">
          <h3 className="font-semibold text-destructive">Удаление аккаунта</h3>
          <p className="text-sm text-muted-foreground">
            Будут удалены профиль, избранное, оценки, комментарии и идеи на
            проверке. Опубликованные темы останутся на сайте.
          </p>
          <div className="space-y-2">
            <Label htmlFor="del-pass">Пароль для подтверждения</Label>
            <Input
              id="del-pass"
              type="password"
              autoComplete="current-password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
            />
          </div>
          <ConfirmDelete
            title={data.user.nickname}
            actionLabel="Удалить аккаунт"
            description="Аккаунт будет удалён без возможности восстановления."
            confirmText={data.user.nickname}
            trigger={
              <Button variant="destructive" disabled={!deletePassword}>
                Удалить аккаунт
              </Button>
            }
            onConfirm={async () => {
              try {
                await deleteAccount({ data: { password: deletePassword } })
                toast.success('Аккаунт удалён')
                await router.invalidate()
                await navigate({ to: '/' })
              } catch (err) {
                toast.error(errorMessage(err))
              }
            }}
          />
        </div>
      </div>
    </Panel>
  )
}
