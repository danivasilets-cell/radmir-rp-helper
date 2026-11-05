import { useState } from 'react'
import { Link, createFileRoute, useRouter } from '@tanstack/react-router'
import { Building2, Crown, Pencil, Plus, Server, Theater } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { PageShell } from '@/components/app/page-shell'
import { useServerName } from '@/components/app/server-select'
import {
  ORG_KINDS,
  OrgEditor,
  type EditState,
} from '@/components/admin/editors'
import { ConfirmDelete } from '@/components/events/confirm-delete'
import { deleteOrganization, listOrganizations } from '@/lib/catalog.functions'
import { errorMessage } from '@/lib/errors'
import { allowed, type Organization } from '@/lib/types'

export const Route = createFileRoute('/orgs')({
  loader: () => listOrganizations({ data: {} }),
  head: () => ({ meta: [{ title: 'Организации — Radmir Helper' }] }),
  component: OrgsPage,
})

function OrgsPage() {
  const { session } = Route.useRouteContext()
  const orgs = Route.useLoaderData()
  const router = useRouter()
  const serverName = useServerName()
  const [editor, setEditor] = useState<EditState<Organization>>(null)
  const canEdit = allowed(session, 'orgs.manage')

  return (
    <PageShell session={session}>
      <div className="mx-auto max-w-content px-4 py-10 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-3 text-3xl">
              <Building2 className="size-7 text-primary" aria-hidden />{' '}
              Организации
            </h1>
            <p className="mt-2 max-w-reading text-muted-foreground">
              Фракции сервера и готовые отыгровки для каждой из них.
            </p>
          </div>
          {canEdit && (
            <Button onClick={() => setEditor({ item: null })}>
              <Plus /> Добавить организацию
            </Button>
          )}
        </div>
        {orgs.length === 0 ? (
          <p className="mt-8 rounded-xl border border-dashed p-10 text-center text-muted-foreground">
            Организаций пока нет.
          </p>
        ) : (
          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {orgs.map((o) => (
              <li
                key={o.id}
                className="flex flex-col rounded-xl border bg-card p-5"
              >
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold tracking-wider text-primary uppercase">
                      {ORG_KINDS[o.kind as keyof typeof ORG_KINDS] ?? o.kind}
                    </p>
                    <h2 className="mt-1 text-xl">{o.name}</h2>
                  </div>
                  {canEdit && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Изменить ${o.name}`}
                        onClick={() => setEditor({ item: o })}
                      >
                        <Pencil />
                      </Button>
                      <ConfirmDelete
                        title={o.name}
                        description="Отыгровки этой организации останутся, но будут без привязки."
                        confirmText={o.name}
                        onConfirm={async () => {
                          try {
                            await deleteOrganization({ data: { id: o.id } })
                            toast.success('Организация удалена')
                            await router.invalidate()
                          } catch (err) {
                            toast.error(errorMessage(err))
                          }
                        }}
                      />
                    </>
                  )}
                </div>
                {o.description && (
                  <p className="mt-2 flex-1 text-sm text-muted-foreground">
                    {o.description}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  {o.leader && (
                    <span className="inline-flex items-center gap-1">
                      <Crown className="size-3.5" aria-hidden /> Лидер:{' '}
                      {o.leader}
                    </span>
                  )}
                  {serverName(o.serverId) && (
                    <span className="inline-flex items-center gap-1 text-chart-2">
                      <Server className="size-3.5" aria-hidden />{' '}
                      {serverName(o.serverId)}
                    </span>
                  )}
                </div>
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="mt-4 self-start"
                >
                  <Link to="/roleplays" search={{ org: o.id }}>
                    <Theater /> Отыгровки
                  </Link>
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {canEdit && <OrgEditor state={editor} onClose={() => setEditor(null)} />}
    </PageShell>
  )
}
