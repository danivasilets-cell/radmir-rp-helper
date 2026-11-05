import { useState, type FormEvent } from 'react'
import { useRouter } from '@tanstack/react-router'
import { ClipboardPaste, Loader2, Plus, X } from 'lucide-react'
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
import { Textarea } from '@/components/ui/textarea'
import { saveEventTable } from '@/lib/events.functions'
import { ServerSelect } from '@/components/app/server-select'
import { errorMessage } from '@/lib/errors'
import type { EventTable } from '@/lib/types'

export type TableEditorState = { table: EventTable | null }

const TEMPLATES: { label: string; columns: string[] }[] = [
  { label: 'Рейтинг', columns: ['Место', 'Ник', 'Очки'] },
  { label: 'Расписание', columns: ['Дата', 'Время', 'Ивент', 'Ведущий'] },
  { label: 'Результаты', columns: ['Место', 'Участник', 'Результат', 'Приз'] },
]

export function TableEditor({
  state,
  onClose,
}: {
  state: TableEditorState | null
  onClose: () => void
}) {
  return (
    <Dialog open={state !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92svh] overflow-y-auto sm:max-w-3xl">
        {state && <TableForm table={state.table} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  )
}

function TableForm({
  table,
  onClose,
}: {
  table: EventTable | null
  onClose: () => void
}) {
  const router = useRouter()
  const [title, setTitle] = useState(table?.title ?? '')
  const [description, setDescription] = useState(table?.description ?? '')
  const [serverId, setServerId] = useState<number | null>(
    table?.serverId ?? null,
  )
  const [columns, setColumns] = useState<string[]>(
    table?.columns ?? ['Место', 'Ник', 'Очки'],
  )
  const [rows, setRows] = useState<string[][]>(
    table?.rows ?? [
      ['1', '', ''],
      ['2', '', ''],
      ['3', '', ''],
    ],
  )
  const [pasteOpen, setPasteOpen] = useState(false)
  const [paste, setPaste] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const setCell = (r: number, c: number, v: string) =>
    setRows((rs) =>
      rs.map((row, i) =>
        i === r ? row.map((x, j) => (j === c ? v : x)) : row,
      ),
    )

  const addColumn = () => {
    if (columns.length >= 12) return
    setColumns((cs) => [...cs, `Колонка ${cs.length + 1}`])
    setRows((rs) => rs.map((r) => [...r, '']))
  }
  const removeColumn = (c: number) => {
    if (columns.length <= 1) return
    setColumns((cs) => cs.filter((_, i) => i !== c))
    setRows((rs) => rs.map((r) => r.filter((_, i) => i !== c)))
  }
  const addRow = () =>
    setRows((rs) => [
      ...rs,
      columns.map((col, i) =>
        i === 0 && /место|№|#/i.test(col) ? String(rs.length + 1) : '',
      ),
    ])

  function applyTemplate(cols: string[]) {
    setColumns(cols)
    setRows(
      [1, 2, 3].map((n) =>
        cols.map((c, i) => (i === 0 && /место/i.test(c) ? String(n) : '')),
      ),
    )
  }

  function applyPaste() {
    // Excel / Google Sheets copy as tab-separated lines; also allow ; or |
    const lines = paste
      .replace(/\r/g, '')
      .split('\n')
      .filter((l) => l.trim())
    if (lines.length < 1) return
    const sep = lines[0].includes('\t')
      ? '\t'
      : lines[0].includes(';')
        ? ';'
        : '|'
    const parsed = lines.map((l) =>
      l.split(sep).map((x) => x.trim().slice(0, 200)),
    )
    const width = Math.min(12, Math.max(...parsed.map((p) => p.length)))
    const norm = parsed.map((p) =>
      Array.from({ length: width }, (_, i) => p[i] ?? ''),
    )
    setColumns(norm[0].map((h, i) => h || `Колонка ${i + 1}`))
    setRows(norm.slice(1, 301))
    setPaste('')
    setPasteOpen(false)
    toast.success(`Вставлено строк: ${Math.min(norm.length - 1, 300)}`)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!title.trim()) return setError('Введите название таблицы')
    if (columns.some((c) => !c.trim()))
      return setError('У каждой колонки должен быть заголовок')
    setError(null)
    setPending(true)
    try {
      await saveEventTable({
        data: {
          id: table?.id ?? null,
          title,
          description,
          columns: columns.map((c) => c.trim()),
          // drop rows where every cell is empty
          rows: rows.filter((r) => r.some((x) => x.trim())),
          serverId,
        },
      })
      toast.success(table ? 'Таблица сохранена' : 'Таблица добавлена')
      onClose()
      await router.invalidate()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <DialogHeader>
        <DialogTitle>
          {table ? 'Редактировать таблицу' : 'Новая таблица'}
        </DialogTitle>
        <DialogDescription>
          Рейтинг участников, итоги ивента или расписание. Можно вставить данные
          прямо из Excel или Google Таблиц.
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="t-title">Название</Label>
          <Input
            id="t-title"
            value={title}
            maxLength={150}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Например: Гонка выходного дня"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="t-desc">Описание (необязательно)</Label>
          <Input
            id="t-desc"
            value={description}
            maxLength={1000}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Дата, условия"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="t-server">Сервер</Label>
          <ServerSelect id="t-server" value={serverId} onChange={setServerId} />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">Шаблон:</span>
        {TEMPLATES.map((t) => (
          <Button
            key={t.label}
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => applyTemplate(t.columns)}
          >
            {t.label}
          </Button>
        ))}
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="ml-auto"
          onClick={() => setPasteOpen((v) => !v)}
        >
          <ClipboardPaste /> Вставить из таблицы
        </Button>
      </div>

      {pasteOpen && (
        <div className="space-y-2 rounded-lg border border-dashed p-3">
          <Label htmlFor="t-paste">
            Скопируйте ячейки в Excel / Google Таблицах и вставьте сюда. Первая
            строка — заголовки.
          </Label>
          <Textarea
            id="t-paste"
            rows={5}
            value={paste}
            onChange={(e) => setPaste(e.target.value)}
            className="font-mono text-xs"
          />
          <Button
            type="button"
            size="sm"
            onClick={applyPaste}
            disabled={!paste.trim()}
          >
            Применить
          </Button>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-max text-sm">
          <thead className="bg-muted/60">
            <tr>
              {columns.map((col, c) => (
                <th key={c} className="p-1.5">
                  <div className="flex items-center gap-1">
                    <Input
                      aria-label={`Заголовок колонки ${c + 1}`}
                      value={col}
                      maxLength={200}
                      onChange={(e) =>
                        setColumns((cs) =>
                          cs.map((x, i) => (i === c ? e.target.value : x)),
                        )
                      }
                      className="h-8 min-w-28 font-semibold"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      aria-label={`Удалить колонку ${col || c + 1}`}
                      disabled={columns.length <= 1}
                      onClick={() => removeColumn(c)}
                    >
                      <X />
                    </Button>
                  </div>
                </th>
              ))}
              <th className="w-10 p-1.5" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, r) => (
              <tr key={r} className="border-t">
                {row.map((value, c) => (
                  <td key={c} className="p-1.5">
                    <Input
                      aria-label={`Строка ${r + 1}, ${columns[c]}`}
                      value={value}
                      maxLength={200}
                      onChange={(e) => setCell(r, c, e.target.value)}
                      className="h-8 min-w-28"
                    />
                  </td>
                ))}
                <td className="p-1.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    aria-label={`Удалить строку ${r + 1}`}
                    onClick={() =>
                      setRows((rs) => rs.filter((_, i) => i !== r))
                    }
                  >
                    <X />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addRow}
          disabled={rows.length >= 300}
        >
          <Plus /> Строка
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addColumn}
          disabled={columns.length >= 12}
        >
          <Plus /> Колонка
        </Button>
      </div>

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
          Сохранить
        </Button>
      </DialogFooter>
    </form>
  )
}
