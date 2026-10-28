import { Ban, Printer, SendHorizontal, Wallet } from 'lucide-react'
import {
  DialogRoot,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { StatusPill } from '@/features/dashboard/dashboardComponents'
import {
  PAYMENT_METHOD_LABELS,
  formatCurrency,
  formatLongDate,
  formatNumber,
} from '@/features/dashboard/dashboardUtils'
import { Select } from '@/components/ui/select'
import {
  ESTADO_LABELS,
  ESTADO_ELECTRONICO_LABELS,
  PAYMENT_FORM_OPTIONS,
  formatDateTime,
  getEstadoTone,
  getEstadoElectronicoTone,
} from './useFinanzasHistorial'
import FormAbono from './FormAbono'
import { nombreAutor } from '@/lib/equipo'

// Al anular, cada producto vuelve a la bodega salvo que se diga lo contrario.
const DESTINOS_PRODUCTO = [
  { value: 'vuelve', label: 'Vuelve a la bodega' },
  { value: 'entregado', label: 'No vuelve: se entregó al cliente' },
  { value: 'danado', label: 'No vuelve: se dañó' },
  { value: 'vencido', label: 'No vuelve: venció' },
]

function ProductosAlAnular({ items, noVuelven, onCambiar }) {
  const productos = items.filter((item) => item.tipo === 'producto' && item.productoId)
  if (!productos.length) return null
  return (
    <div role="group" aria-labelledby="anular-productos" className="space-y-2 rounded-xl bg-muted p-4">
      <p id="anular-productos" className="text-sm font-semibold text-foreground">¿Qué pasa con los productos?</p>
      <p className="text-[13px] text-muted-foreground">
        Lo que vuelve suma al inventario. Lo que no vuelve queda registrado como salida con su motivo.
      </p>
      {productos.map((item) => (
        <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <span className="text-sm text-foreground">
            {item.descripcion} <span className="text-muted-foreground">× {Number(item.cantidad)}</span>
          </span>
          <Select
            variant="field"
            aria-label={`Qué pasa con ${item.descripcion}`}
            className="h-10 w-64"
            value={noVuelven[item.id] || 'vuelve'}
            onValueChange={(valor) => onCambiar(item.id, valor)}
            options={DESTINOS_PRODUCTO}
          />
        </div>
      ))}
    </div>
  )
}

export default function FacturaDetalleModal({ historialHook }) {
  const {
    currentFacturaId,
    resetSeleccion,
    facturaDetalleQuery,
    facturaSeleccionada,
    handlePrintReceipt,
    canEmitInvoice,
    canAbonar,
    canVoidInvoice,
    emisionForm,
    setEmisionForm,
    motivoAnulacion,
    setMotivoAnulacion,
    noVuelven,
    setNoVuelven,
    handleEmitirFactura,
    handleAnularFactura,
    emitirFacturaMutation,
    anularFacturaMutation,
  } = historialHook

  return (
    <DialogRoot
      open={Boolean(currentFacturaId)}
      onOpenChange={(isOpen) => !isOpen && resetSeleccion()}
    >
      <DialogContent className="max-w-none w-[min(96vw,880px)]">
        <DialogHeader>
          <DialogTitle>Detalle de factura</DialogTitle>
          <DialogDescription>
            Revisa la venta, imprime la tirilla o cobra el saldo si fue a crédito.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 max-h-[75vh] overflow-y-auto pr-1">
          {facturaDetalleQuery.isError ? (
            <div className="rounded-xl bg-danger-soft px-4 py-4 text-sm leading-6 text-danger">
              No fue posible cargar el detalle de la factura seleccionada.
            </div>
          ) : facturaDetalleQuery.isLoading || facturaDetalleQuery.isPlaceholderData ? (
            <div className="space-y-3">
              {[0, 1, 2].map((item) => (
                <div key={item} className="h-16 animate-pulse rounded-xl bg-muted" />
              ))}
            </div>
          ) : facturaSeleccionada ? (
            <div className="space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[22px] font-semibold tracking-[-0.02em] text-foreground">
                    {facturaSeleccionada.numero}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {facturaSeleccionada.propietario?.nombre || 'Sin propietario'}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handlePrintReceipt}
                    className="inline-flex h-10 items-center gap-2 px-3.5 rounded-lg bg-secondary text-sm font-semibold text-secondary-foreground transition hover:brightness-95 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Printer className="h-4 w-4" />
                    Imprimir tirilla
                  </button>
                  <StatusPill tone={getEstadoTone(facturaSeleccionada.estado)}>
                    {ESTADO_LABELS[facturaSeleccionada.estado] || facturaSeleccionada.estado}
                  </StatusPill>
                  <StatusPill tone={getEstadoElectronicoTone(facturaSeleccionada.estadoElectronico)}>
                    {ESTADO_ELECTRONICO_LABELS[facturaSeleccionada.estadoElectronico] ||
                      facturaSeleccionada.estadoElectronico}
                  </StatusPill>
                </div>
              </div>

              <div className="flex items-baseline justify-between gap-3 rounded-xl bg-muted px-5 py-4">
                <p className="text-[15px] font-semibold text-foreground">
                  Total facturado
                </p>
                <p className="text-[34px] font-semibold leading-none tracking-[-0.03em] tabular-nums text-foreground">
                  {formatCurrency(facturaSeleccionada.total)}
                </p>
              </div>

              {canAbonar ? (
                <div className="flex items-baseline justify-between gap-3 rounded-xl bg-warning-soft px-5 py-3">
                  <p className="text-[15px] font-semibold text-warning">Saldo pendiente</p>
                  <p className="text-[22px] font-semibold tabular-nums text-warning">
                    {formatCurrency(facturaSeleccionada.saldoPendiente)}
                  </p>
                </div>
              ) : null}

              <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                <div className="rounded-xl bg-muted px-4 py-3">
                  <dt className="text-[13px] font-semibold text-muted-foreground">
                    Fecha
                  </dt>
                  <dd className="mt-1 text-sm font-semibold text-foreground">
                    {formatLongDate(facturaSeleccionada.fecha)}
                  </dd>
                </div>
                <div className="rounded-xl bg-muted px-4 py-3">
                  <dt className="text-[13px] font-semibold text-muted-foreground">
                    Pago
                  </dt>
                  <dd className="mt-1 text-sm font-semibold text-foreground">
                    {PAYMENT_METHOD_LABELS[facturaSeleccionada.metodoPago] || 'Sin definir'}
                  </dd>
                </div>
                <div className="rounded-xl bg-muted px-4 py-3">
                  <dt className="text-[13px] font-semibold text-muted-foreground">
                    Responsable
                  </dt>
                  <dd className="mt-1 truncate text-sm font-semibold text-foreground">
                    {nombreAutor(facturaSeleccionada.usuario, 'Sin usuario asignado')}
                  </dd>
                </div>
              </dl>

              <div className="overflow-x-auto rounded-xl bg-muted/50">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr>
                      <th className="px-3 py-3 text-left text-[13px] font-medium text-muted-foreground">
                        Concepto
                      </th>
                      <th className="px-3 py-3 text-right text-[13px] font-medium text-muted-foreground">
                        Cantidad
                      </th>
                      <th className="px-3 py-3 text-right text-[13px] font-medium text-muted-foreground">
                        Subtotal
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {(facturaSeleccionada.items || []).map((item) => (
                      <tr key={item.id}>
                        <td className="px-3 py-3 text-foreground">{item.descripcion}</td>
                        <td className="px-3 py-3 text-right tabular-nums text-foreground">
                          {formatNumber(item.cantidad)}
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums text-foreground">
                          {formatCurrency(item.subtotal)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-border">
                      <td className="px-3 py-3 text-[15px] font-semibold text-foreground" colSpan={2}>
                        Total
                      </td>
                      <td className="px-3 py-3 text-right text-lg font-semibold tabular-nums text-foreground">
                        {formatCurrency(facturaSeleccionada.total)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {facturaSeleccionada.observaciones ? (
                <div className="rounded-xl bg-muted px-4 py-4 text-sm leading-6 text-muted-foreground">
                  {facturaSeleccionada.observaciones}
                </div>
              ) : null}

              <div className="space-y-3 border-t border-border/60 pt-5">
                <p className="text-[15px] font-semibold text-foreground">
                  Estado electrónico
                </p>
                <div className="grid gap-2">
                  <div className="rounded-xl bg-muted px-4 py-3 text-sm text-foreground">
                    CUFE:{' '}
                    <span className="font-semibold text-foreground">
                      {facturaSeleccionada.cufe || 'Pendiente'}
                    </span>
                  </div>
                  <div className="rounded-xl bg-muted px-4 py-3 text-sm text-foreground">
                    Validada en:{' '}
                    <span className="font-semibold text-foreground">
                      {facturaSeleccionada.fechaValidacionElectronica
                        ? formatDateTime(facturaSeleccionada.fechaValidacionElectronica)
                        : 'Sin validación'}
                    </span>
                  </div>
                  {facturaSeleccionada.mensajeElectronico ? (
                    <div className="rounded-xl bg-muted px-4 py-4 text-sm leading-6 text-muted-foreground">
                      {facturaSeleccionada.mensajeElectronico}
                    </div>
                  ) : null}
                  {facturaSeleccionada.motivoAnulacion ? (
                    <div className="rounded-xl bg-danger-soft px-4 py-4 text-sm leading-6 text-danger">
                      Motivo de anulación: {facturaSeleccionada.motivoAnulacion}
                    </div>
                  ) : null}
                </div>
              </div>

              {canEmitInvoice ? (
                <div className="space-y-4 border-t border-border/60 pt-5">
                  <div className="flex items-center gap-2">
                    <SendHorizontal className="h-4 w-4 text-primary" />
                    <p className="text-sm font-semibold text-foreground">
                      Reintentar emisión electrónica
                    </p>
                  </div>
                  <div className="rounded-xl bg-muted px-4 py-4 text-sm leading-6 text-muted-foreground">
                    La emisión electrónica normalmente sale automática al crear la factura
                    cuando la clínica tiene esta funcionalidad activa. Este bloque solo
                    sirve para pendientes, rechazos o reintentos controlados.
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="grid gap-2">
                      <span className="text-[13px] font-semibold text-muted-foreground">
                        Forma de pago
                      </span>
                      <Select
                        variant="field"
                        aria-label="Forma de pago"
                        value={emisionForm.formaPagoCodigo}
                        onValueChange={(value) =>
                          setEmisionForm((curr) => ({
                            ...curr,
                            formaPagoCodigo: value,
                            fechaVencimientoPago:
                              value === '1' ? '' : curr.fechaVencimientoPago,
                          }))
                        }
                        options={PAYMENT_FORM_OPTIONS}
                      />
                    </label>
                    <label className="grid gap-2">
                      <span className="text-[13px] font-semibold text-muted-foreground">
                        Vencimiento
                      </span>
                      <input
                        type="date"
                        value={emisionForm.fechaVencimientoPago}
                        onChange={(event) =>
                          setEmisionForm((curr) => ({
                            ...curr,
                            fechaVencimientoPago: event.target.value,
                          }))
                        }
                        disabled={emisionForm.formaPagoCodigo !== '2'}
                        className="h-11 rounded-lg border border-input bg-card px-3 text-sm text-foreground outline-none transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:bg-muted"
                      />
                    </label>
                  </div>
                  <label className="flex items-center gap-3 rounded-xl bg-muted px-4 py-3 text-sm text-foreground">
                    <input
                      type="checkbox"
                      checked={emisionForm.enviarEmail}
                      onChange={(event) =>
                        setEmisionForm((curr) => ({
                          ...curr,
                          enviarEmail: event.target.checked,
                        }))
                      }
                      className="h-5 w-5 accent-primary"
                    />
                    Enviar el correo al tutor al emitir electrónicamente
                  </label>
                  <button
                    type="button"
                    onClick={handleEmitirFactura}
                    disabled={emitirFacturaMutation.isPending}
                    className="inline-flex h-11 items-center gap-2 px-4 rounded-lg bg-secondary text-sm font-semibold text-secondary-foreground transition hover:brightness-95 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <SendHorizontal className="h-4 w-4" />
                    {emitirFacturaMutation.isPending ? 'Emitiendo...' : 'Reintentar emisión'}
                  </button>
                </div>
              ) : null}

              {canAbonar ? (
                <div className="space-y-4 border-t border-border/60 pt-5">
                  <div className="flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-primary" />
                    <p className="text-sm font-semibold text-foreground">Cobrar venta a crédito</p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Registra un abono o paga el saldo completo. El efectivo entra a tu turno de caja.
                  </p>
                  {/* key: al cambiar de factura el formulario arranca vacío. */}
                  <FormAbono key={facturaSeleccionada.id} factura={facturaSeleccionada} />
                </div>
              ) : null}

              {canVoidInvoice ? (
                <div className="space-y-4 border-t border-border/60 pt-5">
                  <div className="flex items-center gap-2">
                    <Ban className="h-4 w-4 text-danger" />
                    <p className="text-sm font-semibold text-foreground">Anular factura</p>
                  </div>
                  <ProductosAlAnular
                    items={facturaSeleccionada.items || []}
                    noVuelven={noVuelven}
                    onCambiar={(itemId, valor) =>
                      setNoVuelven((actual) => {
                        const siguiente = { ...actual }
                        if (valor === 'vuelve') delete siguiente[itemId]
                        else siguiente[itemId] = valor
                        return siguiente
                      })
                    }
                  />
                  <textarea
                    value={motivoAnulacion}
                    onChange={(event) => setMotivoAnulacion(event.target.value)}
                    placeholder="Describe el motivo de anulación para auditoría y control interno."
                    className="min-h-24 w-full rounded-lg border border-input bg-card px-3 py-3 text-sm leading-6 text-foreground outline-none transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                  <button
                    type="button"
                    onClick={handleAnularFactura}
                    disabled={anularFacturaMutation.isPending}
                    className="inline-flex h-11 items-center gap-2 rounded-lg bg-danger-soft px-4 text-sm font-semibold text-danger transition hover:brightness-95 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Ban className="h-4 w-4" />
                    {anularFacturaMutation.isPending ? 'Anulando...' : 'Anular factura'}
                  </button>
                </div>
              ) : facturaSeleccionada?.estadoElectronico === 'validada' &&
                facturaSeleccionada?.cufe ? (
                <div className="rounded-xl bg-warning-soft px-4 py-4 text-sm leading-6 text-warning">
                  Esta factura ya fue validada electrónicamente. No se puede anular desde
                  caja: requiere una nota crédito.
                </div>
              ) : null}
            </div>
          ) : (
            <div className="rounded-xl bg-muted px-4 py-6 text-sm leading-6 text-muted-foreground">
              No fue posible abrir el detalle de esta factura.
            </div>
          )}
        </div>
      </DialogContent>
    </DialogRoot>
  )
}
