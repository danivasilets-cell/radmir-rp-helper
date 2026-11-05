import { Link } from '@tanstack/react-router'
import { Power, Wrench } from 'lucide-react'

const COPY = {
  maintenance: {
    icon: Wrench,
    title: 'Технические работы',
    text: 'Мы обновляем сайт. Загляните немного позже — скоро всё заработает.',
  },
  disabled: {
    icon: Power,
    title: 'Сайт временно отключён',
    text: 'Radmir Helper сейчас недоступен. Следите за новостями.',
  },
} as const

/** Full-screen stub shown to visitors while the site is closed by the owner. */
export function SiteStub({
  mode,
  message,
}: {
  mode: keyof typeof COPY
  message: string
}) {
  const c = COPY[mode]
  const Icon = c.icon
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 px-4 py-12 text-center sm:px-6">
      <img
        src="/logo.png"
        alt=""
        width={64}
        height={64}
        className="size-16 object-contain"
      />
      <div className="flex size-16 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10 text-primary">
        <Icon className="size-8" aria-hidden />
      </div>
      <div className="max-w-reading space-y-3">
        <h1 className="font-display text-3xl sm:text-4xl">{c.title}</h1>
        <p className="text-muted-foreground">{c.text}</p>
        {message && (
          <p className="rounded-xl border bg-card p-4 text-sm whitespace-pre-line">
            {message}
          </p>
        )}
      </div>
      <Link
        to="/login"
        search={{ tab: 'team' }}
        className="text-xs text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline motion-reduce:transition-none"
      >
        Вход для команды
      </Link>
    </main>
  )
}
