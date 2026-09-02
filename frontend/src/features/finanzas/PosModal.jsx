import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, ArrowRight, CheckCircle2, FileText, Loader2, PackageSearch, Printer, ShoppingCart } from 'lucide-react'
import { DialogRoot, DialogContent, DialogTitle } from '@/components/ui/dialog'
import ProductCommandSearch from './ProductCommandSearch'
import CartSidebar from './CartSidebar'
import { PAYMENT_METHOD_OPTIONS } from './useFinanzasFacturacion'
import { PAYMENT_METHOD_ICONS } from './finanzasConstants'
import { finanzasApi } from './finanzasApi'
import { imprimirTirilla, formatDateTime } from './reciboTermico'
import MoneyInput from '@/components/shared/MoneyInput'
import { useAuthStore } from '@/store/authStore'

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
 *   carrito  →  cobro (recibido / vuelto)  →  éxito (cuánto devolver)  →  factura
 * El último paso muestra la factura recién emitida sin salir del POS, para no
 * mandar al cajero al historial a buscar lo que acaba de vender.
 * Solo venta interna: no menciona facturación electrónica en ningún paso.
 */
export default function PosModal({
  open,
  onClose,
  facturacionHook,
  puedeConsultarInventario,
  ventaExitosa,
  facturaCreadaId,
  onNuevaVenta,
}) {
  const [view, setView] = useState('cart')          // cart | pago | exito | factura
  const [mobilePane, setMobilePane] = useState('productos')
  const [montoRecibido, setMontoRecibido] = useState('')
  const [snapshot, setSnapshot] = useState(null)     // { total, recibido, vuelto, metodo }
  const searchInputRef = useRef(null)
  const clinica = useAuthStore((state) => state.clinica)

  const {
    ownerSearch, setOwnerSearch,
    productSearch, setProductSearch,
    categoriaFiltro, setCategoriaFiltro,
    servicioSearch, setServicioSearch,
    barcodeInput, setBarcodeInput,
    invoiceForm, setInvoiceForm,
    productosDisponibles, serviciosDisponibles,
    selectedOwnerData, selectOwner,
    invoiceTotals,
    propietariosQuery, productosQuery, serviciosQuery,
    crearFacturaMutation,
    buscarProductoPorBarcodeMutation,
    handleCrearFactura, handleBarcodeScan,
    addServiceFromCatalog, addProductToInvoice,
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

  // Se carga solo al pedir "Ver factura": el paso de vuelto no necesita el detalle.
  const facturaQuery = useQuery({
    queryKey: ['pos-factura-emitida', facturaCreadaId],
    queryFn: () => finanzasApi.obtenerFactura(facturaCreadaId),
    enabled: Boolean(facturaCreadaId) && view === 'factura',
  })

  const facturaEmitida = facturaQuery.data?.factura || null

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
                {view === 'factura'
                  ? 'Factura emitida'
                  : view === 'exito'
                    ? 'Venta registrada'
                    : view === 'pago'
                      ? 'Cobro'
                      : 'Arma la compra y cobra'}
              </p>
            </div>
            {view !== 'exito' && view !== 'factura' && itemCount > 0 ? (
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
                      servicioSearch={servicioSearch}
                      setServicioSearch={setServicioSearch}
                      serviciosDisponibles={serviciosDisponibles}
                      serviciosQuery={serviciosQuery}
                      addProductToInvoice={addProductToInvoice}
                      addServiceFromCatalog={addServiceFromCatalog}
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
                        servicioSearch={servicioSearch}
                        setServicioSearch={setServicioSearch}
                        serviciosDisponibles={serviciosDisponibles}
                        serviciosQuery={serviciosQuery}
                        addProductToInvoice={(p) => { addProductToInvoice(p); setMobilePane('carrito') }}
                        addServiceFromCatalog={(s) => { addServiceFromCatalog(s); setMobilePane('carrito') }}
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
              <div className="flex h-full flex-col lg:flex-row">

                {/* Resumen de la venta: el cajero confirma que esta cobrando
                    sin tener que devolverse al carrito. */}
                <aside className="hidden shrink-0 flex-col border-r border-border bg-muted/30 p-5 lg:flex lg:w-[340px]">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Resumen de la venta
                  </p>
                  <div className="mt-3 min-h-0 flex-1 overflow-y-auto rounded-xl border border-border bg-card">
                    {items.map((item) => {
                      const qty = parseFloat(item.cantidad) || 0
                      const precio = parseFloat(item.precioUnitario) || 0
                      return (
                        <div
                          key={item.id}
                          className="flex items-start justify-between gap-3 border-b border-border/60 px-4 py-2.5 last:border-b-0"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-xs font-semibold text-foreground">
                              {item.descripcion || 'Sin descripción'}
                            </p>
                            <p className="mt-0.5 text-[11px] text-muted-foreground">
                              {qty} × {formatCOP(precio)}
                            </p>
                          </div>
                          <span className="shrink-0 text-xs font-bold tabular-nums text-foreground">
                            {formatCOP(Math.max(qty * precio, 0))}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                  <div className="mt-4 flex items-baseline justify-between border-t border-dashed border-border pt-3">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Total
                    </span>
                    <span className="text-2xl font-bold tracking-tight tabular-nums text-foreground">
                      {formatCOP(total)}
                    </span>
                  </div>
                </aside>

                <div className="mx-auto flex h-full w-full max-w-md flex-col px-6 py-5">
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
                    <MoneyInput
                      id="pos-recibido"
                      value={montoRecibido}
                      onChange={(value) => setMontoRecibido(value === 0 ? '' : String(value))}
                      placeholder="$ 0"
                      autoFocus
                      className={`w-full rounded-xl border-2 bg-card px-4 py-3 text-right text-2xl font-bold tabular-nums text-foreground placeholder:font-normal placeholder:text-muted-foreground/60 focus:outline-none ${
                        montoRecibido && !vueltoOk ? 'border-red-300 focus:border-red-400 dark:border-red-600 dark:focus:border-red-500' : 'border-border focus:border-primary'
                      }`}
                    />
                    {/* Vuelto: el número que el cajero necesita ver grande */}
                    <div
                      className={`flex items-center justify-between rounded-xl px-4 py-3 ${
                        montoRecibido && vueltoOk ? 'bg-primary/10' : montoRecibido ? 'bg-red-50 dark:bg-red-900/30' : 'bg-muted'
                      }`}
                    >
                      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {montoRecibido && !vueltoOk ? 'Falta' : 'Vuelto'}
                      </span>
                      <span
                        className={`text-2xl font-bold tabular-nums ${
                          !montoRecibido ? 'text-muted-foreground/50' : vueltoOk ? 'text-primary' : 'text-red-600 dark:text-red-400'
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

                {/* El vuelto es lo unico que el cajero necesita leer de lejos;
                    total y recibido quedan de respaldo, en letra menor. */}
                {snapshot.vuelto > 0 && (
                  <div className="mt-6 w-full rounded-2xl border border-primary/25 bg-primary/10 px-6 py-5">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      Devolver al cliente
                    </p>
                    <p className="mt-1 text-[2.75rem] font-bold leading-none tracking-tight tabular-nums text-primary">
                      {formatCOP(snapshot.vuelto)}
                    </p>
                  </div>
                )}

                <dl className={`w-full space-y-px overflow-hidden rounded-xl border border-border bg-border text-sm ${snapshot.vuelto > 0 ? 'mt-3' : 'mt-6'}`}>
                  <div className="flex items-center justify-between bg-card px-4 py-2.5">
                    <dt className="text-muted-foreground">Total</dt>
                    <dd className="font-semibold tabular-nums text-foreground">{formatCOP(snapshot.total)}</dd>
                  </div>
                  <div className="flex items-center justify-between bg-card px-4 py-2.5">
                    <dt className="text-muted-foreground">Recibido</dt>
                    <dd className="font-semibold tabular-nums text-foreground">{formatCOP(snapshot.recibido)}</dd>
                  </div>
                  <div className="flex items-center justify-between bg-card px-4 py-2.5">
                    <dt className="text-muted-foreground">Pago</dt>
                    <dd className="font-semibold text-foreground">{snapshot.metodo}</dd>
                  </div>
                </dl>

                {facturaCreadaId ? (
                  <button
                    type="button"
                    onClick={() => setView('factura')}
                    className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card py-3 text-sm font-semibold text-foreground transition hover:bg-muted"
                  >
                    <FileText className="h-4 w-4" />
                    Ver factura
                  </button>
                ) : null}

                <div className={`flex w-full gap-2 ${facturaCreadaId ? 'mt-2' : 'mt-6'}`}>
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

            {/* Paso 4: la factura recién emitida, dentro del mismo POS */}
            {view === 'factura' && (
              <div className="h-full overflow-y-auto px-5 py-5">
                <div className="mx-auto max-w-lg">
                  {facturaQuery.isError ? (
                    <div className="border border-red-200 bg-red-50 px-4 py-4 text-sm leading-7 text-red-700 dark:border-red-700/60 dark:bg-red-900/30 dark:text-red-200">
                      No fue posible cargar la factura. Quedó registrada y puedes verla en el
                      historial.
                    </div>
                  ) : facturaQuery.isLoading ? (
                    <div className="space-y-3">
                      {[0, 1, 2].map((i) => (
                        <div key={i} className="h-16 animate-pulse rounded-xl border border-border bg-muted" />
                      ))}
                    </div>
                  ) : facturaEmitida ? (
                    <div className="space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-lg font-bold text-foreground">{facturaEmitida.numero}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {formatDateTime(facturaEmitida.createdAt || facturaEmitida.fecha)}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => imprimirTirilla({ factura: facturaEmitida, clinica })}
                          className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground transition hover:bg-muted"
                        >
                          <Printer className="h-4 w-4" />
                          Imprimir tirilla
                        </button>
                      </div>

                      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border text-sm">
                        <div className="bg-card px-4 py-2.5">
                          <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">Cliente</dt>
                          <dd className="mt-0.5 truncate font-semibold text-foreground">
                            {facturaEmitida.propietario?.nombre || 'Consumidor final'}
                          </dd>
                        </div>
                        <div className="bg-card px-4 py-2.5">
                          <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">Pago</dt>
                          <dd className="mt-0.5 truncate font-semibold text-foreground">
                            {snapshot?.metodo || facturaEmitida.metodoPago}
                          </dd>
                        </div>
                      </dl>

                      <div className="overflow-hidden rounded-xl border border-border">
                        <table className="min-w-full divide-y divide-border text-sm">
                          <tbody className="divide-y divide-border">
                            {(facturaEmitida.items || []).map((item) => (
                              <tr key={item.id}>
                                <td className="px-3 py-2.5">
                                  <p className="font-medium text-foreground">{item.descripcion}</p>
                                  <p className="text-[11px] text-muted-foreground">
                                    {item.cantidad} x {formatCOP(Number(item.precioUnitario))}
                                  </p>
                                </td>
                                <td className="px-3 py-2.5 text-right font-semibold tabular-nums text-foreground">
                                  {formatCOP(Number(item.subtotal))}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="border-t border-border bg-muted">
                              <td className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                Total
                              </td>
                              <td className="px-3 py-3 text-right text-base font-bold tabular-nums text-foreground">
                                {formatCOP(Number(facturaEmitida.total))}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>

                      <div className="flex gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setView('exito')}
                          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-card py-3 text-sm font-semibold text-foreground transition hover:bg-muted"
                        >
                          <ArrowLeft className="h-4 w-4" />
                          Volver
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
                  ) : null}
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </DialogRoot>
  )
}
