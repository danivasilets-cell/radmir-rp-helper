import { useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Pencil, Plus, Search, Server, Terminal } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PageShell } from '@/components/app/page-shell'
import { useServerName } from '@/components/app/server-select'
import { CommandEditor, type EditState } from '@/components/admin/editors'
import { ConfirmDelete } from '@/components/events/confirm-delete'
import { deleteCommand, listCommands } from '@/lib/catalog.functions'
import { errorMessage } from '@/lib/errors'
import { allowed, type GameCommand } from '@/lib/types'

export const Route = createFileRoute('/commands')({
  loader: () => listCommands({ data: {} }),
  head: () => ({ meta: [{ title: 'Игровые команды — Radmir Helper' }] }),
  component: CommandsPage,
})

function CommandsPage() {
  const { session } = Route.useRouteContext()
  const commands = Route.useLoaderData()
  const router = useRouter()
  const serverName = useServerName()
  const [q, setQ] = useState('')
  const [editor, setEditor] = useState<EditState<GameCommand>>(null)
  const canEdit = allowed(session, 'catalog.manage')

  const groups = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const map = new Map<string, GameCommand[]>()
    for (const c of commands) {
      if (
        needle &&
        !c.command.toLowerCase().includes(needle) &&
        !c.description.toLowerCase().includes(needle)
      )
        continue
      const key = c.category || 'Прочее'
      map.set(key, [...(map.get(key) ?? []), c])
    }
    return [...map.entries()]
  }, [commands, q])

  return (
    <PageShell session={session}>
      <div className="mx-auto max-w-content px-4 py-10 sm:px-6">
        <h1 className="flex items-center gap-3 text-3xl">
          <Terminal className="size-7 text-primary" aria-hidden /> Игровые
          команды
        </h1>
        <p className="mt-2 max-w-reading text-muted-foreground">
          Справочник команд чата с примерами. Нажмите на команду, чтобы
          скопировать.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <div className="relative min-w-60 flex-1 sm:max-w-sm">
            <Search
              className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              aria-label="Поиск по командам"
              className="pl-9"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="/me, крик, шёпот…"
            />
          </div>
          {canEdit && (
            <Button onClick={() => setEditor({ item: null })}>
              <Plus /> Добавить команду
            </Button>
          )}
        </div>

        {groups.length === 0 ? (
          <p className="mt-8 rounded-xl border border-dashed p-10 text-center text-muted-foreground">
            {commands.length === 0 ? 'Команд пока нет.' : 'Ничего не найдено.'}
          </p>
        ) : (
          groups.map(([category, list]) => (
            <section key={category} className="mt-8">
              <h2 className="mb-3 text-xl">{category}</h2>
              <ul className="divide-y rounded-xl border bg-card">
                {list.map((c) => (
                  <li
                    key={c.id}
                    className="flex flex-wrap items-start gap-3 px-4 py-3"
                  >
                    <button
                      type="button"
                      className="rounded-md bg-primary/15 px-2 py-1 font-mono text-sm font-semibold text-primary hover:bg-primary/25"
                      onClick={async () => {
                        await navigator.clipboard
                          .writeText(c.command)
                          .catch(() => undefined)
                        toast.success(`${c.command} скопирована`)
                      }}
                    >
                      {c.command}
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm">{c.description}</p>
                      {c.usage && (
                        <p className="mt-1 font-mono text-xs text-muted-foreground">
                          {c.usage}
                        </p>
                      )}
                      {serverName(c.serverId) && (
                        <p className="mt-1 inline-flex items-center gap-1 text-xs text-chart-2">
                          <Server className="size-3" aria-hidden />{' '}
                          {serverName(c.serverId)}
                        </p>
                      )}
                    </div>
                    {canEdit && (
                      <div className="flex">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Изменить ${c.command}`}
                          onClick={() => setEditor({ item: c })}
                        >
                          <Pencil />
                        </Button>
                        <ConfirmDelete
                          title={c.command}
                          onConfirm={async () => {
                            try {
                              await deleteCommand({ data: { id: c.id } })
                              toast.success('Команда удалена')
                              await router.invalidate()
                            } catch (err) {
                              toast.error(errorMessage(err))
                            }
                          }}
                        />
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </div>
      {canEdit && (
        <CommandEditor state={editor} onClose={() => setEditor(null)} />
      )}
    </PageShell>
  )
}
