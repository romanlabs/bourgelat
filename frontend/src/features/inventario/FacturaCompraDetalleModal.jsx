import {
  DialogRoot,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { formatCurrency, formatNumber } from '@/features/dashboard/dashboardUtils'
import { ESTADO_COLORS } from './useFacturaCompra'
import { DESTINO_BADGE } from './inventarioUtils'

function estadoBadge(estado) {
  return (
    <span className={`inline-block rounded-md px-2.5 py-1 text-[13px] font-semibold ${ESTADO_COLORS[estado] || ''}`}>
      {estado.charAt(0).toUpperCase() + estado.slice(1)}
    </span>
  )
}

// Un ítem apunta a un producto de venta o a un insumo clínico según su destino.
function referenciaItem(item) {
  const destino = item.destinoInventario === 'clinico' ? 'clinico' : 'ventas'
  const registro = destino === 'clinico' ? item.insumoClinico : item.producto
  return {
    destino,
    nombre: registro?.nombre,
    unidad: destino === 'clinico' ? registro?.unidadBase : registro?.unidadMedida,
  }
}

function estadoPagoTexto(factura) {
  if (factura.pagada) return `Pagada · ${factura.fechaPago}`
  if (!factura.fechaPagoFinal) return 'Contado'
  const hoy = new Date()
  const plazo = new Date(factura.fechaPagoFinal)
  if (plazo < hoy) return `Crédito · vencida el ${factura.fechaPagoFinal}`
  return `Crédito · vence el ${factura.fechaPagoFinal}`
}

export default function FacturaCompraDetalleModal({ factura, onClose }) {
  return (
    <DialogRoot open={Boolean(factura)} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-none w-[min(96vw,720px)]">
        <DialogHeader>
          <DialogTitle>Detalle de factura de compra</DialogTitle>
          <DialogDescription>
            Información completa de la factura seleccionada, incluyendo los productos comprados.
          </DialogDescription>
        </DialogHeader>

        {factura && (
          <div className="mt-4 max-h-[75vh] space-y-5 overflow-y-auto pr-1">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-lg font-semibold text-foreground">
                  {factura.numero || 'Sin número'}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{factura.proveedor}</p>
              </div>
              {estadoBadge(factura.estado)}
            </div>

            <div className="flex items-end justify-between rounded-xl bg-muted px-4 py-3">
              <p className="text-[13px] font-semibold text-muted-foreground">
                Total de la compra
              </p>
              <p className="text-[28px] font-semibold leading-none tracking-[-0.03em] tabular-nums text-foreground">
                {formatCurrency(Number(factura.total || 0))}
              </p>
            </div>

            <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <div className="rounded-xl bg-muted px-4 py-3">
                <dt className="text-[13px] font-semibold text-muted-foreground">
                  Fecha de compra
                </dt>
                <dd className="mt-1 text-sm font-semibold text-foreground">{factura.fecha}</dd>
              </div>
              <div className="rounded-xl bg-muted px-4 py-3">
                <dt className="text-[13px] font-semibold text-muted-foreground">
                  Forma de pago
                </dt>
                <dd className="mt-1 text-sm font-semibold text-foreground">
                  {estadoPagoTexto(factura)}
                </dd>
              </div>
              <div className="rounded-xl bg-muted px-4 py-3">
                <dt className="text-[13px] font-semibold text-muted-foreground">
                  N° factura proveedor
                </dt>
                <dd className="mt-1 text-sm font-semibold text-foreground">
                  {factura.numero || '—'}
                </dd>
              </div>
            </dl>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr>
                    <th className="px-3 py-3 text-left text-[13px] font-medium text-muted-foreground">
                      Producto
                    </th>
                    <th className="px-3 py-3 text-right text-[13px] font-medium text-muted-foreground">
                      Cantidad
                    </th>
                    <th className="px-3 py-3 text-right text-[13px] font-medium text-muted-foreground">
                      Precio unitario
                    </th>
                    <th className="px-3 py-3 text-right text-[13px] font-medium text-muted-foreground">
                      Subtotal
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(factura.items || []).map((item) => {
                    const { destino, nombre, unidad } = referenciaItem(item)
                    const badge = DESTINO_BADGE[destino]
                    return (
                    <tr key={item.id} className="border-t border-border/60">
                      <td className="px-3 py-3 text-foreground">
                        <div className="flex flex-wrap items-center gap-2">
                          <span>
                            {nombre || (destino === 'clinico' ? 'Insumo eliminado' : 'Producto eliminado')}
                            {unidad && (
                              <span className="ml-1 text-[13px] text-muted-foreground">({unidad})</span>
                            )}
                          </span>
                          <span
                            className={`inline-block rounded-lg px-1.5 py-0.5 text-[13px] font-semibold ${badge.className}`}
                          >
                            {badge.label}
                          </span>
                        </div>
                        {item.fechaVencimiento && (
                          <p className="mt-1 text-[13px] text-muted-foreground">
                            Vence {item.fechaVencimiento}
                            {item.lote && ` · Lote ${item.lote}`}
                          </p>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums text-foreground">
                        {formatNumber(item.cantidad)}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums text-foreground">
                        {formatCurrency(Number(item.precioUnitario || 0))}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums text-foreground">
                        {formatCurrency(Number(item.subtotal || 0))}
                      </td>
                    </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t border-border/60">
                    <td
                      className="px-3 py-3 text-[13px] font-semibold text-muted-foreground"
                      colSpan={3}
                    >
                      Total
                    </td>
                    <td className="px-3 py-3 text-right font-bold tabular-nums text-foreground">
                      {formatCurrency(Number(factura.total || 0))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {factura.observaciones && (
              <div className="rounded-xl bg-muted px-4 py-4 text-sm leading-7 text-muted-foreground">
                {factura.observaciones}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </DialogRoot>
  )
}
