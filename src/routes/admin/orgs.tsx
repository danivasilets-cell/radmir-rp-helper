import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useServerName } from '@/components/app/server-select'
import { CrudList } from '@/components/admin/crud-list'
import {
  ORG_KINDS,
  OrgEditor,
  type EditState,
} from '@/components/admin/editors'
import { guard } from '@/components/admin/guard'
import { deleteOrganization, listOrganizations } from '@/lib/catalog.functions'
import type { Organization } from '@/lib/types'

export const Route = createFileRoute('/admin/orgs')({
  beforeLoad: guard('orgs.manage'),
  loader: () => listOrganizations({ data: { all: true } }),
  component: OrgsAdmin,
})

function OrgsAdmin() {
  const orgs = Route.useLoaderData()
  const serverName = useServerName()
  const [editor, setEditor] = useState<EditState<Organization>>(null)
  return (
    <>
      <CrudList
        title="Организации"
        text="Фракции показываются на странице «Организации» и в фильтрах отыгровок."
        items={orgs}
        name={(o) => o.name}
        searchText={(o) => `${o.name} ${o.leader} ${o.description}`}
        render={(o) => (
          <>
            <p className="font-semibold">{o.name}</p>
            <p className="text-xs text-muted-foreground">
              {ORG_KINDS[o.kind as keyof typeof ORG_KINDS] ?? o.kind}
              {o.leader && ` · лидер ${o.leader}`} ·{' '}
              {serverName(o.serverId) ?? 'все серверы'}
            </p>
          </>
        )}
        onAdd={() => setEditor({ item: null })}
        onEdit={(item) => setEditor({ item })}
        onDelete={(o) => deleteOrganization({ data: { id: o.id } })}
        confirmName
      />
      <OrgEditor state={editor} onClose={() => setEditor(null)} />
    </>
  )
}
