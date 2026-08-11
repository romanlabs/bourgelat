import { useRef, useState } from 'react'
import { Barcode, ClipboardList, ImageOff, Package, Plus, Scan, Stethoscope, X } from 'lucide-react'
import { PRODUCT_CATEGORIES } from './finanzasConstants'

const formatCOP = (value) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value)

export default function ProductCommandSearch({
  productSearch,
  setProductSearch,
  categoriaFiltro,
  setCategoriaFiltro,
  productosDisponibles,
  productosQuery,
  servicioSearch,
  setServicioSearch,
  serviciosDisponibles = [],
  serviciosQuery,
  addProductToInvoice,
  addServiceFromCatalog,
  puedeConsultarInventario,
  barcodeInput,
  setBarcodeInput,
  handleBarcodeScan,
  buscarProductoPorBarcodeMutation,
  searchInputRef,
  setInvoiceForm,
}) {
  const [activeTab, setActiveTab] = useState('productos')
  const [scanMode, setScanMode] = useState(false)
  const [serviceForm, setServiceForm] = useState({ descripcion: '', precio: '' })
  const barcodeRef = useRef(null)

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter' && productosDisponibles.length > 0) {
      addProductToInvoice(productosDisponibles[0])
      setProductSearch('')
    }
  }

  const handleAddService = () => {
    const desc = serviceForm.descripcion.trim()
    if (!desc) return
    const newItem = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      tipo: 'servicio',
      descripcion: desc,
      cantidad: '1',
      precioUnitario: serviceForm.precio || '0',
      productoId: '',
      stock: null,
      precioMinimo: 0,
    }
    setInvoiceForm((curr) => ({ ...curr, items: [...curr.items, newItem] }))
    setServiceForm({ descripcion: '', precio: '' })
  }

  const toggleScan = () => {
    setScanMode((v) => !v)
    setTimeout(() => barcodeRef.current?.focus(), 50)
  }

  if (!puedeConsultarInventario) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
        <Package className="h-10 w-10 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">
          El inventario no está habilitado en el plan actual.
        </p>
        <button
          type="button"
          onClick={() => setActiveTab('servicio')}
          className="inline-flex items-center gap-2 border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-muted"
        >
          <Plus className="h-4 w-4" />
          Agregar servicio manual
        </button>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header: tabs + escáner */}
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <div className="flex gap-0">
          {[
            { id: 'productos', label: 'Productos', icon: Package },
            { id: 'servicios', label: 'Servicios', icon: ClipboardList },
            { id: 'servicio', label: 'Servicio libre', icon: Stethoscope },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={`-mb-px flex items-center gap-1.5 border-b-2 px-4 py-2 text-xs font-semibold transition-colors ${
                activeTab === id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={toggleScan}
          title="Escanear código de barras"
          className={`flex items-center gap-1.5 border px-3 py-1.5 text-xs font-semibold transition ${
            scanMode
              ? 'border-primary bg-primary/10 text-primary'
              : 'border-border bg-card text-muted-foreground hover:text-foreground'
          }`}
        >
          <Scan className="h-3.5 w-3.5" />
          Escáner
        </button>
      </div>

      {/* Escáner de código de barras */}
      {scanMode && (
        <div className="flex items-center gap-2 border-b border-border bg-amber-50 px-4 py-2">
          <Barcode className="h-4 w-4 shrink-0 text-amber-600" />
          <input
            ref={barcodeRef}
            type="text"
            value={barcodeInput}
            onChange={(e) => setBarcodeInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleBarcodeScan() }}
            placeholder="Escanea o escribe el código..."
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          <button
            type="button"
            onClick={handleBarcodeScan}
            disabled={buscarProductoPorBarcodeMutation?.isPending}
            className="border border-amber-400 bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800 transition hover:bg-amber-200 disabled:opacity-60"
          >
            {buscarProductoPorBarcodeMutation?.isPending ? '...' : 'Agregar'}
          </button>
          <button
            type="button"
            onClick={() => setScanMode(false)}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {activeTab === 'productos' ? (
        <>
          {/* Barra de búsqueda */}
          <div className="border-b border-border px-4 py-3">
            <div className="flex items-center gap-2 border border-border bg-background px-3 py-2.5 focus-within:border-primary">
              <svg className="h-4 w-4 shrink-0 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
              </svg>
              <input
                ref={searchInputRef}
                type="text"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Buscar producto... (Enter para agregar el primero)"
                className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
              {productSearch && (
                <button type="button" onClick={() => setProductSearch('')} className="shrink-0 text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Pills de categoría */}
          <div className="flex gap-1.5 overflow-x-auto border-b border-border px-4 py-2 scrollbar-none">
            <button
              type="button"
              onClick={() => setCategoriaFiltro('')}
              className={`shrink-0 border px-3 py-1 text-xs font-semibold transition ${
                !categoriaFiltro
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-card text-muted-foreground hover:border-border hover:text-foreground'
              }`}
            >
              Todos
            </button>
            {PRODUCT_CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                type="button"
                onClick={() => setCategoriaFiltro(categoriaFiltro === cat.value ? '' : cat.value)}
                className={`shrink-0 border px-3 py-1 text-xs font-semibold transition ${
                  categoriaFiltro === cat.value
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-card text-muted-foreground hover:text-foreground'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Grid de productos */}
          <div className="flex-1 overflow-y-auto p-4">
            {productosQuery?.isLoading ? (
              <div className="grid gap-3 grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-28 animate-pulse border border-border bg-muted" />
                ))}
              </div>
            ) : productosDisponibles.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 py-12 text-center">
                <Package className="h-8 w-8 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">
                  {productSearch || categoriaFiltro
                    ? 'Sin resultados para ese filtro.'
                    : 'No hay productos en el inventario.'}
                </p>
              </div>
            ) : (
              <div className="grid gap-2 grid-cols-2 lg:grid-cols-3">
                {productosDisponibles.map((product) => {
                  const sinStock = product.stock !== null && product.stock !== undefined && product.stock <= 0
                  return (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => !sinStock && addProductToInvoice(product)}
                      disabled={sinStock}
                      className={`group relative flex flex-col items-start gap-1 border p-3 text-left transition ${
                        sinStock
                          ? 'cursor-not-allowed border-border bg-muted opacity-50'
                          : 'border-border bg-card hover:border-primary hover:bg-primary/5'
                      }`}
                    >
                      <div className="flex w-full items-center gap-2">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden border border-border bg-muted">
                          {product.imagenUrl
                            ? (
                              <img
                                src={product.imagenUrl}
                                alt=""
                                loading="lazy"
                                className="h-full w-full object-cover"
                              />
                            )
                            : <ImageOff className="h-3.5 w-3.5 text-muted-foreground/50" />
                          }
                        </div>
                        <p className="line-clamp-2 min-w-0 text-xs font-semibold leading-tight text-foreground">
                          {product.nombre}
                        </p>
                      </div>
                      <p className="text-sm font-bold text-primary">
                        {formatCOP(product.precioVenta || 0)}
                      </p>
                      {product.stock !== null && product.stock !== undefined && (
                        <p className={`text-xs ${sinStock ? 'text-red-500' : 'text-muted-foreground'}`}>
                          {sinStock ? 'Agotado' : `Cantidad: ${product.stock}`}
                        </p>
                      )}
                      {!sinStock && (
                        <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center border border-primary/30 bg-primary/10 text-primary opacity-0 transition group-hover:opacity-100">
                          <Plus className="h-3 w-3" />
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </>
      ) : activeTab === 'servicios' ? (
        <>
          {/* Barra de búsqueda del catalogo de servicios */}
          <div className="border-b border-border px-4 py-3">
            <div className="flex items-center gap-2 border border-border bg-background px-3 py-2.5 focus-within:border-primary">
              <svg className="h-4 w-4 shrink-0 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
              </svg>
              <input
                type="text"
                value={servicioSearch}
                onChange={(e) => setServicioSearch(e.target.value)}
                placeholder="Buscar servicio del catalogo..."
                className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
              {servicioSearch && (
                <button type="button" onClick={() => setServicioSearch('')} className="shrink-0 text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {serviciosQuery?.isLoading ? (
              <div className="grid gap-3 grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-28 animate-pulse border border-border bg-muted" />
                ))}
              </div>
            ) : serviciosDisponibles.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 py-12 text-center">
                <ClipboardList className="h-8 w-8 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">
                  {servicioSearch ? 'Sin resultados para ese filtro.' : 'Aun no hay servicios en el catalogo.'}
                </p>
              </div>
            ) : (
              <div className="grid gap-2 grid-cols-2 lg:grid-cols-3">
                {serviciosDisponibles.map((servicio) => (
                  <button
                    key={servicio.id}
                    type="button"
                    onClick={() => addServiceFromCatalog(servicio)}
                    className="group relative flex flex-col items-start gap-1 border border-border bg-card p-3 text-left transition hover:border-primary hover:bg-primary/5"
                  >
                    <p className="line-clamp-2 text-xs font-semibold leading-tight text-foreground">
                      {servicio.nombre}
                    </p>
                    <p className="text-sm font-bold text-primary">
                      {formatCOP(servicio.precioVenta || 0)}
                    </p>
                    {servicio.categoria && (
                      <p className="text-xs text-muted-foreground">{servicio.categoria}</p>
                    )}
                    <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center border border-primary/30 bg-primary/10 text-primary opacity-0 transition group-hover:opacity-100">
                      <Plus className="h-3 w-3" />
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        /* Tab: Servicio manual */
        <div className="flex flex-1 flex-col items-center justify-center p-8">
          <div className="w-full max-w-sm space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Stethoscope className="h-4 w-4 text-primary" />
              Agregar servicio o concepto libre
            </div>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Descripción *
                </label>
                <input
                  type="text"
                  value={serviceForm.descripcion}
                  onChange={(e) => setServiceForm((f) => ({ ...f, descripcion: e.target.value }))}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddService() }}
                  placeholder="Ej: Consulta general, Baño y corte..."
                  className="w-full border border-border bg-card px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Precio unitario (COP)
                </label>
                <input
                  type="number"
                  value={serviceForm.precio}
                  onChange={(e) => setServiceForm((f) => ({ ...f, precio: e.target.value }))}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddService() }}
                  placeholder="0"
                  className="w-full border border-border bg-card px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                />
              </div>
              <button
                type="button"
                onClick={handleAddService}
                disabled={!serviceForm.descripcion.trim()}
                className="flex w-full items-center justify-center gap-2 border border-primary bg-primary/10 px-4 py-2.5 text-sm font-semibold text-primary transition hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                Agregar al carrito
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
