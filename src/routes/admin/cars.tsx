import { useState } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useServerName } from '@/components/app/server-select'
import { CarEditor, type CarEditorState } from '@/components/cars/car-editor'
import { CrudList } from '@/components/admin/crud-list'
import { guard } from '@/components/admin/guard'
import { carClassLabel, formatPrice } from '@/lib/cars'
import { deleteCar, listCars } from '@/lib/cars.functions'

export const Route = createFileRoute('/admin/cars')({
  beforeLoad: guard('catalog.manage'),
  loader: () => listCars(),
  component: CarsAdmin,
})

function CarsAdmin() {
  const cars = Route.useLoaderData()
  const serverName = useServerName()
  const [editor, setEditor] = useState<CarEditorState | null>(null)
  return (
    <>
      <CrudList
        title="Автомобили"
        text="Каталог с учётом выбранного сервера в шапке."
        items={cars}
        name={(c) => c.name}
        searchText={(c) => `${c.name} ${c.modelId} ${c.dealership}`}
        render={(c) => (
          <>
            <p className="font-semibold">
              {c.name}{' '}
              <span className="font-mono text-xs text-muted-foreground">
                ID {c.modelId}
              </span>
            </p>
            <p className="text-xs text-muted-foreground">
              {carClassLabel(c.carClass)} · {formatPrice(c.price)} ·{' '}
              {serverName(c.serverId) ?? 'все серверы'}
            </p>
          </>
        )}
        extraActions={
          <Button asChild variant="outline">
            <Link to="/cars">
              <ExternalLink /> Каталог
            </Link>
          </Button>
        }
        onAdd={() => setEditor({ car: null })}
        onEdit={(car) => setEditor({ car })}
        onDelete={(c) => deleteCar({ data: { id: c.id } })}
      />
      <CarEditor state={editor} onClose={() => setEditor(null)} />
    </>
  )
}
