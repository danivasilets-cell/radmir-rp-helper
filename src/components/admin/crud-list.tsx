import { useMemo, useState, type ReactNode } from 'react'
import { useRouter } from '@tanstack/react-router'
import { Pencil, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ConfirmDelete } from '@/components/events/confirm-delete'
import { errorMessage } from '@/lib/errors'
import { EmptyRow, SearchBox, SectionHead } from './ui'

/** Searchable list with add / edit / delete-with-confirmation. */
export function CrudList<T extends { id: number }>({
  title,
  text,
  items,
  searchText,
  render,
  name,
  onAdd,
  onEdit,
  onDelete,
  confirmName = false,
  deleteHint,
  extraActions,
}: {
  title: string
  text?: string
  items: T[]
  searchText: (item: T) => string
  render: (item: T) => ReactNode
  name: (item: T) => string
  onAdd?: () => void
  onEdit?: (item: T) => void
  onDelete?: (item: T) => Promise<unknown>
  /** Require typing the name before deleting (important data). */
  confirmName?: boolean
  deleteHint?: (item: T) => string
  extraActions?: ReactNode
}) {
  const router = useRouter()
  const [q, setQ] = useState('')
  const list = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return needle
      ? items.filter((i) => searchText(i).toLowerCase().includes(needle))
      : items
  }, [items, q, searchText])

  return (
    <div>
      <SectionHead
        title={title}
        text={text}
        actions={
          <>
            {extraActions}
            {onAdd && (
              <Button onClick={onAdd}>
                <Plus /> Добавить
              </Button>
            )}
          </>
        }
      />
      <div className="mb-4 flex items-center gap-3">
        <SearchBox value={q} onChange={setQ} />
        <span className="text-sm text-muted-foreground">
          {list.length} из {items.length}
        </span>
      </div>
      {list.length === 0 ? (
        <EmptyRow
          text={items.length === 0 ? 'Записей пока нет.' : 'Ничего не найдено.'}
        />
      ) : (
        <ul className="divide-y rounded-xl border bg-card">
          {list.map((item) => (
            <li key={item.id} className="flex items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">{render(item)}</div>
              {onEdit && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Изменить: ${name(item)}`}
                  onClick={() => onEdit(item)}
                >
                  <Pencil />
                </Button>
              )}
              {onDelete && (
                <ConfirmDelete
                  title={name(item)}
                  description={deleteHint?.(item)}
                  confirmText={confirmName ? name(item) : undefined}
                  onConfirm={async () => {
                    try {
                      await onDelete(item)
                      toast.success('Удалено')
                      await router.invalidate()
                    } catch (err) {
                      toast.error(errorMessage(err))
                    }
                  }}
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
