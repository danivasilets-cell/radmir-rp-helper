import { useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { useRouter } from '@tanstack/react-router'
import {
  ImagePlus,
  Loader2,
  Newspaper,
  Pencil,
  Pin,
  Plus,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
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
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { ConfirmDelete } from '@/components/events/confirm-delete'
import { ServerSelect, useServerName } from '@/components/app/server-select'
import { errorMessage } from '@/lib/errors'
import { deleteNews, saveNews } from '@/lib/news.functions'
import {
  NEWS_IMAGE_MAX_BYTES,
  NEWS_IMAGE_TYPES,
  NEWS_MAX_IMAGES,
  newsImageUrl,
} from '@/lib/news-images'
import type { NewsItem } from '@/lib/types'
import { cn } from '@/lib/utils'

const dateFormat = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'long',
  timeZone: 'Europe/Moscow',
})

type Draft = {
  id: number | null
  title: string
  body: string
  pinned: boolean
  serverId: number | null
  images: string[]
}

const EMPTY: Draft = {
  id: null,
  title: '',
  body: '',
  pinned: false,
  serverId: null,
  images: [],
}

/** «Новости» column on the home page. Moderators and above can post. */
export function NewsPanel({
  items,
  canManage,
  className,
}: {
  items: NewsItem[]
  canManage: boolean
  className?: string
}) {
  const [draft, setDraft] = useState<Draft | null>(null)

  return (
    <aside
      aria-labelledby="news-heading"
      className={cn(
        'flex flex-col rounded-2xl border bg-card/80 shadow-sm',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3 border-b p-4">
        <h2 id="news-heading" className="flex items-center gap-2 text-xl">
          <span className="grid size-9 place-items-center rounded-lg bg-primary/15 text-primary">
            <Newspaper className="size-5" aria-hidden />
          </span>
          Новости
        </h2>
        {canManage && (
          <Button size="sm" onClick={() => setDraft(EMPTY)}>
            <Plus /> Добавить
          </Button>
        )}
      </div>

      {items.length === 0 ? (
        <p className="p-6 text-center text-sm text-muted-foreground">
          Новостей пока нет.
          {canManage ? ' Нажмите «Добавить», чтобы опубликовать первую.' : ''}
        </p>
      ) : (
        <ul className="min-h-0 divide-y overflow-y-auto">
          {items.map((n) => (
            <NewsEntry
              key={n.id}
              item={n}
              canManage={canManage}
              onEdit={() =>
                setDraft({
                  id: n.id,
                  title: n.title,
                  body: n.body,
                  pinned: n.pinned,
                  serverId: n.serverId,
                  images: n.images,
                })
              }
            />
          ))}
        </ul>
      )}

      <NewsEditor draft={draft} onClose={() => setDraft(null)} />
    </aside>
  )
}

function NewsEntry({
  item,
  canManage,
  onEdit,
}: {
  item: NewsItem
  canManage: boolean
  onEdit: () => void
}) {
  const router = useRouter()
  const serverName = useServerName()(item.serverId)
  const [open, setOpen] = useState(false)
  const long = item.body.length > 220 || item.body.split('\n').length > 4

  return (
    <li className="group p-4">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            {item.pinned && (
              <Badge className="gap-1 px-1.5 py-0">
                <Pin className="size-3" aria-hidden /> Закреплено
              </Badge>
            )}
            <time dateTime={item.createdAt}>
              {dateFormat.format(new Date(item.createdAt))}
            </time>
            {serverName && <span>· {serverName}</span>}
          </p>
          <h3 className="mt-1 font-display text-base leading-snug">
            {item.title}
          </h3>
        </div>
        {canManage && (
          <div className="flex shrink-0 gap-0.5">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Редактировать: ${item.title}`}
              onClick={onEdit}
            >
              <Pencil />
            </Button>
            <ConfirmDelete
              title={item.title}
              onConfirm={async () => {
                try {
                  await deleteNews({ data: { id: item.id } })
                  toast.success('Новость удалена')
                  await router.invalidate()
                } catch (err) {
                  toast.error(errorMessage(err))
                }
              }}
            />
          </div>
        )}
      </div>
      {item.body && (
        <>
          <p
            className={cn(
              'mt-1.5 text-sm whitespace-pre-line text-muted-foreground',
              !open && 'line-clamp-4',
            )}
          >
            {item.body}
          </p>
          {long && (
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              className="mt-1 text-xs font-semibold text-primary hover:underline"
            >
              {open ? 'Свернуть' : 'Читать полностью'}
            </button>
          )}
        </>
      )}
      {item.images.length > 0 && <NewsImages item={item} />}
      {item.authorLabel && (
        <p className="mt-2 text-xs text-muted-foreground/80">
          {item.authorLabel}
        </p>
      )}
    </li>
  )
}

function NewsImages({ item }: { item: NewsItem }) {
  const single = item.images.length === 1
  return (
    <div className={cn('mt-2.5 grid gap-1.5', !single && 'grid-cols-2')}>
      {item.images.map((key, i) => (
        <a
          key={key}
          href={newsImageUrl(key)}
          target="_blank"
          rel="noreferrer"
          className="block overflow-hidden rounded-lg border bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <img
            src={newsImageUrl(key)}
            alt={`${item.title} — фото ${i + 1}`}
            loading="lazy"
            className={cn(
              'w-full object-cover transition-opacity hover:opacity-90 motion-reduce:transition-none',
              single ? 'max-h-64' : 'aspect-square',
            )}
          />
        </a>
      ))}
    </div>
  )
}

async function uploadImage(file: File): Promise<string> {
  const body = new FormData()
  body.append('file', file)
  const res = await fetch('/api/news-images', { method: 'POST', body })
  const json = (await res.json().catch(() => ({}))) as {
    key?: string
    error?: string
  }
  if (!res.ok || !json.key)
    throw new Error(json.error ?? 'Не удалось загрузить фото')
  return json.key
}

function ImagePicker({
  images,
  onChange,
  onBusyChange,
}: {
  images: string[]
  onChange: (images: string[]) => void
  onBusyChange: (busy: boolean) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(0)
  const left = NEWS_MAX_IMAGES - images.length

  async function pick(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (files.length > left)
      toast.error(`Можно добавить не больше ${NEWS_MAX_IMAGES} фото`)
    const valid = files.slice(0, left).filter((f) => {
      if (!(NEWS_IMAGE_TYPES as readonly string[]).includes(f.type)) {
        toast.error(`${f.name}: поддерживаются JPG, PNG, WebP и GIF`)
        return false
      }
      if (f.size > NEWS_IMAGE_MAX_BYTES) {
        toast.error(`${f.name}: файл больше 5 МБ`)
        return false
      }
      return true
    })
    if (!valid.length) return
    setUploading(valid.length)
    onBusyChange(true)
    const keys: string[] = []
    for (const file of valid) {
      try {
        keys.push(await uploadImage(file))
      } catch (err) {
        toast.error(`${file.name}: ${errorMessage(err)}`)
      }
      setUploading((n) => n - 1)
    }
    onBusyChange(false)
    onChange([...images, ...keys])
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="news-images">Фото</Label>
      <div className="grid grid-cols-3 gap-2">
        {images.map((key, i) => (
          <div
            key={key}
            className="relative aspect-square overflow-hidden rounded-lg border bg-muted"
          >
            <img
              src={newsImageUrl(key)}
              alt={`Фото ${i + 1}`}
              className="size-full object-cover"
            />
            <Button
              type="button"
              variant="secondary"
              size="icon-sm"
              className="absolute top-1 right-1 size-7 rounded-full shadow"
              aria-label={`Убрать фото ${i + 1}`}
              onClick={() => onChange(images.filter((k) => k !== key))}
            >
              <X />
            </Button>
          </div>
        ))}
        {Array.from({ length: uploading }, (_, i) => (
          <div
            key={`up-${i}`}
            className="grid aspect-square place-items-center rounded-lg border border-dashed bg-muted/50"
          >
            <Loader2
              className="size-5 animate-spin text-muted-foreground motion-reduce:animate-none"
              aria-label="Загрузка фото"
            />
          </div>
        ))}
        {left - uploading > 0 && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading > 0}
            className="grid aspect-square place-items-center rounded-lg border border-dashed text-muted-foreground transition-colors hover:border-primary hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-50 motion-reduce:transition-none"
          >
            <span className="flex flex-col items-center gap-1 text-xs">
              <ImagePlus className="size-5" aria-hidden />
              Добавить
            </span>
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        id="news-images"
        type="file"
        accept={NEWS_IMAGE_TYPES.join(',')}
        multiple
        className="sr-only"
        tabIndex={-1}
        onChange={pick}
      />
      <p className="text-xs text-muted-foreground">
        До {NEWS_MAX_IMAGES} фото, JPG, PNG, WebP или GIF, каждое до 5 МБ.
      </p>
      <span className="sr-only" aria-live="polite">
        {uploading > 0 ? 'Загрузка фото…' : ''}
      </span>
    </div>
  )
}

function NewsEditor({
  draft,
  onClose,
}: {
  draft: Draft | null
  onClose: () => void
}) {
  return (
    <Dialog open={draft !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        {draft && (
          <NewsForm key={draft.id ?? 'new'} initial={draft} onDone={onClose} />
        )}
      </DialogContent>
    </Dialog>
  )
}

function NewsForm({ initial, onDone }: { initial: Draft; onDone: () => void }) {
  const router = useRouter()
  const [form, setForm] = useState(initial)
  const [pending, setPending] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) {
      setError('Введите заголовок')
      return
    }
    setPending(true)
    setError('')
    try {
      await saveNews({ data: form })
      toast.success(initial.id ? 'Новость обновлена' : 'Новость опубликована')
      await router.invalidate()
      onDone()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <DialogHeader>
        <DialogTitle>
          {initial.id ? 'Редактировать новость' : 'Новая новость'}
        </DialogTitle>
        <DialogDescription>
          Новость появится в блоке «Новости» на главной странице.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-2">
        <Label htmlFor="news-title">Заголовок</Label>
        <Input
          id="news-title"
          value={form.title}
          maxLength={120}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          placeholder="Например: Обновление 6.2 на сервере"
          autoFocus
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="news-body">Текст</Label>
        <Textarea
          id="news-body"
          value={form.body}
          maxLength={4000}
          rows={6}
          onChange={(e) => setForm({ ...form, body: e.target.value })}
          placeholder="Что нового?"
        />
      </div>
      <ImagePicker
        images={form.images}
        onChange={(images) => setForm((f) => ({ ...f, images }))}
        onBusyChange={setUploading}
      />
      <div className="space-y-2">
        <Label htmlFor="news-server">Сервер</Label>
        <ServerSelect
          id="news-server"
          value={form.serverId}
          onChange={(serverId) => setForm({ ...form, serverId })}
        />
      </div>
      <div className="flex items-center gap-3">
        <Switch
          id="news-pinned"
          checked={form.pinned}
          onCheckedChange={(pinned) => setForm({ ...form, pinned })}
        />
        <Label htmlFor="news-pinned">Закрепить сверху</Label>
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Отмена
        </Button>
        <Button type="submit" disabled={pending || uploading}>
          {pending && (
            <Loader2 className="animate-spin motion-reduce:animate-none" />
          )}
          {initial.id ? 'Сохранить' : 'Опубликовать'}
        </Button>
      </DialogFooter>
    </form>
  )
}
