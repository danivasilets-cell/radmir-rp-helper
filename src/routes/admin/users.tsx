import { useState } from 'react'
import {
  Link,
  createFileRoute,
  useNavigate,
  useRouter,
} from '@tanstack/react-router'
import { Ban, ShieldCheck, Undo2 } from 'lucide-react'
import { toast } from 'sonner'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { guard } from '@/components/admin/guard'
import {
  Chips,
  EmptyRow,
  SearchBox,
  SectionHead,
  fmtDate,
} from '@/components/admin/ui'
import { ConfirmDelete } from '@/components/events/confirm-delete'
import {
  adminDeleteUser,
  adminListUsers,
  setUserBan,
  setUserRole,
} from '@/lib/admin.functions'
import { errorMessage } from '@/lib/errors'
import {
  ASSIGNABLE_ROLES,
  ROLE_LABELS,
  ROLE_RANK,
  type AssignableRole,
} from '@/lib/permissions'
import { allowed } from '@/lib/types'

const FILTERS = [
  { id: 'all', label: 'Все' },
  { id: 'staff', label: 'Команда' },
  { id: 'banned', label: 'Заблокированные' },
] as const

export const Route = createFileRoute('/admin/users')({
  validateSearch: z.object({
    q: z.string().max(60).optional().catch(undefined),
    filter: z.enum(['all', 'staff', 'banned']).optional().catch(undefined),
  }),
  beforeLoad: guard('users.manage'),
  loaderDeps: ({ search }) => ({
    q: search.q ?? '',
    filter: search.filter ?? 'all',
  }),
  loader: ({ deps }) => adminListUsers({ data: deps }),
  component: UsersPage,
})

function UsersPage() {
  const users = Route.useLoaderData()
  const { session } = Route.useRouteContext()
  const search = Route.useSearch()
  const navigate = useNavigate({ from: '/admin/users' })
  const router = useRouter()
  const canRoles = allowed(session, 'roles.manage')
  const myRank = session ? ROLE_RANK[session.role] : 0
  const [busy, setBusy] = useState<number | null>(null)

  async function run(id: number, action: () => Promise<unknown>, msg: string) {
    setBusy(id)
    try {
      await action()
      toast.success(msg)
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
        title="Пользователи"
        text={`Найдено: ${users.length}. Управлять можно аккаунтами с ролью ниже вашей.`}
      />
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <SearchBox
          value={search.q ?? ''}
          onChange={(q) =>
            navigate({ search: (s) => ({ ...s, q: q || undefined }) })
          }
          placeholder="Ник…"
        />
        <Chips
          label="Фильтр"
          value={search.filter ?? 'all'}
          options={FILTERS}
          onChange={(filter) => navigate({ search: (s) => ({ ...s, filter }) })}
        />
      </div>
      {users.length === 0 ? (
        <EmptyRow text="Пользователей не найдено." />
      ) : (
        <div className="rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ник</TableHead>
                <TableHead>Роль</TableHead>
                <TableHead>Сервер</TableHead>
                <TableHead>Активность</TableHead>
                <TableHead className="text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => {
                const manageable =
                  ROLE_RANK[u.role] < myRank && u.id !== session?.userId
                return (
                  <TableRow key={u.id}>
                    <TableCell>
                      <Link
                        to="/u/$nickname"
                        params={{ nickname: u.nickname }}
                        className="font-semibold hover:text-primary"
                      >
                        {u.nickname}
                      </Link>
                      {u.bannedAt && (
                        <p className="text-xs text-destructive">
                          Заблокирован{u.banReason && `: ${u.banReason}`}
                        </p>
                      )}
                      <p
                        className="text-xs text-muted-foreground"
                        suppressHydrationWarning
                      >
                        с {fmtDate(u.createdAt)}
                      </p>
                    </TableCell>
                    <TableCell>
                      {canRoles && manageable ? (
                        <Select
                          value={u.role}
                          onValueChange={(role) =>
                            run(
                              u.id,
                              () =>
                                setUserRole({
                                  data: {
                                    id: u.id,
                                    role: role as AssignableRole,
                                  },
                                }),
                              `Роль ${u.nickname}: ${ROLE_LABELS[role as AssignableRole]}`,
                            )
                          }
                        >
                          <SelectTrigger
                            aria-label={`Роль ${u.nickname}`}
                            className="h-8 w-40"
                            disabled={busy === u.id}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ASSIGNABLE_ROLES.map((r) => (
                              <SelectItem key={r} value={r}>
                                {ROLE_LABELS[r]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-sm">
                          {u.role !== 'user' && (
                            <ShieldCheck className="size-3.5 text-primary" />
                          )}
                          {ROLE_LABELS[u.role]}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{u.server ?? '—'}</TableCell>
                    <TableCell
                      className="text-xs text-muted-foreground"
                      suppressHydrationWarning
                    >
                      {u.ideas} идей · {u.comments} комм.
                      <br />
                      был(а): {fmtDate(u.lastSeenAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      {manageable && (
                        <div className="flex justify-end gap-1">
                          {u.bannedAt ? (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={busy === u.id}
                              onClick={() =>
                                run(
                                  u.id,
                                  () =>
                                    setUserBan({
                                      data: { id: u.id, banned: false },
                                    }),
                                  'Пользователь разблокирован',
                                )
                              }
                            >
                              <Undo2 /> Разблокировать
                            </Button>
                          ) : (
                            <BanButton
                              nickname={u.nickname}
                              onBan={(reason) =>
                                run(
                                  u.id,
                                  () =>
                                    setUserBan({
                                      data: { id: u.id, banned: true, reason },
                                    }),
                                  'Пользователь заблокирован',
                                )
                              }
                            />
                          )}
                          <ConfirmDelete
                            title={u.nickname}
                            description="Аккаунт, избранное, оценки, комментарии и идеи пользователя будут удалены."
                            confirmText={u.nickname}
                            onConfirm={() =>
                              run(
                                u.id,
                                () => adminDeleteUser({ data: { id: u.id } }),
                                'Пользователь удалён',
                              )
                            }
                          />
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}

function BanButton({
  nickname,
  onBan,
}: {
  nickname: string
  onBan: (reason: string) => Promise<void>
}) {
  const [reason, setReason] = useState('')
  return (
    <ConfirmDelete
      title={nickname}
      actionLabel="Заблокировать"
      description="Пользователь не сможет входить, все его сеансы будут завершены."
      trigger={
        <Button size="sm" variant="outline">
          <Ban /> Блок
        </Button>
      }
      onConfirm={() => onBan(reason)}
      extra={
        <Input
          aria-label="Причина блокировки"
          placeholder="Причина (видна пользователю при входе)"
          maxLength={300}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      }
    />
  )
}
