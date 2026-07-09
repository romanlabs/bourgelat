import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { ShoppingCart } from 'lucide-react'
import ProductCommandSearch from './ProductCommandSearch'
import CartSidebar from './CartSidebar'
import PaymentConfirmModal from './PaymentConfirmModal'

const formatCOP = (value) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value)

export default function QuickSaleLayout({
  facturacionHook,
  puedeConsultarInventario,
  emisionAutomaticaActiva,
}) {
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const [cartExpanded, setCartExpanded] = useState(false)
  const searchInputRef = useRef(null)

  const {
    ownerSearch,
    setOwnerSearch,
    productSearch,
    setProductSearch,
    servicioSearch,
    setServicioSearch,
    categoriaFiltro,
    setCategoriaFiltro,
    barcodeInput,
    setBarcodeInput,
    invoiceForm,
    setInvoiceForm,
    productosDisponibles,
    serviciosDisponibles,
    selectedOwnerData,
    selectOwner,
    invoiceTotals,
    propietariosQuery,
    productosQuery,
    serviciosQuery,
    crearFacturaMutation,
    buscarProductoPorBarcodeMutation,
    handleCrearFactura,
    handleBarcodeScan,
    addServiceItem,
    addServiceFromCatalog,
    addProductToInvoice,
    removeInvoiceItem,
    updateInvoiceItem,
  } = facturacionHook

  // Ctrl+K → foca el input de búsqueda
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        searchInputRef.current?.focus()
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  const itemCount = invoiceForm?.items?.length ?? 0

  return (
    <>
      {/* Layout desktop: dos columnas */}
      <div className="hidden lg:flex h-[calc(100vh-10rem)] overflow-hidden border border-border bg-background">
        {/* Columna izquierda: búsqueda de productos */}
        <div className="min-w-0 flex-1 overflow-hidden border-r border-border">
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
            addServiceItem={addServiceItem}
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

        {/* Columna derecha: carrito */}
        <div className="w-[360px] shrink-0 overflow-hidden">
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
            onOpenPaymentModal={() => setPaymentModalOpen(true)}
          />
        </div>
      </div>

      {/* Layout mobile: columna única + bottom sheet */}
      <div className="flex flex-col lg:hidden" style={{ height: 'calc(100dvh - 10rem)' }}>
        {/* Área de productos */}
        <div className="min-h-0 flex-1 overflow-hidden border border-border bg-background">
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
            addServiceItem={addServiceItem}
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

        {/* Bottom bar colapsable */}
        <div className="border-t border-border bg-card shadow-lg">
          {/* Barra resumen siempre visible */}
          <button
            type="button"
            onClick={() => setCartExpanded((v) => !v)}
            className="flex w-full items-center justify-between px-4 py-3"
          >
            <div className="flex items-center gap-2">
              <div className="relative">
                <ShoppingCart className="h-5 w-5 text-foreground" />
                {itemCount > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center bg-primary text-[10px] font-bold text-white">
                    {itemCount}
                  </span>
                )}
              </div>
              <span className="text-sm font-semibold text-foreground">
                {itemCount === 0 ? 'Carrito vacío' : `${itemCount} ítem${itemCount > 1 ? 's' : ''}`}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-foreground">
                {formatCOP(invoiceTotals?.total ?? 0)}
              </span>
              <span className="text-xs text-muted-foreground">
                {cartExpanded ? '▼' : '▲'}
              </span>
            </div>
          </button>

          {/* Carrito expandido */}
          <AnimatePresence>
            {cartExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: '60vh', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                <div className="h-full overflow-hidden">
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
                    onOpenPaymentModal={() => {
                      setCartExpanded(false)
                      setPaymentModalOpen(true)
                    }}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Modal de cobro */}
      <PaymentConfirmModal
        open={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        invoiceTotals={invoiceTotals}
        invoiceForm={invoiceForm}
        handleCrearFactura={handleCrearFactura}
        crearFacturaMutation={crearFacturaMutation}
      />
    </>
  )
}
