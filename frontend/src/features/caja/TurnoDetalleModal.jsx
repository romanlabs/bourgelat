import { useQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import {
  DialogRoot,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { formatCurrency, formatLongDate } from '@/features/dashboard/dashboardUtils'
import { cajaApi } from './cajaApi'
import { CATEGORIA_DIFERENCIA_LABELS, motivoMovimientoLabel } from './cajaConstants'

export default function TurnoDetalleModal({ turnoId, onClose }) {
  const detalleQuery = useQuery({
    queryKey: ['caja-turno-detalle', turnoId],
    queryFn: () => cajaApi.obtenerDetalleTurno(turnoId),
    enabled: Boolean(turnoId),
  })

  const detalle = detalleQuery.data

  return (
    <DialogRoot open={Boolean(turnoId)} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Detalle del turno</DialogTitle>
          <DialogDescription>
            {detalle?.turno ? `Cerrado el ${formatLongDate(detalle.turno.fechaCierre)}` : 'Cargando...'}
          </DialogDescription>
        </DialogHeader>

        {detalleQuery.isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : detalle ? (
          <div className="mt-4 max-h-[70vh] space-y-5 overflow-y-auto">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-xl bg-muted px-4 py-3">
                <p className="text-[13px] font-semibold text-muted-foreground">Cajero</p>
                <p className="font-semibold text-foreground">{detalle.turno.usuario?.nombre || 'Sin nombre'}</p>
              </div>
              <div className="rounded-xl bg-muted px-4 py-3">
                <p className="text-[13px] font-semibold text-muted-foreground">Diferencia</p>
                <p className="text-xl font-semibold tracking-[-0.02em] tabular-nums text-foreground">{formatCurrency(detalle.turno.diferencia)}</p>
              </div>
            </div>

            {detalle.turno.categoriaDiferencia ? (
              <div className="rounded-xl bg-warning-soft px-4 py-3 text-sm text-warning">
                <p className="font-semibold">{CATEGORIA_DIFERENCIA_LABELS[detalle.turno.categoriaDiferencia] || detalle.turno.categoriaDiferencia}</p>
                {detalle.turno.observacionesCierre ? (
                  <p className="mt-1 text-[13px]">{detalle.turno.observacionesCierre}</p>
                ) : null}
              </div>
            ) : null}

            <div>
              <p className="mb-1 text-[15px] font-semibold text-foreground">
                Movimientos manuales
              </p>
              {detalle.movimientos.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin movimientos manuales en este turno.</p>
              ) : (
                <div className="divide-y divide-border text-sm">
                  {detalle.movimientos.map((movimiento) => (
                    <div key={movimiento.id} className="flex items-center justify-between py-2">
                      <span className="text-foreground">{motivoMovimientoLabel(movimiento.motivo)}</span>
                      <span className={`font-semibold tabular-nums ${movimiento.tipo === 'ingreso' ? 'text-success' : 'text-danger'}`}>
                        {movimiento.tipo === 'ingreso' ? '+' : '-'}
                        {formatCurrency(movimiento.monto)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <p className="mb-1 text-[15px] font-semibold text-foreground">
                Productos vendidos en el turno
              </p>
              {detalle.trazabilidadInventario.length === 0 ? (
                <p className="text-sm text-muted-foreground">No se vendieron productos de inventario en este turno.</p>
              ) : (
                <div className="divide-y divide-border text-sm">
                  {detalle.trazabilidadInventario.map((item) => (
                    <div key={item.productoId || item.nombre} className="flex items-center justify-between py-2">
                      <span className="text-foreground">{item.nombre}</span>
                      <span className="font-semibold tabular-nums text-foreground">{item.cantidadVendida}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </DialogContent>
    </DialogRoot>
  )
}
