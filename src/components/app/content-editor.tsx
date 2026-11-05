import { useRef, useState, type KeyboardEvent } from 'react'
import { Bold, Heading2, ImagePlus, List, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { NEWS_IMAGE_MAX_BYTES, NEWS_IMAGE_TYPES } from '@/lib/news-images'
import { cn } from '@/lib/utils'

async function uploadTopicImage(file: File): Promise<string> {
  if (!(NEWS_IMAGE_TYPES as readonly string[]).includes(file.type))
    throw new Error('Поддерживаются JPG, PNG, WebP и GIF')
  if (file.size > NEWS_IMAGE_MAX_BYTES) throw new Error('Фото больше 5 МБ')
  const body = new FormData()
  body.append('file', file)
  const res = await fetch('/api/topic-images', { method: 'POST', body })
  const json = (await res.json().catch(() => ({}))) as {
    url?: string
    error?: string
  }
  if (!res.ok || !json.url)
    throw new Error(json.error ?? 'Не удалось загрузить фото')
  return json.url
}

/**
 * Textarea with a formatting toolbar: bold (Ctrl+B), heading, list and photo
 * upload. Photos are inserted into the text as «![](url)» on their own line.
 */
export function ContentEditor({
  id,
  value,
  onChange,
  rows = 12,
  maxLength,
  placeholder,
  onBusyChange,
  stickyTop = 'top-20',
}: {
  id: string
  value: string
  onChange: (value: string) => void
  rows?: number
  maxLength?: number
  placeholder?: string
  onBusyChange?: (busy: boolean) => void
  /** Tailwind `top-*` class for the sticky toolbar (below the site header). */
  stickyTop?: string
}) {
  const ref = useRef<HTMLTextAreaElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(0)

  /** Replaces the current selection and restores a sensible selection. */
  function apply(
    build: (selected: string) => {
      text: string
      selectFrom: number
      selectTo: number
    },
  ) {
    const el = ref.current
    if (!el) return
    const start = el.selectionStart
    const end = el.selectionEnd
    const { text, selectFrom, selectTo } = build(value.slice(start, end))
    const next = value.slice(0, start) + text + value.slice(end)
    onChange(next)
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(start + selectFrom, start + selectTo)
    })
  }

  function toggleBold() {
    const el = ref.current
    if (!el) return
    const start = el.selectionStart
    const end = el.selectionEnd
    // Already wrapped in ** ** — unwrap.
    if (
      start >= 2 &&
      value.slice(start - 2, start) === '**' &&
      value.slice(end, end + 2) === '**'
    ) {
      onChange(
        value.slice(0, start - 2) +
          value.slice(start, end) +
          value.slice(end + 2),
      )
      requestAnimationFrame(() => {
        el.focus()
        el.setSelectionRange(start - 2, end - 2)
      })
      return
    }
    apply((sel) => {
      const word = sel || 'жирный текст'
      // Keep surrounding spaces outside the markers.
      const lead = word.match(/^\s*/)?.[0] ?? ''
      const trail = word.match(/\s*$/)?.[0] ?? ''
      const core = word.trim() || 'жирный текст'
      return {
        text: `${lead}**${core}**${trail}`,
        selectFrom: lead.length + 2,
        selectTo: lead.length + 2 + core.length,
      }
    })
  }

  /** Adds a prefix to every selected line (or the current one). */
  function prefixLines(prefix: string, fallback: string) {
    const el = ref.current
    if (!el) return
    let start = el.selectionStart
    const end = el.selectionEnd
    start = value.lastIndexOf('\n', start - 1) + 1
    const block = value.slice(start, end)
    const lines = (block || fallback).split('\n')
    const text = lines
      .map((l) => (l.startsWith(prefix) ? l : prefix + l))
      .join('\n')
    onChange(value.slice(0, start) + text + value.slice(end))
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(start + text.length, start + text.length)
    })
  }

  function insertBlock(snippet: string) {
    const el = ref.current
    const pos = el ? el.selectionEnd : value.length
    const before = value.slice(0, pos)
    const after = value.slice(pos)
    const pre =
      before && !before.endsWith('\n\n')
        ? before.endsWith('\n')
          ? '\n'
          : '\n\n'
        : ''
    const post = after.startsWith('\n') ? '\n' : '\n\n'
    const text = pre + snippet + post
    onChange(before + text + after)
    requestAnimationFrame(() => {
      el?.focus()
      el?.setSelectionRange(pos + text.length, pos + text.length)
    })
    return text.length
  }

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return
    const list = Array.from(files).slice(0, 6)
    setUploading((n) => n + list.length)
    onBusyChange?.(true)
    const urls: string[] = []
    for (const file of list) {
      try {
        urls.push(await uploadTopicImage(file))
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Ошибка загрузки')
      } finally {
        setUploading((n) => {
          const left = n - 1
          if (left === 0) onBusyChange?.(false)
          return left
        })
      }
    }
    if (urls.length) {
      insertBlock(urls.map((u) => `![фото](${u})`).join('\n'))
      toast.success(urls.length > 1 ? 'Фото добавлены' : 'Фото добавлено')
    }
    if (fileRef.current) fileRef.current.value = ''
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
      e.preventDefault()
      toggleBold()
    }
  }

  const tool =
    'h-9 w-9 justify-center gap-1.5 px-0 text-xs text-muted-foreground hover:text-foreground sm:w-full sm:justify-start sm:px-2.5'

  return (
    <div className="flex rounded-md border border-input focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50">
      <div className="order-2 shrink-0 rounded-r-md border-l border-input bg-muted/40 p-1">
        <div
          role="toolbar"
          aria-label="Форматирование текста"
          aria-orientation="vertical"
          className={cn('sticky flex flex-col gap-0.5', stickyTop)}
        >
          <Button
            type="button"
            variant="ghost"
            className={cn(tool, 'font-bold')}
            title="Жирный (Ctrl+B)"
            aria-label="Жирный"
            onMouseDown={(e) => e.preventDefault()}
            onClick={toggleBold}
          >
            <Bold /> <span className="hidden sm:inline">Жирный</span>
          </Button>
          <Button
            type="button"
            variant="ghost"
            className={tool}
            title="Подзаголовок"
            aria-label="Подзаголовок"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => prefixLines('## ', 'Заголовок')}
          >
            <Heading2 /> <span className="hidden sm:inline">Заголовок</span>
          </Button>
          <Button
            type="button"
            variant="ghost"
            className={tool}
            title="Пункт списка"
            aria-label="Пункт списка"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => prefixLines('- ', 'пункт')}
          >
            <List /> <span className="hidden sm:inline">Список</span>
          </Button>
          <Button
            type="button"
            variant="ghost"
            className={tool}
            title="Добавить фото (JPG, PNG, WebP, GIF до 5 МБ)"
            aria-label="Добавить фото"
            disabled={uploading > 0}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => fileRef.current?.click()}
          >
            {uploading > 0 ? (
              <Loader2 className="animate-spin motion-reduce:animate-none" />
            ) : (
              <ImagePlus />
            )}
            <span className="hidden sm:inline">
              {uploading > 0 ? 'Загрузка…' : 'Фото'}
            </span>
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept={NEWS_IMAGE_TYPES.join(',')}
            multiple
            hidden
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>
      </div>
      <Textarea
        ref={ref}
        id={id}
        rows={rows}
        maxLength={maxLength}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onPaste={(e) => {
          const files = e.clipboardData.files
          if (files.length && files[0].type.startsWith('image/')) {
            e.preventDefault()
            void handleFiles(files)
          }
        }}
        placeholder={placeholder}
        className="order-1 min-w-0 flex-1 rounded-none rounded-l-md border-0 font-mono text-sm shadow-none focus-visible:ring-0 dark:bg-transparent"
      />
    </div>
  )
}
