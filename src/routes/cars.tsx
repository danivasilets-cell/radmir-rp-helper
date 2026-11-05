import { useMemo, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import {
  CarFront,
  Copy,
  LayoutGrid,
  List,
  Plus,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react'
import { z } from 'zod'
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
import { PageShell } from '@/components/app/page-shell'
import { CarCard, copyCarId, type CarMaxima } from '@/components/cars/car-card'
import { listMyCarFavorites } from '@/lib/account.functions'
import { CompareTray } from '@/components/cars/car-compare'
import { CarEditor, type CarEditorState } from '@/components/cars/car-editor'
import {
  CAR_CLASSES,
  CAR_CLASS_IDS,
  CAR_SORT_IDS,
  CAR_SORTS,
  carClassLabel,
  EXCLUSIVE_SOURCES,
  formatPrice,
  PRICE_PRESETS,
  shortPrice,
  tankLabel,
  type CarSort,
} from '@/lib/cars'
import { listCars } from '@/lib/cars.functions'
import { allowed, type Car } from '@/lib/types'
import { cn } from '@/lib/utils'

const searchSchema = z.object({
  // `?q=410` arrives as a number, so accept both.
  q: z
    .union([z.string(), z.number()])
    .transform(String)
    .pipe(z.string().max(100))
    .optional()
    .catch(undefined),
  cls: z.array(z.enum(CAR_CLASS_IDS)).optional().catch(undefined),
  min: z.number().int().min(0).optional().catch(undefined),
  max: z.number().int().min(0).optional().catch(undefined),
  sort: z.enum(CAR_SORT_IDS).optional().catch(undefined),
  view: z.enum(['cards', 'table']).optional().catch(undefined),
})
type CarSearch = z.infer<typeof searchSchema>

export const Route = createFileRoute('/cars')({
  validateSearch: searchSchema,
  loader: async () => {
    const [cars, favorites] = await Promise.all([
      listCars(),
      listMyCarFavorites().catch(() => null),
    ])
    return { cars, favorites }
  },
  head: () => ({
    meta: [
      { title: 'Каталог автомобилей — Radmir Helper' },
      {
        name: 'description',
        content:
          'Весь транспорт Радмир РП: автосалоны, грузовые, мото, водный и воздушный транспорт, дома на колёсах и эксклюзив. ID, цены, фото и характеристики.',
      },
    ],
  }),
  component: CarsPage,
})

const norm = (s: string) => s.toLowerCase().replace(/ё/g, 'е').trim()

function sorter(sort: CarSort) {
  const price = (c: Car) => c.price ?? Number.MAX_SAFE_INTEGER
  switch (sort) {
    case 'price-desc':
      return (a: Car, b: Car) => (b.price ?? -1) - (a.price ?? -1)
    case 'speed':
      return (a: Car, b: Car) => b.maxSpeed - a.maxSpeed
    case 'name':
      return (a: Car, b: Car) => a.name.localeCompare(b.name, 'ru')
    case 'id':
      return (a: Car, b: Car) => a.modelId - b.modelId
    default:
      return (a: Car, b: Car) => price(a) - price(b) || a.modelId - b.modelId
  }
}

function parseRub(v: string) {
  const digits = v.replace(/\D/g, '')
  return digits === '' ? undefined : Math.min(Number(digits), 1e11)
}

function CarsPage() {
  const { cars: all, favorites } = Route.useLoaderData()
  const search = Route.useSearch()
  const { session } = Route.useRouteContext()
  const navigate = useNavigate({ from: '/cars' })
  const canEdit = allowed(session, 'catalog.manage')
  const [editor, setEditor] = useState<CarEditorState | null>(null)
  const [compareIds, setCompareIds] = useState<number[]>([])
  const [compareOpen, setCompareOpen] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)

  const q = search.q ?? ''
  const classes = useMemo(() => search.cls ?? [], [search.cls])
  const sort = search.sort ?? 'price-asc'
  const view = search.view ?? 'cards'
  const hasPrice = search.min !== undefined || search.max !== undefined
  const filtered = classes.length > 0 || hasPrice || q.trim() !== ''

  const update = (patch: Partial<CarSearch>) =>
    navigate({
      search: (prev) => ({ ...prev, ...patch }),
      replace: true,
      resetScroll: false,
    })

  const max: CarMaxima = useMemo(
    () => ({
      speed: Math.max(1, ...all.map((c) => c.maxSpeed)),
    }),
    [all],
  )

  // Everything except the class filter, so class chips can show counts.
  const matchesBase = useMemo(() => {
    const nq = norm(q)
    const digits = /^\d+$/.test(nq)
    return (c: Car) => {
      if (nq) {
        const byName = norm(c.name).includes(nq)
        const byId = digits && String(c.modelId).startsWith(nq)
        if (!byName && !byId) return false
      }
      if (hasPrice) {
        if (c.price === null) return false
        if (search.min !== undefined && c.price < search.min) return false
        if (search.max !== undefined && c.price > search.max) return false
      }
      return true
    }
  }, [q, hasPrice, search.min, search.max])

  const base = useMemo(() => all.filter(matchesBase), [all, matchesBase])
  const counts = useMemo(() => {
    const m = new Map<string, number>()
    for (const c of base) m.set(c.carClass, (m.get(c.carClass) ?? 0) + 1)
    return m
  }, [base])
  const list = useMemo(() => {
    const exactId = /^\d+$/.test(q.trim()) ? Number(q.trim()) : null
    const res = base
      .filter(
        (c) => classes.length === 0 || classes.includes(c.carClass as never),
      )
      .sort(sorter(sort))
    if (exactId !== null) {
      const i = res.findIndex((c) => c.modelId === exactId)
      if (i > 0) res.unshift(...res.splice(i, 1))
    }
    return res
  }, [base, classes, sort, q])

  const groups = useMemo(
    () =>
      CAR_CLASSES.map((cl) => ({
        ...cl,
        cars: list.filter((c) => c.carClass === cl.id),
      })).filter((g) => g.cars.length > 0),
    [list],
  )
  // Group by class unless the user searches by text/ID (then best match first).
  const grouped = q.trim() === ''

  const prices = all.flatMap((c) => (c.price === null ? [] : [c.price]))
  const compared = compareIds
    .map((id) => all.find((c) => c.id === id))
    .filter((c): c is Car => !!c)
  const toggleCompare = (car: Car) =>
    setCompareIds((ids) =>
      ids.includes(car.id)
        ? ids.filter((i) => i !== car.id)
        : ids.length >= 3
          ? ids
          : [...ids, car.id],
    )

  const toggleClass = (id: (typeof CAR_CLASS_IDS)[number]) => {
    const next = classes.includes(id)
      ? classes.filter((c) => c !== id)
      : [...classes, id]
    update({ cls: next.length ? next : undefined })
  }

  const renderCars = (cars: Car[]) =>
    view === 'table' ? (
      <CarTable
        cars={cars}
        compareIds={compareIds}
        onToggleCompare={toggleCompare}
        onEdit={canEdit ? (car) => setEditor({ car }) : undefined}
      />
    ) : (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {cars.map((c) => (
          <CarCard
            key={c.id}
            car={c}
            max={max}
            canEdit={canEdit}
            compared={compareIds.includes(c.id)}
            compareFull={compareIds.length >= 3}
            onToggleCompare={toggleCompare}
            onEdit={(car) => setEditor({ car })}
            favorite={favorites ? favorites.includes(c.id) : null}
          />
        ))}
      </div>
    )

  // Exclusives are split by where to get them (containers, craft, cases…).
  const renderExclusive = (cars: Car[]) => {
    const known = new Set(EXCLUSIVE_SOURCES.map((s) => s.id))
    const extra = [
      ...new Set(cars.map((c) => c.dealership).filter((d) => !known.has(d))),
    ].map((id) => ({ id, label: id, note: undefined }))
    const parts = [...EXCLUSIVE_SOURCES, ...extra]
      .map((src) => ({
        ...src,
        cars: cars.filter((c) => c.dealership === src.id),
      }))
      .filter((p) => p.cars.length > 0)
    return (
      <div className="space-y-8">
        {parts.map((p) => (
          <div key={p.id || 'other'}>
            <h3 className="text-lg font-semibold">
              {p.label}{' '}
              <span className="text-sm font-normal text-muted-foreground">
                {p.cars.length} шт.
              </span>
            </h3>
            {p.note && (
              <p className="mt-1 max-w-reading text-sm text-muted-foreground">
                {p.note}
              </p>
            )}
            <div className="mt-3">{renderCars(p.cars)}</div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <PageShell session={session}>
      <section className="bg-grid border-b border-border/70">
        <div className="mx-auto max-w-content px-4 py-10 sm:px-6 sm:py-14">
          <p className="inline-flex items-center gap-2 text-sm font-semibold tracking-wider text-primary uppercase">
            <CarFront className="size-4" aria-hidden /> Автосалоны Радмир РП
          </p>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl leading-tight sm:text-4xl">
                Каталог автомобилей
              </h1>
              <p className="mt-2 max-w-reading text-muted-foreground">
                {all.length} единиц транспорта: автосалоны, грузовые, мото,
                водный и воздушный транспорт, дома на колёсах и эксклюзив. ID,
                цена, фото и характеристики.
                {prices.length > 0 &&
                  ` Цены от ${shortPrice(Math.min(...prices))} до ${shortPrice(Math.max(...prices))} ₽.`}
              </p>
            </div>
            {canEdit && (
              <Button onClick={() => setEditor({ car: null })}>
                <Plus /> Добавить машину
              </Button>
            )}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-content px-4 py-8 sm:px-6">
        {/* Filters */}
        <div className="space-y-4 rounded-xl border bg-card p-4">
          <div className="flex flex-wrap gap-2">
            <div className="relative min-w-56 flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                value={q}
                onChange={(e) =>
                  update({ q: e.target.value ? e.target.value : undefined })
                }
                placeholder="Название или ID, например «Приора» или 410"
                aria-label="Поиск по названию или ID"
                className="pl-9"
              />
            </div>
            <Select
              value={sort}
              onValueChange={(v) =>
                update({ sort: v === 'price-asc' ? undefined : (v as CarSort) })
              }
            >
              <SelectTrigger className="w-48" aria-label="Сортировка">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CAR_SORTS.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div
              className="flex rounded-md border p-0.5"
              role="group"
              aria-label="Вид"
            >
              <Button
                size="icon-sm"
                variant={view === 'cards' ? 'secondary' : 'ghost'}
                aria-label="Карточки"
                aria-pressed={view === 'cards'}
                onClick={() => update({ view: undefined })}
              >
                <LayoutGrid />
              </Button>
              <Button
                size="icon-sm"
                variant={view === 'table' ? 'secondary' : 'ghost'}
                aria-label="Таблица"
                aria-pressed={view === 'table'}
                onClick={() => update({ view: 'table' })}
              >
                <List />
              </Button>
            </div>
            <Button
              variant="outline"
              className="sm:hidden"
              onClick={() => setFiltersOpen((o) => !o)}
              aria-expanded={filtersOpen}
            >
              <SlidersHorizontal /> Фильтры
            </Button>
          </div>

          <div className={cn('space-y-4', !filtersOpen && 'max-sm:hidden')}>
            <div>
              <p className="mb-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Раздел
              </p>
              <div className="flex flex-wrap gap-2">
                {CAR_CLASSES.map((cl) => {
                  const active = classes.includes(cl.id)
                  const n = counts.get(cl.id) ?? 0
                  return (
                    <button
                      key={cl.id}
                      type="button"
                      onClick={() => toggleClass(cl.id)}
                      aria-pressed={active}
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors motion-reduce:transition-none',
                        active
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'hover:border-primary/60',
                        n === 0 && !active && 'opacity-50',
                      )}
                    >
                      {cl.label}
                      <span
                        className={cn(
                          'text-xs tabular-nums',
                          active ? 'opacity-80' : 'text-muted-foreground',
                        )}
                      >
                        {n}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Стоимость
              </p>
              <div className="flex flex-wrap items-end gap-2">
                <PriceInput
                  label="от, ₽"
                  value={search.min}
                  onChange={(v) => update({ min: v })}
                />
                <PriceInput
                  label="до, ₽ (бюджет)"
                  value={search.max}
                  onChange={(v) => update({ max: v })}
                />
                {PRICE_PRESETS.map((p) => {
                  const active = search.min === p.min && search.max === p.max
                  return (
                    <button
                      key={p.label}
                      type="button"
                      aria-pressed={active}
                      onClick={() =>
                        update(
                          active
                            ? { min: undefined, max: undefined }
                            : { min: p.min, max: p.max },
                        )
                      }
                      className={cn(
                        'h-9 rounded-md border px-3 text-sm transition-colors motion-reduce:transition-none',
                        active
                          ? 'border-primary bg-primary/15 text-foreground'
                          : 'text-muted-foreground hover:border-primary/60 hover:text-foreground',
                      )}
                    >
                      {p.label}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3 text-sm">
            <span className="text-muted-foreground" aria-live="polite">
              Найдено: <b className="text-foreground">{list.length}</b> из{' '}
              {all.length}
              {hasPrice && ' · без транспорта с индивидуальной ценой'}
            </span>
            {filtered && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  update({
                    q: undefined,
                    cls: undefined,
                    min: undefined,
                    max: undefined,
                  })
                }
              >
                <X /> Сбросить фильтры
              </Button>
            )}
          </div>
        </div>

        {/* Results */}
        <div className={cn('mt-8 space-y-10', compared.length > 0 && 'pb-20')}>
          {all.length === 0 ? (
            <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">
              Каталог пока пуст.
              {canEdit
                ? ' Добавьте первую машину.'
                : ' Модераторы скоро его заполнят.'}
            </div>
          ) : list.length === 0 ? (
            <div className="rounded-xl border border-dashed p-10 text-center">
              <p className="text-muted-foreground">
                Ничего не найдено. Попробуйте изменить запрос или фильтры.
              </p>
              <Button
                className="mt-4"
                variant="outline"
                onClick={() =>
                  update({
                    q: undefined,
                    cls: undefined,
                    min: undefined,
                    max: undefined,
                  })
                }
              >
                Показать все машины
              </Button>
            </div>
          ) : grouped ? (
            groups.map((g) => (
              <section key={g.id} aria-labelledby={`cls-${g.id}`}>
                <div className="mb-4 flex items-baseline justify-between gap-3 border-b pb-2">
                  <h2 id={`cls-${g.id}`} className="text-2xl">
                    {g.label}
                  </h2>
                  <span className="text-sm text-muted-foreground">
                    {g.cars.length} шт.
                    {(() => {
                      const ps = g.cars.flatMap((c) =>
                        c.price === null ? [] : [c.price],
                      )
                      return ps.length
                        ? ` · ${shortPrice(Math.min(...ps))} – ${shortPrice(Math.max(...ps))} ₽`
                        : ''
                    })()}
                  </span>
                </div>
                {g.id === 'exclusive'
                  ? renderExclusive(g.cars)
                  : renderCars(g.cars)}
              </section>
            ))
          ) : (
            renderCars(list)
          )}
        </div>
      </div>

      <CompareTray
        cars={compared}
        open={compareOpen}
        onOpenChange={setCompareOpen}
        onRemove={toggleCompare}
        onClear={() => setCompareIds([])}
      />
      <CarEditor state={editor} onClose={() => setEditor(null)} />
    </PageShell>
  )
}

function PriceInput({
  label,
  value,
  onChange,
}: {
  label: string
  value: number | undefined
  onChange: (v: number | undefined) => void
}) {
  const id = `price-${label.slice(0, 2)}`
  return (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        {label}
      </Label>
      <Input
        id={id}
        inputMode="numeric"
        className="w-36 tabular-nums"
        value={value === undefined ? '' : value.toLocaleString('ru-RU')}
        onChange={(e) => onChange(parseRub(e.target.value))}
        placeholder="любая"
      />
    </div>
  )
}

function CarTable({
  cars,
  compareIds,
  onToggleCompare,
  onEdit,
}: {
  cars: Car[]
  compareIds: number[]
  onToggleCompare: (car: Car) => void
  onEdit?: (car: Car) => void
}) {
  return (
    <div className="rounded-xl border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Название</TableHead>
            <TableHead>Раздел</TableHead>
            <TableHead className="text-right">Цена</TableHead>
            <TableHead className="text-right">км/ч</TableHead>
            <TableHead className="text-right">Мест</TableHead>
            <TableHead className="text-right">Багаж.</TableHead>
            <TableHead className="text-right">Бак</TableHead>
            <TableHead>
              <span className="sr-only">Действия</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {cars.map((c) => {
            const inCompare = compareIds.includes(c.id)
            return (
              <TableRow
                key={c.id}
                data-state={inCompare ? 'selected' : undefined}
              >
                <TableCell>
                  <button
                    type="button"
                    onClick={() => copyCarId(c)}
                    className="inline-flex items-center gap-1 font-mono text-xs hover:text-primary"
                    aria-label={`Скопировать ID ${c.modelId}`}
                  >
                    {c.modelId} <Copy className="size-3" aria-hidden />
                  </button>
                </TableCell>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell className="text-muted-foreground">
                  {carClassLabel(c.carClass)}
                  {c.carClass === 'exclusive' && c.dealership
                    ? ` · ${c.dealership}`
                    : ''}
                </TableCell>
                <TableCell className="text-right font-semibold tabular-nums">
                  {formatPrice(c.price)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {c.maxSpeed}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {c.seats}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {c.trunk}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {tankLabel(c)}
                </TableCell>
                <TableCell className="text-right whitespace-nowrap">
                  <Button
                    size="sm"
                    variant={inCompare ? 'default' : 'ghost'}
                    disabled={!inCompare && compareIds.length >= 3}
                    aria-pressed={inCompare}
                    onClick={() => onToggleCompare(c)}
                  >
                    {inCompare ? 'В сравнении' : 'Сравнить'}
                  </Button>
                  {onEdit && (
                    <Button size="sm" variant="ghost" onClick={() => onEdit(c)}>
                      Изменить
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
