import { useState, type FormEvent } from 'react'
import {
  createFileRoute,
  useNavigate,
  useRouteContext,
  useRouter,
} from '@tanstack/react-router'
import { ServerSelect } from '@/components/app/server-select'
import { passwordProblem } from '@/lib/password'
import { Crown, Gamepad2, Loader2, ShieldCheck, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PageShell } from '@/components/app/page-shell'
import { playerAuth, signIn } from '@/lib/api.functions'
import { importFavorites } from '@/lib/community.functions'
import { errorMessage } from '@/lib/errors'
import { readLocalFavorites } from '@/lib/favorites'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/login')({
  validateSearch: z.object({
    tab: z.enum(['player', 'team']).optional().catch(undefined),
  }),
  head: () => ({ meta: [{ title: 'Вход — Radmir Helper' }] }),
  component: LoginPage,
})

const tabClass = (active: boolean) =>
  cn(
    'flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors motion-reduce:transition-none',
    active
      ? 'bg-primary text-primary-foreground shadow'
      : 'text-muted-foreground hover:text-foreground',
  )

function LoginPage() {
  const { session } = Route.useRouteContext()
  const tab = Route.useSearch().tab ?? 'player'
  const navigate = useNavigate()

  return (
    <PageShell session={session}>
      <div className="bg-grid border-b border-border/70">
        <div className="mx-auto max-w-content px-4 py-10 sm:px-6">
          <h1 className="text-3xl">Вход</h1>
          <p className="mt-2 max-w-reading text-muted-foreground">
            {session
              ? `Сейчас вы вошли как ${session.label}. Можно войти под другим аккаунтом.`
              : 'Читать сайт можно без входа. Аккаунт игрока нужен, чтобы предлагать идеи, комментировать, оценивать и хранить избранное.'}
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-md px-4 py-10">
        <div
          role="tablist"
          aria-label="Тип входа"
          className="flex gap-1 rounded-xl border bg-card p-1"
        >
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'player'}
            className={tabClass(tab === 'player')}
            onClick={() =>
              navigate({ to: '/login', search: { tab: 'player' } })
            }
          >
            <Gamepad2 className="size-4" /> Игрок
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'team'}
            className={tabClass(tab === 'team')}
            onClick={() => navigate({ to: '/login', search: { tab: 'team' } })}
          >
            <ShieldCheck className="size-4" /> Команда сайта
          </button>
        </div>
        <div className="mt-4 rounded-xl border bg-card p-6">
          {tab === 'player' ? <PlayerForm /> : <TeamForm />}
        </div>
      </div>
    </PageShell>
  )
}

function PlayerForm() {
  const router = useRouter()
  const navigate = useNavigate()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [nickname, setNickname] = useState('')
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [serverId, setServerId] = useState<number | null>(null)
  const [website, setWebsite] = useState('')
  const { settings } = useRouteContext({ from: '__root__' })
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const register = mode === 'register'

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (nickname.trim().length < 3) return setError('Ник — минимум 3 символа')
    if (register) {
      const problem = passwordProblem(password, nickname.trim())
      if (problem) return setError(problem)
      if (password !== password2) return setError('Пароли не совпадают')
    } else if (password.length < 6) return setError('Введите пароль')
    setPending(true)
    setError(null)
    try {
      await playerAuth({
        data: { mode, nickname: nickname.trim(), password, serverId, website },
      })
      // Bring favorites saved in this browser into the account.
      const local = readLocalFavorites()
      if (local.length) {
        await importFavorites({ data: { ids: local.map((f) => f.id) } }).catch(
          () => undefined,
        )
      }
      toast.success(
        register ? `Добро пожаловать, ${nickname.trim()}!` : 'Вы вошли',
      )
      await router.invalidate()
      await navigate({ to: '/me' })
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="relative space-y-4" noValidate>
      <div>
        <h2 className="text-xl">{register ? 'Регистрация' : 'Вход игрока'}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {register
            ? 'Используйте игровой ник — так вас узнают на сервере.'
            : 'Войдите по нику и паролю.'}
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="nick">Ник</Label>
        <Input
          id="nick"
          autoComplete="username"
          value={nickname}
          maxLength={32}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="Ivan_Petrov"
        />
        {register && (
          <p className="text-xs text-muted-foreground">
            Буквы, цифры и _, от 3 до 32 символов.
          </p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="pass">Пароль</Label>
        <Input
          id="pass"
          type="password"
          autoComplete={register ? 'new-password' : 'current-password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {register && (
          <p className="text-xs text-muted-foreground">
            Минимум 8 символов, буквы и цифры. Не используйте пароль от игрового
            аккаунта.
          </p>
        )}
      </div>
      {register && (
        <div className="space-y-2">
          <Label htmlFor="pass2">Повторите пароль</Label>
          <Input
            id="pass2"
            type="password"
            autoComplete="new-password"
            value={password2}
            onChange={(e) => setPassword2(e.target.value)}
          />
        </div>
      )}
      {register && (
        <div className="space-y-2">
          <Label htmlFor="reg-server">Ваш сервер</Label>
          <ServerSelect
            id="reg-server"
            value={serverId}
            onChange={setServerId}
            allLabel="Выберу позже"
          />
        </div>
      )}
      {/* Honeypot for bots — hidden from people and screen readers. */}
      <div aria-hidden className="absolute -left-[9999px] h-0 overflow-hidden">
        <label htmlFor="website">Сайт</label>
        <input
          id="website"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />
      </div>
      {register && !settings.registrationOpen && (
        <p role="status" className="text-sm text-muted-foreground">
          Регистрация временно закрыта владельцем сайта.
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? (
          <Loader2 className="animate-spin motion-reduce:animate-none" />
        ) : register ? (
          <UserPlus />
        ) : (
          <Gamepad2 />
        )}
        {register ? 'Создать аккаунт' : 'Войти'}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        {register ? 'Уже есть аккаунт?' : 'Нет аккаунта?'}{' '}
        <button
          type="button"
          className="font-semibold text-primary hover:underline"
          onClick={() => {
            setMode(register ? 'login' : 'register')
            setError(null)
          }}
        >
          {register ? 'Войти' : 'Зарегистрироваться'}
        </button>
      </p>
    </form>
  )
}

function TeamForm() {
  const router = useRouter()
  const navigate = useNavigate()
  const [mode, setMode] = useState<'moderator' | 'owner'>('moderator')
  const [secret, setSecret] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!secret.trim()) {
      setError(mode === 'owner' ? 'Введите пароль' : 'Введите ключ')
      return
    }
    setPending(true)
    setError(null)
    try {
      await signIn({ data: { mode, secret } })
      toast.success(
        mode === 'owner'
          ? 'Режим владельца включён'
          : 'Вы вошли в команду сайта',
      )
      await router.invalidate()
      await navigate({ to: '/admin' })
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setPending(false)
    }
  }

  const roles = [
    {
      id: 'moderator',
      icon: ShieldCheck,
      title: 'Ключ доступа',
      text: 'Модератор или администратор',
    },
    {
      id: 'owner',
      icon: Crown,
      title: 'Владелец',
      text: 'Полное управление сайтом',
    },
  ] as const

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        {roles.map((r) => (
          <button
            key={r.id}
            type="button"
            aria-pressed={mode === r.id}
            onClick={() => setMode(r.id)}
            className={cn(
              'rounded-lg border p-3 text-left transition-colors motion-reduce:transition-none',
              mode === r.id
                ? 'border-primary ring-1 ring-primary'
                : 'hover:border-primary/50',
            )}
          >
            <r.icon
              className={cn(
                'size-5',
                mode === r.id ? 'text-primary' : 'text-muted-foreground',
              )}
            />
            <span className="mt-2 block text-sm font-semibold">{r.title}</span>
            <span className="block text-xs text-muted-foreground">
              {r.text}
            </span>
          </button>
        ))}
      </div>
      <div className="space-y-2">
        <Label htmlFor="secret">
          {mode === 'owner' ? 'Пароль владельца' : 'Ключ доступа'}
        </Label>
        <Input
          id="secret"
          type="password"
          autoComplete={mode === 'owner' ? 'current-password' : 'off'}
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          aria-invalid={!!error}
          placeholder={mode === 'owner' ? '••••••••' : 'mod_…'}
        />
        {mode === 'moderator' && (
          <p className="text-xs text-muted-foreground">
            Ключ выдаёт владелец сайта.
          </p>
        )}
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending && (
          <Loader2 className="animate-spin motion-reduce:animate-none" />
        )}
        {mode === 'owner' ? 'Войти как владелец' : 'Войти по ключу'}
      </Button>
    </form>
  )
}
