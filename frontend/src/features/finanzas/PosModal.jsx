import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, ArrowRight, CheckCircle2, Download, FileText, Loader2, Printer, ShoppingCart } from 'lucide-react'
import { DialogRoot, DialogContent, DialogTitle } from '@/components/ui/dialog'
import ProductCommandSearch from './ProductCommandSearch'
import CartSidebar from './CartSidebar'
import VencimientoCajaDialog from './VencimientoCajaDialog'
import { PAYMENT_METHOD_OPTIONS } from './useFinanzasFacturacion'
import { PAYMENT_METHOD_ICONS } from './finanzasConstants'
import { cuentaDelCobro } from './cuentaCobro'
import { useCuentasRecaudo } from './useCuentasRecaudo'
import { finanzasApi } from './finanzasApi'
import { imprimirTirilla, formatDateTime } from './reciboTermico'
import { descargarFacturaPdf } from './facturaPdf'
import MoneyInput from '@/components/shared/MoneyInput'
import { useAuthStore } from '@/store/authStore'
import { hasAnyRole } from '@/lib/permissions'
import { formatShortDate } from '@/features/dashboard/dashboardUtils'
import { PLAZOS_CREDITO, sumarDias } from './resumenFinanzas'
import { hoyLocal } from '@/lib/fecha'

// Plazo opcional del crédito: rápido con botones o escrito a mano. Sin plazo el
// fiado no vence (como siempre); con plazo, Por cobrar avisa cuando se pase.
function PlazoCredito({ plazo, onPlazo, cliente }) {
  const escrito = plazo !== '' && !PLAZOS_CREDITO.includes(Number(plazo))
  const opcion = (activa) =>
    `h-10 rounded-lg px-3.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
      activa ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground hover:brightness-95'
    }`
  return (
    <div className="mt-6 flex flex-col gap-3 rounded-xl bg-muted/60 p-4">
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-semibold text-foreground">¿En cuántos días paga?</legend>
        <div className="flex flex-wrap gap-2">
          <button type="button" aria-pressed={plazo === ''} onClick={() => onPlazo('')} className={opcion(plazo === '')}>
            Sin plazo
          </button>
          {PLAZOS_CREDITO.map((dias) => (
            <button key={dias} type="button" aria-pressed={Number(plazo) === dias} onClick={() => onPlazo(String(dias))} className={opcion(Number(plazo) === dias)}>
              {dias} días
            </button>
          ))}
          <label className={`flex h-10 items-center gap-2 rounded-lg px-3 text-sm ${escrito ? 'bg-primary/10 ring-2 ring-primary' : 'bg-card'}`}>
            <span className="text-muted-foreground">Otro</span>
            <input
              type="number"
              min={1}
              max={365}
              inputMode="numeric"
              value={escrito ? plazo : ''}
              onChange={(e) => onPlazo(e.target.value.replace(/\D/g, '').slice(0, 3))}
              aria-label="Plazo en días"
              placeholder="días"
              className="w-14 bg-transparent text-right font-semibold tabular-nums text-foreground outline-none"
            />
          </label>
        </div>
      </fieldset>
      <p className="text-sm text-muted-foreground">
        {plazo
          ? <>Queda en pagar <span className="font-semibold text-foreground">el {formatShortDate(sumarDias(hoyLocal(), plazo))}</span>. </>
          : 'Sin fecha de pago. '}
        Queda por cobrar a {cliente || 'el cliente'}; los abonos se registran en Por cobrar.
      </p>
    </div>
  )
}

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
 *
 * Con `embedded` se pinta dentro de la página (pestaña Venta de Caja) en lugar
 * de en una ventana: mismo flujo, sin cabecera propia ni botón de cerrar.
 */
export default function PosModal({
  open,
  onClose,
  facturacionHook,
  puedeConsultarInventario,
  ventaExitosa,
  facturaCreadaId,
  onNuevaVenta,
  embedded = false,
}) {
  const [view, setView] = useState('cart')          // cart | pago | exito | factura
  const [mobilePane, setMobilePane] = useState('productos')
  const [montoRecibido, setMontoRecibido] = useState('')
  const [snapshot, setSnapshot] = useState(null)     // { total, recibido, vuelto, metodo }
  const [generandoPdf, setGenerandoPdf] = useState(false)
  const searchInputRef = useRef(null)
  const clinica = useAuthStore((state) => state.clinica)
  // La factura impresa dice quien la imprimio.
  const usuario = useAuthStore((state) => state.usuario)
  const { data: cuentasRecaudo = [] } = useCuentasRecaudo({ soloActivas: true })

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
    vencimientoPendiente, setVencimientoPendiente, aplicarRelevoVencimiento,
  } = facturacionHook

  // Mismos roles que POST /inventario/:id/vencimiento: recepción y facturación
  // solo ven el aviso.
  const puedeRelevarVencimiento = hasAnyRole(usuario, ['admin', 'superadmin', 'auxiliar'])
  const abrirVencimientoProducto = (producto) => setVencimientoPendiente({ producto })
  const abrirVencimientoItem = (item) =>
    setVencimientoPendiente({
      itemId: item.id,
      producto: {
        id: item.productoId,
        nombre: item.descripcion,
        stock: item.stock,
        fechaVencimiento: item.fechaVencimiento,
      },
    })

  const items = invoiceForm?.items || []
  const itemCount = items.length
  // Unidades en la cuenta: el resumen del celular sube con cada toque.
  const unidades = items.reduce((suma, item) => suma + Math.max(parseFloat(item.cantidad) || 0, 0), 0)
  const total = invoiceTotals?.total ?? 0
  const metodoPago = invoiceForm?.metodoPago || 'efectivo'
  const esEfectivo = metodoPago === 'efectivo'
  const esCredito = metodoPago === 'credito'
  const monto = parseFloat(montoRecibido) || 0
  const vuelto = monto - total
  const vueltoOk = vuelto >= 0
  const metodoBase = PAYMENT_METHOD_OPTIONS.find((m) => m.value === metodoPago)?.label || metodoPago
  // La transferencia muestra a qué cuenta de la clínica entró («Transferencia · Nequi»).
  const cuentaId = cuentaDelCobro({ metodoPago, cuentaRecaudoId: invoiceForm?.cuentaRecaudoId, cuentas: cuentasRecaudo })
  const nombreCuenta = cuentasRecaudo.find((cuenta) => cuenta.id === cuentaId)?.nombre
  const metodoLabel = nombreCuenta ? `${metodoBase} · ${nombreCuenta}` : metodoBase
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

  // En el celular la página entera hace scroll: al cambiar de paso (catálogo,
  // cuenta, cobro, vuelto) se vuelve arriba para no caer a mitad del siguiente.
  useEffect(() => {
    if (!embedded || typeof window === 'undefined') return
    if (window.matchMedia?.('(max-width: 1023px)').matches) window.scrollTo?.({ top: 0 })
  }, [embedded, view, mobilePane])

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
    setSnapshot({ total, recibido: esEfectivo ? monto : esCredito ? 0 : total, vuelto: esEfectivo ? vuelto : 0, metodo: metodoLabel })
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

  // La generación es asíncrona (jsPDF se carga bajo demanda y el logo viaja por
  // red), así que el botón se bloquea mientras corre para no soltar dos archivos.
  const descargarPdf = async () => {
    setGenerandoPdf(true)
    try {
      await descargarFacturaPdf({ factura: facturaEmitida, clinica, usuario })
    } finally {
      setGenerandoPdf(false)
    }
  }

  const puedeConfirmar = itemCount > 0 && (!esEfectivo || (montoRecibido !== '' && vueltoOk))

  const contenido = (
        <div className={embedded ? 'flex h-full flex-col overflow-hidden rounded-2xl bg-background' : 'flex h-[min(92dvh,780px)] flex-col bg-background'}>
          {/* ── Cabecera (solo en la ventana: en la página ya hay título) ── */}
          {embedded ? null : (
          <header className="flex shrink-0 items-center gap-3 bg-card px-6 py-4 pr-14">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-accent-foreground">
              <ShoppingCart className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-xl font-semibold tracking-[-0.02em] text-foreground">Nueva venta</DialogTitle>
              <p className="text-[13px] text-muted-foreground">
                {view === 'factura'
                  ? 'Factura emitida'
                  : view === 'exito'
                    ? 'Venta registrada'
                    : view === 'pago'
                      ? 'Cobro'
                      : 'Busca productos o servicios, arma la cuenta y cobra'}
              </p>
            </div>
            {view !== 'exito' && view !== 'factura' && itemCount > 0 ? (
              <span className="ml-auto hidden items-baseline gap-1.5 sm:flex">
                <span className="text-sm text-muted-foreground">Total</span>
                <span className="text-xl font-semibold tracking-[-0.02em] tabular-nums text-foreground">{formatCOP(total)}</span>
              </span>
            ) : null}
          </header>
          )}

          {/* ── Cuerpo ── */}
          <div className="min-h-0 flex-1 overflow-hidden">
            {/* Paso 1: carrito */}
            {view === 'cart' && (
              <>
                {/* Desktop: dos columnas */}
                <div className="hidden h-full lg:grid lg:grid-cols-[1fr_400px]">
                  <div className="min-h-0 overflow-hidden">
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
                      onProductoVencido={abrirVencimientoProducto}
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
                    onRevisarVencimiento={abrirVencimientoItem}
                  />
                </div>

                {/* Celular: el catálogo en una columna con la cuenta como resumen
                    fijo abajo; «Cobrar» abre la cuenta (cliente, cantidades y
                    medio de pago) y de ahí sigue el paso de cobro. */}
                <div className="flex flex-col lg:hidden">
                  <div className="min-w-0">
                    {mobilePane === 'productos' ? (
                      <>
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
                        onProductoVencido={abrirVencimientoProducto}
                        setInvoiceForm={setInvoiceForm}
                        puedeConsultarInventario={puedeConsultarInventario}
                        barcodeInput={barcodeInput}
                        setBarcodeInput={setBarcodeInput}
                        handleBarcodeScan={handleBarcodeScan}
                        buscarProductoPorBarcodeMutation={buscarProductoPorBarcodeMutation}
                        searchInputRef={searchInputRef}
                        itemsCarrito={items}
                        updateInvoiceItem={updateInvoiceItem}
                        removeInvoiceItem={removeInvoiceItem}
                      />
                      {/* Lo que ocupa el resumen fijo, para no tapar el último producto. */}
                      <div aria-hidden className="h-24" />
                      <div className="fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-20 border-t border-border bg-card px-3 py-2.5">
                        {itemCount ? (
                          // Todo el resumen abre la cuenta: cliente, cantidades y medio de pago.
                          <button
                            type="button"
                            onClick={() => setMobilePane('carrito')}
                            aria-label={`Cobrar ${unidades} ${unidades === 1 ? 'ítem' : 'ítems'} por ${formatCOP(total)}`}
                            className="flex h-[52px] w-full items-center gap-3 rounded-xl bg-primary pl-4 pr-1.5 text-primary-foreground transition active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          >
                            <ShoppingCart aria-hidden className="h-5 w-5 shrink-0" />
                            <span className="min-w-0 flex-1 truncate text-left text-[15px] font-semibold tabular-nums">
                              {unidades} {unidades === 1 ? 'ítem' : 'ítems'} · {formatCOP(total)}
                            </span>
                            <span className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg bg-card px-4 text-[15px] font-semibold text-primary">
                              Cobrar
                              <ArrowRight aria-hidden className="h-4 w-4" />
                            </span>
                          </button>
                        ) : (
                          <div className="flex h-[52px] items-center gap-3 px-1">
                            <ShoppingCart aria-hidden className="h-5 w-5 shrink-0 text-muted-foreground" />
                            <p className="min-w-0 flex-1 text-sm text-muted-foreground">La cuenta está vacía: toca un producto para agregarlo.</p>
                          </div>
                        )}
                      </div>
                      </>
                    ) : (
                      <>
                      <button
                        type="button"
                        onClick={() => setMobilePane('productos')}
                        className="mb-3 inline-flex h-11 items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-primary transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <ArrowLeft aria-hidden className="h-4 w-4" />
                        Agregar más productos
                      </button>
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
                        onRevisarVencimiento={abrirVencimientoItem}
                      />
                      </>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Paso 2: cobro — el vuelto es el protagonista */}
            {view === 'pago' && (
              <div className="flex h-full flex-col gap-5 overflow-y-auto p-0 lg:flex-row lg:overflow-hidden lg:p-5">

                {/* Resumen de la venta: el cajero confirma que esta cobrando
                    sin tener que devolverse al carrito. */}
                <aside className="hidden shrink-0 flex-col rounded-2xl bg-card p-6 lg:flex lg:w-[360px]">
                  <h3 className="text-lg font-semibold tracking-[-0.02em] text-foreground">
                    Cuenta
                  </h3>
                  <div className="mt-2 min-h-0 flex-1 overflow-y-auto">
                    {items.map((item) => {
                      const qty = parseFloat(item.cantidad) || 0
                      const precio = parseFloat(item.precioUnitario) || 0
                      return (
                        <div
                          key={item.id}
                          className="flex items-start justify-between gap-3 border-b border-border/60 py-3 last:border-b-0"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-[15px] font-semibold text-foreground">
                              {item.descripcion || 'Sin descripción'}
                            </p>
                            <p className="mt-0.5 text-[13px] tabular-nums text-muted-foreground">
                              {qty} × {formatCOP(precio)}
                            </p>
                          </div>
                          <span className="shrink-0 text-[15px] font-semibold tabular-nums text-foreground">
                            {formatCOP(Math.max(qty * precio, 0))}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                  <div className="mt-4 flex items-baseline justify-between pt-2">
                    <span className="text-[17px] font-semibold text-foreground">
                      Total
                    </span>
                    <span className="text-[34px] font-semibold leading-none tracking-[-0.03em] tabular-nums text-foreground">
                      {formatCOP(total)}
                    </span>
                  </div>
                </aside>

                <div className="flex min-h-0 w-full flex-1 flex-col rounded-2xl bg-card p-5 lg:overflow-y-auto lg:p-6">
                <div className="flex flex-col gap-2">
                  <h3 className="text-lg font-semibold tracking-[-0.02em] text-foreground">
                    Total a cobrar
                  </h3>
                  <p className="text-[44px] font-semibold leading-none tracking-[-0.04em] tabular-nums text-foreground">
                    {formatCOP(total)}
                  </p>
                  <span className="mt-1 inline-flex w-fit items-center gap-1.5 rounded-md bg-secondary px-2.5 py-1 text-[13px] font-semibold text-secondary-foreground">
                    {MetodoIcon && <MetodoIcon className="h-4 w-4 text-primary" />}
                    {metodoLabel}
                  </span>
                </div>

                {esEfectivo ? (
                  <div className="mt-6 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <label htmlFor="pos-recibido" className="text-sm font-semibold text-foreground">
                        Recibido
                      </label>
                      {cashSuggestions.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {cashSuggestions.map((amount, i) => (
                            <button
                              key={amount}
                              type="button"
                              onClick={() => setMontoRecibido(String(amount))}
                              aria-pressed={monto === amount}
                              className={`h-11 rounded-lg px-3 text-[13px] font-semibold tabular-nums transition lg:h-9 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                                monto === amount
                                  ? 'bg-foreground text-background'
                                  : 'bg-secondary text-secondary-foreground hover:brightness-95'
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
                      className={`h-14 w-full rounded-lg border bg-card px-4 text-right text-2xl font-semibold tabular-nums text-foreground placeholder:font-normal placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                        montoRecibido && !vueltoOk ? 'border-danger' : 'border-input'
                      }`}
                    />
                    {/* Vuelto: el número que el cajero necesita ver grande */}
                    <div
                      className={`flex h-14 items-center justify-between rounded-lg px-4 ${
                        montoRecibido && vueltoOk ? 'bg-success-soft' : montoRecibido ? 'bg-danger-soft' : 'bg-muted'
                      }`}
                    >
                      <span className={`text-sm font-semibold ${
                        montoRecibido && vueltoOk ? 'text-success' : montoRecibido ? 'text-danger' : 'text-muted-foreground'
                      }`}>
                        {montoRecibido && !vueltoOk ? 'Falta' : 'Vuelto'}
                      </span>
                      <span
                        className={`text-2xl font-semibold tracking-[-0.02em] tabular-nums ${
                          !montoRecibido ? 'text-muted-foreground' : vueltoOk ? 'text-success' : 'text-danger'
                        }`}
                      >
                        {formatCOP(Math.abs(montoRecibido ? vuelto : 0))}
                      </span>
                    </div>
                  </div>
                ) : esCredito ? (
                  <PlazoCredito
                    plazo={invoiceForm?.plazoCreditoDias || ''}
                    onPlazo={(valor) => setInvoiceForm((curr) => ({ ...curr, plazoCreditoDias: valor }))}
                    cliente={selectedOwnerData?.nombre}
                  />
                ) : (
                  <p className="mt-6 rounded-lg bg-muted px-4 py-3 text-sm text-muted-foreground">
                    {`Pago con ${metodoBase.toLowerCase()}${nombreCuenta ? ` a ${nombreCuenta}` : ''} — sin vuelto.`}
                  </p>
                )}

                <div className="mt-auto space-y-2 pt-5">
                  <button
                    type="button"
                    onClick={confirmarVenta}
                    disabled={isPending || !puedeConfirmar}
                    className="flex h-14 w-full items-center justify-center gap-2 rounded-lg bg-primary text-base font-semibold text-primary-foreground transition hover:brightness-110 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:brightness-100"
                  >
                    {isPending ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> Registrando…</>
                    ) : (
                      <><span className="tabular-nums">{esCredito ? `Registrar venta a crédito por ${formatCOP(total)}` : `Cobrar ${formatCOP(total)}`}</span> <ArrowRight className="h-4 w-4" /></>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setView('cart')}
                    disabled={isPending}
                    className="flex h-11 w-full items-center justify-center gap-1.5 rounded-lg text-sm font-semibold text-muted-foreground transition hover:bg-muted lg:h-10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                  >
                    <ArrowLeft className="h-4 w-4" /> Volver a la cuenta
                  </button>
                </div>
                </div>
              </div>
            )}

            {/* Paso 3: éxito — cuánto devolver */}
            {view === 'exito' && snapshot && (
              <div className="mx-auto flex h-full max-w-md flex-col items-center justify-center overflow-y-auto px-6 py-8 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-success-soft text-success">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <p className="mt-4 text-[22px] font-semibold tracking-[-0.02em] text-foreground">Venta registrada</p>
                <p className="text-sm text-muted-foreground">Se descontó el inventario y quedó en el historial.</p>

                {/* El vuelto es lo unico que el cajero necesita leer de lejos;
                    total y recibido quedan de respaldo, en letra menor. */}
                {snapshot.vuelto > 0 && (
                  <div className="mt-6 w-full rounded-2xl bg-success-soft px-6 py-5">
                    <p className="text-sm font-semibold text-success">
                      Devolver al cliente
                    </p>
                    <p className="mt-2 text-[48px] font-semibold leading-none tracking-[-0.04em] tabular-nums text-success">
                      {formatCOP(snapshot.vuelto)}
                    </p>
                  </div>
                )}

                <dl className={`w-full overflow-hidden rounded-xl bg-card text-[15px] ${snapshot.vuelto > 0 ? 'mt-3' : 'mt-6'}`}>
                  <div className="flex items-center justify-between border-b border-border/60 px-4 py-3 last:border-b-0">
                    <dt className="text-muted-foreground">Total</dt>
                    <dd className="font-semibold tabular-nums text-foreground">{formatCOP(snapshot.total)}</dd>
                  </div>
                  <div className="flex items-center justify-between border-b border-border/60 px-4 py-3 last:border-b-0">
                    <dt className="text-muted-foreground">Recibido</dt>
                    <dd className="font-semibold tabular-nums text-foreground">{formatCOP(snapshot.recibido)}</dd>
                  </div>
                  <div className="flex items-center justify-between border-b border-border/60 px-4 py-3 last:border-b-0">
                    <dt className="text-muted-foreground">Pago</dt>
                    <dd className="font-semibold text-foreground">{snapshot.metodo}</dd>
                  </div>
                </dl>

                {facturaCreadaId ? (
                  <button
                    type="button"
                    onClick={() => setView('factura')}
                    className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-secondary text-sm font-semibold text-secondary-foreground transition hover:brightness-95 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <FileText className="h-4 w-4" />
                    Ver factura
                  </button>
                ) : null}

                <div className={`flex w-full gap-2 ${facturaCreadaId ? 'mt-2' : 'mt-6'}`}>
                  {embedded ? null : (
                  <button
                    type="button"
                    onClick={onClose}
                    className="h-12 flex-1 rounded-lg bg-secondary text-sm font-semibold text-secondary-foreground transition hover:brightness-95 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    Cerrar
                  </button>
                  )}
                  <button
                    type="button"
                    onClick={nuevaVenta}
                    className="h-12 flex-1 rounded-lg bg-primary text-base font-semibold text-primary-foreground transition hover:brightness-110 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    Nueva venta
                  </button>
                </div>
              </div>
            )}

            {/* Paso 4: la factura recién emitida, dentro del mismo POS */}
            {view === 'factura' && (
              <div className="h-full overflow-y-auto p-5">
                <div className="mx-auto max-w-lg">
                  {facturaQuery.isError ? (
                    <div className="rounded-xl bg-danger-soft px-4 py-4 text-sm leading-6 text-danger">
                      No fue posible cargar la factura. Quedó registrada y puedes verla en el
                      historial.
                    </div>
                  ) : facturaQuery.isLoading ? (
                    <div className="space-y-3">
                      {[0, 1, 2].map((i) => (
                        <div key={i} className="h-16 animate-pulse rounded-xl bg-card" />
                      ))}
                    </div>
                  ) : facturaEmitida ? (
                    <div className="space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[22px] font-semibold tracking-[-0.02em] text-foreground">{facturaEmitida.numero}</p>
                          <p className="mt-0.5 text-[13px] text-muted-foreground">
                            {formatDateTime(facturaEmitida.createdAt || facturaEmitida.fecha)}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => imprimirTirilla({ factura: facturaEmitida, clinica })}
                            className="inline-flex h-11 items-center gap-2 px-3 rounded-lg bg-secondary text-sm font-semibold text-secondary-foreground transition hover:brightness-95 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:h-10"
                          >
                            <Printer className="h-4 w-4" />
                            Imprimir tirilla
                          </button>
                          {/* Formato carta para entregar o enviar al cliente. */}
                          <button
                            type="button"
                            onClick={descargarPdf}
                            disabled={generandoPdf}
                            className="inline-flex h-11 items-center gap-2 px-3 rounded-lg bg-secondary text-sm font-semibold text-secondary-foreground transition hover:brightness-95 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:h-10 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {generandoPdf ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Download className="h-4 w-4" />
                            )}
                            Descargar PDF
                          </button>
                        </div>
                      </div>

                      <dl className="grid grid-cols-2 gap-2 text-sm">
                        <div className="rounded-xl bg-card px-4 py-3">
                          <dt className="text-[13px] text-muted-foreground">Cliente</dt>
                          <dd className="mt-0.5 truncate font-semibold text-foreground">
                            {facturaEmitida.propietario?.nombre || 'Consumidor final'}
                          </dd>
                        </div>
                        <div className="rounded-xl bg-card px-4 py-3">
                          <dt className="text-[13px] text-muted-foreground">Pago</dt>
                          <dd className="mt-0.5 truncate font-semibold text-foreground">
                            {snapshot?.metodo || facturaEmitida.metodoPago}
                          </dd>
                        </div>
                      </dl>

                      <div className="overflow-hidden rounded-xl bg-card">
                        <table className="min-w-full text-sm">
                          <tbody className="divide-y divide-border/60">
                            {(facturaEmitida.items || []).map((item) => (
                              <tr key={item.id}>
                                <td className="px-4 py-3">
                                  <p className="font-medium text-foreground">{item.descripcion}</p>
                                  <p className="text-[13px] tabular-nums text-muted-foreground">
                                    {item.cantidad} x {formatCOP(Number(item.precioUnitario))}
                                  </p>
                                </td>
                                <td className="px-4 py-3 text-right font-semibold tabular-nums text-foreground">
                                  {formatCOP(Number(item.subtotal))}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="border-t border-border">
                              <td className="px-4 py-4 text-[15px] font-semibold text-foreground">
                                Total
                              </td>
                              <td className="px-4 py-4 text-right text-[28px] font-semibold tracking-[-0.03em] tabular-nums text-foreground">
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
                          className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-lg bg-secondary text-sm font-semibold text-secondary-foreground transition hover:brightness-95 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <ArrowLeft className="h-4 w-4" />
                          Volver
                        </button>
                        <button
                          type="button"
                          onClick={nuevaVenta}
                          className="h-12 flex-1 rounded-lg bg-primary text-base font-semibold text-primary-foreground transition hover:brightness-110 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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

          <VencimientoCajaDialog
            pendiente={vencimientoPendiente}
            puedeRelevar={puedeRelevarVencimiento}
            onGuardado={aplicarRelevoVencimiento}
            onClose={() => setVencimientoPendiente(null)}
          />
        </div>
  )

  if (embedded) return contenido

  return (
    <DialogRoot open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-none gap-0 overflow-hidden rounded-2xl p-0 w-[min(96vw,1180px)]">
        {contenido}
      </DialogContent>
    </DialogRoot>
  )
}
