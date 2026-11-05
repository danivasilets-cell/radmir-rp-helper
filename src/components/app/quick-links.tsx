import { useState, type FormEvent } from 'react'
import { useRouter } from '@tanstack/react-router'
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  CalendarDays,
  CarFront,
  ExternalLink,
  Gift,
  Heart,
  Link2,
  Loader2,
  Plus,
  Search,
  Settings2,
  Table2,
  Trash2,
  Trophy,
  type LucideIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ICONS } from '@/components/app/node-icon'
import { errorMessage } from '@/lib/errors'
import { saveQuickLinks } from '@/lib/quick-links.functions'
import type { QuickLink } from '@/lib/types'
import { cn } from '@/lib/utils'

const LINK_ICONS: Record<string, LucideIcon> = {
  'car-front': CarFront,
  table: Table2,
  gift: Gift,
  heart: Heart,
  trophy: Trophy,
  calendar: CalendarDays,
  search: Search,
  link: Link2,
  ...ICONS,
}

const isExternal = (url: string) => /^https?:\/\//i.test(url)

export function QuickLinks({
  links,
  owner,
}: {
  links: QuickLink[]
  owner: boolean
}) {
  const [editing, setEditing] = useState(false)

  if (links.length === 0 && !owner) return null

  return (
    <div className="space-y-3">
      {owner && (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            <Settings2 /> Настроить кнопки
          </Button>
        </div>
      )}
      {links.length === 0 ? (
        <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
          Кнопок пока нет. Нажмите «Настроить кнопки», чтобы добавить.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {links.map((l) => (
            <QuickLinkCard key={l.id} link={l} />
          ))}
        </div>
      )}
      {owner && editing && (
        <QuickLinksEditor
          open
          links={links}
          onClose={() => setEditing(false)}
        />
      )}
    </div>
  )
}

function QuickLinkCard({ link }: { link: QuickLink }) {
  const router = useRouter()
  const Icon = LINK_ICONS[link.icon] ?? Link2
  const external = isExternal(link.url)
  return (
    <a
      href={link.url}
      target={external ? '_blank' : undefined}
      rel={external ? 'noopener noreferrer' : undefined}
      onClick={(e) => {
        if (
          external ||
          e.defaultPrevented ||
          e.button !== 0 ||
          e.metaKey ||
          e.ctrlKey ||
          e.shiftKey ||
          e.altKey
        )
          return
        e.preventDefault()
        void router.navigate({ href: link.url })
      }}
      className="group flex items-center gap-3 rounded-xl border bg-gradient-to-br from-primary/10 to-transparent p-4 transition-colors hover:border-primary/60 motion-reduce:transition-none"
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
        <Icon className="size-5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">{link.title}</span>
        {link.text && (
          <span className="block text-sm text-muted-foreground">
            {link.text}
          </span>
        )}
      </span>
      {external ? (
        <ExternalLink className="size-4 text-muted-foreground" aria-hidden />
      ) : (
        <ArrowRight
          className="size-4 text-muted-foreground transition-transform group-hover:translate-x-1 motion-reduce:transition-none"
          aria-hidden
        />
      )}
    </a>
  )
}

type Draft = Omit<QuickLink, 'id'> & { key: string }

const toDrafts = (links: QuickLink[]): Draft[] =>
  links.map((l) => ({ ...l, key: String(l.id) }))

function QuickLinksEditor({
  open,
  links,
  onClose,
}: {
  open: boolean
  links: QuickLink[]
  onClose: () => void
}) {
  const router = useRouter()
  const [drafts, setDrafts] = useState<Draft[]>(() => toDrafts(links))
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const update = (i: number, patch: Partial<Draft>) =>
    setDrafts((d) => d.map((x, j) => (j === i ? { ...x, ...patch } : x)))
  const move = (i: number, dir: -1 | 1) =>
    setDrafts((d) => {
      const next = [...d]
      ;[next[i], next[i + dir]] = [next[i + dir], next[i]]
      return next
    })

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const clean = drafts.map((d) => ({
      title: d.title.trim(),
      text: d.text.trim(),
      url: d.url.trim(),
      icon: d.icon,
    }))
    const bad = clean.findIndex((l) => !l.title || !l.url)
    if (bad !== -1)
      return setError(`Кнопка №${bad + 1}: укажите название и ссылку`)
    const badUrl = clean.findIndex(
      (l) =>
        !(
          (l.url.startsWith('/') && !l.url.startsWith('//')) ||
          isExternal(l.url)
        ),
    )
    if (badUrl !== -1)
      return setError(
        `Кнопка №${badUrl + 1}: ссылка должна начинаться с / (страница сайта) или https://`,
      )
    setError(null)
    setPending(true)
    try {
      await saveQuickLinks({ data: { links: clean } })
      toast.success('Кнопки сохранены')
      await router.invalidate()
      onClose()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose()
      }}
    >
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Кнопки на главной</DialogTitle>
          <DialogDescription>
            Меняйте названия, подписи, ссылки и иконки, порядок кнопок,
            добавляйте новые и удаляйте ненужные. Ссылка — страница сайта
            (например, /cars или /n/12) или внешний адрес https://…
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <ol className="space-y-3">
            {drafts.map((d, i) => (
              <li key={d.key} className="space-y-3 rounded-lg border p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-muted-foreground">
                    Кнопка №{i + 1}
                  </span>
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="Выше"
                      disabled={i === 0}
                      onClick={() => move(i, -1)}
                    >
                      <ArrowUp />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="Ниже"
                      disabled={i === drafts.length - 1}
                      onClick={() => move(i, 1)}
                    >
                      <ArrowDown />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Удалить кнопку ${d.title || i + 1}`}
                      onClick={() =>
                        setDrafts((x) => x.filter((_, j) => j !== i))
                      }
                    >
                      <Trash2 className="text-destructive" />
                    </Button>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor={`ql-title-${d.key}`}>Название</Label>
                    <Input
                      id={`ql-title-${d.key}`}
                      value={d.title}
                      maxLength={40}
                      onChange={(e) => update(i, { title: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor={`ql-text-${d.key}`}>Подпись</Label>
                    <Input
                      id={`ql-text-${d.key}`}
                      value={d.text}
                      maxLength={80}
                      placeholder="Необязательно"
                      onChange={(e) => update(i, { text: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor={`ql-url-${d.key}`}>Ссылка</Label>
                    <Input
                      id={`ql-url-${d.key}`}
                      value={d.url}
                      maxLength={500}
                      placeholder="/cars или https://…"
                      onChange={(e) => update(i, { url: e.target.value })}
                    />
                  </div>
                </div>
                <fieldset className="space-y-1.5">
                  <legend className="text-sm font-medium">Иконка</legend>
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(LINK_ICONS).map(([name, Icon]) => (
                      <button
                        key={name}
                        type="button"
                        aria-label={name}
                        aria-pressed={d.icon === name}
                        onClick={() => update(i, { icon: name })}
                        className={cn(
                          'grid size-8 place-items-center rounded-md border transition-colors motion-reduce:transition-none',
                          d.icon === name
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-border text-muted-foreground hover:bg-accent hover:text-foreground',
                        )}
                      >
                        <Icon className="size-4" />
                      </button>
                    ))}
                  </div>
                </fieldset>
              </li>
            ))}
          </ol>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={drafts.length >= 20}
            onClick={() =>
              setDrafts((d) => [
                ...d,
                {
                  key: `new-${Date.now()}`,
                  title: '',
                  text: '',
                  url: '/',
                  icon: 'link',
                },
              ])
            }
          >
            <Plus /> Добавить кнопку
          </Button>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              Отмена
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && (
                <Loader2 className="animate-spin motion-reduce:animate-none" />
              )}
              Сохранить
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
