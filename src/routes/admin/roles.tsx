import { useState, type FormEvent } from 'react'
import { Link, createFileRoute, useRouter } from '@tanstack/react-router'
import { Check, Copy, KeyRound, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { EmptyRow, SectionHead } from '@/components/admin/ui'
import { ConfirmDelete } from '@/components/events/confirm-delete'
import {
  addModerator,
  listModerators,
  removeModerator,
  setModeratorRole,
} from '@/lib/api.functions'
import { errorMessage } from '@/lib/errors'
import {
  PERMISSIONS,
  ROLES,
  ROLE_LABELS,
  hasRole,
  type Permission,
} from '@/lib/permissions'

type KeyRole = 'moderator' | 'admin'

export const Route = createFileRoute('/admin/roles')({
  beforeLoad: guard('roles.manage'),
  loader: () => listModerators(),
  component: RolesPage,
})

function RolesPage() {
  const keys = Route.useLoaderData()
  const router = useRouter()
  const [name, setName] = useState('')
  const [role, setRole] = useState<KeyRole>('moderator')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [newKey, setNewKey] = useState<{ name: string; key: string } | null>(
    null,
  )
  const [copied, setCopied] = useState(false)

  async function handleAdd(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return setError('Введите имя')
    setPending(true)
    setError(null)
    try {
      const { key } = await addModerator({ data: { name, role } })
      setNewKey({ name: name.trim(), key })
      setCopied(false)
      setName('')
      await router.invalidate()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="space-y-10">
      <section>
        <SectionHead
          title="Роли и доступ"
          text="Роль можно выдать двумя способами: зарегистрированному игроку — в разделе «Пользователи», или отдельным ключом доступа — здесь."
          actions={
            <Button asChild variant="outline">
              <Link to="/admin/users" search={{ filter: 'staff' }}>
                Команда среди игроков
              </Link>
            </Button>
          }
        />
        <form
          onSubmit={handleAdd}
          className="flex flex-col gap-3 rounded-xl border bg-card p-5 sm:flex-row sm:items-end"
        >
          <div className="flex-1 space-y-2">
            <Label htmlFor="key-name">Имя</Label>
            <Input
              id="key-name"
              value={name}
              maxLength={60}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ivan_Petrov"
              aria-invalid={!!error}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="key-role">Роль</Label>
            <Select value={role} onValueChange={(v) => setRole(v as KeyRole)}>
              <SelectTrigger id="key-role" className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="moderator">Модератор</SelectItem>
                <SelectItem value="admin">Администратор</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" disabled={pending}>
            {pending ? (
              <Loader2 className="animate-spin motion-reduce:animate-none" />
            ) : (
              <KeyRound />
            )}
            Выдать ключ
          </Button>
        </form>
        {error && (
          <p role="alert" className="mt-2 text-sm text-destructive">
            {error}
          </p>
        )}
        {newKey && (
          <div
            role="status"
            className="mt-4 rounded-xl border border-primary/60 bg-primary/10 p-5"
          >
            <p className="font-semibold">Ключ для {newKey.name}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Скопируйте его сейчас — повторно ключ показан не будет.
            </p>
            <div className="mt-3 flex gap-2">
              <code className="flex-1 overflow-x-auto rounded-md border bg-background px-3 py-2 text-sm select-all">
                {newKey.key}
              </code>
              <Button
                type="button"
                variant="outline"
                aria-label="Скопировать ключ"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(newKey.key)
                    setCopied(true)
                  } catch {
                    toast.error('Не удалось скопировать, выделите ключ вручную')
                  }
                }}
              >
                {copied ? <Check /> : <Copy />}
              </Button>
            </div>
          </div>
        )}

        <h3 className="mt-8 mb-3 text-lg font-semibold">Активные ключи</h3>
        {keys.length === 0 ? (
          <EmptyRow text="Ключей пока нет." />
        ) : (
          <ul className="divide-y rounded-xl border bg-card">
            {keys.map((k) => (
              <li
                key={k.id}
                className="flex flex-wrap items-center gap-3 px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{k.name}</p>
                  <p className="text-xs text-muted-foreground">
                    С {new Date(k.createdAt).toLocaleDateString('ru-RU')}
                  </p>
                </div>
                <Select
                  value={k.role}
                  onValueChange={async (v) => {
                    try {
                      await setModeratorRole({
                        data: { id: k.id, role: v as KeyRole },
                      })
                      toast.success('Роль изменена')
                      await router.invalidate()
                    } catch (err) {
                      toast.error(errorMessage(err))
                    }
                  }}
                >
                  <SelectTrigger
                    aria-label={`Роль ключа ${k.name}`}
                    className="h-8 w-44"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="moderator">Модератор</SelectItem>
                    <SelectItem value="admin">Администратор</SelectItem>
                  </SelectContent>
                </Select>
                <ConfirmDelete
                  title={k.name}
                  actionLabel="Отозвать"
                  description="Ключ перестанет работать, активные входы по нему завершатся."
                  onConfirm={async () => {
                    try {
                      await removeModerator({ data: { id: k.id } })
                      toast.success('Доступ отозван')
                      await router.invalidate()
                    } catch (err) {
                      toast.error(errorMessage(err))
                    }
                  }}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h3 className="mb-3 text-lg font-semibold">Права ролей</h3>
        <div className="rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Право</TableHead>
                {ROLES.map((r) => (
                  <TableHead key={r} className="text-center">
                    {ROLE_LABELS[r]}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>
                  Личный кабинет, избранное, публикации, комментарии, жалобы
                </TableCell>
                {ROLES.map((r) => (
                  <TableCell key={r} className="text-center">
                    <Check
                      className="mx-auto size-4 text-primary"
                      aria-label="да"
                    />
                  </TableCell>
                ))}
              </TableRow>
              {(Object.keys(PERMISSIONS) as Permission[]).map((p) => (
                <TableRow key={p}>
                  <TableCell>{PERMISSIONS[p].label}</TableCell>
                  {ROLES.map((r) => (
                    <TableCell key={r} className="text-center">
                      {hasRole(r, PERMISSIONS[p].min) ? (
                        <Check
                          className="mx-auto size-4 text-primary"
                          aria-label="да"
                        />
                      ) : (
                        <span
                          className="text-muted-foreground"
                          aria-label="нет"
                        >
                          —
                        </span>
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  )
}
