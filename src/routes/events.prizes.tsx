import { allowed } from '@/lib/types'
import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageShell } from '@/components/app/page-shell'
import { EventsHero } from '@/components/events/events-nav'
import { PrizeCard, prizeStatus } from '@/components/events/prize-card'
import {
  PrizeEditor,
  type PrizeEditorState,
} from '@/components/events/prize-editor'
import { listEventPrizes } from '@/lib/events.functions'

export const Route = createFileRoute('/events/prizes')({
  loader: () => listEventPrizes(),
  head: () => ({ meta: [{ title: 'Призы ивентов — Radmir Helper' }] }),
  component: PrizesPage,
})

function PrizesPage() {
  const { prizes, today } = Route.useLoaderData()
  const { session } = Route.useRouteContext()
  const canEdit = allowed(session, 'events.manage')
  const [editor, setEditor] = useState<PrizeEditorState | null>(null)

  const upcoming = prizes
    .filter((p) => prizeStatus(p, today).tone !== 'done')
    .sort((a, b) =>
      (a.eventDate ?? '9999').localeCompare(b.eventDate ?? '9999'),
    )
  const finished = prizes.filter((p) => prizeStatus(p, today).tone === 'done')

  const grid = (list: typeof prizes) => (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {list.map((p) => (
        <PrizeCard
          key={p.id}
          prize={p}
          today={today}
          canEdit={canEdit}
          onEdit={(prize) => setEditor({ prize })}
        />
      ))}
    </div>
  )

  return (
    <PageShell session={session}>
      <EventsHero
        title="Призы"
        text="Что разыгрывают на ивентах, когда и кто уже забрал награду."
        action={
          canEdit && (
            <Button onClick={() => setEditor({ prize: null })}>
              <Plus /> Новый приз
            </Button>
          )
        }
      />
      <div className="mx-auto max-w-content space-y-12 px-4 py-12 sm:px-6">
        {prizes.length === 0 ? (
          <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">
            Призов пока нет.
            {canEdit
              ? ' Добавьте первый приз.'
              : ' Модераторы скоро их добавят.'}
          </div>
        ) : (
          <>
            {upcoming.length > 0 && (
              <section>
                <h2 className="mb-5 text-2xl">Можно выиграть</h2>
                {grid(upcoming)}
              </section>
            )}
            {finished.length > 0 && (
              <section>
                <h2 className="mb-5 text-2xl">Прошедшие ивенты</h2>
                {grid(finished)}
              </section>
            )}
          </>
        )}
      </div>
      <PrizeEditor state={editor} onClose={() => setEditor(null)} />
    </PageShell>
  )
}
