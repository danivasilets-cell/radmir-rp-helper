import { useEffect, useState, type ReactNode } from 'react'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

export function SectionHead({
  title,
  text,
  actions,
}: {
  title: string
  text?: string
  actions?: ReactNode
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-2xl">{title}</h2>
        {text && <p className="mt-1 text-sm text-muted-foreground">{text}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}

/** Search field that reports its value after a short pause. */
export function SearchBox({
  value,
  onChange,
  placeholder = 'Поиск…',
  label = 'Поиск по записям',
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  label?: string
}) {
  const [text, setText] = useState(value)
  // Resync when the URL value changes from outside (e.g. back button).
  const [synced, setSynced] = useState(value)
  if (synced !== value) {
    setSynced(value)
    setText(value)
  }
  useEffect(() => {
    if (text === value) return
    const t = setTimeout(() => onChange(text), 350)
    return () => clearTimeout(t)
  }, [text, value, onChange])
  return (
    <div className="relative min-w-56 flex-1 sm:max-w-xs">
      <Search
        className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <Input
        aria-label={label}
        className="pl-9"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  )
}

export function Chips<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T
  options: readonly { id: T; label: string }[]
  onChange: (v: T) => void
  label: string
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          aria-pressed={value === o.id}
          onClick={() => onChange(o.id)}
          className={cn(
            'rounded-full border px-3 py-1 text-sm font-medium transition-colors motion-reduce:transition-none',
            value === o.id
              ? 'border-primary bg-primary text-primary-foreground'
              : 'hover:border-primary/60',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function EmptyRow({ text }: { text: string }) {
  return (
    <p className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
      {text}
    </p>
  )
}

export const fmtDate = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString('ru-RU', {
        dateStyle: 'short',
        timeStyle: 'short',
      })
    : '—'
