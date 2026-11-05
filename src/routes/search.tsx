import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Search } from 'lucide-react'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NodeGrid } from '@/components/app/node-grid'
import { PageShell } from '@/components/app/page-shell'
import { searchNodes } from '@/lib/api.functions'

export const Route = createFileRoute('/search')({
  validateSearch: z.object({ q: z.string().catch('') }),
  loaderDeps: ({ search }) => ({ q: search.q.trim() }),
  loader: async ({ deps }) =>
    deps.q.length >= 2
      ? searchNodes({ data: { q: deps.q.slice(0, 100) } })
      : null,
  head: () => ({ meta: [{ title: 'Поиск — Radmir Helper' }] }),
  component: SearchPage,
})

function SearchPage() {
  const results = Route.useLoaderData()
  const { q } = Route.useSearch()
  const { session } = Route.useRouteContext()
  return (
    <PageShell session={session}>
      <div className="mx-auto max-w-content px-4 py-10 sm:px-6">
        <h1 className="text-3xl">Поиск</h1>
        <SearchForm key={q} initial={q} />

        <div className="mt-8">
          {results === null ? (
            <p className="text-muted-foreground">Введите минимум 2 символа.</p>
          ) : results.length === 0 ? (
            <p className="text-muted-foreground">
              По запросу «{q}» ничего не найдено.
            </p>
          ) : (
            <>
              <p className="mb-4 text-sm text-muted-foreground">
                Найдено: {results.length}
              </p>
              <NodeGrid items={results} session={session} />
            </>
          )}
        </div>
      </div>
    </PageShell>
  )
}

function SearchForm({ initial }: { initial: string }) {
  const navigate = useNavigate()
  const [value, setValue] = useState(initial)
  return (
    <form
      role="search"
      className="mt-6 flex max-w-xl gap-2"
      onSubmit={(e) => {
        e.preventDefault()
        void navigate({ to: '/search', search: { q: value.trim() } })
      }}
    >
      <label htmlFor="search-input" className="sr-only">
        Поисковый запрос
      </label>
      <Input
        id="search-input"
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Название, описание или текст темы"
        className="h-11"
      />
      <Button type="submit" size="lg" className="h-11">
        <Search /> Найти
      </Button>
    </form>
  )
}
