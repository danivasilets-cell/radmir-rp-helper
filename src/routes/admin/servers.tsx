import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { CrudList } from '@/components/admin/crud-list'
import { ServerEditor, type EditState } from '@/components/admin/editors'
import { guard } from '@/components/admin/guard'
import { adminListServers, deleteServer } from '@/lib/catalog.functions'
import type { GameServer } from '@/lib/types'

export const Route = createFileRoute('/admin/servers')({
  beforeLoad: guard('servers.manage'),
  loader: () => adminListServers(),
  component: ServersAdmin,
})

function ServersAdmin() {
  const servers = Route.useLoaderData()
  const [editor, setEditor] = useState<EditState<GameServer>>(null)
  return (
    <>
      <CrudList
        title="Серверы RADMIR RP"
        text="Новый сервер сразу появляется в выборе сервера. Любую статью, машину, ивент, команду или отыгровку можно привязать к серверу — тогда её видят только игроки этого сервера."
        items={servers}
        name={(s) => s.name}
        searchText={(s) => `${s.name} ${s.description}`}
        render={(s) => (
          <>
            <p className="font-semibold">
              {s.name}
              {!s.active && (
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  (скрыт)
                </span>
              )}
            </p>
            <p className="text-xs text-muted-foreground">
              {s.players} игроков · порядок {s.sortOrder}
              {s.description && ` · ${s.description}`}
            </p>
          </>
        )}
        onAdd={() => setEditor({ item: null })}
        onEdit={(item) => setEditor({ item })}
        onDelete={(s) => deleteServer({ data: { id: s.id } })}
        confirmName
        deleteHint={() =>
          'Материалы этого сервера станут общими для всех серверов, у игроков сбросится выбор сервера. Чтобы просто скрыть сервер, отключите его в редактировании.'
        }
      />
      <ServerEditor state={editor} onClose={() => setEditor(null)} />
    </>
  )
}
