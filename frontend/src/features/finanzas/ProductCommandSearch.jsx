import { createElement, useEffect, useRef, useState } from 'react'
import { DropdownMenu } from 'radix-ui'
import { Barcode, Check, ClipboardList, Filter, ImageOff, Minus, Package, Plus, Scan, Stethoscope, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { estadoVencimiento, textoVencimiento } from '@/features/inventario/inventarioUtils'
import { PRODUCT_CATEGORIES } from './finanzasConstants'
import { useEsCelular } from '@/lib/useEsCelular'
import { useMantenerPresionado, vibrar } from '@/lib/gestos'
import HojaInferior from '@/components/movil/HojaInferior'

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
            'relative flex h-11 min-w-[2.75rem] shrink-0 gap-1.5 lg:h-14 lg:w-14 lg:min-w-0 items-center justify-center rounded-xl bg-card text-muted-foreground transition hover:text-foreground active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:bg-accent',
            categoriaFiltro && 'bg-accent px-3 text-accent-foreground lg:px-0'
          )}
        >
          <Filter className="h-4 w-4" />
          {/* En celular el filtro activo se lee en el mismo botón (sin chip aparte). */}
          {categoriaFiltro && (
            <span className="max-w-[7rem] truncate px-1 text-[13px] font-semibold lg:hidden">
              {PRODUCT_CATEGORIES.find((c) => c.value === categoriaFiltro)?.label}
            </span>
          )}
          {categoriaFiltro && (
            <span className="absolute right-2 top-2 hidden h-2 w-2 rounded-full bg-brand lg:block" />
          )}
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          className="z-50 w-56 rounded-xl bg-card p-1.5 shadow-dropdown data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
        >
          <DropdownMenu.Label className="px-3 py-1.5 text-[13px] font-semibold text-muted-foreground">
            Categoría
          </DropdownMenu.Label>
          {[{ value: '', label: 'Todos' }, ...PRODUCT_CATEGORIES].map((opt) => (
            <DropdownMenu.Item
              key={opt.value || 'todos'}
              onSelect={() => setCategoriaFiltro(opt.value)}
              className={cn(
                'flex cursor-pointer items-center justify-between rounded-lg px-3 py-2.5 text-sm text-foreground outline-none transition hover:bg-muted focus:bg-muted',
                categoriaFiltro === opt.value && 'bg-accent font-semibold text-accent-foreground'
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


// Fila del catálogo en celular: tocarla o tocar «+» agrega una unidad; si ya
// está en la cuenta, el «+» se vuelve − cantidad + en la misma fila.
function FilaCatalogoMovil({
  clave,
  nombre,
  detalle,
  detalleAlerta = false,
  aviso = null,
  precio,
  imagenUrl,
  conImagen = false,
  deshabilitado = false,
  enCuenta,
  onAgregar,
  updateInvoiceItem,
  removeInvoiceItem,
  resaltado = false,
  onResaltar,
}) {
  const conStepper = Boolean(enCuenta && updateInvoiceItem && removeInvoiceItem)
  const [editando, setEditando] = useState(false)
  // Mantener presionada una fila que ya está en la cuenta abre la edición rápida.
  const presion = useMantenerPresionado(() => {
    if (conStepper && !deshabilitado) setEditando(true)
  })
  const cantidad = enCuenta ? Math.max(Number(enCuenta.cantidad) || 0, 0) : 0
  const sumar = () => {
    // No más unidades de las que hay en inventario (los servicios no tienen stock).
    if (enCuenta.stock != null && cantidad >= Number(enCuenta.stock)) return
    updateInvoiceItem(enCuenta.id, 'cantidad', String(cantidad + 1))
    vibrar()
    onResaltar?.(clave)
  }
  const restar = () => {
    if (cantidad <= 1) removeInvoiceItem(enCuenta.id)
    else updateInvoiceItem(enCuenta.id, 'cantidad', String(cantidad - 1))
  }
  const agregar = () => {
    if (deshabilitado || presion.consumido()) return
    if (conStepper) {
      sumar()
      return
    }
    onAgregar()
    vibrar()
    onResaltar?.(clave)
  }
  const botonRedondo =
    'flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

  return (
    <li
      className={cn(
        'flex min-h-[68px] items-center gap-2 px-3 py-2 transition-colors duration-300',
        resaltado && 'bg-primary/10',
        deshabilitado && 'opacity-60'
      )}
    >
      <button
        type="button"
        onClick={agregar}
        disabled={deshabilitado}
        {...presion.props}
        className="flex min-w-0 flex-1 select-none items-center gap-3 self-stretch rounded-lg py-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed"
      >
        {conImagen ? (
          <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
            {imagenUrl ? (
              <img src={imagenUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
            ) : (
              <ImageOff aria-hidden className="h-5 w-5 text-muted-foreground/40" />
            )}
          </span>
        ) : null}
        <span className="min-w-0 flex-1">
          <span className="line-clamp-2 text-[15px] font-semibold leading-snug text-foreground">{nombre}</span>
          <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px]">
            <span className="font-semibold tabular-nums text-foreground">{formatCOP(precio || 0)}</span>
            {detalle ? (
              <span className={detalleAlerta ? 'font-semibold text-danger' : 'tabular-nums text-muted-foreground first-letter:uppercase'}>
                {detalle}
              </span>
            ) : null}
            {aviso ? (
              <span className={cn('rounded-md px-1.5 py-0.5 text-[12px] font-semibold', aviso.tono)}>{aviso.texto}</span>
            ) : null}
          </span>
        </span>
      </button>
      {deshabilitado ? null : conStepper ? (
        <div className="flex shrink-0 items-center" role="group" aria-label={`Cantidad de ${nombre}`}>
          <button type="button" onClick={restar} aria-label={cantidad <= 1 ? `Quitar ${nombre}` : `Restar una unidad de ${nombre}`} className={`${botonRedondo} bg-secondary text-secondary-foreground`}>
            <Minus aria-hidden className="h-4 w-4" />
          </button>
          <span aria-live="polite" className="min-w-[2rem] text-center text-[15px] font-semibold tabular-nums text-foreground">
            {cantidad}
          </span>
          <button type="button" onClick={sumar} aria-label={`Sumar una unidad de ${nombre}`} className={`${botonRedondo} bg-primary text-primary-foreground`}>
            <Plus aria-hidden className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <button type="button" onClick={agregar} aria-label={`Agregar ${nombre}`} className={`${botonRedondo} bg-primary text-primary-foreground`}>
          <Plus aria-hidden className="h-5 w-5" />
        </button>
      )}
      {conStepper ? (
        <HojaInferior
          abierta={editando}
          onCambiar={setEditando}
          titulo={nombre}
          descripcion="Ajusta la cantidad y el precio de esta línea."
          pie={
            <button
              type="button"
              onClick={() => setEditando(false)}
              className="flex h-12 w-full items-center justify-center rounded-lg bg-primary text-base font-semibold text-primary-foreground transition active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Listo
            </button>
          }
        >
          <div className="flex flex-col gap-4 py-1">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-semibold text-foreground">Cantidad</span>
              <div className="flex items-center gap-1">
                <button type="button" onClick={restar} aria-label={cantidad <= 1 ? 'Quitar de la cuenta' : 'Restar una unidad'} className={`${botonRedondo} bg-secondary text-secondary-foreground`}>
                  <Minus aria-hidden className="h-4 w-4" />
                </button>
                <span className="min-w-[2.5rem] text-center text-lg font-semibold tabular-nums text-foreground">{cantidad}</span>
                <button type="button" onClick={sumar} aria-label="Sumar una unidad" className={`${botonRedondo} bg-primary text-primary-foreground`}>
                  <Plus aria-hidden className="h-4 w-4" />
                </button>
              </div>
            </div>
            <label className="flex items-center justify-between gap-3">
              <span className="text-sm font-semibold text-foreground">Precio unitario</span>
              <span className="flex items-center gap-1 text-muted-foreground">
                <span aria-hidden>$</span>
                <input
                  type="number"
                  inputMode="numeric"
                  value={enCuenta.precioUnitario}
                  min={Number(enCuenta.precioMinimo) || undefined}
                  onChange={(e) => updateInvoiceItem(enCuenta.id, 'precioUnitario', e.target.value)}
                  className={cn(
                    'h-11 w-32 rounded-lg border bg-card px-3 text-right text-base font-semibold tabular-nums focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    Number(enCuenta.precioMinimo) > 0 && Number(enCuenta.precioUnitario) < Number(enCuenta.precioMinimo) ? 'border-danger text-danger' : 'border-input text-foreground'
                  )}
                />
              </span>
            </label>
            {Number(enCuenta.precioMinimo) > 0 && Number(enCuenta.precioUnitario) < Number(enCuenta.precioMinimo) ? (
              <p className="text-[13px] font-semibold text-danger">Mínimo {formatCOP(Number(enCuenta.precioMinimo))} (costo)</p>
            ) : null}
          </div>
        </HojaInferior>
      ) : null}
    </li>
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
  onProductoVencido,
  puedeConsultarInventario,
  barcodeInput,
  setBarcodeInput,
  handleBarcodeScan,
  buscarProductoPorBarcodeMutation,
  searchInputRef,
  setInvoiceForm,
  // Solo celular: lo que ya está en la cuenta, para mostrar la cantidad en la fila.
  itemsCarrito,
  updateInvoiceItem,
  removeInvoiceItem,
}) {
  const esCelular = useEsCelular()
  // Resaltado breve de la fila recién agregada (respuesta inmediata al toque).
  const [resaltado, setResaltado] = useState(null)
  const temporizador = useRef(null)
  const resaltar = (clave) => {
    setResaltado(clave)
    clearTimeout(temporizador.current)
    temporizador.current = setTimeout(() => setResaltado(null), 700)
  }
  useEffect(() => () => clearTimeout(temporizador.current), [])
  const [activeTab, setActiveTab] = useState('productos')
  const [scanMode, setScanMode] = useState(false)
  const [serviceForm, setServiceForm] = useState({ descripcion: '', precio: '' })
  const barcodeRef = useRef(null)
  const categoriaActiva = PRODUCT_CATEGORIES.find((c) => c.value === categoriaFiltro)

  // Un vencido no entra al carrito: se abre el aviso para revisar su fecha.
  const elegirProducto = (product) => {
    if (estadoVencimiento(product) === 'vencido') onProductoVencido?.(product)
    else addProductToInvoice(product)
  }

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter' && productosDisponibles.length > 0) {
      elegirProducto(productosDisponibles[0])
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
          className="inline-flex h-11 items-center gap-2 rounded-lg bg-secondary px-4 text-sm font-semibold text-secondary-foreground transition hover:brightness-95 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:h-10"
        >
          <Plus className="h-4 w-4" />
          Agregar servicio manual
        </button>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <div className="sticky top-14 z-30 -mx-4 bg-background px-4 pb-2 sm:-mx-6 sm:px-6 lg:static lg:z-auto lg:mx-0 lg:bg-transparent lg:p-0 lg:contents">
      {/* Header: tabs + escáner */}
      {/* En celular: el catálogo va a ancho completo (sin marco propio), las
          pestañas son chips desplazables y el escáner (lector USB) no aparece. */}
      <div className="flex items-center justify-between gap-2 pt-1 lg:flex-wrap lg:gap-3 lg:px-5 lg:pt-5">
        <div role="tablist" aria-label="Catálogo" className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto [scrollbar-width:none] lg:inline-flex lg:flex-none lg:flex-wrap lg:gap-1 lg:overflow-visible lg:rounded-xl lg:bg-secondary lg:p-1 [&::-webkit-scrollbar]:hidden">
          {[
            { id: 'productos', label: 'Productos', icon: Package },
            { id: 'servicios', label: 'Servicios', icon: ClipboardList },
            { id: 'servicio', label: 'Servicio libre', icon: Stethoscope },
          ].map(({ id, label, icon }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={activeTab === id}
              onClick={() => setActiveTab(id)}
              className={`flex h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-4 text-sm transition lg:h-9 lg:rounded-lg lg:px-3.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                activeTab === id
                  ? 'bg-primary font-semibold text-primary-foreground lg:bg-card lg:text-foreground'
                  : 'bg-card font-medium text-muted-foreground hover:text-foreground lg:bg-transparent'
              }`}
            >
              {createElement(icon, { className: `h-4 w-4 shrink-0 ${activeTab === id ? 'text-primary-foreground lg:text-primary' : 'text-muted-foreground'}` })}
              {label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={toggleScan}
          title="Escanear código de barras"
          aria-pressed={scanMode}
          className={`hidden h-10 items-center gap-2 rounded-lg px-3.5 text-sm font-semibold transition active:translate-y-px lg:inline-flex focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
            scanMode
              ? 'bg-accent text-accent-foreground'
              : 'bg-card text-foreground hover:bg-muted'
          }`}
        >
          <Scan className="h-4 w-4" />
          Escáner
        </button>
      </div>

      {/* Escáner de código de barras */}
      {scanMode && (
        <div className="mt-3 hidden h-12 items-center gap-2 rounded-xl bg-brand-muted px-4 lg:mx-5 lg:flex">
          <Barcode className="h-4 w-4 shrink-0 text-brand-foreground" />
          <input
            ref={barcodeRef}
            type="text"
            value={barcodeInput}
            onChange={(e) => setBarcodeInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleBarcodeScan() }}
            placeholder="Escanea o escribe el código"
            aria-label="Código de barras"
            className="min-w-0 flex-1 bg-transparent text-base text-foreground placeholder:text-muted-foreground focus:outline-none lg:text-[15px]"
          />
          <button
            type="button"
            onClick={handleBarcodeScan}
            disabled={buscarProductoPorBarcodeMutation?.isPending}
            className="h-11 rounded-lg bg-card px-3 text-[13px] font-semibold text-foreground transition hover:bg-muted active:translate-y-px disabled:opacity-60 lg:h-9"
          >
            {buscarProductoPorBarcodeMutation?.isPending ? '...' : 'Agregar'}
          </button>
          <button
            type="button"
            onClick={() => setScanMode(false)}
            aria-label="Cerrar escáner"
            className="flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground hover:text-foreground lg:h-8 lg:w-8"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {activeTab === 'productos' ? (
        <>
          {/* Barra de búsqueda + filtro */}
          <div className="flex items-center gap-2 pt-2 lg:px-5 lg:pt-3">
            <div className="flex h-11 min-w-0 flex-1 items-center gap-3 rounded-xl bg-card px-4 lg:h-14 focus-within:ring-2 focus-within:ring-ring">
              <svg aria-hidden="true" className="h-5 w-5 shrink-0 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
              </svg>
              <input
                ref={searchInputRef}
                type="text"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder={esCelular ? "Buscar producto o servicio" : "Buscar producto (Enter agrega el primero)"}
                aria-label="Buscar producto"
                className="w-full bg-transparent text-base text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
              {productSearch && (
                <button type="button" onClick={() => setProductSearch('')} aria-label="Limpiar búsqueda" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:text-foreground lg:h-8 lg:w-8">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <FiltroCategoriaMenu
              categoriaFiltro={categoriaFiltro}
              setCategoriaFiltro={setCategoriaFiltro}
            />
          </div>

        </>
      ) : activeTab === 'servicios' ? (
        <>
          {/* Barra de búsqueda del catalogo de servicios */}
          <div className="pt-2 lg:px-5 lg:pt-3">
            <div className="flex h-11 items-center gap-3 rounded-xl bg-card px-4 lg:h-14 focus-within:ring-2 focus-within:ring-ring">
              <svg aria-hidden="true" className="h-5 w-5 shrink-0 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
              </svg>
              <input
                type="text"
                value={servicioSearch}
                onChange={(e) => setServicioSearch(e.target.value)}
                placeholder="Buscar servicio del catálogo"
                aria-label="Buscar servicio"
                className="w-full bg-transparent text-base text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
              {servicioSearch && (
                <button type="button" onClick={() => setServicioSearch('')} aria-label="Limpiar búsqueda" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:text-foreground lg:h-8 lg:w-8">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

        </>
      ) : null}
      </div>

      {activeTab === 'productos' ? (
        <>
          {/* Chip de la categoría activa: sin él, el filtro queda invisible */}
          {categoriaActiva && (
            <div className="hidden pt-3 lg:block lg:px-5">
              <button
                type="button"
                onClick={() => setCategoriaFiltro('')}
                aria-label={`Quitar filtro ${categoriaActiva.label}`}
                className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-accent px-3 text-[13px] lg:h-9 font-semibold text-accent-foreground transition hover:brightness-95"
              >
                {categoriaActiva.label}
                <X className="h-3 w-3" />
              </button>
            </div>
          )}

          {/* Grid de productos */}
          <div className="flex-1 overflow-y-auto py-3 lg:p-5">
            {productosQuery?.isLoading ? (
              <div className="grid grid-cols-1 gap-2 lg:grid-cols-3 lg:gap-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-20 animate-pulse rounded-xl bg-card lg:h-48" />
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
              <>
              {/* Celular: una lista a ancho completo; «+» agrega y, si ya está
                  en la cuenta, la misma fila muestra la cantidad. */}
              <ul className="divide-y divide-border overflow-hidden rounded-2xl bg-card lg:hidden">
                {productosDisponibles.map((product) => {
                  const sinStock = product.stock !== null && product.stock !== undefined && product.stock <= 0
                  const vencimiento = estadoVencimiento(product)
                  return (
                    <FilaCatalogoMovil
                      key={product.id}
                      clave={`p-${product.id}`}
                      nombre={product.nombre}
                      detalle={
                        product.stock !== null && product.stock !== undefined
                          ? sinStock ? 'Agotado' : `Quedan ${product.stock}`
                          : product.categoria
                      }
                      detalleAlerta={sinStock}
                      aviso={vencimiento ? { texto: textoVencimiento(product.fechaVencimiento), tono: vencimiento === 'vencido' ? 'bg-danger-soft text-danger' : 'bg-warning-soft text-warning' } : null}
                      precio={product.precioVenta}
                      imagenUrl={product.imagenUrl}
                      conImagen
                      deshabilitado={sinStock}
                      enCuenta={itemsCarrito?.find((item) => item.tipo === 'producto' && item.productoId === product.id)}
                      onAgregar={() => elegirProducto(product)}
                      updateInvoiceItem={updateInvoiceItem}
                      removeInvoiceItem={removeInvoiceItem}
                      resaltado={resaltado === `p-${product.id}`}
                      onResaltar={resaltar}
                    />
                  )
                })}
              </ul>
              <div className="hidden gap-3 lg:grid lg:grid-cols-3">
                {productosDisponibles.map((product) => {
                  const sinStock = product.stock !== null && product.stock !== undefined && product.stock <= 0
                  const vencimiento = estadoVencimiento(product)
                  const vencido = vencimiento === 'vencido'
                  return (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => !sinStock && elegirProducto(product)}
                      disabled={sinStock}
                      aria-label={vencido ? `${product.nombre}, vencido: revisar vencimiento` : undefined}
                      className={`group relative flex flex-col gap-2 rounded-xl p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                        sinStock
                          ? 'cursor-not-allowed bg-muted opacity-60'
                          : vencido
                            ? 'bg-muted hover:bg-danger-soft active:translate-y-px'
                            : 'bg-card hover:bg-accent active:translate-y-px'
                      }`}
                    >
                      {/* La imagen manda: es lo que el cajero reconoce de un vistazo */}
                      <div className={cn(
                        'flex aspect-square w-full items-center justify-center overflow-hidden rounded-lg bg-muted',
                        vencido && 'opacity-60'
                      )}>
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
                      {/* Fuera de la imagen atenuada, para que el aviso se lea completo */}
                      {vencimiento && !sinStock && (
                        <span
                          className={cn(
                            'absolute left-4 top-4 rounded-md px-2 py-0.5 text-[12px] font-semibold',
                            vencido ? 'bg-danger-soft text-danger' : 'bg-warning-soft text-warning'
                          )}
                        >
                          {textoVencimiento(product.fechaVencimiento)}
                        </span>
                      )}
                      <div className="min-w-0">
                        <p className="line-clamp-2 text-[15px] font-semibold leading-snug text-foreground">
                          {product.nombre}
                        </p>
                        {product.categoria && (
                          <p className="mt-0.5 truncate text-[13px] capitalize text-muted-foreground">
                            {product.categoria}
                          </p>
                        )}
                      </div>
                      <div className="mt-auto flex items-baseline justify-between gap-2">
                        <span className="text-[15px] font-semibold tabular-nums text-foreground">
                          {formatCOP(product.precioVenta || 0)}
                        </span>
                        {product.stock !== null && product.stock !== undefined && (
                          <span className={`shrink-0 text-[13px] tabular-nums ${sinStock ? 'font-semibold text-danger' : 'text-muted-foreground'}`}>
                            {sinStock ? 'Agotado' : `Quedan ${product.stock}`}
                          </span>
                        )}
                      </div>
                      {!sinStock && !vencido && (
                        <span className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
                          <Plus className="h-3.5 w-3.5" />
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
              </>
            )}
          </div>
        </>
      ) : activeTab === 'servicios' ? (
        <>
          <div className="flex-1 overflow-y-auto py-3 lg:p-5">
            {serviciosQuery?.isLoading ? (
              <div className="grid grid-cols-1 gap-2 lg:grid-cols-3 lg:gap-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-20 animate-pulse rounded-xl bg-card lg:h-48" />
                ))}
              </div>
            ) : serviciosDisponibles.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 py-12 text-center">
                <ClipboardList className="h-8 w-8 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">
                  {servicioSearch ? 'Sin resultados para ese filtro.' : 'Aún no hay servicios en el catálogo.'}
                </p>
              </div>
            ) : (
              <>
              <ul className="divide-y divide-border overflow-hidden rounded-2xl bg-card lg:hidden">
                {serviciosDisponibles.map((servicio) => (
                  <FilaCatalogoMovil
                    key={servicio.id}
                    clave={`s-${servicio.id}`}
                    nombre={servicio.nombre}
                    detalle={servicio.categoria}
                    precio={servicio.precioVenta}
                    enCuenta={itemsCarrito?.find((item) => item.tipo === 'servicio' && item.servicioClinicoId === servicio.id)}
                    onAgregar={() => addServiceFromCatalog(servicio)}
                    updateInvoiceItem={updateInvoiceItem}
                    removeInvoiceItem={removeInvoiceItem}
                    resaltado={resaltado === `s-${servicio.id}`}
                    onResaltar={resaltar}
                  />
                ))}
              </ul>
              <div className="hidden gap-3 lg:grid lg:grid-cols-3">
                {serviciosDisponibles.map((servicio) => (
                  <button
                    key={servicio.id}
                    type="button"
                    onClick={() => addServiceFromCatalog(servicio)}
                    className="group relative flex min-h-[104px] flex-col gap-2 rounded-xl bg-card p-3.5 text-left transition hover:bg-accent active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {/* Los servicios no tienen imagen: el nombre ocupa ese lugar */}
                    <div className="min-w-0">
                      <p className="line-clamp-2 text-[15px] font-semibold leading-snug text-foreground">
                        {servicio.nombre}
                      </p>
                      {servicio.categoria && (
                        <p className="mt-0.5 truncate text-[13px] capitalize text-muted-foreground">
                          {servicio.categoria}
                        </p>
                      )}
                    </div>
                    <span className="mt-auto text-[15px] font-semibold tabular-nums text-foreground">
                      {formatCOP(servicio.precioVenta || 0)}
                    </span>
                    <span className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
                      <Plus className="h-3.5 w-3.5" />
                    </span>
                  </button>
                ))}
              </div>
              </>
            )}
          </div>
        </>
      ) : (
        /* Tab: Servicio manual */
        <div className="flex flex-1 flex-col items-center justify-center py-4 lg:p-8">
          <div className="w-full max-w-sm space-y-4 rounded-2xl bg-card p-5 lg:p-6">
            <div className="flex items-center gap-2 text-lg font-semibold tracking-[-0.02em] text-foreground">
              <Stethoscope className="h-5 w-5 text-primary" />
              Agregar servicio o concepto libre
            </div>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-[13px] font-semibold text-muted-foreground">
                  Descripción
                </label>
                <input
                  type="text"
                  value={serviceForm.descripcion}
                  onChange={(e) => setServiceForm((f) => ({ ...f, descripcion: e.target.value }))}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddService() }}
                  placeholder="Ej.: consulta general, baño y corte"
                  className="h-11 w-full rounded-lg border border-input bg-card px-3 text-base text-foreground lg:text-sm placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[13px] font-semibold text-muted-foreground">
                  Precio unitario (COP)
                </label>
                <input
                  type="number"
                  value={serviceForm.precio}
                  onChange={(e) => setServiceForm((f) => ({ ...f, precio: e.target.value }))}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddService() }}
                  placeholder="0"
                  inputMode="numeric"
                  className="h-11 w-full rounded-lg border border-input bg-card px-3 text-base text-foreground lg:text-sm placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              <button
                type="button"
                onClick={handleAddService}
                disabled={!serviceForm.descripcion.trim()}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-secondary px-4 text-sm font-semibold text-secondary-foreground transition hover:brightness-95 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
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
