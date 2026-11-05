import { Link } from '@tanstack/react-router'
import { Gift, PartyPopper, Table2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const tabs = [
  { to: '/events', label: 'Обзор', icon: PartyPopper },
  { to: '/events/tables', label: 'Таблицы', icon: Table2 },
  { to: '/events/prizes', label: 'Призы', icon: Gift },
] as const

/** Hero + tab strip shared by the events pages. */
export function EventsHero({
  title,
  text,
  action,
}: {
  title: string
  text: string
  action?: React.ReactNode
}) {
  return (
    <section className="bg-grid border-b border-border/70">
      <div className="mx-auto max-w-content px-4 pt-10 sm:px-6 sm:pt-14">
        <p className="text-sm font-semibold tracking-wider text-primary uppercase">
          Ивенты Радмир РП
        </p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl leading-tight sm:text-4xl">{title}</h1>
            <p className="mt-2 max-w-reading text-muted-foreground">{text}</p>
          </div>
          {action}
        </div>
        <nav
          aria-label="Разделы ивентов"
          className="mt-8 flex gap-1 overflow-x-auto"
        >
          {tabs.map((t) => (
            <Link
              key={t.to}
              to={t.to}
              activeOptions={{ exact: true }}
              className={cn(
                'inline-flex items-center gap-2 border-b-2 border-transparent px-4 py-3 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground motion-reduce:transition-none',
              )}
              activeProps={{ className: 'border-primary! text-foreground!' }}
            >
              <t.icon className="size-4" /> {t.label}
            </Link>
          ))}
        </nav>
      </div>
    </section>
  )
}
