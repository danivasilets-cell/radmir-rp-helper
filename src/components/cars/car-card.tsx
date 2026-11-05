import { useRef, useState, type ChangeEvent } from 'react'
import { useRouter } from '@tanstack/react-router'
import {
  Check,
  Copy,
  Fuel,
  Gauge,
  Heart,
  ImagePlus,
  Loader2,
  Package,
  Pencil,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ConfirmDelete } from '@/components/events/confirm-delete'
import {
  carClassLabel,
  carImageUrl,
  DRIVE_LABELS,
  formatPrice,
  sourceLabel,
  tankLabel,
} from '@/lib/cars'
import { deleteCar, saveCar } from '@/lib/cars.functions'
import { carInput, checkCarImage, uploadCarImage } from './car-photo'
import { toggleFavoriteCar } from '@/lib/account.functions'
import { errorMessage } from '@/lib/errors'
import type { Car } from '@/lib/types'
import { cn } from '@/lib/utils'

export type CarMaxima = { speed: number }

/** Heart toggle; `favorite = null` means a guest (asks to sign in). */
export function FavoriteCarButton({
  car,
  favorite,
}: {
  car: Car
  favorite: boolean | null
}) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  async function toggle() {
    if (favorite === null) {
      toast.info('Войдите в аккаунт игрока, чтобы сохранять машины')
      return
    }
    setPending(true)
    try {
      const res = await toggleFavoriteCar({ data: { carId: car.id } })
      toast.success(res.saved ? 'Машина в избранном' : 'Убрано из избранного')
      await router.invalidate()
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setPending(false)
    }
  }
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      className="ml-auto shrink-0"
      aria-pressed={!!favorite}
      aria-label={
        favorite
          ? `Убрать ${car.name} из избранного`
          : `Добавить ${car.name} в избранное`
      }
      disabled={pending}
      onClick={toggle}
    >
      <Heart className={cn(favorite && 'fill-current text-primary')} />
    </Button>
  )
}

export async function copyCarId(car: Car) {
  try {
    await navigator.clipboard.writeText(String(car.modelId))
    toast.success(`ID ${car.modelId} скопирован`)
  } catch {
    toast.error('Не удалось скопировать')
  }
}

function Bar({
  icon,
  label,
  value,
  ratio,
}: {
  icon: React.ReactNode
  label: string
  value: string
  ratio: number
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          {icon} {label}
        </span>
        <span className="font-semibold tabular-nums">{value}</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary"
          style={{ width: `${Math.max(4, Math.min(100, ratio * 100))}%` }}
        />
      </div>
    </div>
  )
}

/** Team-only button: uploads a photo and saves it to the car right away. */
function QuickPhotoButton({ car }: { car: Car }) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState(false)
  async function pick(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const problem = checkCarImage(file)
    if (problem) return void toast.error(problem)
    setPending(true)
    try {
      const image = await uploadCarImage(file)
      await saveCar({ data: { ...carInput(car), image } })
      toast.success('Фото сохранено')
      await router.invalidate()
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setPending(false)
    }
  }
  return (
    <>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={`${car.image ? 'Заменить' : 'Загрузить'} фото: ${car.name}`}
        title={car.image ? 'Заменить фото' : 'Загрузить фото'}
        disabled={pending}
        onClick={() => inputRef.current?.click()}
      >
        {pending ? (
          <Loader2 className="animate-spin motion-reduce:animate-none" />
        ) : (
          <ImagePlus />
        )}
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={pick}
        tabIndex={-1}
        aria-hidden
      />
    </>
  )
}

export function CarCard({
  car,
  max,
  canEdit,
  compared,
  compareFull,
  onToggleCompare,
  onEdit,
  favorite = null,
}: {
  favorite?: boolean | null
  car: Car
  max: CarMaxima
  canEdit: boolean
  compared: boolean
  compareFull: boolean
  onToggleCompare: (car: Car) => void
  onEdit: (car: Car) => void
}) {
  const router = useRouter()
  return (
    <article
      className={cn(
        'flex flex-col rounded-xl border bg-card p-4 transition-colors motion-reduce:transition-none',
        compared
          ? 'border-primary ring-1 ring-primary/40'
          : 'hover:border-primary/50',
      )}
    >
      {car.image && (
        <a
          href={carImageUrl(car.image)}
          target="_blank"
          rel="noreferrer"
          className="-mx-4 -mt-4 mb-4 block overflow-hidden rounded-t-xl bg-muted"
          aria-label={`Фото: ${car.name}`}
        >
          <img
            src={carImageUrl(car.image)}
            alt={car.name}
            loading="lazy"
            className="aspect-video w-full object-cover transition-opacity hover:opacity-90 motion-reduce:transition-none"
          />
        </a>
      )}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold tracking-wider text-primary uppercase">
            {carClassLabel(car.carClass)}
            {sourceLabel(car) && (
              <span className="text-muted-foreground normal-case">
                {' '}
                · {sourceLabel(car)}
              </span>
            )}
          </p>
          <h3 className="mt-1 text-lg leading-snug font-semibold">
            {car.name}
          </h3>
        </div>
        <FavoriteCarButton car={car} favorite={favorite} />
        <button
          type="button"
          onClick={() => copyCarId(car)}
          className="inline-flex shrink-0 items-center gap-1 rounded-md border bg-muted/50 px-2 py-1 font-mono text-xs transition-colors hover:border-primary/60 motion-reduce:transition-none"
          aria-label={`Скопировать ID ${car.modelId}`}
          title="Скопировать ID"
        >
          ID {car.modelId} <Copy className="size-3" aria-hidden />
        </button>
      </div>

      <p
        className={cn(
          'mt-3 text-2xl font-bold tabular-nums',
          car.price === null && 'text-base font-semibold text-muted-foreground',
        )}
      >
        {formatPrice(car.price)}
      </p>

      <div className="mt-4 space-y-2.5">
        <Bar
          icon={<Gauge className="size-3.5" />}
          label="Скорость"
          value={`${car.maxSpeed} км/ч`}
          ratio={car.maxSpeed / max.speed}
        />
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
        <div className="rounded-md bg-muted/50 px-1 py-1.5">
          <dt className="sr-only">Мест</dt>
          <dd className="flex items-center justify-center gap-1">
            <Users className="size-3.5 text-muted-foreground" /> {car.seats}
          </dd>
        </div>
        <div className="rounded-md bg-muted/50 px-1 py-1.5">
          <dt className="sr-only">Багажник</dt>
          <dd className="flex items-center justify-center gap-1">
            <Package className="size-3.5 text-muted-foreground" /> {car.trunk}
          </dd>
        </div>
        <div className="rounded-md bg-muted/50 px-1 py-1.5">
          <dt className="sr-only">Бак</dt>
          <dd className="flex items-center justify-center gap-1">
            <Fuel className="size-3.5 text-muted-foreground" /> {tankLabel(car)}
          </dd>
        </div>
      </dl>
      {(car.drive || car.description) && (
        <p className="mt-3 text-sm text-muted-foreground">
          {car.drive && (
            <span className="font-medium text-foreground">
              {DRIVE_LABELS[car.drive] ?? car.drive} привод.{' '}
            </span>
          )}
          {car.description}
        </p>
      )}

      <div className="mt-auto flex items-center justify-between gap-2 pt-4">
        <Button
          size="sm"
          variant={compared ? 'default' : 'outline'}
          disabled={!compared && compareFull}
          onClick={() => onToggleCompare(car)}
          aria-pressed={compared}
          title={
            !compared && compareFull ? 'Сравнивать можно до 3 машин' : undefined
          }
        >
          {compared && <Check />} {compared ? 'В сравнении' : 'Сравнить'}
        </Button>
        {canEdit && (
          <div className="flex gap-1">
            <QuickPhotoButton car={car} />
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Редактировать: ${car.name}`}
              onClick={() => onEdit(car)}
            >
              <Pencil />
            </Button>
            <ConfirmDelete
              title={car.name}
              onConfirm={async () => {
                try {
                  await deleteCar({ data: { id: car.id } })
                  toast.success('Машина удалена')
                  await router.invalidate()
                } catch (err) {
                  toast.error(errorMessage(err))
                }
              }}
            />
          </div>
        )}
      </div>
    </article>
  )
}
