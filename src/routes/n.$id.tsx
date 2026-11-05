import { useState } from 'react'
import { allowed } from '@/lib/types'
import { Link, createFileRoute, notFound } from '@tanstack/react-router'
import { Clock, ChevronRight, Home, Plus, Server } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { NodeActions } from '@/components/app/node-actions'
import { NodeEditor, type EditorState } from '@/components/app/node-editor'
import { NodeGrid } from '@/components/app/node-grid'
import { NodeIcon } from '@/components/app/node-icon'
import { PageShell } from '@/components/app/page-shell'
import { RichText } from '@/components/app/rich-text'
import { TopicToolbar } from '@/components/app/topic-toolbar'
import { ReadingProgress } from '@/components/app/reading-progress'
import { useTrackView } from '@/lib/recent'
import { getNode } from '@/lib/api.functions'
import { getNodeCommunity } from '@/lib/community.functions'
import { Comments } from '@/components/community/comments'
import { StarRating } from '@/components/community/star-rating'
import { Lightbulb } from 'lucide-react'

export const Route = createFileRoute('/n/$id')({
  loader: async ({ params }) => {
    const id = Number(params.id)
    if (!Number.isInteger(id) || id <= 0) throw notFound()
    const [data, community] = await Promise.all([
      getNode({ data: { id } }),
      getNodeCommunity({ data: { nodeId: id } }),
    ])
    if (!data) throw notFound()
    return { ...data, community }
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.node.title} — Radmir Helper` },
          {
            name: 'description',
            content: loaderData.node.summary || loaderData.node.title,
          },
        ]
      : [],
  }),
  component: NodePage,
})

function NodePage() {
  const { node, children, crumbs, community, serverName } =
    Route.useLoaderData()
  const { session } = Route.useRouteContext()
  const [editor, setEditor] = useState<EditorState | null>(null)
  useTrackView(node)
  const owner = allowed(session, 'content.manage')
  const section = node.kind === 'section'
  const canAdd = owner

  const childSections = children.filter((c) => c.kind === 'section')
  const childTopics = children.filter((c) => c.kind === 'topic')
  const words = node.content.trim()
    ? node.content.trim().split(/\s+/).length
    : 0
  const readMinutes = words ? Math.max(1, Math.round(words / 180)) : 0

  return (
    <PageShell session={session}>
      {node.kind === 'topic' && node.content.trim() && <ReadingProgress />}
      <div className="mx-auto max-w-content px-4 py-8 sm:px-6 sm:py-10">
        <nav aria-label="Навигация" className="mb-6">
          <ol className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
            <li>
              <Link
                to="/"
                className="inline-flex items-center gap-1 rounded hover:text-foreground"
              >
                <Home className="size-3.5" /> Главная
              </Link>
            </li>
            {crumbs.map((c) => (
              <li key={c.id} className="flex items-center gap-1">
                <ChevronRight className="size-3.5" aria-hidden />
                <Link
                  to="/n/$id"
                  params={{ id: String(c.id) }}
                  className="rounded hover:text-foreground"
                >
                  {c.title}
                </Link>
              </li>
            ))}
          </ol>
        </nav>

        <header className="flex items-start gap-4">
          <span
            className={
              'grid size-14 shrink-0 place-items-center rounded-xl ' +
              (section
                ? 'bg-primary/15 text-primary'
                : 'bg-secondary text-muted-foreground')
            }
          >
            <NodeIcon icon={node.icon} kind={node.kind} className="size-7" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold tracking-wider text-primary uppercase">
              {section ? 'Раздел' : 'Тема'}
            </p>
            <h1 className="mt-1 text-3xl leading-tight sm:text-4xl">
              {node.title}
            </h1>
            {node.summary && (
              <p className="mt-2 text-lg text-muted-foreground">
                {node.summary}
              </p>
            )}
            {serverName && (
              <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-chart-2/15 px-2.5 py-1 text-xs font-semibold text-chart-2">
                <Server className="size-3.5" aria-hidden /> Только для:{' '}
                {serverName}
              </p>
            )}{' '}
            {readMinutes > 0 && (
              <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="size-3.5" aria-hidden /> ~{readMinutes} мин
                чтения
              </p>
            )}
            <div className="mt-4">
              <TopicToolbar
                node={node}
                session={session}
                serverFavorite={community.isFavorite}
              />
            </div>
          </div>
          <NodeActions
            node={node}
            session={session}
            onEdit={setEditor}
            redirectAfterDelete
          />
        </header>

        {node.content.trim() && (
          <article className="relative mt-8 max-w-reading overflow-hidden rounded-xl border bg-card p-5 shadow-sm sm:p-7">
            <div
              aria-hidden
              className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-chart-5 to-primary/0"
            />
            <RichText text={node.content} />
            {node.createdBy && (
              <p className="mt-6 border-t pt-4 text-xs text-muted-foreground">
                Автор: {node.createdBy}
              </p>
            )}
          </article>
        )}

        {!section && (
          <div className="mt-4 max-w-reading">
            <StarRating
              nodeId={node.id}
              rating={community.rating}
              session={session}
            />
          </div>
        )}

        {section && !canAdd && (
          <div className="mt-8 flex flex-wrap items-center gap-4 rounded-xl border border-primary/30 bg-gradient-to-r from-primary/10 to-transparent p-4">
            <Lightbulb className="size-6 shrink-0 text-primary" aria-hidden />
            <p className="min-w-0 flex-1 text-sm">
              <span className="font-semibold">Есть своя идея для РП?</span>{' '}
              <span className="text-muted-foreground">
                Предложите её — после проверки она появится в этом разделе с
                вашим ником.
              </span>
            </p>
            <Button asChild size="sm">
              <Link to="/ideas/new" search={{ section: node.id }}>
                Предложить идею
              </Link>
            </Button>
          </div>
        )}

        {(children.length > 0 || canAdd) && (
          <section className="mt-10">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl">
                {section ? 'Содержимое раздела' : 'Подпункты'}
              </h2>
              <div className="flex flex-wrap gap-2">
                {owner && (
                  <Button
                    variant="outline"
                    onClick={() =>
                      setEditor({
                        mode: 'create',
                        parentId: node.id,
                        kind: 'section',
                        allowKindChoice: true,
                      })
                    }
                  >
                    <Plus /> Подраздел
                  </Button>
                )}
                {canAdd && (
                  <Button
                    onClick={() =>
                      setEditor({
                        mode: 'create',
                        parentId: node.id,
                        kind: 'topic',
                        allowKindChoice: false,
                      })
                    }
                  >
                    <Plus /> {section ? 'Тема' : 'Подпункт'}
                  </Button>
                )}
              </div>
            </div>

            {children.length === 0 ? (
              <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
                Здесь пока пусто — добавьте первую тему.
              </div>
            ) : (
              <div className="space-y-8">
                {childSections.length > 0 && (
                  <NodeGrid items={childSections} session={session} />
                )}
                {childTopics.length > 0 && (
                  <div>
                    {childSections.length > 0 && (
                      <h3 className="mb-3 text-sm font-semibold tracking-wider text-muted-foreground uppercase">
                        Темы
                      </h3>
                    )}
                    <NodeGrid items={childTopics} session={session} />
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {!section && (
          <Comments
            nodeId={node.id}
            comments={community.comments}
            session={session}
          />
        )}
      </div>

      <NodeEditor state={editor} onClose={() => setEditor(null)} />
    </PageShell>
  )
}
