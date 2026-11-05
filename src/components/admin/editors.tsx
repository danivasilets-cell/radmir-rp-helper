import { useState, type FormEvent, type ReactNode } from 'react'
import { useRouter } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { ServerSelect } from '@/components/app/server-select'
import {
  saveCommand,
  saveOrganization,
  saveRoleplay,
  saveServer,
} from '@/lib/catalog.functions'
import { errorMessage } from '@/lib/errors'
import type {
  GameCommand,
  GameServer,
  Organization,
  Roleplay,
  RoleplayKind,
} from '@/lib/types'

/** null = closed, { item: null } = create, { item } = edit. */
export type EditState<T> = { item: T | null } | null

function EditorDialog({
  open,
  onClose,
  title,
  description,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92svh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {open && children}
      </DialogContent>
    </Dialog>
  )
}

/** Shared submit handling for all editors. */
function useSave(onClose: () => void) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  async function run(action: () => Promise<unknown>, success: string) {
    setPending(true)
    setError(null)
    try {
      await action()
      toast.success(success)
      onClose()
      await router.invalidate()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setPending(false)
    }
  }
  return { pending, error, setError, run }
}

function Footer({
  pending,
  error,
  onClose,
  edit,
}: {
  pending: boolean
  error: string | null
  onClose: () => void
  edit: boolean
}) {
  return (
    <>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onClose}>
          Отмена
        </Button>
        <Button type="submit" disabled={pending}>
          {pending && (
            <Loader2 className="animate-spin motion-reduce:animate-none" />
          )}
          {edit ? 'Сохранить' : 'Добавить'}
        </Button>
      </DialogFooter>
    </>
  )
}

// ── Roleplays ─────────────────────────────────────────────

export function RoleplayEditor({
  state,
  onClose,
  organizations,
  defaultKind = 'action',
}: {
  state: EditState<Roleplay>
  onClose: () => void
  organizations: Organization[]
  defaultKind?: RoleplayKind
}) {
  const item = state?.item ?? null
  return (
    <EditorDialog
      open={state !== null}
      onClose={onClose}
      title={item ? 'Редактировать запись' : 'Новая отыгровка или сценарий'}
      description="Отыгровка — готовые строки /me, /do. Сценарий — план RP-ситуации."
    >
      <RoleplayForm
        item={item}
        onClose={onClose}
        organizations={organizations}
        defaultKind={defaultKind}
      />
    </EditorDialog>
  )
}

const NO_ORG = 'none'

function RoleplayForm({
  item,
  onClose,
  organizations,
  defaultKind,
}: {
  item: Roleplay | null
  onClose: () => void
  organizations: Organization[]
  defaultKind: RoleplayKind
}) {
  const [f, setF] = useState({
    kind: item?.kind ?? defaultKind,
    title: item?.title ?? '',
    category: item?.category ?? '',
    content: item?.content ?? '',
    organizationId: item?.organizationId ?? null,
    serverId: item?.serverId ?? null,
  })
  const { pending, error, setError, run } = useSave(onClose)
  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (f.title.trim().length < 2) return setError('Введите название')
    if (f.content.trim().length < 5) return setError('Добавьте текст')
    void run(
      () => saveRoleplay({ data: { ...f, id: item?.id ?? null } }),
      item ? 'Сохранено' : 'Добавлено',
    )
  }
  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="rp-kind">Тип</Label>
          <Select
            value={f.kind}
            onValueChange={(v) => setF({ ...f, kind: v as RoleplayKind })}
          >
            <SelectTrigger id="rp-kind" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="action">Отыгровка</SelectItem>
              <SelectItem value="scenario">RP-сценарий</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="rp-category">Категория</Label>
          <Input
            id="rp-category"
            value={f.category}
            maxLength={60}
            onChange={(e) => setF({ ...f, category: e.target.value })}
            placeholder="Задержание, Медицина…"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="rp-title">Название</Label>
        <Input
          id="rp-title"
          value={f.title}
          maxLength={150}
          onChange={(e) => setF({ ...f, title: e.target.value })}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="rp-org">Организация</Label>
          <Select
            value={
              f.organizationId === null ? NO_ORG : String(f.organizationId)
            }
            onValueChange={(v) =>
              setF({ ...f, organizationId: v === NO_ORG ? null : Number(v) })
            }
          >
            <SelectTrigger id="rp-org" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_ORG}>Для всех</SelectItem>
              {organizations.map((o) => (
                <SelectItem key={o.id} value={String(o.id)}>
                  {o.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="rp-server">Сервер</Label>
          <ServerSelect
            id="rp-server"
            value={f.serverId}
            onChange={(serverId) => setF({ ...f, serverId })}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="rp-content">Текст</Label>
        <Textarea
          id="rp-content"
          rows={10}
          className="font-mono text-sm"
          value={f.content}
          onChange={(e) => setF({ ...f, content: e.target.value })}
          placeholder={'/me достал рацию\n/do Рация включена.'}
        />
      </div>
      <Footer pending={pending} error={error} onClose={onClose} edit={!!item} />
    </form>
  )
}

// ── Game commands ─────────────────────────────────────────

export function CommandEditor({
  state,
  onClose,
}: {
  state: EditState<GameCommand>
  onClose: () => void
}) {
  const item = state?.item ?? null
  return (
    <EditorDialog
      open={state !== null}
      onClose={onClose}
      title={item ? 'Редактировать команду' : 'Новая команда'}
      description="Команда чата и пример использования."
    >
      <CommandForm item={item} onClose={onClose} />
    </EditorDialog>
  )
}

function CommandForm({
  item,
  onClose,
}: {
  item: GameCommand | null
  onClose: () => void
}) {
  const [f, setF] = useState({
    command: item?.command ?? '/',
    description: item?.description ?? '',
    usage: item?.usage ?? '',
    category: item?.category ?? '',
    serverId: item?.serverId ?? null,
  })
  const { pending, error, setError, run } = useSave(onClose)
  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!/^\/\S/.test(f.command.trim()))
      return setError('Команда начинается с /')
    if (!f.description.trim()) return setError('Опишите команду')
    void run(
      () => saveCommand({ data: { ...f, id: item?.id ?? null } }),
      item ? 'Команда сохранена' : 'Команда добавлена',
    )
  }
  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="cmd-command">Команда</Label>
          <Input
            id="cmd-command"
            className="font-mono"
            value={f.command}
            maxLength={60}
            onChange={(e) => setF({ ...f, command: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cmd-category">Категория</Label>
          <Input
            id="cmd-category"
            value={f.category}
            maxLength={40}
            onChange={(e) => setF({ ...f, category: e.target.value })}
            placeholder="RP-чат, Чаты, Работа…"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="cmd-desc">Описание</Label>
        <Textarea
          id="cmd-desc"
          rows={3}
          maxLength={500}
          value={f.description}
          onChange={(e) => setF({ ...f, description: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="cmd-usage">Пример</Label>
        <Input
          id="cmd-usage"
          className="font-mono"
          value={f.usage}
          maxLength={300}
          onChange={(e) => setF({ ...f, usage: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="cmd-server">Сервер</Label>
        <ServerSelect
          id="cmd-server"
          value={f.serverId}
          onChange={(serverId) => setF({ ...f, serverId })}
        />
      </div>
      <Footer pending={pending} error={error} onClose={onClose} edit={!!item} />
    </form>
  )
}

// ── Organizations ─────────────────────────────────────────

export const ORG_KINDS = {
  gov: 'Государственная',
  crime: 'Криминальная',
  other: 'Другая',
} as const

export function OrgEditor({
  state,
  onClose,
}: {
  state: EditState<Organization>
  onClose: () => void
}) {
  const item = state?.item ?? null
  return (
    <EditorDialog
      open={state !== null}
      onClose={onClose}
      title={item ? 'Редактировать организацию' : 'Новая организация'}
      description="Фракция или организация сервера."
    >
      <OrgForm item={item} onClose={onClose} />
    </EditorDialog>
  )
}

function OrgForm({
  item,
  onClose,
}: {
  item: Organization | null
  onClose: () => void
}) {
  const [f, setF] = useState({
    name: item?.name ?? '',
    kind: (item?.kind ?? 'gov') as keyof typeof ORG_KINDS,
    description: item?.description ?? '',
    leader: item?.leader ?? '',
    serverId: item?.serverId ?? null,
    sortOrder: item?.sortOrder ?? 0,
  })
  const { pending, error, setError, run } = useSave(onClose)
  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!f.name.trim()) return setError('Введите название')
    void run(
      () => saveOrganization({ data: { ...f, id: item?.id ?? null } }),
      item ? 'Организация сохранена' : 'Организация добавлена',
    )
  }
  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="org-name">Название</Label>
          <Input
            id="org-name"
            value={f.name}
            maxLength={80}
            onChange={(e) => setF({ ...f, name: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="org-kind">Тип</Label>
          <Select
            value={f.kind}
            onValueChange={(v) =>
              setF({ ...f, kind: v as keyof typeof ORG_KINDS })
            }
          >
            <SelectTrigger id="org-kind" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(ORG_KINDS).map(([k, label]) => (
                <SelectItem key={k} value={k}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="org-leader">Лидер</Label>
          <Input
            id="org-leader"
            value={f.leader}
            maxLength={60}
            onChange={(e) => setF({ ...f, leader: e.target.value })}
            placeholder="Ник лидера (необязательно)"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="org-server">Сервер</Label>
          <ServerSelect
            id="org-server"
            value={f.serverId}
            onChange={(serverId) => setF({ ...f, serverId })}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="org-desc">Описание</Label>
        <Textarea
          id="org-desc"
          rows={4}
          maxLength={2000}
          value={f.description}
          onChange={(e) => setF({ ...f, description: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="org-order">Порядок</Label>
        <Input
          id="org-order"
          type="number"
          min={0}
          className="w-32"
          value={f.sortOrder}
          onChange={(e) =>
            setF({ ...f, sortOrder: Number(e.target.value) || 0 })
          }
        />
      </div>
      <Footer pending={pending} error={error} onClose={onClose} edit={!!item} />
    </form>
  )
}

// ── Game servers ──────────────────────────────────────────

export function ServerEditor({
  state,
  onClose,
}: {
  state: EditState<GameServer>
  onClose: () => void
}) {
  const item = state?.item ?? null
  return (
    <EditorDialog
      open={state !== null}
      onClose={onClose}
      title={item ? 'Редактировать сервер' : 'Новый сервер'}
      description="Новый сервер сразу появится в выборе сервера на сайте."
    >
      <ServerForm item={item} onClose={onClose} />
    </EditorDialog>
  )
}

function ServerForm({
  item,
  onClose,
}: {
  item: GameServer | null
  onClose: () => void
}) {
  const [f, setF] = useState({
    name: item?.name ?? '',
    description: item?.description ?? '',
    sortOrder: item?.sortOrder ?? 0,
    active: item?.active ?? true,
  })
  const { pending, error, setError, run } = useSave(onClose)
  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!f.name.trim()) return setError('Введите название')
    void run(
      () => saveServer({ data: { ...f, id: item?.id ?? null } }),
      item ? 'Сервер сохранён' : 'Сервер добавлен',
    )
  }
  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
        <div className="space-y-2">
          <Label htmlFor="srv-name">Название</Label>
          <Input
            id="srv-name"
            value={f.name}
            maxLength={60}
            onChange={(e) => setF({ ...f, name: e.target.value })}
            placeholder="Сервер 11"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="srv-order">Порядок</Label>
          <Input
            id="srv-order"
            type="number"
            min={0}
            value={f.sortOrder}
            onChange={(e) =>
              setF({ ...f, sortOrder: Number(e.target.value) || 0 })
            }
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="srv-desc">Описание</Label>
        <Input
          id="srv-desc"
          value={f.description}
          maxLength={300}
          onChange={(e) => setF({ ...f, description: e.target.value })}
          placeholder="IP, особенности сервера"
        />
      </div>
      <div className="flex items-center gap-3">
        <Switch
          id="srv-active"
          checked={f.active}
          onCheckedChange={(active) => setF({ ...f, active })}
        />
        <Label htmlFor="srv-active">Показывать в выборе сервера</Label>
      </div>
      <Footer pending={pending} error={error} onClose={onClose} edit={!!item} />
    </form>
  )
}
