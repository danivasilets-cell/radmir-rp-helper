import { useState, type FormEvent } from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { Loader2, Save } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { guard } from '@/components/admin/guard'
import { SectionHead } from '@/components/admin/ui'
import {
  getPlatformSettings,
  savePlatformSettings,
} from '@/lib/admin.functions'
import { errorMessage } from '@/lib/errors'
import { getOwnerSecurity } from '@/lib/owner.functions'
import { OwnerSecurity } from '@/components/admin/owner-security'
import {
  siteModeOf,
  type PlatformSettings,
  type SiteMode,
} from '@/lib/settings'

export const Route = createFileRoute('/admin/settings')({
  beforeLoad: guard('settings.manage'),
  loader: async () => {
    const [platform, security] = await Promise.all([
      getPlatformSettings(),
      getOwnerSecurity(),
    ])
    return { platform, security }
  },
  component: SettingsPage,
})

const SITE_MODE_OPTIONS: { value: SiteMode; label: string; hint: string }[] = [
  {
    value: 'online',
    label: 'Сайт работает',
    hint: 'Обычный режим, сайт доступен всем.',
  },
  {
    value: 'maintenance',
    label: 'Технические работы',
    hint: 'Посетители и игроки видят заглушку. Команда (модераторы и выше) пользуется сайтом как обычно.',
  },
  {
    value: 'disabled',
    label: 'Сайт отключён',
    hint: 'Заглушка для всех, кроме владельца. Страница входа остаётся доступной.',
  },
]

const SWITCHES: { key: keyof PlatformSettings; label: string; hint: string }[] =
  [
    {
      key: 'registrationOpen',
      label: 'Регистрация игроков',
      hint: 'Если выключено, новые аккаунты создать нельзя. Вход работает.',
    },
    {
      key: 'commentsEnabled',
      label: 'Комментарии',
      hint: 'Игроки могут оставлять комментарии под темами.',
    },
    {
      key: 'ideasEnabled',
      label: 'Приём RP-идей',
      hint: 'Игроки могут предлагать идеи на проверку.',
    },
    {
      key: 'reportsEnabled',
      label: 'Жалобы',
      hint: 'Кнопка «Пожаловаться» у материалов и комментариев.',
    },
  ]

function SettingsPage() {
  const { platform: initial, security } = Route.useLoaderData()
  const router = useRouter()
  const [f, setF] = useState({
    ...initial,
    siteMode: siteModeOf(initial) as SiteMode,
  })
  const [pending, setPending] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setPending(true)
    try {
      await savePlatformSettings({ data: f })
      if (f.siteMode !== siteModeOf(initial))
        toast.info(
          f.siteMode === 'online'
            ? 'Сайт снова открыт для всех'
            : 'Заглушка включена',
        )
      toast.success('Настройки сохранены')
      await router.invalidate()
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="max-w-reading space-y-10">
      <form onSubmit={handleSubmit}>
        <SectionHead
          title="Настройки платформы"
          text="Кнопки главной страницы редактируются прямо на главной."
        />
        <fieldset className="mb-6 rounded-xl border bg-card p-4">
          <legend className="px-1 text-sm font-semibold">
            Режим сайта (заглушка)
          </legend>
          <RadioGroup
            value={f.siteMode}
            onValueChange={(v) => setF({ ...f, siteMode: v as SiteMode })}
            className="mt-2 gap-3"
          >
            {SITE_MODE_OPTIONS.map((o) => (
              <div key={o.value} className="flex items-start gap-3">
                <RadioGroupItem
                  id={`mode-${o.value}`}
                  value={o.value}
                  className="mt-0.5"
                />
                <div>
                  <Label htmlFor={`mode-${o.value}`}>{o.label}</Label>
                  <p className="mt-1 text-xs text-muted-foreground">{o.hint}</p>
                </div>
              </div>
            ))}
          </RadioGroup>
          {f.siteMode !== 'online' && (
            <div className="mt-4 space-y-2">
              <Label htmlFor="set-site-message">Текст на заглушке</Label>
              <Textarea
                id="set-site-message"
                rows={3}
                maxLength={500}
                value={f.siteModeMessage}
                onChange={(e) =>
                  setF({ ...f, siteModeMessage: e.target.value })
                }
                placeholder="Например: вернёмся к 18:00 по МСК. Необязательно."
              />
            </div>
          )}
        </fieldset>
        <div className="divide-y rounded-xl border bg-card">
          {SWITCHES.map((s) => (
            <div key={s.key} className="flex items-start gap-4 p-4">
              <div className="flex-1">
                <Label htmlFor={`set-${s.key}`}>{s.label}</Label>
                <p className="mt-1 text-xs text-muted-foreground">{s.hint}</p>
              </div>
              <Switch
                id={`set-${s.key}`}
                checked={f[s.key] as boolean}
                onCheckedChange={(v) => setF({ ...f, [s.key]: v })}
              />
            </div>
          ))}
          <div className="space-y-2 p-4">
            <Label htmlFor="set-announcement">
              Объявление на всех страницах
            </Label>
            <Textarea
              id="set-announcement"
              rows={2}
              maxLength={300}
              value={f.announcement}
              onChange={(e) => setF({ ...f, announcement: e.target.value })}
              placeholder="Пусто — объявление скрыто"
            />
          </div>
        </div>
        <Button type="submit" className="mt-4" disabled={pending}>
          {pending ? (
            <Loader2 className="animate-spin motion-reduce:animate-none" />
          ) : (
            <Save />
          )}
          Сохранить
        </Button>
      </form>
      <OwnerSecurity security={security} />
    </div>
  )
}
