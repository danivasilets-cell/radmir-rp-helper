import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ChevronDown,
  ExternalLink,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { getOnline } from '@/lib/online.functions'
import { MONITOR_URL, SLOTS_PER_SERVER, type OnlineStats } from '@/lib/online'
import { cn } from '@/lib/utils'

const REFRESH_MS = 60_000
const nf = new Intl.NumberFormat('ru-RU')

/** Smoothly counts from the previous value to the new one. */
function useCountUp(value: number) {
  const [shown, setShown] = useState(value)
  const from = useRef(value)
  useEffect(() => {
    const start = from.current
    if (start === value) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const t0 = performance.now()
    let raf = 0
    const step = (t: number) => {
      const k = reduce ? 1 : Math.min(1, (t - t0) / 800)
      const eased = 1 - (1 - k) ** 3
      setShown(Math.round(start + (value - start) * eased))
      if (k < 1) raf = requestAnimationFrame(step)
      else from.current = value
    }
    raf = requestAnimationFrame(step)
    return () => {
      cancelAnimationFrame(raf)
      from.current = value
    }
  }, [value])
  return shown
}

function timeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function OnlineWidget() {
  const [data, setData] = useState<OnlineStats | null>(null)
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading')
  const [delta, setDelta] = useState<number | null>(null)
  const [open, setOpen] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const last = useRef<number | null>(null)

  const load = useCallback(async () => {
    try {
      const next = await getOnline()
      if (!next) throw new Error('no data')
      if (last.current !== null && last.current !== next.total)
        setDelta(next.total - last.current)
      last.current = next.total
      setData(next)
      setStatus('ok')
    } catch {
      setStatus((s) => (s === 'ok' ? 'ok' : 'error'))
    }
  }, [])

  const refresh = useCallback(async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }, [load])

  useEffect(() => {
    void load()
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') void load()
    }, REFRESH_MS)
    const onVisible = () => {
      if (document.visibilityState === 'visible') void load()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [load])

  const total = useCountUp(data?.total ?? 0)

  if (status === 'loading')
    return (
      <div className="rounded-xl border bg-card p-5" aria-busy="true">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="mt-3 h-10 w-48" />
        <Skeleton className="mt-4 h-2 w-full" />
      </div>
    )

  if (status === 'error' || !data)
    return (
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-dashed bg-card p-5 text-sm text-muted-foreground">
        <Users className="size-5" aria-hidden />
        <span className="flex-1">
          Не удалось получить онлайн с мониторинга. Попробуем ещё раз через
          минуту.
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void refresh()}
          disabled={refreshing}
        >
          <RefreshCw
            className={cn(
              refreshing && 'animate-spin motion-reduce:animate-none',
            )}
          />
          Обновить
        </Button>
      </div>
    )

  const fill = data.slots ? Math.min(100, (data.total / data.slots) * 100) : 0
  const sorted = [...data.servers].sort((a, b) => b.players - a.players)
  const busiest = sorted[0]
  const freest = sorted[sorted.length - 1]
  const full = data.servers.filter((s) => s.players >= SLOTS_PER_SERVER).length

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <div className="flex flex-wrap items-center gap-x-8 gap-y-4 p-5">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            <span className="relative flex size-2.5" aria-hidden>
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-chart-3 opacity-75 motion-reduce:animate-none" />
              <span className="relative inline-flex size-2.5 rounded-full bg-chart-3" />
            </span>
            Общий онлайн Радмир РП
          </p>
          <p
            className="mt-1 flex flex-wrap items-baseline gap-x-3"
            aria-live="polite"
          >
            <span className="font-display text-4xl tabular-nums sm:text-5xl">
              {nf.format(total)}
            </span>
            <span className="text-sm text-muted-foreground">
              из {nf.format(data.slots)} · {data.servers.length} серверов
            </span>
            {delta !== null && delta !== 0 && (
              <span
                className={cn(
                  'inline-flex items-center gap-1 text-sm font-semibold',
                  delta > 0 ? 'text-chart-3' : 'text-destructive',
                )}
                title="Изменение с прошлого обновления"
              >
                {delta > 0 ? (
                  <TrendingUp className="size-4" aria-hidden />
                ) : (
                  <TrendingDown className="size-4" aria-hidden />
                )}
                {delta > 0 ? '+' : ''}
                {nf.format(delta)}
              </span>
            )}
          </p>
          <div
            className="mt-3 h-2 overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-label="Заполненность серверов"
            aria-valuenow={Math.round(fill)}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-chart-5 transition-[width] duration-700 motion-reduce:transition-none"
              style={{ width: `${fill}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Заполнено {Math.round(fill)}% · обновлено в{' '}
            {timeLabel(data.updatedAt)} · обновляется само каждую минуту
          </p>
        </div>

        <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
          <Stat
            label="Самый людный"
            value={busiest.name}
            hint={nf.format(busiest.players)}
          />
          <Stat
            label="Самый свободный"
            value={freest.name}
            hint={nf.format(freest.players)}
          />
          <Stat label="Забито полностью" value={String(full)} hint="серверов" />
        </dl>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t bg-muted/30 px-5 py-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="online-servers"
        >
          <ChevronDown
            className={cn(
              'transition-transform motion-reduce:transition-none',
              open && 'rotate-180',
            )}
          />
          {open ? 'Скрыть серверы' : 'Онлайн по серверам'}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => void refresh()}
          disabled={refreshing}
        >
          <RefreshCw
            className={cn(
              refreshing && 'animate-spin motion-reduce:animate-none',
            )}
          />
          Обновить
        </Button>
        <a
          href={MONITOR_URL}
          target="_blank"
          rel="noreferrer"
          className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          Данные: CRMP мониторинг{' '}
          <ExternalLink className="size-3" aria-hidden />
        </a>
      </div>

      {open && (
        <ul
          id="online-servers"
          className="grid gap-x-6 gap-y-2 border-t p-5 sm:grid-cols-2 lg:grid-cols-3"
        >
          {data.servers.map((s) => {
            const pct = Math.min(100, (s.players / SLOTS_PER_SERVER) * 100)
            return (
              <li key={s.name} className="text-sm">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-medium">Сервер {s.name}</span>
                  <span className="text-muted-foreground tabular-nums">
                    {nf.format(s.players)}
                  </span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      'h-full rounded-full',
                      pct >= 100
                        ? 'bg-destructive'
                        : pct >= 70
                          ? 'bg-primary'
                          : 'bg-chart-3',
                    )}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint: string
}) {
  return (
    <div className="min-w-28 rounded-lg border bg-background/60 px-3 py-2">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-display text-lg leading-tight">
        {value}{' '}
        <span className="font-sans text-xs text-muted-foreground">{hint}</span>
      </dd>
    </div>
  )
}
