import { useState, type ReactNode } from 'react'
import { Loader2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

/**
 * Delete confirmation. For important data pass `confirmText`: the user must
 * type it (e.g. the nickname or the server name) before deleting.
 */
export function ConfirmDelete({
  title,
  onConfirm,
  description = 'Это действие нельзя отменить.',
  confirmText,
  actionLabel = 'Удалить',
  trigger,
  extra,
}: {
  extra?: ReactNode
  title: string
  onConfirm: () => Promise<void>
  description?: string
  confirmText?: string
  actionLabel?: string
  trigger?: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const [typed, setTyped] = useState('')
  const locked =
    !!confirmText &&
    typed.trim().toLowerCase() !== confirmText.trim().toLowerCase()
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (!o) setTyped('')
      }}
    >
      <DialogTrigger asChild>
        {trigger ?? (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Удалить: ${title}`}
          >
            <Trash2 />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {actionLabel} «{title}»?
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {extra}
        {confirmText && (
          <div className="space-y-2">
            <Label htmlFor="confirm-delete-text">
              Для подтверждения введите: <b>{confirmText}</b>
            </Label>
            <Input
              id="confirm-delete-text"
              value={typed}
              autoComplete="off"
              onChange={(e) => setTyped(e.target.value)}
            />
          </div>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Отмена
          </Button>
          <Button
            variant="destructive"
            disabled={pending || locked}
            onClick={async () => {
              setPending(true)
              try {
                await onConfirm()
                setOpen(false)
                setTyped('')
              } finally {
                setPending(false)
              }
            }}
          >
            {pending && (
              <Loader2 className="animate-spin motion-reduce:animate-none" />
            )}
            {actionLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
