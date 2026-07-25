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
import {
  ESTADO_LABELS,
  ESTADO_ELECTRONICO_LABELS,
  PAYMENT_FORM_OPTIONS,
  formatDateTime,
  getEstadoTone,
  getEstadoElectronicoTone,
} from './useFinanzasHistorial'

export default function FacturaDetalleModal({ historialHook }) {
  const {
    currentFacturaId,
    resetSeleccion,
    facturaDetalleQuery,
    facturaSeleccionada,
    handlePrintReceipt,
    canEmitInvoice,
    canRegisterPayment,
    canVoidInvoice,
    emisionForm,
    setEmisionForm,
    pagoMetodo,
    setPagoMetodo,
    motivoAnulacion,
    setMotivoAnulacion,
    handleEmitirFactura,
    handleRegistrarPago,
    handleAnularFactura,
    emitirFacturaMutation,
    registrarPagoMutation,
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
            Desde aqui revisas la venta, imprimes la tirilla y solo intervienes la emision
            electronica si hubo pendiente o error.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 max-h-[75vh] overflow-y-auto pr-1">
          {facturaDetalleQuery.isError ? (
            <div className="border border-red-200 bg-red-50 px-4 py-4 text-sm leading-7 text-red-700">
              No fue posible cargar el detalle de la factura seleccionada.
            </div>
          ) : facturaDetalleQuery.isLoading || facturaDetalleQuery.isPlaceholderData ? (
            <div className="space-y-3">
              {[0, 1, 2].map((item) => (
                <div key={item} className="h-16 animate-pulse border border-border bg-muted" />
              ))}
            </div>
          ) : facturaSeleccionada ? (
            <div className="space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold text-slate-950">
                    {facturaSeleccionada.numero}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {facturaSeleccionada.propietario?.nombre || 'Sin propietario'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handlePrintReceipt}
                    className="inline-flex items-center gap-2 border border-border bg-card px-3 py-2 text-sm font-semibold text-foreground transition hover:bg-muted"
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

              <div className="flex items-end justify-between border border-border bg-muted px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Total facturado
                </p>
                <p className="text-2xl font-bold tabular-nums text-slate-950">
                  {formatCurrency(facturaSeleccionada.total)}
                </p>
              </div>

              <dl className="grid grid-cols-2 gap-px border border-border bg-border sm:grid-cols-3">
                <div className="bg-card px-4 py-3">
                  <dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Fecha
                  </dt>
                  <dd className="mt-1 text-sm font-semibold text-slate-950">
                    {formatLongDate(facturaSeleccionada.fecha)}
                  </dd>
                </div>
                <div className="bg-card px-4 py-3">
                  <dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Pago
                  </dt>
                  <dd className="mt-1 text-sm font-semibold text-slate-950">
                    {PAYMENT_METHOD_LABELS[facturaSeleccionada.metodoPago] || 'Sin definir'}
                  </dd>
                </div>
                <div className="bg-card px-4 py-3">
                  <dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Responsable
                  </dt>
                  <dd className="mt-1 truncate text-sm font-semibold text-slate-950">
                    {facturaSeleccionada.usuario?.nombre || 'Sin usuario asignado'}
                  </dd>
                </div>
              </dl>

              <div className="overflow-x-auto border border-border">
                <table className="min-w-full divide-y divide-border text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        Concepto
                      </th>
                      <th className="px-3 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        Cantidad
                      </th>
                      <th className="px-3 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        Subtotal
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
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
                    <tr className="border-t border-border bg-muted">
                      <td className="px-3 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground" colSpan={2}>
                        Total
                      </td>
                      <td className="px-3 py-3 text-right font-bold tabular-nums text-slate-950">
                        {formatCurrency(facturaSeleccionada.total)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {facturaSeleccionada.observaciones ? (
                <div className="border border-border bg-muted px-4 py-4 text-sm leading-7 text-muted-foreground">
                  {facturaSeleccionada.observaciones}
                </div>
              ) : null}

              <div className="space-y-3 border-t border-border pt-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Estado electronico
                </p>
                <div className="grid gap-3">
                  <div className="border border-border bg-card px-4 py-3 text-sm text-foreground">
                    CUFE:{' '}
                    <span className="font-semibold text-slate-950">
                      {facturaSeleccionada.cufe || 'Pendiente'}
                    </span>
                  </div>
                  <div className="border border-border bg-card px-4 py-3 text-sm text-foreground">
                    Validada en:{' '}
                    <span className="font-semibold text-slate-950">
                      {facturaSeleccionada.fechaValidacionElectronica
                        ? formatDateTime(facturaSeleccionada.fechaValidacionElectronica)
                        : 'Sin validacion'}
                    </span>
                  </div>
                  {facturaSeleccionada.mensajeElectronico ? (
                    <div className="border border-border bg-muted px-4 py-4 text-sm leading-7 text-muted-foreground">
                      {facturaSeleccionada.mensajeElectronico}
                    </div>
                  ) : null}
                  {facturaSeleccionada.motivoAnulacion ? (
                    <div className="border border-red-200 bg-red-50 px-4 py-4 text-sm leading-7 text-red-700">
                      Motivo de anulacion: {facturaSeleccionada.motivoAnulacion}
                    </div>
                  ) : null}
                </div>
              </div>

              {canEmitInvoice ? (
                <div className="space-y-4 border-t border-border pt-4">
                  <div className="flex items-center gap-2">
                    <SendHorizontal className="h-4 w-4 text-primary" />
                    <p className="text-sm font-semibold text-slate-950">
                      Reintentar emision electronica
                    </p>
                  </div>
                  <div className="border border-border bg-muted px-4 py-4 text-sm leading-7 text-muted-foreground">
                    La emision electronica normalmente sale automatica al crear la factura
                    cuando la clinica tiene esta funcionalidad activa. Este bloque solo
                    sirve para pendientes, rechazos o reintentos controlados.
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="grid gap-2">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        Forma de pago
                      </span>
                      <select
                        value={emisionForm.formaPagoCodigo}
                        onChange={(event) =>
                          setEmisionForm((curr) => ({
                            ...curr,
                            formaPagoCodigo: event.target.value,
                            fechaVencimientoPago:
                              event.target.value === '1' ? '' : curr.fechaVencimientoPago,
                          }))
                        }
                        className="h-10 border border-border bg-card px-3 text-sm text-foreground outline-none transition focus:border-primary"
                      >
                        {PAYMENT_FORM_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="grid gap-2">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
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
                        className="h-10 border border-border bg-card px-3 text-sm text-foreground outline-none transition focus:border-primary disabled:bg-muted"
                      />
                    </label>
                  </div>
                  <label className="flex items-center gap-3 border border-border bg-muted px-4 py-3 text-sm text-foreground">
                    <input
                      type="checkbox"
                      checked={emisionForm.enviarEmail}
                      onChange={(event) =>
                        setEmisionForm((curr) => ({
                          ...curr,
                          enviarEmail: event.target.checked,
                        }))
                      }
                      className="h-4 w-4 border-border text-primary focus:ring-primary"
                    />
                    Enviar el correo al tutor al emitir electrónicamente
                  </label>
                  <button
                    type="button"
                    onClick={handleEmitirFactura}
                    disabled={emitirFacturaMutation.isPending}
                    className="inline-flex items-center gap-2 border border-border bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <SendHorizontal className="h-4 w-4" />
                    {emitirFacturaMutation.isPending ? 'Emitiendo...' : 'Reintentar emision'}
                  </button>
                </div>
              ) : null}

              {canRegisterPayment ? (
                <div className="space-y-4 border-t border-border pt-4">
                  <div className="flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-primary" />
                    <p className="text-sm font-semibold text-slate-950">Registrar pago</p>
                  </div>
                  <select
                    value={pagoMetodo}
                    onChange={(event) => setPagoMetodo(event.target.value)}
                    className="w-full border border-border bg-card px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary"
                  >
                    <option value="">Método de pago (opcional)</option>
                    <option value="efectivo">Efectivo</option>
                    <option value="transferencia">Transferencia</option>
                    <option value="nequi">Nequi</option>
                    <option value="daviplata">Daviplata</option>
                    <option value="tarjeta_debito">Tarjeta débito</option>
                    <option value="tarjeta_credito">Tarjeta crédito</option>
                    <option value="otro">Otro</option>
                  </select>
                  <button
                    type="button"
                    onClick={handleRegistrarPago}
                    disabled={registrarPagoMutation.isPending}
                    className="inline-flex items-center gap-2 border border-primary bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Wallet className="h-4 w-4" />
                    {registrarPagoMutation.isPending ? 'Registrando...' : 'Marcar como pagada'}
                  </button>
                </div>
              ) : null}

              {canVoidInvoice ? (
                <div className="space-y-4 border-t border-border pt-4">
                  <div className="flex items-center gap-2">
                    <Ban className="h-4 w-4 text-red-700" />
                    <p className="text-sm font-semibold text-slate-950">Anular factura</p>
                  </div>
                  <textarea
                    value={motivoAnulacion}
                    onChange={(event) => setMotivoAnulacion(event.target.value)}
                    placeholder="Describe el motivo de anulacion para auditoria y control interno."
                    className="min-h-24 w-full border border-border bg-card px-3 py-3 text-sm leading-6 text-foreground outline-none transition focus:border-primary"
                  />
                  <button
                    type="button"
                    onClick={handleAnularFactura}
                    disabled={anularFacturaMutation.isPending}
                    className="inline-flex items-center gap-2 border border-red-200 bg-red-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Ban className="h-4 w-4" />
                    {anularFacturaMutation.isPending ? 'Anulando...' : 'Anular factura'}
                  </button>
                </div>
              ) : facturaSeleccionada?.estadoElectronico === 'validada' &&
                facturaSeleccionada?.cufe ? (
                <div className="border border-amber-200 bg-amber-50 px-4 py-4 text-sm leading-7 text-amber-800">
                  Esta factura ya fue validada electronicamente. No se puede anular desde
                  caja: requiere un flujo tributario controlado como nota credito.
                </div>
              ) : null}
            </div>
          ) : (
            <div className="border border-dashed border-border bg-muted px-4 py-6 text-sm leading-7 text-muted-foreground">
              No fue posible abrir el detalle de esta factura.
            </div>
          )}
        </div>
      </DialogContent>
    </DialogRoot>
  )
}
