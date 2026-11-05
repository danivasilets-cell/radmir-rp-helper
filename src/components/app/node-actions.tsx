import { useEffect, useState } from 'react'
import { useNavigate, useRouter } from '@tanstack/react-router'
import {
  ArrowDown,
  ArrowUp,
  FolderInput,
  Loader2,
  MoreVertical,
  Pencil,
  Trash2,
} from 'lucide-react'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Label } from '@/components/ui/label'
import {
  deleteNode,
  getSectionTree,
  moveNode,
  reparentNode,
} from '@/lib/api.functions'
import { errorMessage } from '@/lib/errors'
import { allowed, type NodeItem, type SessionInfo } from '@/lib/types'
import type { EditorState } from './node-editor'

type Target = Pick<NodeItem, 'id' | 'kind' | 'title' | 'parentId'>

export function canDelete(session: SessionInfo, kind: NodeItem['kind']) {
  return (
    allowed(session, 'content.manage') ||
    (allowed(session, 'content.moderate') && kind === 'topic')
  )
}

export function NodeActions({
  node,
  session,
  onEdit,
  redirectAfterDelete = false,
  showReorder = true,
}: {
  node: Target & {
    summary?: string
    content?: string
    icon?: string
    serverId?: number | null
  }
  session: SessionInfo
  onEdit?: (state: EditorState) => void
  redirectAfterDelete?: boolean
  showReorder?: boolean
}) {
  const router = useRouter()
  const navigate = useNavigate()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [moveOpen, setMoveOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const owner = allowed(session, 'content.manage')

  if (!canDelete(session, node.kind)) return null

  async function run(action: () => Promise<unknown>, success: string) {
    setPending(true)
    try {
      await action()
      toast.success(success)
      await router.invalidate()
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setPending(false)
    }
  }

  async function handleDelete() {
    setPending(true)
    try {
      const res = await deleteNode({ data: { id: node.id } })
      toast.success('Удалено')
      setConfirmOpen(false)
      if (redirectAfterDelete) {
        if (res.parentId)
          await navigate({ to: '/n/$id', params: { id: String(res.parentId) } })
        else await navigate({ to: '/' })
      } else {
        await router.invalidate()
      }
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setPending(false)
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Действия: ${node.title}`}
            disabled={pending}
          >
            {pending ? (
              <Loader2 className="animate-spin motion-reduce:animate-none" />
            ) : (
              <MoreVertical />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {owner && onEdit && (
            <DropdownMenuItem
              onSelect={() =>
                onEdit({
                  mode: 'edit',
                  id: node.id,
                  kind: node.kind,
                  title: node.title,
                  summary: node.summary ?? '',
                  content: node.content ?? '',
                  icon: node.icon ?? '',
                  serverId: node.serverId ?? null,
                })
              }
            >
              <Pencil /> Редактировать
            </DropdownMenuItem>
          )}
          {owner && showReorder && (
            <>
              <DropdownMenuItem
                onSelect={() =>
                  run(
                    () => moveNode({ data: { id: node.id, direction: 'up' } }),
                    'Перемещено выше',
                  )
                }
              >
                <ArrowUp /> Выше
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() =>
                  run(
                    () =>
                      moveNode({ data: { id: node.id, direction: 'down' } }),
                    'Перемещено ниже',
                  )
                }
              >
                <ArrowDown /> Ниже
              </DropdownMenuItem>
            </>
          )}
          {owner && (
            <DropdownMenuItem onSelect={() => setMoveOpen(true)}>
              <FolderInput /> Перенести в…
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onSelect={() => setConfirmOpen(true)}
          >
            <Trash2 /> Удалить
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Удалить «{node.title}»?</DialogTitle>
            <DialogDescription>
              Все вложенные подпункты тоже будут удалены. Это действие нельзя
              отменить.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
              Отмена
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={pending}
            >
              {pending && (
                <Loader2 className="animate-spin motion-reduce:animate-none" />
              )}
              Удалить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {owner && (
        <MoveDialog open={moveOpen} onOpenChange={setMoveOpen} node={node} />
      )}
    </>
  )
}

function MoveDialog({
  open,
  onOpenChange,
  node,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  node: Target
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Перенести «{node.title}»</DialogTitle>
          <DialogDescription>
            Выберите, внутри чего будет находиться этот пункт.
          </DialogDescription>
        </DialogHeader>
        {open && <MoveBody node={node} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  )
}

function MoveBody({ node, onDone }: { node: Target; onDone: () => void }) {
  const router = useRouter()
  const [options, setOptions] = useState<
    { id: number; label: string }[] | null
  >(null)
  const [target, setTarget] = useState<string>(
    node.parentId ? String(node.parentId) : 'root',
  )
  const [pending, setPending] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    getSectionTree()
      .then((rows) => {
        if (cancelled) return
        // Indented list, excluding the node itself and its descendants.
        const byParent = new Map<number | null, typeof rows>()
        for (const r of rows) {
          const list = byParent.get(r.parentId) ?? []
          list.push(r)
          byParent.set(r.parentId, list)
        }
        const out: { id: number; label: string }[] = []
        const walk = (parent: number | null, depth: number) => {
          for (const r of byParent.get(parent) ?? []) {
            if (r.id === node.id) continue
            out.push({ id: r.id, label: `${'— '.repeat(depth)}${r.title}` })
            walk(r.id, depth + 1)
          }
        }
        walk(null, 0)
        setOptions(out)
      })
      .catch((err) => !cancelled && setLoadError(errorMessage(err)))
    return () => {
      cancelled = true
    }
  }, [node.id])

  async function handleMove() {
    setPending(true)
    try {
      await reparentNode({
        data: {
          id: node.id,
          parentId: target === 'root' ? null : Number(target),
        },
      })
      toast.success('Перенесено')
      onDone()
      await router.invalidate()
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setPending(false)
    }
  }

  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="move-target">Новое расположение</Label>
        {loadError ? (
          <p role="alert" className="text-sm text-destructive">
            {loadError}
          </p>
        ) : !options ? (
          <p role="status" className="text-sm text-muted-foreground">
            Загрузка структуры…
          </p>
        ) : (
          <select
            id="move-target"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="root">Главный экран</option>
            {options.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        )}
      </div>
      <DialogFooter>
        <Button variant="ghost" onClick={onDone}>
          Отмена
        </Button>
        <Button onClick={handleMove} disabled={pending || !options}>
          {pending && (
            <Loader2 className="animate-spin motion-reduce:animate-none" />
          )}
          Перенести
        </Button>
      </DialogFooter>
    </>
  )
}
