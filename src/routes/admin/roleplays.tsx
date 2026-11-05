import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useServerName } from '@/components/app/server-select'
import { CrudList } from '@/components/admin/crud-list'
import { RoleplayEditor, type EditState } from '@/components/admin/editors'
import { guard } from '@/components/admin/guard'
import { RP_KIND_LABEL } from '@/components/roleplay/roleplay-card'
import {
  deleteRoleplay,
  listOrganizations,
  listRoleplays,
} from '@/lib/catalog.functions'
import type { Roleplay } from '@/lib/types'

export const Route = createFileRoute('/admin/roleplays')({
  beforeLoad: guard('catalog.manage'),
  loader: async () => {
    const [rp, organizations] = await Promise.all([
      listRoleplays({ data: { all: true } }),
      listOrganizations({ data: { all: true } }),
    ])
    return { items: rp.items, organizations }
  },
  component: RoleplaysAdmin,
})

function RoleplaysAdmin() {
  const { items, organizations } = Route.useLoaderData()
  const serverName = useServerName()
  const [editor, setEditor] = useState<EditState<Roleplay>>(null)
  return (
    <>
      <CrudList
        title="RP-отыгровки и сценарии"
        text="Показываются на странице «Отыгровки»; игроки сохраняют их в личный кабинет."
        items={items}
        name={(r) => r.title}
        searchText={(r) =>
          `${r.title} ${r.category} ${r.organizationName ?? ''} ${r.content}`
        }
        render={(r) => (
          <>
            <p className="font-semibold">{r.title}</p>
            <p className="text-xs text-muted-foreground">
              {RP_KIND_LABEL[r.kind]}
              {r.category && ` · ${r.category}`} ·{' '}
              {r.organizationName ?? 'для всех'} ·{' '}
              {serverName(r.serverId) ?? 'все серверы'}
            </p>
          </>
        )}
        onAdd={() => setEditor({ item: null })}
        onEdit={(item) => setEditor({ item })}
        onDelete={(r) => deleteRoleplay({ data: { id: r.id } })}
      />
      <RoleplayEditor
        state={editor}
        onClose={() => setEditor(null)}
        organizations={organizations}
      />
    </>
  )
}
