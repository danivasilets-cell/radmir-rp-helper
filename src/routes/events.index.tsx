import { allowed } from '@/lib/types'
import { useState } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { ArrowRight, Gift, Plus, Table2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageShell } from '@/components/app/page-shell'
import { EventTableCard } from '@/components/events/event-table-card'
import { EventsHero } from '@/components/events/events-nav'
import { PrizeCard } from '@/components/events/prize-card'
import {
  PrizeEditor,
  type PrizeEditorState,
} from '@/components/events/prize-editor'
import {
  TableEditor,
  type TableEditorState,
} from '@/components/events/table-editor'
import { getEventsOverview } from '@/lib/events.functions'

export const Route = createFileRoute('/events/')({
  loader: () => getEventsOverview(),
  head: () => ({
    meta: [
      { title: 'Ивенты — Radmir Helper' },
      { name: 'description', content: 'Таблицы и призы ивентов Радмир РП' },
    ],
  }),
  component: EventsPage,
})

function EventsPage() {
  const { tables, prizes, tableCount, prizeCount, today } =
    Route.useLoaderData()
  const { session } = Route.useRouteContext()
  const canEdit = allowed(session, 'events.manage')
  const [tableEditor, setTableEditor] = useState<TableEditorState | null>(null)
  const [prizeEditor, setPrizeEditor] = useState<PrizeEditorState | null>(null)

  return (
    <PageShell session={session}>
      <EventsHero
        title="Ивенты"
        text="Рейтинги, итоги и расписание ивентов, а также призы, которые можно выиграть на сервере."
        action={
          canEdit && (
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() => setTableEditor({ table: null })}
              >
                <Plus /> Таблица
              </Button>
              <Button onClick={() => setPrizeEditor({ prize: null })}>
                <Plus /> Приз
              </Button>
            </div>
          )
        }
      />

      <div className="mx-auto max-w-content space-y-14 px-4 py-12 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <QuickCard
            to="/events/tables"
            icon={<Table2 className="size-6" />}
            title="Таблицы"
            count={tableCount}
            text="Рейтинги участников, результаты и расписание"
          />
          <QuickCard
            to="/events/prizes"
            icon={<Gift className="size-6" />}
            title="Призы"
            count={prizeCount}
            text="Что разыгрывают и кто уже победил"
          />
        </div>

        <section>
          <SectionHead
            title="Призы"
            to="/events/prizes"
            show={prizeCount > 0}
          />
          {prizes.length === 0 ? (
            <Empty text="Призов пока нет." canEdit={canEdit} />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {prizes.map((p) => (
                <PrizeCard
                  key={p.id}
                  prize={p}
                  today={today}
                  canEdit={canEdit}
                  onEdit={(prize) => setPrizeEditor({ prize })}
                />
              ))}
            </div>
          )}
        </section>

        <section>
          <SectionHead
            title="Свежие таблицы"
            to="/events/tables"
            show={tableCount > 0}
          />
          {tables.length === 0 ? (
            <Empty text="Таблиц пока нет." canEdit={canEdit} />
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {tables.map((t) => (
                <EventTableCard key={t.id} table={t} canEdit={false} preview />
              ))}
            </div>
          )}
        </section>
      </div>

      <TableEditor state={tableEditor} onClose={() => setTableEditor(null)} />
      <PrizeEditor state={prizeEditor} onClose={() => setPrizeEditor(null)} />
    </PageShell>
  )
}

function QuickCard({
  to,
  icon,
  title,
  count,
  text,
}: {
  to: '/events/tables' | '/events/prizes'
  icon: React.ReactNode
  title: string
  count: number
  text: string
}) {
  return (
    <Link
      to={to}
      className="group flex items-center gap-4 rounded-xl border bg-card p-5 transition-colors hover:border-primary/60 hover:bg-accent/50 motion-reduce:transition-none"
    >
      <span className="grid size-14 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/25">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline gap-2">
          <span className="font-display text-xl">{title}</span>
          <span className="text-sm font-semibold text-primary">{count}</span>
        </span>
        <span className="block text-sm text-muted-foreground">{text}</span>
      </span>
      <ArrowRight className="size-5 text-muted-foreground transition-transform group-hover:translate-x-1 motion-reduce:transition-none" />
    </Link>
  )
}

function SectionHead({
  title,
  to,
  show,
}: {
  title: string
  to: '/events/tables' | '/events/prizes'
  show: boolean
}) {
  return (
    <div className="mb-5 flex items-center justify-between gap-3">
      <h2 className="text-2xl">{title}</h2>
      {show && (
        <Link
          to={to}
          className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
        >
          Все <ArrowRight className="size-4" />
        </Link>
      )}
    </div>
  )
}

function Empty({ text, canEdit }: { text: string; canEdit: boolean }) {
  return (
    <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">
      {text}
      {canEdit
        ? ' Нажмите «+», чтобы добавить первый.'
        : ' Следите за обновлениями — модераторы скоро добавят.'}
    </div>
  )
}
