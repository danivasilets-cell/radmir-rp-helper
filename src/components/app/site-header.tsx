import { useEffect, useState } from 'react'
import {
  Link,
  useNavigate,
  useRouteContext,
  useRouter,
} from '@tanstack/react-router'
import {
  CarFront,
  ChevronDown,
  Crown,
  Dices,
  Gift,
  Heart,
  LayoutGrid,
  Lightbulb,
  MessagesSquare,
  UserRound,
  Inbox,
  LogIn,
  LogOut,
  Menu,
  PartyPopper,
  Search,
  ShieldCheck,
  Table2,
  Building2,
  LayoutDashboard,
  Terminal,
  Theater,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { NodeIcon } from '@/components/app/node-icon'
import { ThemeToggle } from '@/components/app/theme-toggle'
import { signOut } from '@/lib/api.functions'
import { useFavorites } from '@/lib/favorites'
import { allowed, isPlayer, isTeam, type SessionInfo } from '@/lib/types'
import { useRandomTopic } from '@/lib/use-random-topic'

export function RoleBadge({ session }: { session: SessionInfo }) {
  if (!session) return null
  if (session.role === 'admin')
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-chart-5/20 px-2.5 py-1 text-xs font-semibold text-chart-5">
        <ShieldCheck className="size-3.5" /> Админ
      </span>
    )
  if (session.role === 'user')
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-chart-3/15 px-2.5 py-1 text-xs font-semibold text-chart-3">
        <UserRound className="size-3.5" /> Игрок
      </span>
    )
  const owner = session.role === 'owner'
  return (
    <span
      className={
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ' +
        (owner
          ? 'bg-primary text-primary-foreground'
          : 'bg-chart-2/20 text-chart-2')
      }
    >
      {owner ? (
        <Crown className="size-3.5" />
      ) : (
        <ShieldCheck className="size-3.5" />
      )}
      {owner ? 'Владелец' : 'Модератор'}
    </span>
  )
}

const EVENT_LINKS = [
  {
    to: '/events/tables',
    label: 'Таблицы',
    hint: 'Рейтинги, результаты, расписание',
    icon: Table2,
  },
  {
    to: '/events/prizes',
    label: 'Призы',
    hint: 'Награды за ивенты и победители',
    icon: Gift,
  },
] as const

const TOOL_LINKS = [
  {
    to: '/roleplays',
    label: 'Отыгровки',
    hint: 'Готовые /me, /do и RP-сценарии',
    icon: Theater,
  },
  {
    to: '/commands',
    label: 'Игровые команды',
    hint: 'Справочник команд чата',
    icon: Terminal,
  },
  {
    to: '/orgs',
    label: 'Организации',
    hint: 'Фракции сервера и их отыгровки',
    icon: Building2,
  },
] as const

const COMMUNITY_LINKS = [
  {
    to: '/ideas/new',
    label: 'Предложить идею',
    hint: 'Ваша RP-идея появится на сайте после проверки',
    icon: Lightbulb,
  },
  {
    to: '/community',
    label: 'Игроки и идеи',
    hint: 'Активные игроки и свежие идеи сообщества',
    icon: MessagesSquare,
  },
] as const

const navTrigger =
  'gap-1.5 px-3 text-sm font-semibold data-[state=open]:bg-accent data-[state=open]:text-accent-foreground'

/** Root section with exclusive АХК, shown as its own header button. */
function findExclusive<T extends { title: string }>(sections: T[]) {
  return sections.find((s) => /АХК/i.test(s.title))
}

function FavoritesCount() {
  const { list } = useFavorites()
  const { session } = useRouteContext({ from: '__root__' })
  // Players keep favorites in their account; the badge counts browser ones.
  if (list.length === 0 || isPlayer(session)) return null
  return (
    <span className="grid min-w-5 place-items-center rounded-full bg-primary px-1 text-[0.7rem] leading-5 font-bold text-primary-foreground">
      {list.length}
    </span>
  )
}

export function SiteHeader({ session }: { session: SessionInfo }) {
  const router = useRouter()
  const navigate = useNavigate()
  const { navSections, pendingIdeas, openReports } = useRouteContext({
    from: '__root__',
  })
  const teamBadge = pendingIdeas + openReports
  const random = useRandomTopic()
  const canEdit = isTeam(session)
  const exclusive = findExclusive(navSections)

  // «/» focuses search from anywhere (except while typing).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return
      const t = e.target as HTMLElement | null
      if (
        t &&
        (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))
      )
        return
      e.preventDefault()
      const field = document.getElementById('home-search')
      if (field) field.focus()
      else void navigate({ to: '/search', search: { q: '' } })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navigate])

  async function handleSignOut() {
    await signOut()
    toast.success('Вы вышли в режим просмотра')
    await router.invalidate()
  }

  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-background/80 backdrop-blur-md">
      <div
        aria-hidden
        className="h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent opacity-70"
      />
      <div className="mx-auto flex h-16 max-w-wide min-w-0 items-center gap-1 px-3 sm:gap-2 sm:px-6">
        <MobileMenu
          session={session}
          sections={navSections}
          onRandom={random.go}
        />

        <Link
          to="/"
          className="mr-1 flex min-w-0 items-center gap-2.5 rounded-md sm:mr-2"
        >
          <img
            src="/logo.png"
            alt="Логотип Радмир РП"
            width={36}
            height={36}
            className="size-9 shrink-0 object-contain drop-shadow-[0_0_10px_color-mix(in_oklch,var(--primary)_45%,transparent)]"
          />
          <span className="hidden truncate font-display text-base leading-tight min-[380px]:block">
            Radmir Helper
          </span>
        </Link>

        <nav
          aria-label="Основное меню"
          className="hidden min-w-0 items-center gap-0.5 lg:flex xl:gap-1"
        >
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className={navTrigger}>
                <LayoutGrid /> Разделы
                <ChevronDown className="size-3.5 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-72">
              <DropdownMenuLabel>Разделы помощника</DropdownMenuLabel>
              {navSections.length === 0 ? (
                <p className="px-2 py-1.5 text-sm text-muted-foreground">
                  Разделов пока нет
                </p>
              ) : (
                navSections.map((s) => (
                  <DropdownMenuItem key={s.id} asChild>
                    <Link to="/n/$id" params={{ id: String(s.id) }}>
                      <NodeIcon icon={s.icon} kind="section" />
                      <span className="truncate">{s.title}</span>
                    </Link>
                  </DropdownMenuItem>
                ))
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                disabled={random.pending}
                onSelect={() => void random.go()}
              >
                <Dices /> Случайная идея
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className={navTrigger}>
                <PartyPopper /> Ивенты
                <ChevronDown className="size-3.5 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-72">
              <DropdownMenuLabel>Ивенты</DropdownMenuLabel>
              {EVENT_LINKS.map((l) => (
                <DropdownMenuItem key={l.to} asChild>
                  <Link to={l.to} className="items-start">
                    <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-md bg-primary/15 text-primary">
                      <l.icon />
                    </span>
                    <span>
                      <span className="block font-semibold">{l.label}</span>
                      <span className="block text-xs text-muted-foreground">
                        {l.hint}
                      </span>
                    </span>
                  </Link>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/events">
                  <PartyPopper /> Все ивенты
                </Link>
              </DropdownMenuItem>
              {canEdit && (
                <p className="px-2 pt-1 pb-1.5 text-xs text-muted-foreground">
                  Вы можете добавлять таблицы и призы.
                </p>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className={navTrigger}>
                <Theater /> РП
                <ChevronDown className="size-3.5 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-72">
              <DropdownMenuLabel>Инструменты для РП</DropdownMenuLabel>
              {TOOL_LINKS.map((l) => (
                <DropdownMenuItem key={l.to} asChild>
                  <Link to={l.to} className="items-start">
                    <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-md bg-primary/15 text-primary">
                      <l.icon />
                    </span>
                    <span>
                      <span className="block font-semibold">{l.label}</span>
                      <span className="block text-xs text-muted-foreground">
                        {l.hint}
                      </span>
                    </span>
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="ghost" className={navTrigger} asChild>
            <Link to="/cars" activeProps={{ className: 'text-primary' }}>
              <CarFront /> Авто
            </Link>
          </Button>

          {exclusive && (
            <Button
              variant="ghost"
              className={`${navTrigger} text-primary`}
              asChild
            >
              <Link
                to="/n/$id"
                params={{ id: String(exclusive.id) }}
                title={exclusive.title}
                aria-label={exclusive.title}
              >
                <Crown />
                <span>АХК</span>
              </Link>
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className={navTrigger}>
                <MessagesSquare />
                <span className="hidden xl:inline">Сообщество</span>
                {pendingIdeas > 0 && (
                  <span className="grid min-w-5 place-items-center rounded-full bg-primary px-1 text-[0.7rem] leading-5 font-bold text-primary-foreground">
                    {pendingIdeas}
                  </span>
                )}
                <ChevronDown className="size-3.5 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-72">
              <DropdownMenuLabel>Сообщество</DropdownMenuLabel>
              {COMMUNITY_LINKS.map((l) => (
                <DropdownMenuItem key={l.to} asChild>
                  <Link to={l.to} className="items-start">
                    <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-md bg-primary/15 text-primary">
                      <l.icon />
                    </span>
                    <span>
                      <span className="block font-semibold">{l.label}</span>
                      <span className="block text-xs text-muted-foreground">
                        {l.hint}
                      </span>
                    </span>
                  </Link>
                </DropdownMenuItem>
              ))}
              {isPlayer(session) && (
                <DropdownMenuItem asChild>
                  <Link to="/me">
                    <UserRound /> Личный кабинет
                  </Link>
                </DropdownMenuItem>
              )}
              {canEdit && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/ideas">
                      <Inbox /> Идеи на проверке
                      {pendingIdeas > 0 && (
                        <span className="ml-auto rounded-full bg-primary px-1.5 text-xs font-bold text-primary-foreground">
                          {pendingIdeas}
                        </span>
                      )}
                    </Link>
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button asChild variant="ghost" className={navTrigger}>
            <Link
              to="/favorites"
              activeProps={{ className: 'text-primary' }}
              aria-label="Избранное"
              title="Избранное"
            >
              <Heart />
              <FavoritesCount />
            </Link>
          </Button>
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-1.5">
          <Button
            asChild
            variant="ghost"
            size="icon"
            aria-label="Поиск (клавиша /)"
          >
            <Link to="/search" search={{ q: '' }}>
              <Search />
            </Link>
          </Button>
          <ThemeToggle />

          {session ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <RoleBadge session={session} />
                  <span className="hidden max-w-32 truncate xl:inline">
                    {session.label}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  {session.label}
                  {session.role !== 'user' && (
                    <span className="block text-xs font-normal text-muted-foreground">
                      {session.role === 'owner'
                        ? 'Владелец'
                        : session.role === 'admin'
                          ? 'Администратор'
                          : 'Модератор'}
                    </span>
                  )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {isPlayer(session) && (
                  <>
                    <DropdownMenuItem asChild>
                      <Link to="/me">
                        <UserRound /> Личный кабинет
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/ideas/new">
                        <Lightbulb /> Предложить идею
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
                {isTeam(session) && (
                  <>
                    <DropdownMenuItem asChild>
                      <Link to="/admin">
                        <LayoutDashboard /> Панель управления
                        {teamBadge > 0 && (
                          <span className="ml-auto rounded-full bg-primary px-1.5 text-xs font-bold text-primary-foreground">
                            {teamBadge}
                          </span>
                        )}
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/ideas">
                        <Inbox /> Идеи на проверке
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuItem onSelect={handleSignOut}>
                  <LogOut /> Выйти
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild variant="outline">
              <Link to="/login" search={{ tab: 'player' }}>
                <LogIn />
                <span className="hidden sm:inline">Вход</span>
              </Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}

function MobileMenu({
  session,
  sections,
  onRandom,
}: {
  session: SessionInfo
  sections: { id: number; title: string; icon: string }[]
  onRandom: () => Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const exclusive = findExclusive(sections)
  const item =
    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-accent hover:text-accent-foreground'
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          aria-label="Открыть меню"
        >
          <Menu />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-80 overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="font-display">Radmir Helper</SheetTitle>
          <SheetDescription>Разделы, ивенты и избранное</SheetDescription>
        </SheetHeader>
        <nav aria-label="Мобильное меню" className="space-y-6 px-4 pb-6">
          <div>
            <p className="mb-1 px-3 text-xs font-semibold tracking-wider text-primary uppercase">
              Сообщество
            </p>
            {COMMUNITY_LINKS.map((l) => (
              <SheetClose asChild key={l.to}>
                <Link to={l.to} className={item}>
                  <l.icon className="size-4 text-primary" /> {l.label}
                </Link>
              </SheetClose>
            ))}
            {isPlayer(session) && (
              <SheetClose asChild>
                <Link to="/me" className={item}>
                  <UserRound className="size-4 text-primary" /> Личный кабинет
                </Link>
              </SheetClose>
            )}
            {isTeam(session) && (
              <SheetClose asChild>
                <Link to="/admin" className={item}>
                  <LayoutDashboard className="size-4 text-primary" /> Панель
                  управления
                </Link>
              </SheetClose>
            )}
            {allowed(session, 'publications.review') && (
              <SheetClose asChild>
                <Link to="/ideas" className={item}>
                  <Inbox className="size-4 text-primary" /> Идеи на проверке
                </Link>
              </SheetClose>
            )}
          </div>
          <div>
            <p className="mb-1 px-3 text-xs font-semibold tracking-wider text-primary uppercase">
              Инструменты для РП
            </p>
            {TOOL_LINKS.map((l) => (
              <SheetClose asChild key={l.to}>
                <Link to={l.to} className={item}>
                  <l.icon className="size-4 text-primary" /> {l.label}
                </Link>
              </SheetClose>
            ))}
          </div>
          <div>
            <p className="mb-1 px-3 text-xs font-semibold tracking-wider text-primary uppercase">
              Ивенты
            </p>
            {EVENT_LINKS.map((l) => (
              <SheetClose asChild key={l.to}>
                <Link to={l.to} className={item}>
                  <l.icon className="size-4 text-primary" /> {l.label}
                </Link>
              </SheetClose>
            ))}
            <SheetClose asChild>
              <Link to="/events" className={item}>
                <PartyPopper className="size-4 text-primary" /> Все ивенты
              </Link>
            </SheetClose>
            <SheetClose asChild>
              <Link to="/cars" className={item}>
                <CarFront className="size-4 text-primary" /> Каталог авто
              </Link>
            </SheetClose>
            {exclusive && (
              <SheetClose asChild>
                <Link
                  to="/n/$id"
                  params={{ id: String(exclusive.id) }}
                  className={item}
                >
                  <Crown className="size-4 text-primary" /> ЭКСКЛЮЗИВ — АХК для
                  всех организаций
                </Link>
              </SheetClose>
            )}
          </div>
          <div>
            <p className="mb-1 px-3 text-xs font-semibold tracking-wider text-primary uppercase">
              Разделы
            </p>
            {sections.map((s) => (
              <SheetClose asChild key={s.id}>
                <Link
                  to="/n/$id"
                  params={{ id: String(s.id) }}
                  className={item}
                >
                  <NodeIcon
                    icon={s.icon}
                    kind="section"
                    className="size-4 text-primary"
                  />
                  <span className="truncate">{s.title}</span>
                </Link>
              </SheetClose>
            ))}
          </div>
          <div className="border-t pt-4">
            <SheetClose asChild>
              <Link to="/favorites" className={item}>
                <Heart className="size-4 text-primary" /> Избранное
                <FavoritesCount />
              </Link>
            </SheetClose>
            <button
              type="button"
              className={item + ' w-full text-left'}
              onClick={() => {
                setOpen(false)
                void onRandom()
              }}
            >
              <Dices className="size-4 text-primary" /> Случайная идея
            </button>
            {!session && (
              <SheetClose asChild>
                <Link to="/login" search={{ tab: 'player' }} className={item}>
                  <LogIn className="size-4 text-primary" /> Вход и регистрация
                </Link>
              </SheetClose>
            )}
          </div>
        </nav>
      </SheetContent>
    </Sheet>
  )
}
