import { allowed } from '@/lib/types'
import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageShell } from '@/components/app/page-shell'
import { EventTableCard } from '@/components/events/event-table-card'
import { EventsHero } from '@/components/events/events-nav'
import {
  TableEditor,
  type TableEditorState,
} from '@/components/events/table-editor'
import { listEventTables } from '@/lib/events.functions'

export const Route = createFileRoute('/events/tables')({
  loader: () => listEventTables(),
  head: () => ({ meta: [{ title: 'Таблицы ивентов — Radmir Helper' }] }),
  component: TablesPage,
})

function TablesPage() {
  const tables = Route.useLoaderData()
  const { session } = Route.useRouteContext()
  const canEdit = allowed(session, 'events.manage')
  const [editor, setEditor] = useState<TableEditorState | null>(null)

  return (
    <PageShell session={session}>
      <EventsHero
        title="Таблицы"
        text="Рейтинги участников, результаты и расписание ивентов. Нажмите на заголовок колонки, чтобы отсортировать."
        action={
          canEdit && (
            <Button onClick={() => setEditor({ table: null })}>
              <Plus /> Новая таблица
            </Button>
          )
        }
      />
      <div className="mx-auto max-w-content px-4 py-12 sm:px-6">
        {tables.length === 0 ? (
          <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">
            Таблиц пока нет.
            {canEdit
              ? ' Добавьте первую — рейтинг, итоги или расписание.'
              : ' Модераторы скоро их добавят.'}
          </div>
        ) : (
          <div className="space-y-6">
            {tables.map((t) => (
              <EventTableCard
                key={t.id}
                table={t}
                canEdit={canEdit}
                onEdit={(table) => setEditor({ table })}
              />
            ))}
          </div>
        )}
      </div>
      <TableEditor state={editor} onClose={() => setEditor(null)} />
    </PageShell>
  )
}
