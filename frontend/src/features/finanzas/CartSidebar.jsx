import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Minus, Plus, ShoppingCart, StickyNote, Trash2, UserRound, X } from 'lucide-react'
import { PAYMENT_METHOD_OPTIONS, faltaParaCobrar } from './useFinanzasFacturacion'
import { PAYMENT_METHOD_ICONS } from './finanzasConstants'
import { estadoVencimiento, fechaCortaVencimiento, textoVencimiento } from '@/features/inventario/inventarioUtils'
import { Select } from '@/components/ui/select'
import ClientInlinePicker from './ClientInlinePicker'
import SelectorCuenta from './SelectorCuenta'
import { cuentaDelCobro } from './cuentaCobro'
import { useCuentasRecaudo } from './useCuentasRecaudo'
import { formatearCelular } from '@/lib/celular'

// Alias en mayúscula: la regla no-unused-vars no ve el uso dentro del JSX y
// sin el import `motion` el carrito se caía al agregar el primer producto.
const MotionDiv = motion.div

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
  onRevisarVencimiento,
}) {
  const [clientPickerOpen, setClientPickerOpen] = useState(false)
  const [obsOpen, setObsOpen] = useState(false)

  const items = invoiceForm?.items || []
  const metodoPago = invoiceForm?.metodoPago || 'efectivo'
  const hasItems = items.length > 0
  const itemCount = items.reduce((acc, it) => acc + Math.max(toAmount(it.cantidad), 0), 0)
  const hasObs = Boolean(invoiceForm?.observaciones?.trim())
  const total = invoiceTotals?.total ?? 0

  const opcionPago = PAYMENT_METHOD_OPTIONS.find((o) => o.value === metodoPago)
  const { data: cuentas = [] } = useCuentasRecaudo({ soloActivas: true })
  const falta = faltaParaCobrar(invoiceForm, cuentas)
  const setMetodoPago = (value) => {
    setInvoiceForm((f) => ({ ...f, metodoPago: value, detallePago: '', cuentaRecaudoId: '' }))
  }
  // Con cuentas configuradas el banco ya no se escribe: el detalle queda para la referencia.
  const cuentaElegida = cuentaDelCobro({ metodoPago, cuentaRecaudoId: invoiceForm?.cuentaRecaudoId, cuentas })
  const detalle =
    metodoPago === 'transferencia' && cuentas.length && opcionPago?.detalle
      ? { ...opcionPago.detalle, label: 'Referencia', placeholder: 'ref. 8841…' }
      : opcionPago?.detalle

  const incrementQty = (id, current) => {
    const next = Math.max(toAmount(current) + 1, 1)
    updateInvoiceItem(id, 'cantidad', String(next))
  }

  const decrementQty = (id, current) => {
    const next = Math.max(toAmount(current) - 1, 1)
    updateInvoiceItem(id, 'cantidad', String(next))
  }

  return (
    <div className="flex h-full min-h-0 flex-col rounded-2xl bg-card lg:rounded-none">
      {/* ── Encabezado y cliente ── */}
      <div className="relative shrink-0 space-y-3 px-4 pt-4 lg:px-5 lg:pt-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold tracking-[-0.02em] text-foreground">Cuenta</h2>
          {hasItems ? (
            <span className="rounded-md bg-secondary px-2.5 py-1 text-[13px] font-semibold tabular-nums text-secondary-foreground">
              {itemCount} {itemCount === 1 ? 'unidad' : 'unidades'}
            </span>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => setClientPickerOpen((v) => !v)}
          className="flex w-full items-center gap-3 rounded-xl bg-secondary p-3 text-left transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-base font-bold ${
              selectedOwnerData ? 'bg-brand-muted text-brand-foreground' : 'bg-card text-muted-foreground'
            }`}
          >
            {selectedOwnerData?.nombre?.charAt(0)?.toUpperCase() || <UserRound className="h-4 w-4" />}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[15px] font-semibold text-foreground">
              {selectedOwnerData?.nombre || 'Venta de mostrador'}
            </span>
            <span className="block truncate text-[13px] text-muted-foreground">
              {selectedOwnerData
                ? selectedOwnerData.numeroDocumento || formatearCelular(selectedOwnerData.telefono) || 'Cliente registrado'
                : 'Sin cliente asociado'}
            </span>
          </span>
          <span className="shrink-0 text-[13px] font-semibold text-primary">
            {selectedOwnerData ? 'Cambiar' : 'Agregar cliente'}
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

        {invoiceForm?.historiaClinicaId || invoiceForm?.registroEstiloId ? (
          <p className="rounded-lg bg-info-soft px-3 py-2 text-[13px] font-medium text-info">
            {invoiceForm.historiaClinicaId
              ? 'Cobrando una consulta: al vender queda marcada como facturada.'
              : 'Cobrando un servicio de estilos: al vender queda marcado como facturado.'}
          </p>
        ) : null}
      </div>

      {/* ── Items: única zona con scroll ── */}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-2 lg:px-5">
        {!hasItems ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 py-8 text-center">
            <ShoppingCart className="h-7 w-7 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              Agrega productos o servicios desde el catálogo.
            </p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {items.map((item) => {
              const qty = toAmount(item.cantidad)
              const precio = toAmount(item.precioUnitario)
              const precioMinimo = toAmount(item.precioMinimo)
              const bajoCosto =
                item.tipo === 'producto' && precioMinimo > 0 && precio < precioMinimo
              const subtotalItem = Math.max(qty * precio, 0)
              const vencimiento = item.tipo === 'producto' ? estadoVencimiento(item) : null

              return (
                <MotionDiv
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: 16 }}
                  transition={{ duration: 0.12 }}
                  className="border-b border-border/60 py-3 last:border-b-0"
                >
                  {/* Fila 1: nombre + subtotal */}
                  <div className="flex items-baseline justify-between gap-3">
                    {item.tipo === 'servicio' && !item.descripcion ? (
                      <input
                        type="text"
                        value={item.descripcion}
                        onChange={(e) => updateInvoiceItem(item.id, 'descripcion', e.target.value)}
                        placeholder="Descripción del servicio"
                        aria-label="Descripción del servicio"
                        className="h-9 w-full rounded-lg border border-input bg-card px-2.5 text-sm font-semibold text-foreground placeholder:font-normal placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        autoFocus
                      />
                    ) : (
                      <p className="line-clamp-2 min-w-0 text-[15px] font-semibold leading-snug text-foreground">
                        {item.descripcion || 'Sin descripción'}
                      </p>
                    )}
                    <span className="shrink-0 text-[15px] font-semibold tabular-nums text-foreground">
                      {formatCOP(subtotalItem)}
                    </span>
                  </div>

                  {/* Fila 2: cantidad · precio unitario · quitar */}
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => decrementQty(item.id, item.cantidad)}
                      aria-label="Restar una unidad"
                      className="flex h-11 w-11 items-center justify-center rounded-lg bg-secondary text-secondary-foreground transition hover:brightness-95 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:h-8 lg:w-8"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="min-w-[1.5rem] text-center text-sm font-semibold tabular-nums text-foreground">
                      {qty}
                    </span>
                    <button
                      type="button"
                      onClick={() => incrementQty(item.id, item.cantidad)}
                      aria-label="Sumar una unidad"
                      className="flex h-11 w-11 items-center justify-center rounded-lg bg-secondary text-secondary-foreground transition hover:brightness-95 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:h-8 lg:w-8"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>

                    <label className="ml-1 flex items-center gap-1 text-[13px] text-muted-foreground">
                      <span aria-hidden className="hidden lg:inline">×</span>
                      <span className="sr-only">Precio unitario</span>
                      <span aria-hidden>$</span>
                      <input
                        type="number"
                        value={item.precioUnitario}
                        min={precioMinimo || undefined}
                        onChange={(e) => updateInvoiceItem(item.id, 'precioUnitario', e.target.value)}
                        className={`h-11 w-[84px] rounded-lg border bg-card px-2 text-base font-semibold tabular-nums lg:h-8 lg:w-24 lg:text-[13px] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                          bajoCosto ? 'border-danger text-danger' : 'border-input text-foreground'
                        }`}
                        placeholder="0"
                      />
                    </label>

                    <button
                      type="button"
                      onClick={() => removeInvoiceItem(item.id)}
                      aria-label="Quitar del carrito"
                      className="ml-auto flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-danger-soft lg:h-8 lg:w-8 hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  {bajoCosto && (
                    <p className="mt-1.5 text-[13px] font-semibold text-danger">
                      Mínimo {formatCOP(precioMinimo)} (costo)
                    </p>
                  )}

                  {vencimiento === 'vencido' && (
                    <div className="mt-1.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                      <p className="text-[13px] font-semibold text-danger">
                        Vencido desde el {fechaCortaVencimiento(item.fechaVencimiento)}
                      </p>
                      <button
                        type="button"
                        onClick={() => onRevisarVencimiento?.(item)}
                        className="text-[13px] font-semibold text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        Revisar vencimiento
                      </button>
                    </div>
                  )}
                  {vencimiento === 'proximo' && (
                    <p className="mt-1.5 text-[13px] font-semibold text-warning">
                      {textoVencimiento(item.fechaVencimiento)}
                    </p>
                  )}
                </MotionDiv>
              )
            })}
          </AnimatePresence>
        )}
      </div>

      {/* ── Pie fijo: método, total y cobro ── */}
      <div className="shrink-0 space-y-4 border-t border-border px-4 pb-5 pt-4 lg:px-5">
        {/* Método de pago en una lista: siete opciones no merecen siete botones
            en el pie. Cuando entre una pasarela (Wompi) será una opción más.
            En celular sí van como botones grandes: se eligen con el pulgar. */}
        <div className="flex items-center gap-2">
          <span className="shrink-0 text-sm font-semibold text-foreground">
            <span className="lg:hidden">Medio de pago</span>
            <span className="hidden lg:inline">Pago</span>
          </span>
          <Select
            variant="field"
            aria-label="Método de pago"
            className="hidden h-10 min-w-0 flex-1 lg:flex"
            value={metodoPago}
            onValueChange={setMetodoPago}
            options={PAYMENT_METHOD_OPTIONS.map((opt) => ({ value: opt.value, label: opt.label }))}
          />
          <button
            type="button"
            onClick={() => setObsOpen((v) => !v)}
            aria-label="Observaciones"
            title="Observaciones"
            aria-pressed={obsOpen || hasObs}
            className={`ml-auto inline-flex h-11 shrink-0 items-center gap-1.5 rounded-lg px-3 text-[13px] font-semibold transition lg:ml-0 lg:h-10 lg:px-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              obsOpen || hasObs
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            <StickyNote className="h-3.5 w-3.5" />
            Nota
          </button>
        </div>
        <div role="radiogroup" aria-label="Método de pago" className="!mt-2 grid grid-cols-2 gap-2 lg:hidden">
          {PAYMENT_METHOD_OPTIONS.map((opt) => {
            const Icono = PAYMENT_METHOD_ICONS[opt.value]
            const activo = metodoPago === opt.value
            return (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={activo}
                onClick={() => activo || setMetodoPago(opt.value)}
                className={`flex h-12 min-w-0 items-center gap-2 rounded-lg px-3 text-left text-sm font-semibold transition active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  activo ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:brightness-95'
                }`}
              >
                {Icono ? <Icono aria-hidden className="h-4 w-4 shrink-0" /> : null}
                <span className="truncate">{opt.label}</span>
              </button>
            )
          })}
        </div>

        {/* A qué cuenta de la clínica entró la transferencia (Configuración) */}
        {metodoPago === 'transferencia' && cuentas.length ? (
          <SelectorCuenta
            cuentas={cuentas}
            seleccionada={cuentaElegida}
            onSeleccionar={(id) => setInvoiceForm((f) => ({ ...f, cuentaRecaudoId: id }))}
          />
        ) : null}

        {/* Detalle del método: banco o referencia de la transferencia, o cuál es «otro» */}
        {detalle ? (
          <input
            type="text"
            value={invoiceForm?.detallePago ?? ''}
            onChange={(e) => setInvoiceForm((f) => ({ ...f, detallePago: e.target.value }))}
            maxLength={80}
            aria-label={detalle.label}
            placeholder={`${detalle.label}${detalle.requerido ? '' : ' (opcional)'}: ${detalle.placeholder}`}
            className="h-11 w-full rounded-lg border border-input bg-card px-3 text-base text-foreground placeholder:text-muted-foreground lg:h-10 lg:text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        ) : null}

        {/* Observaciones (solo si está abierto) */}
        {obsOpen && (
          <div className="relative">
            <textarea
              value={invoiceForm?.observaciones ?? ''}
              onChange={(e) => setInvoiceForm((f) => ({ ...f, observaciones: e.target.value }))}
              rows={2}
              autoFocus
              aria-label="Observaciones de la venta"
              placeholder="Notas internas sobre esta venta"
              className="w-full resize-none rounded-lg border border-input bg-card px-3 py-2 pr-11 text-base text-foreground lg:pr-9 lg:text-sm placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <button
              type="button"
              onClick={() => setObsOpen(false)}
              aria-label="Cerrar observaciones"
              className="absolute right-1 top-1 flex h-10 w-10 items-center lg:right-2 lg:top-2 lg:h-7 lg:w-7 justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Total + cobrar: la única acción primaria del carrito. En celular
            queda fija encima de la barra inferior para no perderla al bajar. */}
        <div className="fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-20 space-y-2 border-t border-border bg-card px-4 py-3 lg:static lg:z-auto lg:space-y-4 lg:border-0 lg:bg-transparent lg:p-0">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-[17px] font-semibold text-foreground">
            Total
            {!selectedOwnerData && hasItems && (
              <span className="ml-1.5 text-sm font-normal text-muted-foreground">· mostrador</span>
            )}
          </span>
          <span className="text-[26px] font-semibold leading-none tracking-[-0.03em] tabular-nums text-foreground lg:text-[34px]">
            {formatCOP(total)}
          </span>
        </div>
        <button
          type="button"
          onClick={onOpenPaymentModal}
          disabled={!hasItems || Boolean(falta)}
          className="flex h-[52px] w-full items-center justify-center gap-2 rounded-lg bg-primary text-base lg:h-14 font-semibold text-primary-foreground transition hover:brightness-110 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground disabled:hover:brightness-100"
        >
          {!hasItems ? 'Agrega productos para cobrar' : falta ? falta : <span className="tabular-nums">Cobrar {formatCOP(total)}</span>}
        </button>
        </div>
        {/* Lo que ocupa el cobro fijo, para que no tape los campos de arriba. */}
        <div aria-hidden className="!mt-0 h-24 lg:hidden" />
      </div>
    </div>
  )
}
