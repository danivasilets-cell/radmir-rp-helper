import { useMemo, useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Medal,
  Pencil,
  Search,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { deleteEventTable } from '@/lib/events.functions'
import { errorMessage } from '@/lib/errors'
import type { EventTable } from '@/lib/types'
import { cn } from '@/lib/utils'
import { ConfirmDelete } from './confirm-delete'

const MEDALS = ['text-chart-5', 'text-muted-foreground', 'text-primary']

const compare = (a: string, b: string) => {
  const na = Number(a.replace(',', '.').replace(/\s/g, ''))
  const nb = Number(b.replace(',', '.').replace(/\s/g, ''))
  if (a.trim() && b.trim() && !Number.isNaN(na) && !Number.isNaN(nb))
    return na - nb
  return a.localeCompare(b, 'ru')
}

export function EventTableCard({
  table,
  canEdit,
  onEdit,
  preview = false,
}: {
  table: EventTable
  canEdit: boolean
  onEdit?: (t: EventTable) => void
  preview?: boolean
}) {
  const router = useRouter()
  const [filter, setFilter] = useState('')
  const [sort, setSort] = useState<{ col: number; dir: 1 | -1 } | null>(null)
  const ranked = /место|№|#/i.test(table.columns[0] ?? '')

  const rows = useMemo(() => {
    const q = filter.trim().toLowerCase()
    let list = table.rows.map((cells, index) => ({ cells, index }))
    if (q)
      list = list.filter((r) =>
        r.cells.some((c) => c.toLowerCase().includes(q)),
      )
    if (sort)
      list = [...list].sort(
        (a, b) =>
          sort.dir * compare(a.cells[sort.col] ?? '', b.cells[sort.col] ?? ''),
      )
    return preview ? list.slice(0, 5) : list
  }, [table.rows, filter, sort, preview])

  const cycleSort = (col: number) =>
    setSort((s) =>
      !s || s.col !== col
        ? { col, dir: 1 }
        : s.dir === 1
          ? { col, dir: -1 }
          : null,
    )

  return (
    <article
      id={`table-${table.id}`}
      className="scroll-mt-24 overflow-hidden rounded-xl border bg-card"
    >
      <header className="flex flex-wrap items-start gap-3 border-b p-4 sm:p-5">
        <div className="min-w-0 flex-1">
          <h3 className="text-lg">{table.title}</h3>
          {table.description && (
            <p className="mt-1 text-sm text-muted-foreground">
              {table.description}
            </p>
          )}
          <p className="mt-1.5 text-xs text-muted-foreground">
            {table.rows.length} строк · обновлено{' '}
            {new Date(table.updatedAt).toLocaleDateString('ru-RU')}
            {table.createdBy && <> · {table.createdBy}</>}
          </p>
        </div>
        {!preview && table.rows.length > 5 && (
          <div className="relative w-full sm:w-56">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <label htmlFor={`f-${table.id}`} className="sr-only">
              Поиск в таблице
            </label>
            <Input
              id={`f-${table.id}`}
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Найти ник…"
              className="h-9 pl-8"
            />
          </div>
        )}
        {canEdit && onEdit && (
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Редактировать: ${table.title}`}
              onClick={() => onEdit(table)}
            >
              <Pencil />
            </Button>
            <ConfirmDelete
              title={table.title}
              onConfirm={async () => {
                try {
                  await deleteEventTable({ data: { id: table.id } })
                  toast.success('Таблица удалена')
                  await router.invalidate()
                } catch (err) {
                  toast.error(errorMessage(err))
                }
              }}
            />
          </div>
        )}
      </header>

      {table.rows.length === 0 ? (
        <p className="p-6 text-center text-sm text-muted-foreground">
          В таблице пока нет строк.
        </p>
      ) : (
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              {table.columns.map((col, i) => (
                <TableHead key={i} className="px-4">
                  {preview ? (
                    col
                  ) : (
                    <button
                      type="button"
                      onClick={() => cycleSort(i)}
                      className="inline-flex items-center gap-1 rounded font-semibold hover:text-foreground"
                    >
                      {col}
                      {sort?.col === i ? (
                        sort.dir === 1 ? (
                          <ArrowUp className="size-3.5" />
                        ) : (
                          <ArrowDown className="size-3.5" />
                        )
                      ) : (
                        <ArrowUpDown className="size-3.5 opacity-40" />
                      )}
                      <span className="sr-only">— сортировать</span>
                    </button>
                  )}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={table.columns.length}
                  className="px-4 py-6 text-center text-muted-foreground"
                >
                  Ничего не найдено
                </TableCell>
              </TableRow>
            ) : (
              rows.map(({ cells, index }) => (
                <TableRow
                  key={index}
                  className={cn(ranked && index < 3 && 'bg-primary/5')}
                >
                  {cells.map((cell, i) => (
                    <TableCell
                      key={i}
                      className={cn(
                        'px-4',
                        i === 0 && ranked && 'font-semibold',
                      )}
                    >
                      {i === 0 && ranked && index < 3 ? (
                        <span className="inline-flex items-center gap-1.5">
                          <Medal
                            aria-hidden
                            className={cn('size-4', MEDALS[index])}
                          />
                          {cell}
                        </span>
                      ) : (
                        cell
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}
    </article>
  )
}
