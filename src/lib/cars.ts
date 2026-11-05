/** Vehicle classes (catalog tabs), in display order. */
export const CAR_CLASSES = [
  { id: 'economy', label: 'Эконом' },
  { id: 'comfort', label: 'Средний' },
  { id: 'premium', label: 'Премиум' },
  { id: 'truck', label: 'Грузовые' },
  { id: 'moto', label: 'Мото-вело' },
  { id: 'water', label: 'Водный' },
  { id: 'air', label: 'Воздушный' },
  { id: 'camper', label: 'Дом на колёсах' },
  { id: 'exclusive', label: 'Эксклюзив' },
] as const

export type CarClassId = (typeof CAR_CLASSES)[number]['id']
export const CAR_CLASS_IDS = CAR_CLASSES.map((c) => c.id) as [
  CarClassId,
  ...CarClassId[],
]

export const carClassLabel = (id: string) =>
  CAR_CLASSES.find((c) => c.id === id)?.label ?? id

/**
 * Where exclusive vehicles come from. Stored in `cars.dealership`;
 * '' = other exclusives. Order = display order inside the «Эксклюзив» tab.
 */
export const EXCLUSIVE_SOURCES: { id: string; label: string; note?: string }[] =
  [
    { id: '', label: 'Особые автомобили' },
    {
      id: 'Контейнеры',
      label: 'Редкие автомобили из контейнеров',
      note: 'Поставка контейнеров происходит ежедневно по расписанию, торговаться может любой желающий. /gps — Транспортные узлы — Грузовой порт.',
    },
    {
      id: 'Крафт',
      label: 'Автомобили из крафта',
      note: 'Собираются в крафте (/craft) из деталей, которые можно найти на свалке или сразу купить в киоске. /gps — Общественные места — Киоски.',
    },
    {
      id: 'Рулетка',
      label: 'Автомобили из рулетки',
      note: 'Выпадают из рулетки в казино или на сайте radmir.online. /gps — Развлечения — Казино.',
    },
    { id: 'Кейсы', label: 'Автомобили из кейсов' },
    { id: 'Донат', label: 'Автомобили за донат' },
    { id: 'Пропуск', label: 'Автомобили с пропуска' },
    { id: 'Лавка обмена', label: 'Автомобили с лавки обмена' },
  ]

export const DRIVE_LABELS: Record<string, string> = {
  FWD: 'Передний',
  RWD: 'Задний',
  AWD: 'Полный',
}

/** Fuel types; '' = not specified. */
export const FUEL_TYPES = [
  { id: '92', label: 'АИ-92' },
  { id: '95', label: 'АИ-95' },
  { id: '98', label: 'АИ-98' },
  { id: 'DT', label: 'ДТ' },
  { id: 'electric', label: 'Электро' },
] as const
export const FUEL_TYPE_IDS = ['', ...FUEL_TYPES.map((f) => f.id)] as [
  '',
  ...(typeof FUEL_TYPES)[number]['id'][],
]
export const fuelLabel = (id: string) =>
  FUEL_TYPES.find((f) => f.id === id)?.label ?? id

/** Tank cell text: electric cars have a battery, not litres. */
export const tankLabel = (c: { fuelTank: number; fuelType: string }) =>
  c.fuelType === 'electric'
    ? 'Электро'
    : c.fuelTank === 0
      ? '—'
      : `${c.fuelTank} л${c.fuelType ? ` · ${fuelLabel(c.fuelType)}` : ''}`

const rub = new Intl.NumberFormat('ru-RU')
export const formatPrice = (price: number | null) =>
  price === null ? 'Индивидуально' : `${rub.format(price)} ₽`

/** Card subtitle: dealership for salon classes, source for exclusives. */
export const sourceLabel = (c: { carClass: string; dealership: string }) =>
  !c.dealership
    ? ''
    : c.carClass === 'exclusive'
      ? c.dealership
      : `салон «${c.dealership}»`

export { carImageUrl } from './car-images'

/** Short form for chips: 1.2 млн, 450 тыс. */
export function shortPrice(n: number) {
  if (n >= 1_000_000)
    return `${(n / 1_000_000).toLocaleString('ru-RU', { maximumFractionDigits: 1 })} млн`
  if (n >= 1_000) return `${Math.round(n / 1_000)} тыс`
  return String(n)
}

export const PRICE_PRESETS = [
  { label: 'До 200 тыс', min: undefined, max: 200_000 },
  { label: '200 тыс – 1 млн', min: 200_000, max: 1_000_000 },
  { label: '1 – 5 млн', min: 1_000_000, max: 5_000_000 },
  { label: '5 – 15 млн', min: 5_000_000, max: 15_000_000 },
  { label: 'От 15 млн', min: 15_000_000, max: undefined },
] as const

export const CAR_SORTS = [
  { id: 'price-asc', label: 'Сначала дешёвые' },
  { id: 'price-desc', label: 'Сначала дорогие' },
  { id: 'speed', label: 'Самые быстрые' },
  { id: 'name', label: 'По названию' },
  { id: 'id', label: 'По ID' },
] as const
export type CarSort = (typeof CAR_SORTS)[number]['id']
export const CAR_SORT_IDS = CAR_SORTS.map((s) => s.id) as [
  CarSort,
  ...CarSort[],
]
