import { useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { useRouter } from '@tanstack/react-router'
import { ImagePlus, Loader2, Trash2 } from 'lucide-react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import {
  CAR_CLASSES,
  carImageUrl,
  DRIVE_LABELS,
  EXCLUSIVE_SOURCES,
  FUEL_TYPE_IDS,
  FUEL_TYPES,
  type CarClassId,
} from '@/lib/cars'
import { saveCar } from '@/lib/cars.functions'
import { errorMessage } from '@/lib/errors'
import type { Car } from '@/lib/types'
import { ServerSelect } from '@/components/app/server-select'
import { checkCarImage, uploadCarImage } from './car-photo'

export type CarEditorState = { car: Car | null }

export function CarEditor({
  state,
  onClose,
}: {
  state: CarEditorState | null
  onClose: () => void
}) {
  return (
    <Dialog open={state !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92svh] overflow-y-auto sm:max-w-2xl">
        {state && <CarForm car={state.car} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  )
}

const num = (v: string) => (v.trim() === '' ? 0 : Number(v.replace(',', '.')))

function CarForm({ car, onClose }: { car: Car | null; onClose: () => void }) {
  const router = useRouter()
  const [f, setF] = useState({
    modelId: car ? String(car.modelId) : '',
    name: car?.name ?? '',
    carClass: (car?.carClass ?? 'economy') as CarClassId,
    inSalon: car ? car.price !== null : true,
    price: car?.price != null ? String(car.price) : '',
    dealership: car?.dealership ?? '',
    maxSpeed: car ? String(car.maxSpeed) : '',
    seats: car ? String(car.seats) : '4',
    trunk: car ? String(car.trunk) : '',
    fuelTank: car ? String(car.fuelTank) : '',
    drive: car?.drive ?? '',
    fuelType: car?.fuelType ?? '',
    description: car?.description ?? '',
  })
  const [serverId, setServerId] = useState<number | null>(car?.serverId ?? null)
  const [image, setImage] = useState(car?.image ?? '')
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function pickImage(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const problem = checkCarImage(file)
    if (problem) return void toast.error(problem)
    setUploading(true)
    try {
      setImage(await uploadCarImage(file))
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setUploading(false)
    }
  }
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const set = (k: keyof typeof f) => (v: string | boolean) =>
    setF((s) => ({ ...s, [k]: v }))

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!f.name.trim()) return setError('Введите название')
    if (!/^\d+$/.test(f.modelId.trim())) return setError('ID — целое число')
    if (f.inSalon && !/^\d+$/.test(f.price.replace(/\s/g, '')))
      return setError('Укажите цену в рублях')
    const numbers = [f.maxSpeed, f.seats, f.trunk, f.fuelTank]
    if (numbers.some((v) => Number.isNaN(num(v))))
      return setError('Характеристики должны быть числами')
    setError(null)
    setPending(true)
    try {
      await saveCar({
        data: {
          id: car?.id ?? null,
          modelId: Number(f.modelId),
          name: f.name,
          carClass: f.carClass,
          price: f.inSalon ? Number(f.price.replace(/\s/g, '')) : null,
          dealership: f.dealership.trim(),
          maxSpeed: Math.round(num(f.maxSpeed)),
          acceleration: car?.acceleration ?? 0,
          seats: Math.max(1, Math.round(num(f.seats))),
          trunk: Math.round(num(f.trunk)),
          fuelTank: Math.round(num(f.fuelTank)),
          drive: f.drive as '' | 'FWD' | 'RWD' | 'AWD',
          fuelType: f.fuelType as (typeof FUEL_TYPE_IDS)[number],
          description: f.description,
          image,
          serverId,
        },
      })
      toast.success(car ? 'Машина сохранена' : 'Машина добавлена')
      onClose()
      await router.invalidate()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setPending(false)
    }
  }

  const field = (
    id: keyof typeof f,
    label: string,
    props: React.ComponentProps<typeof Input> = {},
  ) => (
    <div className="space-y-2">
      <Label htmlFor={`car-${id}`}>{label}</Label>
      <Input
        id={`car-${id}`}
        value={f[id] as string}
        onChange={(e) => set(id)(e.target.value)}
        {...props}
      />
    </div>
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <DialogHeader>
        <DialogTitle>
          {car ? 'Редактировать машину' : 'Новая машина'}
        </DialogTitle>
        <DialogDescription>
          Название, ID в игре, цена, фото и характеристики.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-2">
        <Label htmlFor="car-photo">Фото</Label>
        <div className="flex flex-wrap items-center gap-3">
          {image ? (
            <img
              src={carImageUrl(image)}
              alt="Фото машины"
              className="aspect-video w-48 rounded-md border object-cover"
            />
          ) : (
            <div className="flex aspect-video w-48 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
              Нет фото
            </div>
          )}
          <div className="flex flex-col gap-2">
            <Button
              id="car-photo"
              type="button"
              variant="outline"
              size="sm"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
            >
              {uploading ? (
                <Loader2 className="animate-spin motion-reduce:animate-none" />
              ) : (
                <ImagePlus />
              )}
              {image ? 'Заменить фото' : 'Загрузить фото'}
            </Button>
            {image && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setImage('')}
              >
                <Trash2 /> Убрать фото
              </Button>
            )}
            <p className="text-xs text-muted-foreground">
              JPG, PNG, WebP или GIF до 5 МБ
            </p>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={pickImage}
            tabIndex={-1}
            aria-hidden
          />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
        {field('name', 'Название', {
          maxLength: 100,
          placeholder: 'Например: BMW M5 (F90)',
        })}
        {field('modelId', 'ID', { inputMode: 'numeric', placeholder: '411' })}
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="car-class">Класс</Label>
          <Select value={f.carClass} onValueChange={set('carClass')}>
            <SelectTrigger id="car-class" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CAR_CLASSES.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="car-drive">Привод</Label>
          <Select
            value={f.drive || 'none'}
            onValueChange={(v) => set('drive')(v === 'none' ? '' : v)}
          >
            <SelectTrigger id="car-drive" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Не указан</SelectItem>
              {Object.entries(DRIVE_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="car-fuel">Топливо</Label>
          <Select
            value={f.fuelType || 'none'}
            onValueChange={(v) => set('fuelType')(v === 'none' ? '' : v)}
          >
            <SelectTrigger id="car-fuel" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Не указано</SelectItem>
              {FUEL_TYPES.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex items-center gap-3 rounded-lg border p-3">
        <Switch
          id="car-salon"
          checked={f.inSalon}
          onCheckedChange={set('inSalon')}
        />
        <Label htmlFor="car-salon">
          Фиксированная цена{' '}
          <span className="font-normal text-muted-foreground">
            (выключено — «Индивидуально»)
          </span>
        </Label>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {f.inSalon &&
          field('price', 'Цена, ₽', {
            inputMode: 'numeric',
            placeholder: '1500000',
          })}
        {f.carClass === 'exclusive' ? (
          <div className="space-y-2">
            <Label htmlFor="car-source">Где получить</Label>
            <Select
              value={f.dealership || 'none'}
              onValueChange={(v) => set('dealership')(v === 'none' ? '' : v)}
            >
              <SelectTrigger id="car-source" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EXCLUSIVE_SOURCES.map((s) => (
                  <SelectItem key={s.id || 'none'} value={s.id || 'none'}>
                    {s.label}
                  </SelectItem>
                ))}
                {f.dealership &&
                  !EXCLUSIVE_SOURCES.some((s) => s.id === f.dealership) && (
                    <SelectItem value={f.dealership}>{f.dealership}</SelectItem>
                  )}
              </SelectContent>
            </Select>
          </div>
        ) : (
          field('dealership', 'Автосалон', {
            maxLength: 60,
            placeholder: 'Эконом, Средний, Премиум…',
          })
        )}
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {field('maxSpeed', 'Макс. скорость, км/ч', { inputMode: 'numeric' })}
        {field('seats', 'Мест', { inputMode: 'numeric' })}
        {field('trunk', 'Багажник, слотов', { inputMode: 'numeric' })}
        {field('fuelTank', 'Бак, л', { inputMode: 'numeric' })}
      </div>
      <div className="space-y-2">
        <Label htmlFor="car-server">Сервер</Label>
        <ServerSelect id="car-server" value={serverId} onChange={setServerId} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="car-desc">Заметка (необязательно)</Label>
        <Textarea
          id="car-desc"
          rows={3}
          maxLength={1000}
          value={f.description}
          onChange={(e) => set('description')(e.target.value)}
          placeholder="Где купить, особенности, для какой фракции подходит"
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
        <Button type="submit" disabled={pending || uploading}>
          {pending && (
            <Loader2 className="animate-spin motion-reduce:animate-none" />
          )}
          Сохранить
        </Button>
      </DialogFooter>
    </form>
  )
}
