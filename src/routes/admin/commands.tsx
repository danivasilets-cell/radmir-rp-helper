import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useServerName } from '@/components/app/server-select'
import { CrudList } from '@/components/admin/crud-list'
import { CommandEditor, type EditState } from '@/components/admin/editors'
import { guard } from '@/components/admin/guard'
import { deleteCommand, listCommands } from '@/lib/catalog.functions'
import type { GameCommand } from '@/lib/types'

export const Route = createFileRoute('/admin/commands')({
  beforeLoad: guard('catalog.manage'),
  loader: () => listCommands({ data: { all: true } }),
  component: CommandsAdmin,
})

function CommandsAdmin() {
  const commands = Route.useLoaderData()
  const serverName = useServerName()
  const [editor, setEditor] = useState<EditState<GameCommand>>(null)
  return (
    <>
      <CrudList
        title="Игровые команды"
        text="Справочник на странице «Команды»."
        items={commands}
        name={(c) => c.command}
        searchText={(c) => `${c.command} ${c.description} ${c.category}`}
        render={(c) => (
          <>
            <p className="font-mono font-semibold text-primary">{c.command}</p>
            <p className="truncate text-xs text-muted-foreground">
              {c.category || 'Прочее'} · {c.description} ·{' '}
              {serverName(c.serverId) ?? 'все серверы'}
            </p>
          </>
        )}
        onAdd={() => setEditor({ item: null })}
        onEdit={(item) => setEditor({ item })}
        onDelete={(c) => deleteCommand({ data: { id: c.id } })}
      />
      <CommandEditor state={editor} onClose={() => setEditor(null)} />
    </>
  )
}
