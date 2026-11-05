import { Link } from '@tanstack/react-router'
import { Crown, ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Avatar letter with a color derived from the nickname. */
export function Avatar({
  name,
  className,
}: {
  name: string
  className?: string
}) {
  const hue =
    [...name].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) % 360, 7) || 30
  return (
    <span
      aria-hidden
      className={cn(
        'grid size-9 shrink-0 place-items-center rounded-full font-display text-sm text-white',
        className,
      )}
      style={{
        background: `linear-gradient(135deg, oklch(0.68 0.17 ${hue}), oklch(0.5 0.17 ${(hue + 40) % 360}))`,
      }}
    >
      {name.slice(0, 1).toUpperCase()}
    </span>
  )
}

/** Author name: links to a profile for players, a badge for the team. */
export function AuthorName({ name, role }: { name: string; role: string }) {
  if (role === 'owner' || role === 'moderator' || role === 'admin')
    return (
      <span className="inline-flex items-center gap-1 font-semibold">
        {name}
        <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-1.5 py-0.5 text-[0.7rem] text-primary">
          {role === 'owner' ? (
            <Crown className="size-3" />
          ) : (
            <ShieldCheck className="size-3" />
          )}
          {role === 'owner'
            ? 'Владелец'
            : role === 'admin'
              ? 'Администратор'
              : 'Модератор'}
        </span>
      </span>
    )
  return (
    <Link
      to="/u/$nickname"
      params={{ nickname: name }}
      className="font-semibold hover:text-primary hover:underline"
    >
      {name}
    </Link>
  )
}

export function timeAgo(iso: string) {
  const diff = (Date.now() - Date.parse(iso)) / 1000
  if (diff < 60) return 'только что'
  if (diff < 3600) return `${Math.floor(diff / 60)} мин назад`
  if (diff < 86400) return `${Math.floor(diff / 3600)} ч назад`
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)} дн назад`
  return new Date(iso).toLocaleDateString('ru-RU')
}
