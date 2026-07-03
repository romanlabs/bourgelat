import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Minus, Plus, ShoppingCart, StickyNote, Trash2, UserRound, X } from 'lucide-react'
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
  const itemCount = items.reduce((acc, it) => acc + Math.max(toAmount(it.cantidad), 0), 0)
  const hasObs = Boolean(invoiceForm?.observaciones?.trim())

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
    <div className="flex h-full min-h-0 flex-col bg-card">
      {/* ── Cliente: una sola fila delgada ── */}
      <div className="relative shrink-0 border-b border-border">
        <button
          type="button"
          onClick={() => setClientPickerOpen((v) => !v)}
          className="group flex w-full items-center gap-2.5 px-3 py-2 text-left transition hover:bg-primary/5"
        >
          <div
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
              selectedOwnerData ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'
            }`}
          >
            {selectedOwnerData?.nombre?.charAt(0)?.toUpperCase() || <UserRound className="h-3.5 w-3.5" />}
          </div>
          <p className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
            {selectedOwnerData?.nombre || 'Venta de mostrador'}
          </p>
          <span className="shrink-0 text-[11px] font-semibold text-primary">
            {selectedOwnerData ? 'Cambiar' : '+ Cliente'}
          </span>
        </button>

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

      {/* ── Items: única zona con scroll ── */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {!hasItems ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center">
            <ShoppingCart className="h-7 w-7 text-muted-foreground/30" />
            <p className="text-xs text-muted-foreground">
              Agrega productos o servicios
              <br />
              desde el panel izquierdo.
            </p>
          </div>
        ) : (
          <>
            <div className="sticky top-0 z-10 flex items-center justify-between bg-card/95 px-3 py-1.5 backdrop-blur-sm">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Carrito
              </p>
              <span className="rounded-full bg-primary/10 px-1.5 py-px text-[10px] font-bold tabular-nums text-primary">
                {itemCount}
              </span>
            </div>
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
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: 16 }}
                    transition={{ duration: 0.12 }}
                    className="group border-b border-border/60 px-3 py-2"
                  >
                    {/* Fila 1: nombre + subtotal */}
                    <div className="flex items-baseline justify-between gap-2">
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
                        <p className="line-clamp-1 min-w-0 text-xs font-semibold text-foreground">
                          {item.descripcion || 'Sin descripción'}
                        </p>
                      )}
                      <span className="shrink-0 text-xs font-bold tabular-nums text-foreground">
                        {formatCOP(subtotalItem)}
                      </span>
                    </div>

                    {/* Fila 2: precio · stepper · eliminar */}
                    <div className="mt-1 flex items-center gap-2">
                      <div className="flex items-center gap-0.5">
                        <span className="text-[11px] text-muted-foreground">$</span>
                        <input
                          type="number"
                          value={item.precioUnitario}
                          min={precioMinimo || undefined}
                          onChange={(e) => updateInvoiceItem(item.id, 'precioUnitario', e.target.value)}
                          className={`w-16 rounded border bg-background px-1 py-0.5 text-[11px] font-semibold tabular-nums focus:outline-none ${
                            bajoCosto
                              ? 'border-red-400 text-red-600 focus:border-red-500'
                              : 'border-border text-foreground focus:border-primary'
                          }`}
                          placeholder="0"
                        />
                      </div>

                      <div className="ml-auto flex items-center overflow-hidden rounded-full border border-border bg-background">
                        <button
                          type="button"
                          onClick={() => decrementQty(item.id, item.cantidad)}
                          aria-label="Restar una unidad"
                          className="flex h-6 w-6 items-center justify-center text-muted-foreground transition hover:bg-muted hover:text-foreground"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-6 text-center text-[11px] font-bold tabular-nums text-foreground">
                          {qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => incrementQty(item.id, item.cantidad)}
                          aria-label="Sumar una unidad"
                          className="flex h-6 w-6 items-center justify-center text-muted-foreground transition hover:bg-muted hover:text-foreground"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeInvoiceItem(item.id)}
                        aria-label="Quitar del carrito"
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-muted-foreground/50 transition hover:bg-red-50 hover:text-red-500"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>

                    {bajoCosto && (
                      <p className="mt-1 text-[10px] font-semibold text-red-600">
                        Mínimo {formatCOP(precioMinimo)} (costo)
                      </p>
                    )}
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </>
        )}
      </div>

      {/* ── Pie fijo compacto ── */}
      <div className="shrink-0 border-t border-border bg-muted/40">
        {/* Método de pago: fila horizontal deslizable */}
        <div className="flex items-center gap-1 px-3 pt-2">
          <div className="flex min-w-0 flex-1 gap-1 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {PAYMENT_METHOD_OPTIONS.map((opt) => {
              const Icon = PAYMENT_METHOD_ICONS[opt.value]
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setMetodoPago(opt.value)}
                  className={`flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition ${
                    metodoPago === opt.value
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-card text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {Icon && <Icon className="h-3 w-3" />}
                  {PAYMENT_METHOD_SHORT[opt.value] || opt.label}
                </button>
              )
            })}
          </div>
          <button
            type="button"
            onClick={() => setObsOpen((v) => !v)}
            aria-label="Observaciones"
            title="Observaciones"
            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition ${
              obsOpen || hasObs
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border bg-card text-muted-foreground hover:text-foreground'
            }`}
          >
            <StickyNote className="h-3 w-3" />
          </button>
        </div>

        {/* Observaciones (solo si está abierto) */}
        {obsOpen && (
          <div className="relative px-3 pt-2">
            <textarea
              value={invoiceForm?.observaciones ?? ''}
              onChange={(e) => setInvoiceForm((f) => ({ ...f, observaciones: e.target.value }))}
              rows={2}
              autoFocus
              placeholder="Notas internas sobre esta venta..."
              className="w-full resize-none rounded-lg border border-border bg-card px-2.5 py-1.5 pr-7 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setObsOpen(false)}
              aria-label="Cerrar observaciones"
              className="absolute right-5 top-3.5 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}

        {/* Total + cobrar en un bloque */}
        <div className="space-y-2 px-3 pb-3 pt-2">
          <div className="flex items-baseline justify-between">
            <span className="text-xs font-semibold text-muted-foreground">
              Total
              {!selectedOwnerData && hasItems && (
                <span className="ml-1.5 font-normal">· mostrador</span>
              )}
            </span>
            <span className="text-lg font-bold leading-none tabular-nums text-foreground">
              {formatCOP(invoiceTotals?.total ?? 0)}
            </span>
          </div>
          <button
            type="button"
            onClick={onOpenPaymentModal}
            disabled={!hasItems}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground disabled:shadow-none"
          >
            <ShoppingCart className="h-4 w-4" />
            {!hasItems ? 'Agrega productos' : 'Cobrar'}
          </button>
        </div>
      </div>
    </div>
  )
}
