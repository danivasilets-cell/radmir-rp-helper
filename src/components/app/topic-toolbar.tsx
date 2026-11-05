import { useState } from 'react'
import { isPlayer } from '@/lib/types'
import { ReportButton } from '@/components/community/report-button'
import { useRouter } from '@tanstack/react-router'
import { Check, Copy, Heart, Link2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { useFavorites } from '@/lib/favorites'
import { toggleFavorite } from '@/lib/community.functions'
import { errorMessage } from '@/lib/errors'
import type { NodeFull, SessionInfo } from '@/lib/types'
import { cn } from '@/lib/utils'

async function copy(text: string, ok: string) {
  try {
    await navigator.clipboard.writeText(text)
    toast.success(ok)
  } catch {
    toast.error('Не удалось скопировать')
  }
}

/** Favorite / share / copy text buttons for a node page. */
export function TopicToolbar({
  node,
  session,
  serverFavorite,
}: {
  node: NodeFull
  session: SessionInfo
  /** Favorite state from the player's account (null for guests/team). */
  serverFavorite: boolean
}) {
  const router = useRouter()
  const local = useFavorites()
  const player = isPlayer(session)
  const saved = player ? serverFavorite : local.has(node.id)
  const [copied, setCopied] = useState(false)
  const [pending, setPending] = useState(false)

  async function handleFavorite() {
    if (!player) {
      const added = local.toggle(node)
      toast.success(added ? 'Добавлено в избранное' : 'Убрано из избранного')
      return
    }
    setPending(true)
    try {
      const res = await toggleFavorite({ data: { nodeId: node.id } })
      toast.success(
        res.saved ? 'Добавлено в избранное' : 'Убрано из избранного',
      )
      await router.invalidate()
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setPending(false)
    }
  }
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant={saved ? 'default' : 'outline'}
        size="sm"
        aria-pressed={saved}
        disabled={pending}
        onClick={handleFavorite}
      >
        <Heart className={cn(saved && 'fill-current')} />
        {saved ? 'В избранном' : 'В избранное'}
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => copy(window.location.href, 'Ссылка скопирована')}
      >
        <Link2 /> Ссылка
      </Button>
      {node.content.trim() && (
        <Button
          variant="outline"
          size="sm"
          onClick={async () => {
            await copy(
              node.content
                .replace(/^!\[[^\]]*\]\([^)]*\)\s*$/gm, '')
                .replace(/\n{3,}/g, '\n\n')
                .replace(/\*\*/g, '')
                .trim(),
              'Текст скопирован',
            )
            setCopied(true)
            setTimeout(() => setCopied(false), 1500)
          }}
        >
          {copied ? <Check /> : <Copy />} Копировать текст
        </Button>
      )}
      {node.kind === 'topic' && (
        <ReportButton targetType="node" targetId={node.id} />
      )}
    </div>
  )
}
