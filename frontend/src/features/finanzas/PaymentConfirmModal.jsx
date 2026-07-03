import { useMemo, useState } from 'react'
import { ArrowRight, Loader2 } from 'lucide-react'
import {
  DialogRoot,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { PAYMENT_METHOD_OPTIONS } from './useFinanzasFacturacion'
import { PAYMENT_METHOD_ICONS } from './finanzasConstants'

const formatCOP = (value) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value)

// Sugerencias de billetes: monto exacto + redondeos comunes hacia arriba
const buildCashSuggestions = (total) => {
  if (total <= 0) return []
  const bills = [5000, 10000, 20000, 50000, 100000]
  const suggestions = [total]
  for (const bill of bills) {
    const rounded = Math.ceil(total / bill) * bill
    if (rounded > total && !suggestions.includes(rounded)) suggestions.push(rounded)
    if (suggestions.length >= 4) break
  }
  return suggestions.slice(0, 4)
}

export default function PaymentConfirmModal({
  open,
  onClose,
  invoiceTotals,
  invoiceForm,
  handleCrearFactura,
  crearFacturaMutation,
}) {
  const [montoRecibido, setMontoRecibido] = useState('')

  const metodoPago = invoiceForm?.metodoPago || 'efectivo'
  const total = invoiceTotals?.total ?? 0
  const esEfectivo = metodoPago === 'efectivo'
  const monto = parseFloat(montoRecibido) || 0
  const vuelto = monto - total
  const vueltoPositivo = vuelto >= 0

  const metodoPagoLabel =
    PAYMENT_METHOD_OPTIONS.find((m) => m.value === metodoPago)?.label || metodoPago
  const MetodoIcon = PAYMENT_METHOD_ICONS[metodoPago]

  const cashSuggestions = useMemo(() => buildCashSuggestions(total), [total])

  const handleConfirm = () => {
    handleCrearFactura()
  }

  const handleOpenChange = (isOpen) => {
    if (!isOpen) {
      setMontoRecibido('')
      onClose()
    }
  }

  const isPending = crearFacturaMutation?.isPending

  return (
    <DialogRoot open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm overflow-hidden rounded-2xl p-0">
        {/* Cabecera con total protagonista */}
        <div className="bg-muted/60 px-6 pb-5 pt-6 text-center">
          <DialogHeader className="space-y-0">
            <DialogDescription className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Total a cobrar
            </DialogDescription>
            <DialogTitle className="mt-1 text-[2.5rem] font-bold leading-none tracking-tight tabular-nums text-foreground">
              {formatCOP(total)}
            </DialogTitle>
          </DialogHeader>
          <div className="mx-auto mt-3 inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold text-foreground">
            {MetodoIcon && <MetodoIcon className="h-3.5 w-3.5 text-primary" />}
            {metodoPagoLabel}
          </div>
        </div>

        <div className="space-y-4 px-6 pb-6 pt-4">
          {/* Efectivo: monto recibido + sugerencias + vuelto */}
          {esEfectivo && (
            <div className="space-y-2.5">
              <div className="flex items-baseline justify-between">
                <label
                  htmlFor="monto-recibido"
                  className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  Recibido
                </label>
                {montoRecibido && (
                  <span
                    className={`text-xs font-bold tabular-nums ${
                      vueltoPositivo ? 'text-primary' : 'text-red-600'
                    }`}
                  >
                    {vueltoPositivo
                      ? `Vuelto ${formatCOP(vuelto)}`
                      : `Falta ${formatCOP(Math.abs(vuelto))}`}
                  </span>
                )}
              </div>
              <input
                id="monto-recibido"
                type="number"
                inputMode="numeric"
                value={montoRecibido}
                onChange={(e) => setMontoRecibido(e.target.value)}
                placeholder="$ 0"
                autoFocus
                className={`w-full rounded-xl border-2 bg-card px-4 py-2.5 text-right text-xl font-bold tabular-nums text-foreground placeholder:font-normal placeholder:text-muted-foreground/60 focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${
                  montoRecibido && !vueltoPositivo
                    ? 'border-red-300 focus:border-red-400'
                    : 'border-border focus:border-primary'
                }`}
              />
              {cashSuggestions.length > 0 && (
                <div className="grid grid-cols-4 gap-1.5">
                  {cashSuggestions.map((amount, i) => (
                    <button
                      key={amount}
                      type="button"
                      onClick={() => setMontoRecibido(String(amount))}
                      className={`rounded-lg border py-1.5 text-[11px] font-semibold tabular-nums transition ${
                        monto === amount
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground'
                      }`}
                    >
                      {i === 0 ? 'Exacto' : `$${(amount / 1000).toLocaleString('es-CO')}k`}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Botón emitir */}
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isPending}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Emitiendo...
              </>
            ) : (
              <>
                Emitir factura
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
          <p className="text-center text-[11px] text-muted-foreground">
            Revisa los datos antes de emitir — la factura queda registrada en el historial.
          </p>
        </div>
      </DialogContent>
    </DialogRoot>
  )
}
