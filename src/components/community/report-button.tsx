import { useState, type FormEvent } from 'react'
import { Link, useRouteContext } from '@tanstack/react-router'
import { Flag, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
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
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { submitReport } from '@/lib/account.functions'
import { errorMessage } from '@/lib/errors'
import { isPlayer } from '@/lib/types'

const REASONS = [
  'Оскорбления',
  'Спам или реклама',
  'Неверная информация',
  'Нарушение правил сервера',
]

/** «Пожаловаться» — players send a complaint to moderators. */
export function ReportButton({
  targetType,
  targetId,
  label = 'Пожаловаться',
  iconOnly = false,
}: {
  targetType: 'node' | 'comment' | 'idea' | 'user'
  targetId: number
  label?: string
  iconOnly?: boolean
}) {
  const { session, settings } = useRouteContext({ from: '__root__' })
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  if (!settings.reportsEnabled) return null

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (reason.trim().length < 5)
      return setError('Опишите причину — минимум 5 символов')
    setPending(true)
    setError(null)
    try {
      await submitReport({ data: { targetType, targetId, reason } })
      toast.success('Жалоба отправлена модераторам')
      setOpen(false)
      setReason('')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size={iconOnly ? 'icon-sm' : 'sm'}
          aria-label={iconOnly ? label : undefined}
          className="text-muted-foreground"
        >
          <Flag /> {!iconOnly && label}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Жалоба</DialogTitle>
          <DialogDescription>
            Модераторы проверят материал и примут меры, если он нарушает
            правила.
          </DialogDescription>
        </DialogHeader>
        {!isPlayer(session) ? (
          <p className="text-sm text-muted-foreground">
            Чтобы отправить жалобу,{' '}
            <Link
              to="/login"
              search={{ tab: 'player' }}
              className="font-semibold text-primary hover:underline"
            >
              войдите в аккаунт игрока
            </Link>
            .
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3" noValidate>
            <div className="flex flex-wrap gap-1.5">
              {REASONS.map((r) => (
                <Button
                  key={r}
                  type="button"
                  size="sm"
                  variant={reason === r ? 'default' : 'outline'}
                  onClick={() => setReason(r)}
                >
                  {r}
                </Button>
              ))}
            </div>
            <div className="space-y-2">
              <Label htmlFor={`report-${targetType}-${targetId}`}>
                Причина
              </Label>
              <Textarea
                id={`report-${targetType}-${targetId}`}
                value={reason}
                maxLength={1000}
                onChange={(e) => setReason(e.target.value)}
                aria-invalid={!!error}
              />
            </div>
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpen(false)}
              >
                Отмена
              </Button>
              <Button type="submit" disabled={pending}>
                {pending && (
                  <Loader2 className="animate-spin motion-reduce:animate-none" />
                )}
                Отправить
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
