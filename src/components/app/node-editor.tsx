import { useState, type FormEvent } from 'react'
import { useRouter } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
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
import { createNode, updateNode } from '@/lib/api.functions'
import { errorMessage } from '@/lib/errors'
import type { NodeKind } from '@/lib/types'
import { cn } from '@/lib/utils'
import { ICONS } from './node-icon'
import { ContentEditor } from './content-editor'
import { ServerSelect } from './server-select'

export type EditorState =
  | {
      mode: 'create'
      parentId: number | null
      kind: NodeKind
      allowKindChoice: boolean
    }
  | {
      mode: 'edit'
      id: number
      kind: NodeKind
      title: string
      summary: string
      content: string
      icon: string
      serverId: number | null
    }

export function NodeEditor({
  state,
  onClose,
}: {
  state: EditorState | null
  onClose: () => void
}) {
  return (
    <Dialog open={state !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-2xl">
        {state && <EditorForm state={state} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  )
}

function EditorForm({
  state,
  onClose,
}: {
  state: EditorState
  onClose: () => void
}) {
  const router = useRouter()
  const edit = state.mode === 'edit' ? state : null
  const [kind, setKind] = useState<NodeKind>(state.kind)
  const [title, setTitle] = useState(edit?.title ?? '')
  const [summary, setSummary] = useState(edit?.summary ?? '')
  const [content, setContent] = useState(edit?.content ?? '')
  const [icon, setIcon] = useState(edit?.icon ?? '')
  const [serverId, setServerId] = useState<number | null>(
    edit?.serverId ?? null,
  )
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [uploading, setUploading] = useState(false)

  const kindLabel = kind === 'section' ? 'раздел' : 'тему'
  const canChooseKind = state.mode === 'create' && state.allowKindChoice

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!title.trim()) {
      setError('Введите название')
      return
    }
    setPending(true)
    setError(null)
    try {
      const fields = { kind, title, summary, content, icon, serverId }
      if (state.mode === 'create') {
        await createNode({ data: { ...fields, parentId: state.parentId } })
        toast.success(kind === 'section' ? 'Раздел добавлен' : 'Тема добавлена')
      } else {
        await updateNode({ data: { ...fields, id: state.id } })
        toast.success('Изменения сохранены')
      }
      await router.invalidate()
      onClose()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <DialogHeader>
        <DialogTitle>
          {state.mode === 'edit'
            ? `Редактировать ${kindLabel}`
            : `Новый ${kind === 'section' ? 'раздел' : 'подпункт / тема'}`}
        </DialogTitle>
        <DialogDescription>
          Разделы содержат другие пункты, темы — готовые идеи и текст для РП.
          Подпункты можно добавлять внутрь любого элемента.
        </DialogDescription>
      </DialogHeader>

      {canChooseKind && (
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Тип</legend>
          <div className="grid grid-cols-2 gap-2">
            {(['section', 'topic'] as const).map((k) => (
              <button
                key={k}
                type="button"
                aria-pressed={kind === k}
                onClick={() => setKind(k)}
                className={cn(
                  'rounded-lg border px-3 py-2.5 text-left text-sm transition-colors motion-reduce:transition-none',
                  kind === k
                    ? 'border-primary bg-primary/10 text-foreground'
                    : 'border-border text-muted-foreground hover:bg-accent',
                )}
              >
                <span className="block font-semibold">
                  {k === 'section' ? 'Раздел' : 'Тема'}
                </span>
                <span className="text-xs">
                  {k === 'section'
                    ? 'Папка для подразделов и тем'
                    : 'Идея, гайд или отыгровка'}
                </span>
              </button>
            ))}
          </div>
        </fieldset>
      )}

      <div className="space-y-2">
        <Label htmlFor="node-title">Название</Label>
        <Input
          id="node-title"
          value={title}
          maxLength={150}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={
            kind === 'section' ? 'Например: МЧС' : 'Например: Ночной патруль'
          }
          aria-invalid={error === 'Введите название'}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="node-summary">Краткое описание</Label>
        <Input
          id="node-summary"
          value={summary}
          maxLength={300}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="Одна строка, видна в списке"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="node-content">Текст</Label>
        <ContentEditor
          id="node-content"
          value={content}
          onChange={setContent}
          onBusyChange={setUploading}
          stickyTop="top-0"
          rows={kind === 'topic' ? 12 : 4}
          placeholder={
            '## Идея\nОпишите ситуацию...\n\n## Отыгровка\n- /me достал рацию\n- /do Рация включена.'
          }
        />
        <p className="text-xs text-muted-foreground">
          Выделите текст и нажмите «Жирный» (или Ctrl+B). Фото можно добавить
          кнопкой или вставить из буфера. Команды /me, /do, /try подсвечиваются.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="node-server">Сервер</Label>
        <ServerSelect
          id="node-server"
          value={serverId}
          onChange={setServerId}
          allLabel="Все серверы (одинаково везде)"
        />
        <p className="text-xs text-muted-foreground">
          Выберите сервер, если материал отличается на разных серверах.
        </p>
      </div>

      {kind === 'section' && (
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Иконка</legend>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(ICONS).map(([name, Icon]) => (
              <button
                key={name}
                type="button"
                aria-label={name}
                aria-pressed={icon === name}
                onClick={() => setIcon(icon === name ? '' : name)}
                className={cn(
                  'grid size-9 place-items-center rounded-md border transition-colors motion-reduce:transition-none',
                  icon === name
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border text-muted-foreground hover:bg-accent hover:text-foreground',
                )}
              >
                <Icon className="size-4" />
              </button>
            ))}
          </div>
        </fieldset>
      )}

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onClose}>
          Отмена
        </Button>
        <Button type="submit" disabled={pending || uploading}>
          {pending && (
            <Loader2 className="animate-spin motion-reduce:animate-none" />
          )}
          {state.mode === 'edit' ? 'Сохранить' : 'Добавить'}
        </Button>
      </DialogFooter>
    </form>
  )
}
