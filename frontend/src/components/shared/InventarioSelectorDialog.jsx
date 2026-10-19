import { FlaskConical, PackagePlus } from 'lucide-react'
import {
  DialogRoot,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

const OPCIONES = [
  {
    value: 'ventas',
    label: 'Ventas',
    icon: PackagePlus,
    descripcion: 'Productos para venta al público. Cantidades, precios y alertas de vencimiento.',
  },
  {
    value: 'clinica',
    label: 'Clínica',
    icon: FlaskConical,
    descripcion: 'Insumos de consumo interno para servicios y procedimientos. No se venden directamente.',
  },
]

/**
 * @param {{
 *   open: boolean,
 *   onOpenChange: (open: boolean) => void,
 *   onSelect: (inventario: 'ventas' | 'clinica') => void,
 *   seleccionActual?: 'ventas' | 'clinica' | null,
 * }} props
 */
export default function InventarioSelectorDialog({ open, onOpenChange, onSelect, seleccionActual = null }) {
  return (
    <DialogRoot open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>¿Qué inventario quieres gestionar?</DialogTitle>
          <DialogDescription>
            Cada inventario maneja sus propios datos. Elige el que corresponda para evitar registros en la categoría equivocada.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {OPCIONES.map((opcion) => {
            const Icon = opcion.icon
            const activa = seleccionActual === opcion.value
            return (
              <button
                key={opcion.value}
                type="button"
                onClick={() => onSelect(opcion.value)}
                className={cn(
                  'flex flex-col gap-2 rounded-xl p-4 text-left transition active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  activa
                    ? 'bg-accent ring-2 ring-primary'
                    : 'bg-muted hover:bg-accent'
                )}
              >
                <span className="flex items-center gap-2">
                  <Icon className="h-5 w-5 text-primary" />
                  <span className="text-sm font-semibold text-foreground">{opcion.label}</span>
                </span>
                <span className="text-[13px] leading-5 text-muted-foreground">{opcion.descripcion}</span>
              </button>
            )
          })}
        </div>
      </DialogContent>
    </DialogRoot>
  )
}
