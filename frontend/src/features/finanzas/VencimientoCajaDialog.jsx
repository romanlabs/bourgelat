import {
  DialogRoot,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import ActualizarVencimientoDialog from '@/features/inventario/ActualizarVencimientoDialog'
import { formatLongDate } from '@/features/dashboard/dashboardUtils'

const AVISO_CAJA =
  'No se puede vender mientras figure vencido. Retira las unidades vencidas y registra la fecha de las que quedan para seguir con la venta.'

/**
 * Un producto vencido que se intentó vender desde Caja. `pendiente` =
 * { producto: { id, nombre, stock, fechaVencimiento }, itemId? }.
 * Quien puede relevar el vencimiento (mismos roles que POST /inventario/:id/vencimiento)
 * lo corrige aquí mismo; el resto solo ve el aviso para pedírselo a un administrador.
 */
export default function VencimientoCajaDialog({ pendiente, puedeRelevar, onGuardado, onClose }) {
  if (puedeRelevar) {
    return (
      <ActualizarVencimientoDialog
        item={pendiente?.producto ?? null}
        aviso={AVISO_CAJA}
        onGuardado={(data) => onGuardado(pendiente, data)}
        onClose={onClose}
      />
    )
  }

  const producto = pendiente?.producto

  return (
    <DialogRoot open={Boolean(producto)} onOpenChange={(abierto) => { if (!abierto) onClose() }}>
      {producto && (
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Producto vencido</DialogTitle>
            <DialogDescription>
              {producto.nombre} figura vencido desde el {formatLongDate(producto.fechaVencimiento)}.
            </DialogDescription>
          </DialogHeader>

          <p className="mt-4 rounded-xl bg-danger-soft px-3 py-2 text-[13px] text-danger">
            No se puede vender mientras tenga esa fecha. Si quedan unidades vigentes, pídele a un
            administrador que actualice el vencimiento en Inventario.
          </p>

          <DialogFooter>
            <button
              type="button"
              onClick={onClose}
              className="h-11 bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
            >
              Entendido
            </button>
          </DialogFooter>
        </DialogContent>
      )}
    </DialogRoot>
  )
}
