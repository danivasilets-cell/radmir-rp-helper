import { useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import { Bookmark, Check, Copy, Pencil, Server, Shield } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { RichText } from '@/components/app/rich-text'
import { useServerName } from '@/components/app/server-select'
import { ConfirmDelete } from '@/components/events/confirm-delete'
import { deleteRoleplay, toggleSavedRoleplay } from '@/lib/catalog.functions'
import { errorMessage } from '@/lib/errors'
import type { Roleplay } from '@/lib/types'
import { cn } from '@/lib/utils'

export const RP_KIND_LABEL = {
  action: 'Отыгровка',
  scenario: 'RP-сценарий',
} as const

/**
 * One отыгровка / RP scenario. `saved = null` → guest (save asks to sign in).
 */
export function RoleplayCard({
  item,
  saved,
  canEdit = false,
  onEdit,
}: {
  item: Roleplay
  saved: boolean | null
  canEdit?: boolean
  onEdit?: (item: Roleplay) => void
}) {
  const router = useRouter()
  const serverName = useServerName()
  const [pending, setPending] = useState(false)
  const [copied, setCopied] = useState(false)
  const server = serverName(item.serverId)

  async function toggleSave() {
    if (saved === null) {
      toast.info('Войдите в аккаунт игрока, чтобы сохранять отыгровки')
      return
    }
    setPending(true)
    try {
      const res = await toggleSavedRoleplay({ data: { id: item.id } })
      toast.success(
        res.saved ? 'Сохранено в личном кабинете' : 'Убрано из сохранённых',
      )
      await router.invalidate()
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setPending(false)
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(item.content.replace(/\*\*/g, ''))
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
      toast.success('Текст скопирован')
    } catch {
      toast.error('Не удалось скопировать')
    }
  }

  return (
    <article className="flex flex-col rounded-xl border bg-card p-4">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold tracking-wider text-primary uppercase">
            {RP_KIND_LABEL[item.kind]}
            {item.category && (
              <span className="text-muted-foreground normal-case">
                {' '}
                · {item.category}
              </span>
            )}
          </p>
          <h3 className="mt-1 text-lg leading-snug font-semibold">
            {item.title}
          </h3>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {item.organizationName && (
              <span className="inline-flex items-center gap-1">
                <Shield className="size-3.5" aria-hidden />{' '}
                {item.organizationName}
              </span>
            )}
            {server && (
              <span className="inline-flex items-center gap-1 text-chart-2">
                <Server className="size-3.5" aria-hidden /> {server}
              </span>
            )}
          </div>
        </div>
        {canEdit && onEdit && (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Изменить: ${item.title}`}
            onClick={() => onEdit(item)}
          >
            <Pencil />
          </Button>
        )}
        {canEdit && (
          <ConfirmDelete
            title={item.title}
            onConfirm={async () => {
              try {
                await deleteRoleplay({ data: { id: item.id } })
                toast.success('Удалено')
                await router.invalidate()
              } catch (err) {
                toast.error(errorMessage(err))
              }
            }}
          />
        )}
      </div>
      <div className="mt-3 max-h-64 flex-1 overflow-y-auto rounded-lg bg-muted/40 p-3 text-sm">
        <RichText text={item.content} />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          size="sm"
          variant={saved ? 'default' : 'outline'}
          aria-pressed={!!saved}
          disabled={pending}
          onClick={toggleSave}
        >
          <Bookmark className={cn(saved && 'fill-current')} />
          {saved ? 'Сохранено' : 'Сохранить'}
        </Button>
        <Button size="sm" variant="outline" onClick={copy}>
          {copied ? <Check /> : <Copy />} Копировать
        </Button>
      </div>
    </article>
  )
}
