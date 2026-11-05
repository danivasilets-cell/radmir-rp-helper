import { Trophy, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  carClassLabel,
  carImageUrl,
  DRIVE_LABELS,
  formatPrice,
  fuelLabel,
  sourceLabel,
} from '@/lib/cars'
import type { Car } from '@/lib/types'
import { cn } from '@/lib/utils'

type Row = {
  label: string
  value: (c: Car) => number | null
  show: (c: Car) => string
  /** Which end wins; undefined = no winner. */
  best?: 'min' | 'max'
}

const ROWS: Row[] = [
  { label: 'ID', value: () => null, show: (c) => String(c.modelId) },
  { label: 'Класс', value: () => null, show: (c) => carClassLabel(c.carClass) },
  {
    label: 'Где купить',
    value: () => null,
    show: (c) => sourceLabel(c) || '—',
  },
  {
    label: 'Цена',
    value: (c) => c.price,
    show: (c) => formatPrice(c.price),
    best: 'min',
  },
  {
    label: 'Макс. скорость',
    value: (c) => c.maxSpeed,
    show: (c) => `${c.maxSpeed} км/ч`,
    best: 'max',
  },
  {
    label: 'Мест',
    value: (c) => c.seats,
    show: (c) => String(c.seats),
    best: 'max',
  },
  {
    label: 'Багажник',
    value: (c) => c.trunk,
    show: (c) => `${c.trunk} слотов`,
    best: 'max',
  },
  {
    label: 'Бак',
    value: (c) => c.fuelTank,
    show: (c) =>
      c.fuelType === 'electric'
        ? 'Электро'
        : c.fuelTank
          ? `${c.fuelTank} л`
          : '—',
    best: 'max',
  },
  {
    label: 'Привод',
    value: () => null,
    show: (c) => DRIVE_LABELS[c.drive] ?? '—',
  },
  {
    label: 'Топливо',
    value: () => null,
    show: (c) => (c.fuelType ? fuelLabel(c.fuelType) : '—'),
  },
]

function winner(row: Row, cars: Car[]) {
  if (!row.best || cars.length < 2) return null
  const vals = cars.map(row.value).filter((v): v is number => v !== null)
  if (vals.length < 2) return null
  const best = row.best === 'max' ? Math.max(...vals) : Math.min(...vals)
  return vals.every((v) => v === best) ? null : best
}

/** Bottom tray with picked cars and the comparison dialog. */
export function CompareTray({
  cars,
  open,
  onOpenChange,
  onRemove,
  onClear,
}: {
  cars: Car[]
  open: boolean
  onOpenChange: (o: boolean) => void
  onRemove: (car: Car) => void
  onClear: () => void
}) {
  return (
    <>
      {cars.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 shadow-2xl backdrop-blur">
          <div className="mx-auto flex max-w-content flex-wrap items-center gap-2 px-4 py-3 pr-20 sm:px-6 sm:pr-20">
            <span className="text-sm font-semibold">Сравнение:</span>
            {cars.map((c) => (
              <span
                key={c.id}
                className="inline-flex items-center gap-1 rounded-full border bg-card py-1 pr-1 pl-3 text-sm"
              >
                <span className="max-w-40 truncate">{c.name}</span>
                <button
                  type="button"
                  onClick={() => onRemove(c)}
                  className="rounded-full p-0.5 hover:bg-accent"
                  aria-label={`Убрать из сравнения: ${c.name}`}
                >
                  <X className="size-3.5" />
                </button>
              </span>
            ))}
            <div className="ml-auto flex gap-2">
              <Button size="sm" variant="ghost" onClick={onClear}>
                Очистить
              </Button>
              <Button
                size="sm"
                disabled={cars.length < 2}
                onClick={() => onOpenChange(true)}
              >
                Сравнить {cars.length}/3
              </Button>
            </div>
          </div>
        </div>
      )}
      <Dialog open={open && cars.length > 0} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[92svh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Сравнение машин</DialogTitle>
            <DialogDescription>
              Лучшее значение в каждой строке отмечено кубком.
            </DialogDescription>
          </DialogHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-36" />
                {cars.map((c) => (
                  <TableHead
                    key={c.id}
                    className="min-w-36 font-semibold text-foreground whitespace-normal"
                  >
                    {c.image && (
                      <img
                        src={carImageUrl(c.image)}
                        alt=""
                        loading="lazy"
                        className="mb-2 aspect-video w-full rounded-md object-cover"
                      />
                    )}
                    {c.name}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {ROWS.map((row) => {
                const best = winner(row, cars)
                return (
                  <TableRow key={row.label}>
                    <TableCell className="text-muted-foreground">
                      {row.label}
                    </TableCell>
                    {cars.map((c) => {
                      const win = best !== null && row.value(c) === best
                      return (
                        <TableCell
                          key={c.id}
                          className={cn(
                            'tabular-nums',
                            win && 'font-semibold text-primary',
                          )}
                        >
                          <span className="inline-flex items-center gap-1">
                            {row.show(c)}
                            {win && (
                              <Trophy
                                className="size-3.5"
                                aria-label="лучшее"
                              />
                            )}
                          </span>
                        </TableCell>
                      )
                    })}
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>
    </>
  )
}
