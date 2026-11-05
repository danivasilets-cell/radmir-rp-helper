import { useEffect, useState, type ReactNode } from 'react'
import { Link, useRouteContext } from '@tanstack/react-router'
import { ArrowUp, Megaphone, Wrench } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { SessionInfo } from '@/lib/types'
import { SiteHeader } from './site-header'

function BackToTop() {
  const [show, setShow] = useState(false)
  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 600)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  if (!show) return null
  return (
    <Button
      size="icon-lg"
      aria-label="Наверх"
      className="fixed right-4 bottom-4 z-30 rounded-full shadow-lg shadow-primary/30"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
    >
      <ArrowUp />
    </Button>
  )
}

function SiteModeNotice() {
  const { siteMode, session } = useRouteContext({ from: '__root__' })
  if (siteMode === 'online') return null
  return (
    <div
      role="status"
      className="border-b border-destructive/40 bg-destructive/15"
    >
      <p className="mx-auto flex max-w-content items-center gap-2 px-4 py-2 text-sm sm:px-6">
        <Wrench className="size-4 shrink-0 text-destructive" aria-hidden />
        {siteMode === 'disabled'
          ? 'Сайт отключён — его видит только владелец.'
          : 'Идут технические работы — посетители видят заглушку.'}
        {session?.role === 'owner' && (
          <Link
            to="/admin/settings"
            className="ml-auto shrink-0 font-semibold underline-offset-4 hover:underline"
          >
            Настройки
          </Link>
        )}
      </p>
    </div>
  )
}

function Announcement() {
  const { announcement } = useRouteContext({ from: '__root__' })
  if (!announcement) return null
  return (
    <div role="status" className="border-b border-primary/30 bg-primary/10">
      <p className="mx-auto flex max-w-content items-center gap-2 px-4 py-2 text-sm sm:px-6">
        <Megaphone className="size-4 shrink-0 text-primary" aria-hidden />
        {announcement}
      </p>
    </div>
  )
}

const footerLink =
  'text-muted-foreground transition-colors hover:text-foreground motion-reduce:transition-none'

export function PageShell({
  session,
  children,
}: {
  session: SessionInfo
  children: ReactNode
}) {
  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader session={session} />
      <SiteModeNotice />
      <Announcement />
      <main className="flex-1">{children}</main>
      <footer className="border-t border-border/70 bg-card/40">
        <div className="mx-auto flex max-w-content flex-col gap-6 px-4 py-8 sm:flex-row sm:items-start sm:justify-between sm:px-6">
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt=""
              width={32}
              height={32}
              className="size-8 object-contain"
            />
            <div>
              <p className="font-display">Radmir Helper</p>
              <p className="max-w-sm text-xs text-muted-foreground">
                Фанатский помощник по Радмир РП. Не является официальным
                ресурсом проекта.
              </p>
            </div>
          </div>
          <nav
            aria-label="Ссылки в подвале"
            className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm"
          >
            <Link to="/" className={footerLink}>
              Разделы
            </Link>
            <Link to="/events" className={footerLink}>
              Ивенты
            </Link>
            <Link to="/cars" className={footerLink}>
              Каталог авто
            </Link>
            <Link to="/events/tables" className={footerLink}>
              Таблицы
            </Link>
            <Link to="/events/prizes" className={footerLink}>
              Призы
            </Link>
            <Link to="/ideas/new" className={footerLink}>
              Предложить идею
            </Link>
            <Link to="/community" className={footerLink}>
              Сообщество
            </Link>
            <Link to="/roleplays" className={footerLink}>
              Отыгровки
            </Link>
            <Link to="/commands" className={footerLink}>
              Команды
            </Link>
            <Link to="/orgs" className={footerLink}>
              Организации
            </Link>
            <Link to="/favorites" className={footerLink}>
              Избранное
            </Link>
            <Link to="/search" search={{ q: '' }} className={footerLink}>
              Поиск
            </Link>
            {!session && (
              <Link
                to="/login"
                search={{ tab: 'player' }}
                className={footerLink}
              >
                Вход и регистрация
              </Link>
            )}
          </nav>
        </div>
      </footer>
      <BackToTop />
    </div>
  )
}
