import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2, PackageSearch, ShoppingCart } from 'lucide-react'
import { DialogRoot, DialogContent, DialogTitle } from '@/components/ui/dialog'
import ProductCommandSearch from './ProductCommandSearch'
import CartSidebar from './CartSidebar'
import { PAYMENT_METHOD_OPTIONS } from './useFinanzasFacturacion'
import { PAYMENT_METHOD_ICONS } from './finanzasConstants'

const formatCOP = (value) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value)

// Redondeos comunes hacia arriba para agilizar el cobro en efectivo.
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

/**
 * Punto de venta en una sola ventana. Un modal centrado con el flujo completo:
 *   carrito  →  cobro (recibido / vuelto)  →  éxito (cuánto devolver)
 * Solo venta interna: no menciona facturación electrónica en ningún paso.
 */
export default function PosModal({
  open,
  onClose,
  facturacionHook,
  puedeConsultarInventario,
  ventaExitosa,
  onNuevaVenta,
}) {
  const [view, setView] = useState('cart')          // cart | pago | exito
  const [mobilePane, setMobilePane] = useState('productos')
  const [montoRecibido, setMontoRecibido] = useState('')
  const [snapshot, setSnapshot] = useState(null)     // { total, recibido, vuelto, metodo }
  const searchInputRef = useRef(null)

  const {
    ownerSearch, setOwnerSearch,
    productSearch, setProductSearch,
    categoriaFiltro, setCategoriaFiltro,
    barcodeInput, setBarcodeInput,
    invoiceForm, setInvoiceForm,
    productosDisponibles,
    selectedOwnerData, selectOwner,
    invoiceTotals,
    propietariosQuery, productosQuery,
    crearFacturaMutation,
    buscarProductoPorBarcodeMutation,
    handleCrearFactura, handleBarcodeScan,
    addServiceItem, addProductToInvoice,
    removeInvoiceItem, updateInvoiceItem,
  } = facturacionHook

  const items = invoiceForm?.items || []
  const itemCount = items.length
  const total = invoiceTotals?.total ?? 0
  const metodoPago = invoiceForm?.metodoPago || 'efectivo'
  const esEfectivo = metodoPago === 'efectivo'
  const monto = parseFloat(montoRecibido) || 0
  const vuelto = monto - total
  const vueltoOk = vuelto >= 0
  const metodoLabel = PAYMENT_METHOD_OPTIONS.find((m) => m.value === metodoPago)?.label || metodoPago
  const MetodoIcon = PAYMENT_METHOD_ICONS[metodoPago]
  const cashSuggestions = useMemo(() => buildCashSuggestions(total), [total])
  const isPending = crearFacturaMutation?.isPending

  // Cada vez que se abre el modal, arranca limpio en el carrito.
  useEffect(() => {
    if (open) {
      setView('cart')
      setMobilePane('productos')
      setMontoRecibido('')
    }
  }, [open])

  // La página avisa el éxito de la venta (onFacturaCreada) → paso de vuelto.
  useEffect(() => {
    if (ventaExitosa) setView('exito')
  }, [ventaExitosa])

  const handleOpenChange = (next) => {
    if (!next) onClose()
  }

  const irACobrar = () => {
    setMontoRecibido('')
    setView('pago')
  }

  const confirmarVenta = () => {
    // Capturamos antes de emitir: el hook limpia el carrito al tener éxito.
    setSnapshot({ total, recibido: esEfectivo ? monto : total, vuelto: esEfectivo ? vuelto : 0, metodo: metodoLabel })
    handleCrearFactura()
  }

  const nuevaVenta = () => {
    setSnapshot(null)
    setMontoRecibido('')
    setView('cart')
    setMobilePane('productos')
    onNuevaVenta?.()
    crearFacturaMutation?.reset?.()
  }

  const puedeConfirmar = itemCount > 0 && (!esEfectivo || (montoRecibido !== '' && vueltoOk))

  return (
    <DialogRoot open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-none gap-0 overflow-hidden rounded-2xl border-border p-0 w-[min(96vw,1120px)]">
        <div className="flex h-[min(92dvh,780px)] flex-col bg-background">
          {/* ── Cabecera ── */}
          <header className="flex shrink-0 items-center gap-3 border-b border-border bg-card px-5 py-3 pr-12">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ShoppingCart className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-sm font-semibold text-foreground">Punto de venta</DialogTitle>
              <p className="text-[11px] text-muted-foreground">
                {view === 'exito' ? 'Venta registrada' : view === 'pago' ? 'Cobro' : 'Arma la compra y cobra'}
              </p>
            </div>
            {view !== 'exito' && itemCount > 0 ? (
              <span className="ml-auto hidden items-baseline gap-1.5 sm:flex">
                <span className="text-[11px] text-muted-foreground">Total</span>
                <span className="text-base font-bold tabular-nums text-foreground">{formatCOP(total)}</span>
              </span>
            ) : null}
          </header>

          {/* ── Cuerpo ── */}
          <div className="min-h-0 flex-1 overflow-hidden">
            {/* Paso 1: carrito */}
            {view === 'cart' && (
              <>
                {/* Desktop: dos columnas */}
                <div className="hidden h-full lg:grid lg:grid-cols-[1fr_360px]">
                  <div className="min-h-0 overflow-hidden border-r border-border">
                    <ProductCommandSearch
                      productSearch={productSearch}
                      setProductSearch={setProductSearch}
                      categoriaFiltro={categoriaFiltro}
                      setCategoriaFiltro={setCategoriaFiltro}
                      productosDisponibles={productosDisponibles}
                      productosQuery={productosQuery}
                      addProductToInvoice={addProductToInvoice}
                      addServiceItem={addServiceItem}
                      setInvoiceForm={setInvoiceForm}
                      puedeConsultarInventario={puedeConsultarInventario}
                      barcodeInput={barcodeInput}
                      setBarcodeInput={setBarcodeInput}
                      handleBarcodeScan={handleBarcodeScan}
                      buscarProductoPorBarcodeMutation={buscarProductoPorBarcodeMutation}
                      searchInputRef={searchInputRef}
                    />
                  </div>
                  <CartSidebar
                    invoiceForm={invoiceForm}
                    setInvoiceForm={setInvoiceForm}
                    invoiceTotals={invoiceTotals}
                    selectedOwnerData={selectedOwnerData}
                    selectOwner={selectOwner}
                    propietariosQuery={propietariosQuery}
                    ownerSearch={ownerSearch}
                    setOwnerSearch={setOwnerSearch}
                    updateInvoiceItem={updateInvoiceItem}
                    removeInvoiceItem={removeInvoiceItem}
                    onOpenPaymentModal={irACobrar}
                  />
                </div>

                {/* Mobile: segmentado productos / carrito */}
                <div className="flex h-full flex-col lg:hidden">
                  <div className="flex shrink-0 gap-1 border-b border-border bg-card p-1">
                    {[
                      { id: 'productos', label: 'Productos', icon: PackageSearch },
                      { id: 'carrito', label: `Carrito${itemCount ? ` · ${itemCount}` : ''}`, icon: ShoppingCart },
                    ].map((t) => {
                      const Icon = t.icon
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setMobilePane(t.id)}
                          className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition ${
                            mobilePane === t.id ? 'bg-primary/10 text-primary' : 'text-muted-foreground'
                          }`}
                        >
                          <Icon className="h-3.5 w-3.5" />
                          {t.label}
                        </button>
                      )
                    })}
                  </div>
                  <div className="min-h-0 flex-1 overflow-hidden">
                    {mobilePane === 'productos' ? (
                      <ProductCommandSearch
                        productSearch={productSearch}
                        setProductSearch={setProductSearch}
                        categoriaFiltro={categoriaFiltro}
                        setCategoriaFiltro={setCategoriaFiltro}
                        productosDisponibles={productosDisponibles}
                        productosQuery={productosQuery}
                        addProductToInvoice={(p) => { addProductToInvoice(p); setMobilePane('carrito') }}
                        addServiceItem={() => { addServiceItem(); setMobilePane('carrito') }}
                        setInvoiceForm={setInvoiceForm}
                        puedeConsultarInventario={puedeConsultarInventario}
                        barcodeInput={barcodeInput}
                        setBarcodeInput={setBarcodeInput}
                        handleBarcodeScan={handleBarcodeScan}
                        buscarProductoPorBarcodeMutation={buscarProductoPorBarcodeMutation}
                        searchInputRef={searchInputRef}
                      />
                    ) : (
                      <CartSidebar
                        invoiceForm={invoiceForm}
                        setInvoiceForm={setInvoiceForm}
                        invoiceTotals={invoiceTotals}
                        selectedOwnerData={selectedOwnerData}
                        selectOwner={selectOwner}
                        propietariosQuery={propietariosQuery}
                        ownerSearch={ownerSearch}
                        setOwnerSearch={setOwnerSearch}
                        updateInvoiceItem={updateInvoiceItem}
                        removeInvoiceItem={removeInvoiceItem}
                        onOpenPaymentModal={irACobrar}
                      />
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Paso 2: cobro — el vuelto es el protagonista */}
            {view === 'pago' && (
              <div className="mx-auto flex h-full max-w-md flex-col px-6 py-5">
                <div className="rounded-2xl border border-border bg-card px-6 py-5 text-center">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Total a cobrar
                  </p>
                  <p className="mt-1 text-[2.5rem] font-bold leading-none tabular-nums text-foreground">
                    {formatCOP(total)}
                  </p>
                  <span className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold text-foreground">
                    {MetodoIcon && <MetodoIcon className="h-3.5 w-3.5 text-primary" />}
                    {metodoLabel}
                  </span>
                </div>

                {esEfectivo ? (
                  <div className="mt-4 space-y-3">
                    <div className="flex items-baseline justify-between">
                      <label htmlFor="pos-recibido" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Recibido
                      </label>
                      {cashSuggestions.length > 0 && (
                        <div className="flex gap-1.5">
                          {cashSuggestions.map((amount, i) => (
                            <button
                              key={amount}
                              type="button"
                              onClick={() => setMontoRecibido(String(amount))}
                              className={`rounded-lg border px-2 py-1 text-[11px] font-semibold tabular-nums transition ${
                                monto === amount
                                  ? 'border-primary bg-primary/10 text-primary'
                                  : 'border-border bg-card text-muted-foreground hover:text-foreground'
                              }`}
                            >
                              {i === 0 ? 'Exacto' : `$${(amount / 1000).toLocaleString('es-CO')}k`}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <input
                      id="pos-recibido"
                      type="number"
                      inputMode="numeric"
                      value={montoRecibido}
                      onChange={(e) => setMontoRecibido(e.target.value)}
                      placeholder="$ 0"
                      autoFocus
                      className={`w-full rounded-xl border-2 bg-card px-4 py-3 text-right text-2xl font-bold tabular-nums text-foreground placeholder:font-normal placeholder:text-muted-foreground/60 focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${
                        montoRecibido && !vueltoOk ? 'border-red-300 focus:border-red-400' : 'border-border focus:border-primary'
                      }`}
                    />
                    {/* Vuelto: el número que el cajero necesita ver grande */}
                    <div
                      className={`flex items-center justify-between rounded-xl px-4 py-3 ${
                        montoRecibido && vueltoOk ? 'bg-primary/10' : montoRecibido ? 'bg-red-50' : 'bg-muted'
                      }`}
                    >
                      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {montoRecibido && !vueltoOk ? 'Falta' : 'Vuelto'}
                      </span>
                      <span
                        className={`text-2xl font-bold tabular-nums ${
                          !montoRecibido ? 'text-muted-foreground/50' : vueltoOk ? 'text-primary' : 'text-red-600'
                        }`}
                      >
                        {formatCOP(Math.abs(montoRecibido ? vuelto : 0))}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="mt-4 rounded-xl border border-border bg-muted px-4 py-3 text-center text-sm text-muted-foreground">
                    Pago con {metodoLabel.toLowerCase()} — sin vuelto.
                  </p>
                )}

                <div className="mt-auto space-y-2 pt-5">
                  <button
                    type="button"
                    onClick={confirmarVenta}
                    disabled={isPending || !puedeConfirmar}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-bold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isPending ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> Registrando…</>
                    ) : (
                      <>Registrar venta <ArrowRight className="h-4 w-4" /></>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setView('cart')}
                    disabled={isPending}
                    className="flex w-full items-center justify-center gap-1.5 py-1.5 text-xs font-semibold text-muted-foreground transition hover:text-foreground disabled:opacity-50"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" /> Volver al carrito
                  </button>
                </div>
              </div>
            )}

            {/* Paso 3: éxito — cuánto devolver */}
            {view === 'exito' && snapshot && (
              <div className="mx-auto flex h-full max-w-md flex-col items-center justify-center px-6 py-8 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <p className="mt-4 text-lg font-semibold text-foreground">Venta registrada</p>
                <p className="text-sm text-muted-foreground">Se descontó el inventario y quedó en el historial.</p>

                <dl className="mt-6 w-full space-y-px overflow-hidden rounded-xl border border-border bg-border text-sm">
                  <div className="flex items-center justify-between bg-card px-4 py-2.5">
                    <dt className="text-muted-foreground">Total</dt>
                    <dd className="font-semibold tabular-nums text-foreground">{formatCOP(snapshot.total)}</dd>
                  </div>
                  <div className="flex items-center justify-between bg-card px-4 py-2.5">
                    <dt className="text-muted-foreground">Recibido</dt>
                    <dd className="font-semibold tabular-nums text-foreground">{formatCOP(snapshot.recibido)}</dd>
                  </div>
                  <div className="flex items-center justify-between bg-primary/5 px-4 py-3">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Devolver</dt>
                    <dd className="text-2xl font-bold tabular-nums text-primary">{formatCOP(snapshot.vuelto)}</dd>
                  </div>
                </dl>

                <div className="mt-6 flex w-full gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 rounded-xl border border-border bg-card py-3 text-sm font-semibold text-foreground transition hover:bg-muted"
                  >
                    Cerrar
                  </button>
                  <button
                    type="button"
                    onClick={nuevaVenta}
                    className="flex-1 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground transition hover:bg-primary/90"
                  >
                    Nueva venta
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </DialogRoot>
  )
}
