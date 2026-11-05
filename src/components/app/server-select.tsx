import { useRouteContext } from '@tanstack/react-router'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const ALL = 'all'

/** Picks a RADMIR RP server; `null` means «all servers». */
export function ServerSelect({
  id,
  value,
  onChange,
  allLabel = 'Все серверы',
  className,
}: {
  id?: string
  value: number | null
  onChange: (value: number | null) => void
  allLabel?: string
  className?: string
}) {
  const { servers } = useRouteContext({ from: '__root__' })
  return (
    <Select
      value={value === null ? ALL : String(value)}
      onValueChange={(v) => onChange(v === ALL ? null : Number(v))}
    >
      <SelectTrigger id={id} className={className ?? 'w-full'}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{allLabel}</SelectItem>
        {servers.map((s) => (
          <SelectItem key={s.id} value={String(s.id)}>
            {s.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

/** Name of a server by id, from the layout context. */
export function useServerName() {
  const { servers } = useRouteContext({ from: '__root__' })
  return (id: number | null | undefined) =>
    id == null ? null : (servers.find((s) => s.id === id)?.name ?? null)
}
