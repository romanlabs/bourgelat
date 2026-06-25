import { useState } from 'react'
import { Receipt } from 'lucide-react'
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

  const handleConfirm = () => {
    handleCrearFactura()
  }

  const handleOpenChange = (isOpen) => {
    if (!isOpen) {
      setMontoRecibido('')
      onClose()
    }
  }

  return (
    <DialogRoot open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-4 w-4 text-primary" />
            Confirmar cobro
          </DialogTitle>
          <DialogDescription>
            Revisa los datos antes de emitir la factura.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-5">
          {/* Total */}
          <div className="border border-border bg-muted px-5 py-4 text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Total a cobrar
            </p>
            <p className="mt-1 text-4xl font-bold tracking-tight text-foreground">
              {formatCOP(total)}
            </p>
          </div>

          {/* Método de pago */}
          <div className="flex items-center justify-between border border-border bg-card px-4 py-3">
            <span className="text-sm text-muted-foreground">Método de pago</span>
            <span className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <span>{PAYMENT_METHOD_ICONS[metodoPago]}</span>
              {metodoPagoLabel}
            </span>
          </div>

          {/* Campo efectivo */}
          {esEfectivo && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Monto recibido
                </label>
                <input
                  type="number"
                  value={montoRecibido}
                  onChange={(e) => setMontoRecibido(e.target.value)}
                  placeholder="0"
                  className="w-full border border-border bg-card px-3 py-2 text-right text-base font-semibold text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                  autoFocus
                />
              </div>

              {montoRecibido && (
                <div
                  className={`flex items-center justify-between border px-4 py-3 text-sm font-semibold ${
                    vueltoPositivo
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                      : 'border-red-200 bg-red-50 text-red-700'
                  }`}
                >
                  <span>Vuelto</span>
                  <span>{vueltoPositivo ? formatCOP(vuelto) : `Falta ${formatCOP(Math.abs(vuelto))}`}</span>
                </div>
              )}
            </div>
          )}

          {/* Botón emitir */}
          <button
            type="button"
            onClick={handleConfirm}
            disabled={crearFacturaMutation?.isPending}
            className="w-full border border-transparent bg-slate-950 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {crearFacturaMutation?.isPending ? 'Emitiendo...' : 'Emitir factura'}
          </button>
        </div>
      </DialogContent>
    </DialogRoot>
  )
}
