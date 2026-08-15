import {
  DialogRoot,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { formatCurrency, formatNumber } from '@/features/dashboard/dashboardUtils'
import { ESTADO_COLORS } from './useFacturaCompra'

function estadoBadge(estado) {
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-xs font-semibold ${ESTADO_COLORS[estado] || ''}`}>
      {estado.charAt(0).toUpperCase() + estado.slice(1)}
    </span>
  )
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

            <div className="flex items-end justify-between border border-border bg-muted px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Total de la compra
              </p>
              <p className="text-2xl font-bold tabular-nums text-foreground">
                {formatCurrency(Number(factura.total || 0))}
              </p>
            </div>

            <dl className="grid grid-cols-2 gap-px border border-border bg-border sm:grid-cols-3">
              <div className="bg-card px-4 py-3">
                <dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Fecha de compra
                </dt>
                <dd className="mt-1 text-sm font-semibold text-foreground">{factura.fecha}</dd>
              </div>
              <div className="bg-card px-4 py-3">
                <dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Forma de pago
                </dt>
                <dd className="mt-1 text-sm font-semibold text-foreground">
                  {estadoPagoTexto(factura)}
                </dd>
              </div>
              <div className="bg-card px-4 py-3">
                <dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  N° factura proveedor
                </dt>
                <dd className="mt-1 text-sm font-semibold text-foreground">
                  {factura.numero || '—'}
                </dd>
              </div>
            </dl>

            <div className="overflow-x-auto border border-border">
              <table className="min-w-full divide-y divide-border text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Producto
                    </th>
                    <th className="px-3 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Cantidad
                    </th>
                    <th className="px-3 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Precio unitario
                    </th>
                    <th className="px-3 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Subtotal
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(factura.items || []).map((item) => (
                    <tr key={item.id}>
                      <td className="px-3 py-3 text-foreground">
                        {item.producto?.nombre || 'Producto eliminado'}
                        {item.producto?.unidadMedida && (
                          <span className="ml-1 text-xs text-muted-foreground">
                            ({item.producto.unidadMedida})
                          </span>
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
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-border bg-muted">
                    <td
                      className="px-3 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground"
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
              <div className="border border-border bg-muted px-4 py-4 text-sm leading-7 text-muted-foreground">
                {factura.observaciones}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </DialogRoot>
  )
}
