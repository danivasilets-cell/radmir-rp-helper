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
import { Textarea } from '@/components/ui/textarea'
import { saveEventPrize } from '@/lib/events.functions'
import { ServerSelect } from '@/components/app/server-select'
import { errorMessage } from '@/lib/errors'
import type { EventPrize } from '@/lib/types'

export type PrizeEditorState = { prize: EventPrize | null }

export function PrizeEditor({
  state,
  onClose,
}: {
  state: PrizeEditorState | null
  onClose: () => void
}) {
  return (
    <Dialog open={state !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92svh] overflow-y-auto sm:max-w-xl">
        {state && <PrizeForm prize={state.prize} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  )
}

function PrizeForm({
  prize,
  onClose,
}: {
  prize: EventPrize | null
  onClose: () => void
}) {
  const router = useRouter()
  const [title, setTitle] = useState(prize?.title ?? '')
  const [reward, setReward] = useState(prize?.reward ?? '')
  const [description, setDescription] = useState(prize?.description ?? '')
  const [eventDate, setEventDate] = useState(prize?.eventDate ?? '')
  const [winner, setWinner] = useState(prize?.winner ?? '')
  const [serverId, setServerId] = useState<number | null>(
    prize?.serverId ?? null,
  )
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!title.trim()) return setError('Введите название ивента')
    if (!reward.trim()) return setError('Укажите приз')
    setError(null)
    setPending(true)
    try {
      await saveEventPrize({
        data: {
          id: prize?.id ?? null,
          title,
          reward,
          description,
          eventDate: eventDate || null,
          winner,
          serverId,
        },
      })
      toast.success(prize ? 'Приз сохранён' : 'Приз добавлен')
      onClose()
      await router.invalidate()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <DialogHeader>
        <DialogTitle>{prize ? 'Редактировать приз' : 'Новый приз'}</DialogTitle>
        <DialogDescription>
          Что разыгрывается, когда проходит ивент и кто победил.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-2">
        <Label htmlFor="p-title">Ивент</Label>
        <Input
          id="p-title"
          value={title}
          maxLength={150}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Например: Дрифт-битва на набережной"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="p-reward">Приз</Label>
        <Input
          id="p-reward"
          value={reward}
          maxLength={200}
          onChange={(e) => setReward(e.target.value)}
          placeholder="Например: 5 000 000 ₽ и уникальный номер"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="p-date">Дата ивента</Label>
          <Input
            id="p-date"
            type="date"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="p-winner">Победитель (если уже известен)</Label>
          <Input
            id="p-winner"
            value={winner}
            maxLength={100}
            onChange={(e) => setWinner(e.target.value)}
            placeholder="Ник_Фамилия"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="p-server">Сервер</Label>
        <ServerSelect id="p-server" value={serverId} onChange={setServerId} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="p-desc">Условия (необязательно)</Label>
        <Textarea
          id="p-desc"
          rows={4}
          value={description}
          maxLength={2000}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Как участвовать, где сбор, правила"
        />
      </div>
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
  )
}
