import { Link } from '@tanstack/react-router'
import { ChevronRight } from 'lucide-react'
import type { NodeItem, SessionInfo } from '@/lib/types'
import { cn } from '@/lib/utils'
import { NodeActions } from './node-actions'
import { NodeIcon } from './node-icon'

function countLabel(n: number) {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return `${n} пункт`
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14))
    return `${n} пункта`
  return `${n} пунктов`
}

export function NodeGrid({
  items,
  session,
  large = false,
}: {
  items: NodeItem[]
  session: SessionInfo
  large?: boolean
}) {
  return (
    <ul
      className={cn(
        'grid gap-2',
        large ? 'sm:grid-cols-2 lg:grid-cols-3' : 'sm:grid-cols-2',
      )}
    >
      {items.map((item) => {
        const section = item.kind === 'section'
        return (
          <li key={item.id} className="relative">
            <Link
              to="/n/$id"
              params={{ id: String(item.id) }}
              title={item.summary ?? undefined}
              className="group flex h-full items-center gap-3 rounded-lg border bg-card px-3 py-2 pr-11 transition-colors hover:border-primary/60 hover:bg-accent/60 motion-reduce:transition-none"
            >
              <span
                className={cn(
                  'grid shrink-0 place-items-center rounded-md',
                  section
                    ? 'bg-primary/15 text-primary'
                    : 'bg-secondary text-muted-foreground',
                  large ? 'size-9' : 'size-8',
                )}
              >
                <NodeIcon
                  icon={item.icon}
                  kind={item.kind}
                  className={large ? 'size-5' : 'size-4'}
                />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1 font-semibold leading-tight">
                  <span className="truncate">{item.title}</span>
                  <ChevronRight className="size-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" />
                </span>
                <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                  {section ? 'Раздел' : 'Тема'}
                  {item.childCount > 0 && <> · {countLabel(item.childCount)}</>}
                  {item.summary && <> · {item.summary}</>}
                </span>
              </span>
            </Link>
            <div className="absolute top-1/2 right-2 -translate-y-1/2">
              <NodeActions node={item} session={session} />
            </div>
          </li>
        )
      })}
    </ul>
  )
}
