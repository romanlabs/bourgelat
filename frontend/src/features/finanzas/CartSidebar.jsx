import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ChevronDown, ChevronUp, Minus, Plus, Search, ShoppingCart, X } from 'lucide-react'
import { PAYMENT_METHOD_OPTIONS } from './useFinanzasFacturacion'
import { PAYMENT_METHOD_ICONS, PAYMENT_METHOD_SHORT } from './finanzasConstants'
import ClientInlinePicker from './ClientInlinePicker'

const formatCOP = (value) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value)

const toAmount = (v) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

export default function CartSidebar({
  invoiceForm,
  setInvoiceForm,
  invoiceTotals,
  selectedOwnerData,
  selectOwner,
  propietariosQuery,
  ownerSearch,
  setOwnerSearch,
  updateInvoiceItem,
  removeInvoiceItem,
  onOpenPaymentModal,
}) {
  const [clientPickerOpen, setClientPickerOpen] = useState(false)
  const [obsOpen, setObsOpen] = useState(false)

  const items = invoiceForm?.items || []
  const metodoPago = invoiceForm?.metodoPago || 'efectivo'
  const hasItems = items.length > 0

  const setMetodoPago = (value) => {
    setInvoiceForm((f) => ({ ...f, metodoPago: value }))
  }

  const incrementQty = (id, current) => {
    const next = Math.max(toAmount(current) + 1, 1)
    updateInvoiceItem(id, 'cantidad', String(next))
  }

  const decrementQty = (id, current) => {
    const next = Math.max(toAmount(current) - 1, 1)
    updateInvoiceItem(id, 'cantidad', String(next))
  }

  return (
    <div className="flex h-full flex-col bg-card">
      {/* ── Cliente ── */}
      <div className="relative border-b border-border px-4 py-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Cliente
        </p>
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center border border-border bg-secondary text-sm font-bold text-primary">
            {selectedOwnerData?.nombre?.charAt(0)?.toUpperCase() || (
              <Search className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">
              {selectedOwnerData?.nombre || 'Sin cliente'}
            </p>
            {selectedOwnerData?.email && (
              <p className="truncate text-xs text-muted-foreground">{selectedOwnerData.email}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setClientPickerOpen((v) => !v)}
            className="shrink-0 border border-border bg-muted px-2.5 py-1.5 text-xs font-semibold text-foreground transition hover:bg-primary/10 hover:text-primary hover:border-primary/30"
          >
            {selectedOwnerData ? 'Cambiar' : 'Elegir'}
          </button>
        </div>

        <ClientInlinePicker
          open={clientPickerOpen}
          onClose={() => setClientPickerOpen(false)}
          propietariosQuery={propietariosQuery}
          ownerSearch={ownerSearch}
          setOwnerSearch={setOwnerSearch}
          onSelect={selectOwner}
          selectedId={invoiceForm?.propietarioId}
        />
      </div>

      {/* ── Items del carrito ── */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {!hasItems ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
            <ShoppingCart className="h-8 w-8 text-muted-foreground/30" />
            <p className="text-xs text-muted-foreground">
              Agrega productos o servicios desde el panel izquierdo.
            </p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {items.map((item) => {
              const qty = toAmount(item.cantidad)
              const precio = toAmount(item.precioUnitario)
              const precioMinimo = toAmount(item.precioMinimo)
              const bajoCosto = item.tipo === 'producto' && precioMinimo > 0 && precio < precioMinimo
              const subtotalItem = Math.max(qty * precio, 0)

              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.15 }}
                  className="border-b border-border px-4 py-3"
                >
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      {/* Nombre */}
                      {item.tipo === 'servicio' && !item.descripcion ? (
                        <input
                          type="text"
                          value={item.descripcion}
                          onChange={(e) => updateInvoiceItem(item.id, 'descripcion', e.target.value)}
                          placeholder="Descripción del servicio..."
                          className="w-full border-b border-dashed border-border bg-transparent text-xs font-semibold text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                          autoFocus
                        />
                      ) : (
                        <p className="line-clamp-1 text-xs font-semibold text-foreground">
                          {item.descripcion || 'Sin descripción'}
                        </p>
                      )}

                      {/* Precio editable (con piso en el costo para productos) */}
                      <div className="mt-1 flex items-center gap-1">
                        <span className="text-xs text-muted-foreground">$</span>
                        <input
                          type="number"
                          value={item.precioUnitario}
                          min={precioMinimo || undefined}
                          onChange={(e) => updateInvoiceItem(item.id, 'precioUnitario', e.target.value)}
                          className={`w-20 border-b border-dashed bg-transparent text-xs font-semibold focus:outline-none ${
                            bajoCosto
                              ? 'border-red-400 text-red-600 focus:border-red-500'
                              : 'border-border text-foreground focus:border-primary'
                          }`}
                          placeholder="0"
                        />
                        <span className="text-xs text-muted-foreground">c/u</span>
                      </div>
                      {bajoCosto && (
                        <p className="mt-0.5 text-[11px] font-semibold text-red-600">
                          Mínimo {formatCOP(precioMinimo)} (costo)
                        </p>
                      )}

                    </div>

                    {/* Cantidad + subtotal en la columna de números */}
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => decrementQty(item.id, item.cantidad)}
                          aria-label="Restar una unidad"
                          className="flex h-6 w-6 items-center justify-center border border-border bg-muted text-foreground transition hover:bg-primary/10 hover:text-primary"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-6 text-center text-xs font-bold tabular-nums text-foreground">
                          {qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => incrementQty(item.id, item.cantidad)}
                          aria-label="Sumar una unidad"
                          className="flex h-6 w-6 items-center justify-center border border-border bg-muted text-foreground transition hover:bg-primary/10 hover:text-primary"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeInvoiceItem(item.id)}
                          aria-label="Quitar del carrito"
                          className="ml-1 flex h-6 w-6 items-center justify-center text-muted-foreground transition hover:text-red-500"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      {subtotalItem > 0 && (
                        <p className="text-xs font-bold tabular-nums text-primary">
                          {formatCOP(subtotalItem)}
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        )}
      </div>

      {/* ── Totales ── */}
      <div className="space-y-1.5 border-t border-border px-4 py-3">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Subtotal</span>
          <span className="tabular-nums">{formatCOP(invoiceTotals?.subtotal ?? 0)}</span>
        </div>
        <div className="flex items-baseline justify-between pt-1">
          <span className="text-sm font-bold text-foreground">Total</span>
          <span className="text-lg font-bold tabular-nums text-foreground">
            {formatCOP(invoiceTotals?.total ?? 0)}
          </span>
        </div>
      </div>

      {/* ── Método de pago ── */}
      <div className="border-t border-border px-4 py-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Método de pago
        </p>
        <div className="flex flex-wrap gap-1.5">
          {PAYMENT_METHOD_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setMetodoPago(opt.value)}
              className={`flex items-center gap-1 border px-2.5 py-1 text-xs font-semibold transition ${
                metodoPago === opt.value
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-card text-muted-foreground hover:border-border hover:text-foreground'
              }`}
            >
              <span>{PAYMENT_METHOD_ICONS[opt.value]}</span>
              {PAYMENT_METHOD_SHORT[opt.value] || opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Observaciones (colapsable) ── */}
      <div className="border-t border-border">
        <button
          type="button"
          onClick={() => setObsOpen((v) => !v)}
          className="flex w-full items-center justify-between px-4 py-2.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
        >
          Observaciones
          {obsOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
        {obsOpen && (
          <div className="px-4 pb-3">
            <textarea
              value={invoiceForm?.observaciones ?? ''}
              onChange={(e) => setInvoiceForm((f) => ({ ...f, observaciones: e.target.value }))}
              rows={2}
              placeholder="Notas internas sobre esta venta..."
              className="w-full resize-none border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />
          </div>
        )}
      </div>

      {/* ── Botón cobrar ── */}
      <div className="border-t border-border p-4">
        <button
          type="button"
          onClick={onOpenPaymentModal}
          disabled={!hasItems}
          className="flex w-full items-center justify-center gap-2 bg-slate-950 py-3.5 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ShoppingCart className="h-4 w-4" />
          {!hasItems ? 'Agrega productos' : `Cobrar ${formatCOP(invoiceTotals?.total ?? 0)}`}
        </button>
        {!selectedOwnerData && hasItems && (
          <p className="mt-2 text-center text-[11px] text-muted-foreground">
            Venta de mostrador — sin cliente asociado
          </p>
        )}
      </div>
    </div>
  )
}
