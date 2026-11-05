import { useState, type FormEvent } from 'react'
import { useRouter } from '@tanstack/react-router'
import {
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  LogOut,
  ShieldCheck,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SectionHead } from '@/components/admin/ui'
import { errorMessage } from '@/lib/errors'
import {
  changeOwnerPassword,
  endOtherOwnerSessions,
  type getOwnerSecurity,
} from '@/lib/owner.functions'
import { passwordProblem } from '@/lib/password'
import { cn } from '@/lib/utils'

type Security = Awaited<ReturnType<typeof getOwnerSecurity>>

const fmt = (iso: string) =>
  new Date(iso).toLocaleString('ru-RU', {
    day: '2-digit',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  })

/** Strength meter for the new password (0–4). */
function strength(pw: string) {
  let score = 0
  if (pw.length >= 8) score++
  if (pw.length >= 12) score++
  if (/[a-zа-яё]/.test(pw) && /[A-ZА-ЯЁ]/.test(pw)) score++
  if (/\d/.test(pw) && /[^A-Za-zА-Яа-яЁё0-9]/.test(pw)) score++
  return score
}
const STRENGTH = ['Очень слабый', 'Слабый', 'Средний', 'Хороший', 'Отличный']

function generatePassword() {
  const chars =
    'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*'
  const bytes = crypto.getRandomValues(new Uint32Array(16))
  let out = Array.from(bytes, (b) => chars[b % chars.length]).join('')
  // Guarantee letters + digits for the password policy.
  out = out.slice(0, 13) + 'a' + String(bytes[0] % 10) + '!'
  return out
}

export function OwnerSecurity({ security }: { security: Security }) {
  const router = useRouter()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [repeat, setRepeat] = useState('')
  const [show, setShow] = useState(false)
  const [logoutOthers, setLogoutOthers] = useState(true)
  const [pending, setPending] = useState(false)
  const [ending, setEnding] = useState(false)

  if (!security.passwordLogin)
    return (
      <section>
        <SectionHead
          title="Пароль владельца"
          text="Пароль владельца можно сменить, только если вы вошли через «Вход владельца»."
        />
      </section>
    )

  const score = strength(next)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const problem = passwordProblem(next)
    if (problem) return void toast.error(problem)
    if (next !== repeat) return void toast.error('Пароли не совпадают')
    setPending(true)
    try {
      await changeOwnerPassword({ data: { current, next, logoutOthers } })
      toast.success('Пароль владельца изменён')
      setCurrent('')
      setNext('')
      setRepeat('')
      await router.invalidate()
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setPending(false)
    }
  }

  async function handleEndSessions() {
    setEnding(true)
    try {
      await endOtherOwnerSessions()
      toast.success('Другие сеансы владельца завершены')
      await router.invalidate()
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setEnding(false)
    }
  }

  return (
    <section>
      <SectionHead
        title="Безопасность владельца"
        text="Смена пароля для «Входа владельца» и контроль открытых сеансов."
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <div className="flex items-start gap-3 rounded-xl border bg-card p-4">
          <ShieldCheck className="mt-0.5 size-5 text-primary" aria-hidden />
          <div className="text-sm">
            <p className="font-medium">
              {security.custom ? 'Свой пароль' : 'Пароль из настроек сервера'}
            </p>
            <p className="text-muted-foreground">
              {security.changedAt
                ? `Изменён ${fmt(security.changedAt)}`
                : 'Ещё не менялся на сайте'}
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3 rounded-xl border bg-card p-4">
          <LogOut className="mt-0.5 size-5 text-primary" aria-hidden />
          <div className="flex-1 text-sm">
            <p className="font-medium">
              Открытых сеансов: {security.sessionCount}
            </p>
            <p className="text-muted-foreground">Включая этот браузер</p>
            {security.sessionCount > 1 && (
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => void handleEndSessions()}
                disabled={ending}
              >
                {ending && (
                  <Loader2 className="animate-spin motion-reduce:animate-none" />
                )}
                Завершить остальные
              </Button>
            )}
          </div>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-xl border bg-card p-4"
      >
        <div className="space-y-2">
          <Label htmlFor="owner-current">Текущий пароль</Label>
          <Input
            id="owner-current"
            type="password"
            autoComplete="current-password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            required
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="owner-next">Новый пароль</Label>
            <div className="relative">
              <Input
                id="owner-next"
                type={show ? 'text' : 'password'}
                autoComplete="new-password"
                value={next}
                onChange={(e) => setNext(e.target.value)}
                className="pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShow((v) => !v)}
                className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
                aria-label={show ? 'Скрыть пароль' : 'Показать пароль'}
              >
                {show ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="owner-repeat">Повторите пароль</Label>
            <Input
              id="owner-repeat"
              type={show ? 'text' : 'password'}
              autoComplete="new-password"
              value={repeat}
              onChange={(e) => setRepeat(e.target.value)}
              required
            />
          </div>
        </div>

        {next && (
          <div>
            <div className="flex gap-1" aria-hidden>
              {[0, 1, 2, 3].map((i) => (
                <span
                  key={i}
                  className={cn(
                    'h-1.5 flex-1 rounded-full bg-muted',
                    i < score &&
                      (score <= 1
                        ? 'bg-destructive'
                        : score === 2
                          ? 'bg-chart-5'
                          : 'bg-chart-3'),
                  )}
                />
              ))}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Надёжность: {STRENGTH[score]}
              {passwordProblem(next) ? ` · ${passwordProblem(next)}` : ''}
            </p>
          </div>
        )}

        <div className="flex items-center gap-2">
          <Checkbox
            id="owner-logout"
            checked={logoutOthers}
            onCheckedChange={(v) => setLogoutOthers(v === true)}
          />
          <Label htmlFor="owner-logout" className="font-normal">
            Выйти из владельца на всех других устройствах
          </Label>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={pending}>
            {pending ? (
              <Loader2 className="animate-spin motion-reduce:animate-none" />
            ) : (
              <KeyRound />
            )}
            Сменить пароль
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              const pw = generatePassword()
              setNext(pw)
              setRepeat(pw)
              setShow(true)
              void navigator.clipboard
                ?.writeText(pw)
                .then(() => toast.success('Пароль скопирован в буфер обмена'))
                .catch(() => undefined)
            }}
          >
            Придумать надёжный
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Забыли пароль? Измените переменную OWNER_PASSWORD в настройках Netlify
          — после этого снова заработает пароль из неё.
        </p>
      </form>
    </section>
  )
}
