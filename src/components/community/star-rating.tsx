import { useState } from 'react'
import { isPlayer } from '@/lib/types'
import { Link, useRouter } from '@tanstack/react-router'
import { Star } from 'lucide-react'
import { toast } from 'sonner'
import { rateNode } from '@/lib/community.functions'
import { errorMessage } from '@/lib/errors'
import type { SessionInfo } from '@/lib/types'
import { cn } from '@/lib/utils'

function votes(n: number) {
  const m10 = n % 10
  const m100 = n % 100
  if (m10 === 1 && m100 !== 11) return 'оценка'
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return 'оценки'
  return 'оценок'
}

/** Average rating plus 1–5 star input for players. */
export function StarRating({
  nodeId,
  rating,
  session,
}: {
  nodeId: number
  rating: { avg: number; count: number; mine: number }
  session: SessionInfo
}) {
  const router = useRouter()
  const [hover, setHover] = useState(0)
  const [pending, setPending] = useState(false)
  const canRate = isPlayer(session)
  const shown = hover || rating.mine || Math.round(rating.avg)

  async function rate(value: number) {
    setPending(true)
    try {
      const next = value === rating.mine ? 0 : value
      await rateNode({ data: { nodeId, value: next } })
      toast.success(next ? `Ваша оценка: ${next} из 5` : 'Оценка убрана')
      await router.invalidate()
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border bg-card px-4 py-3">
      <div
        className="flex"
        role={canRate ? 'radiogroup' : undefined}
        aria-label={canRate ? 'Оценить материал' : undefined}
        onMouseLeave={() => setHover(0)}
      >
        {[1, 2, 3, 4, 5].map((v) => {
          const filled = v <= shown
          const icon = (
            <Star
              className={cn(
                'size-6 transition-colors motion-reduce:transition-none',
                filled
                  ? 'fill-chart-5 text-chart-5'
                  : 'text-muted-foreground/40',
              )}
            />
          )
          return canRate ? (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={rating.mine === v}
              aria-label={`${v} из 5`}
              disabled={pending}
              onMouseEnter={() => setHover(v)}
              onFocus={() => setHover(v)}
              onBlur={() => setHover(0)}
              onClick={() => rate(v)}
              className="rounded p-0.5"
            >
              {icon}
            </button>
          ) : (
            <span key={v} aria-hidden className="p-0.5">
              {icon}
            </span>
          )
        })}
      </div>
      <p className="text-sm">
        {rating.count > 0 ? (
          <>
            <span className="font-display text-lg">
              {rating.avg.toFixed(1)}
            </span>{' '}
            <span className="text-muted-foreground">
              · {rating.count} {votes(rating.count)}
            </span>
          </>
        ) : (
          <span className="text-muted-foreground">Оценок пока нет</span>
        )}
      </p>
      <p className="text-xs text-muted-foreground sm:ml-auto">
        {canRate ? (
          rating.mine ? (
            'Нажмите на свою оценку ещё раз, чтобы убрать её'
          ) : (
            'Оцените материал'
          )
        ) : session ? (
          'Оценивают игроки'
        ) : (
          <>
            <Link
              to="/login"
              search={{ tab: 'player' }}
              className="font-semibold text-primary hover:underline"
            >
              Войдите
            </Link>
            , чтобы оценить
          </>
        )}
      </p>
    </div>
  )
}
