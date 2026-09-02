import { useRef, useState } from 'react'
import { DropdownMenu } from 'radix-ui'
import { Barcode, Check, ClipboardList, Filter, ImageOff, Package, Plus, Scan, Stethoscope, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PRODUCT_CATEGORIES } from './finanzasConstants'

const formatCOP = (value) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value)

// Filtro de categoria como icono junto al buscador, no como fila de pills: la
// fila ocupaba dos renglones del catalogo y empujaba los productos fuera de
// vista. Mismo componente y comportamiento que el filtro de InventarioPage.
function FiltroCategoriaMenu({ categoriaFiltro, setCategoriaFiltro }) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label="Filtrar por categoría"
          className={cn(
            'relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 data-[state=open]:bg-muted',
            categoriaFiltro && 'border-primary text-primary'
          )}
        >
          <Filter className="h-4 w-4" />
          {categoriaFiltro && (
            <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-primary" />
          )}
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          className="z-50 w-56 rounded-lg border border-border bg-card py-2 shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
        >
          <DropdownMenu.Label className="px-5 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Categoría
          </DropdownMenu.Label>
          {[{ value: '', label: 'Todos' }, ...PRODUCT_CATEGORIES].map((opt) => (
            <DropdownMenu.Item
              key={opt.value || 'todos'}
              onSelect={() => setCategoriaFiltro(opt.value)}
              className={cn(
                'flex cursor-pointer items-center justify-between px-5 py-2.5 text-sm text-foreground outline-none transition hover:bg-muted focus:bg-muted',
                categoriaFiltro === opt.value && 'font-medium text-primary'
              )}
            >
              {opt.label}
              {categoriaFiltro === opt.value && <Check className="h-4 w-4" />}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}

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
  const categoriaActiva = PRODUCT_CATEGORIES.find((c) => c.value === categoriaFiltro)

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
          className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
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
        <div className="flex items-center gap-2 border-b border-border bg-amber-50 px-4 py-2 dark:bg-amber-900/30">
          <Barcode className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
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
            className="border border-amber-400 bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800 transition hover:bg-amber-200 disabled:opacity-60 dark:border-amber-600 dark:bg-amber-900/40 dark:text-amber-200 dark:hover:bg-amber-900/60"
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
          {/* Barra de búsqueda + filtro */}
          <div className="flex items-center gap-2 px-4 py-3">
            <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-border bg-background px-3.5 py-2.5 focus-within:border-primary">
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
            <FiltroCategoriaMenu
              categoriaFiltro={categoriaFiltro}
              setCategoriaFiltro={setCategoriaFiltro}
            />
          </div>

          {/* Chip de la categoría activa: sin él, el filtro queda invisible */}
          {categoriaActiva && (
            <div className="px-4 pb-3">
              <button
                type="button"
                onClick={() => setCategoriaFiltro('')}
                className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary transition hover:bg-primary/15"
              >
                {categoriaActiva.label}
                <X className="h-3 w-3" />
              </button>
            </div>
          )}

          {/* Grid de productos */}
          <div className="flex-1 overflow-y-auto p-4">
            {productosQuery?.isLoading ? (
              <div className="grid gap-3 grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-48 animate-pulse rounded-xl border border-border bg-muted" />
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
              <div className="grid gap-3 grid-cols-2 lg:grid-cols-3">
                {productosDisponibles.map((product) => {
                  const sinStock = product.stock !== null && product.stock !== undefined && product.stock <= 0
                  return (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => !sinStock && addProductToInvoice(product)}
                      disabled={sinStock}
                      className={`group relative flex flex-col gap-2 rounded-xl border p-3 text-left transition ${
                        sinStock
                          ? 'cursor-not-allowed border-border bg-muted opacity-50'
                          : 'border-border bg-card shadow-sm hover:border-primary hover:shadow-md'
                      }`}
                    >
                      {/* La imagen manda: es lo que el cajero reconoce de un vistazo */}
                      <div className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-lg bg-muted">
                        {product.imagenUrl
                          ? (
                            <img
                              src={product.imagenUrl}
                              alt=""
                              loading="lazy"
                              className="h-full w-full object-cover"
                            />
                          )
                          : <ImageOff className="h-7 w-7 text-muted-foreground/40" />
                        }
                      </div>
                      <div className="min-w-0">
                        <p className="line-clamp-2 text-[13px] font-semibold leading-tight text-foreground">
                          {product.nombre}
                        </p>
                        {product.categoria && (
                          <p className="mt-0.5 truncate text-[11px] capitalize text-muted-foreground">
                            {product.categoria}
                          </p>
                        )}
                      </div>
                      <div className="mt-auto flex items-baseline justify-between gap-2">
                        <span className="text-[15px] font-bold text-primary">
                          {formatCOP(product.precioVenta || 0)}
                        </span>
                        {product.stock !== null && product.stock !== undefined && (
                          <span className={`shrink-0 text-[11px] ${sinStock ? 'font-semibold text-red-500 dark:text-red-400' : 'text-muted-foreground'}`}>
                            {sinStock ? 'Agotado' : `Stock: ${product.stock}`}
                          </span>
                        )}
                      </div>
                      {!sinStock && (
                        <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full border border-primary/30 bg-card text-primary opacity-0 shadow-sm transition group-hover:opacity-100">
                          <Plus className="h-3.5 w-3.5" />
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
          <div className="px-4 py-3">
            <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-3.5 py-2.5 focus-within:border-primary">
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
                  <div key={i} className="h-48 animate-pulse rounded-xl border border-border bg-muted" />
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
              <div className="grid gap-3 grid-cols-2 lg:grid-cols-3">
                {serviciosDisponibles.map((servicio) => (
                  <button
                    key={servicio.id}
                    type="button"
                    onClick={() => addServiceFromCatalog(servicio)}
                    className="group relative flex min-h-[104px] flex-col gap-2 rounded-xl border border-border bg-card p-3.5 text-left shadow-sm transition hover:border-primary hover:shadow-md"
                  >
                    {/* Los servicios no tienen imagen: el nombre ocupa ese lugar */}
                    <div className="min-w-0">
                      <p className="line-clamp-2 text-[13px] font-semibold leading-tight text-foreground">
                        {servicio.nombre}
                      </p>
                      {servicio.categoria && (
                        <p className="mt-0.5 truncate text-[11px] capitalize text-muted-foreground">
                          {servicio.categoria}
                        </p>
                      )}
                    </div>
                    <span className="mt-auto text-[15px] font-bold text-primary">
                      {formatCOP(servicio.precioVenta || 0)}
                    </span>
                    <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full border border-primary/30 bg-card text-primary opacity-0 shadow-sm transition group-hover:opacity-100">
                      <Plus className="h-3.5 w-3.5" />
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
