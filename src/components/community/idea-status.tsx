import type { IdeaStatus } from '@/lib/types'
import { cn } from '@/lib/utils'

const STYLES: Record<IdeaStatus, { label: string; className: string }> = {
  pending: { label: 'На проверке', className: 'bg-chart-5/15 text-chart-5' },
  approved: { label: 'Опубликована', className: 'bg-chart-3/15 text-chart-3' },
  rejected: {
    label: 'Отклонена',
    className: 'bg-destructive/15 text-destructive',
  },
}

export function IdeaStatusBadge({ status }: { status: IdeaStatus }) {
  const s = STYLES[status]
  return (
    <span
      className={cn(
        'inline-block rounded-full px-2 py-0.5 text-xs font-semibold',
        s.className,
      )}
    >
      {s.label}
    </span>
  )
}
