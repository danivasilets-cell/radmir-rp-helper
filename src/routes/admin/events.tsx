import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useServerName } from '@/components/app/server-select'
import { CrudList } from '@/components/admin/crud-list'
import { guard } from '@/components/admin/guard'
import {
  PrizeEditor,
  type PrizeEditorState,
} from '@/components/events/prize-editor'
import {
  TableEditor,
  type TableEditorState,
} from '@/components/events/table-editor'
import {
  deleteEventPrize,
  deleteEventTable,
  listEventPrizes,
  listEventTables,
} from '@/lib/events.functions'

export const Route = createFileRoute('/admin/events')({
  beforeLoad: guard('events.manage'),
  loader: async () => {
    const [tables, prizes] = await Promise.all([
      listEventTables(),
      listEventPrizes(),
    ])
    return { tables, prizes: prizes.prizes }
  },
  component: EventsAdmin,
})

function EventsAdmin() {
  const { tables, prizes } = Route.useLoaderData()
  const serverName = useServerName()
  const [table, setTable] = useState<TableEditorState | null>(null)
  const [prize, setPrize] = useState<PrizeEditorState | null>(null)
  return (
    <div className="space-y-10">
      <CrudList
        title="Мероприятия (таблицы)"
        text="Рейтинги, расписания и результаты ивентов."
        items={tables}
        name={(t) => t.title}
        searchText={(t) => `${t.title} ${t.description}`}
        render={(t) => (
          <>
            <p className="font-semibold">{t.title}</p>
            <p className="text-xs text-muted-foreground">
              {t.rows.length} строк ·{' '}
              {serverName(t.serverId ?? null) ?? 'все серверы'}
            </p>
          </>
        )}
        onAdd={() => setTable({ table: null })}
        onEdit={(t) => setTable({ table: t })}
        onDelete={(t) => deleteEventTable({ data: { id: t.id } })}
        confirmName
      />
      <CrudList
        title="Призы"
        items={prizes}
        name={(p) => p.title}
        searchText={(p) => `${p.title} ${p.reward} ${p.winner}`}
        render={(p) => (
          <>
            <p className="font-semibold">{p.title}</p>
            <p className="text-xs text-muted-foreground">
              {p.reward} · {p.eventDate ?? 'без даты'}
              {p.winner && ` · победитель ${p.winner}`} ·{' '}
              {serverName(p.serverId ?? null) ?? 'все серверы'}
            </p>
          </>
        )}
        onAdd={() => setPrize({ prize: null })}
        onEdit={(p) => setPrize({ prize: p })}
        onDelete={(p) => deleteEventPrize({ data: { id: p.id } })}
      />
      <TableEditor state={table} onClose={() => setTable(null)} />
      <PrizeEditor state={prize} onClose={() => setPrize(null)} />
    </div>
  )
}
