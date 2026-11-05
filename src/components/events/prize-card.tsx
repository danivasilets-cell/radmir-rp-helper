import { useRouter } from '@tanstack/react-router'
import { CalendarDays, Gift, Pencil, Trophy } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { deleteEventPrize } from '@/lib/events.functions'
import { errorMessage } from '@/lib/errors'
import type { EventPrize } from '@/lib/types'
import { cn } from '@/lib/utils'
import { ConfirmDelete } from './confirm-delete'

function plural(n: number, one: string, few: string, many: string) {
  const m10 = n % 10
  const m100 = n % 100
  if (m10 === 1 && m100 !== 11) return one
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few
  return many
}

/** Status chip from the date and winner. Dates are compared as calendar days. */
export function prizeStatus(p: EventPrize, today: string) {
  if (p.winner) return { label: 'Разыгран', tone: 'done' as const }
  if (!p.eventDate) return { label: 'Скоро', tone: 'soon' as const }
  const days = Math.round(
    (Date.parse(p.eventDate) - Date.parse(today)) / 86_400_000,
  )
  if (days === 0) return { label: 'Сегодня!', tone: 'live' as const }
  if (days > 0)
    return {
      label: `Через ${days} ${plural(days, 'день', 'дня', 'дней')}`,
      tone: 'soon' as const,
    }
  return { label: 'Ждём итоги', tone: 'done' as const }
}

const toneClass = {
  live: 'bg-primary text-primary-foreground animate-pulse motion-reduce:animate-none',
  soon: 'bg-chart-3/15 text-chart-3',
  done: 'bg-secondary text-muted-foreground',
}

export function PrizeCard({
  prize,
  canEdit,
  onEdit,
  today,
}: {
  prize: EventPrize
  canEdit: boolean
  onEdit?: (p: EventPrize) => void
  today: string
}) {
  const router = useRouter()
  const status = prizeStatus(prize, today)
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-xl border bg-card p-5 transition-colors hover:border-primary/60 motion-reduce:transition-none">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-16 -right-16 size-40 rounded-full bg-primary/10 blur-2xl"
      />
      <div className="flex items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">
          <Gift className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <span
            className={cn(
              'inline-block rounded-full px-2 py-0.5 text-xs font-semibold',
              toneClass[status.tone],
            )}
          >
            {status.label}
          </span>
          <h3 className="mt-1.5 text-base leading-snug">{prize.title}</h3>
        </div>
        {canEdit && onEdit && (
          <div className="flex gap-0.5">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Редактировать: ${prize.title}`}
              onClick={() => onEdit(prize)}
            >
              <Pencil />
            </Button>
            <ConfirmDelete
              title={prize.title}
              onConfirm={async () => {
                try {
                  await deleteEventPrize({ data: { id: prize.id } })
                  toast.success('Приз удалён')
                  await router.invalidate()
                } catch (err) {
                  toast.error(errorMessage(err))
                }
              }}
            />
          </div>
        )}
      </div>

      <p className="mt-4 rounded-lg bg-primary/10 px-3 py-2 font-semibold text-primary">
        {prize.reward}
      </p>
      {prize.description && (
        <p className="mt-3 text-sm whitespace-pre-line text-muted-foreground">
          {prize.description}
        </p>
      )}

      <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 pt-4 text-xs text-muted-foreground">
        {prize.eventDate && (
          <span className="inline-flex items-center gap-1">
            <CalendarDays className="size-3.5" aria-hidden />
            {new Date(prize.eventDate + 'T12:00:00').toLocaleDateString(
              'ru-RU',
              {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              },
            )}
          </span>
        )}
        {prize.winner && (
          <span className="inline-flex items-center gap-1 font-semibold text-foreground">
            <Trophy className="size-3.5 text-chart-5" aria-hidden />{' '}
            {prize.winner}
          </span>
        )}
      </div>
    </article>
  )
}
