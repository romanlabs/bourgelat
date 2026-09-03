import { useEffect, useState } from 'react'
import { DropdownMenu } from 'radix-ui'
import { ArrowLeftRight, Check, CircleAlert, FileSpreadsheet, Filter, PackagePlus, Plus, Search, ShieldCheck, Sparkles, Boxes, ShoppingCart, FlaskConical, Wallet } from 'lucide-react'
import { cn } from '@/lib/utils'
import AdminShell from '@/components/layout/AdminShell'
import { useAdminHeaderSlot } from '@/components/layout/HeaderSlotContext'
import { NavCta } from '@/components/shared/NavCta'
import { EmptyState } from '@/components/shared/EmptyState'
import {
  DashboardPanel,
  DataTable,
  DonutCard,
  KpiCard,
  StatusPill,
} from '@/features/dashboard/dashboardComponents'
import { formatCurrency, formatNumber } from '@/features/dashboard/dashboardUtils'
import { useAuthStore } from '@/store/authStore'
import { hasAnyRole } from '@/lib/permissions'
import Paginacion from '@/components/shared/Paginacion'
import ProductoComboBox from '@/components/shared/ProductoComboBox'
import InventarioSelectorDialog from '@/components/shared/InventarioSelectorDialog'
import ProductoDrawer from '@/features/inventario/ProductoDrawer'
import FacturaCompraDrawer from '@/features/inventario/FacturaCompraDrawer'
import FacturaCompraDetalleModal from '@/features/inventario/FacturaCompraDetalleModal'
import ImportarInventarioDialog from '@/features/inventario/ImportarInventarioDialog'
import { useInventarioResumen } from '@/features/inventario/useInventarioResumen'
import { useInventarioProductos, CATEGORY_OPTIONS } from '@/features/inventario/useInventarioProductos'
import { useImportarInventario } from '@/features/inventario/useImportarInventario'
import {
  useInventarioMovimientos,
  MOVEMENT_TYPE_OPTIONS,
  MOVEMENT_REASON_OPTIONS,
} from '@/features/inventario/useInventarioMovimientos'
import { useFacturaCompra, ESTADO_COLORS } from '@/features/inventario/useFacturaCompra'
import InsumoClinicoDrawer from '@/features/inventarioClinico/InsumoClinicoDrawer'
import { useInsumosClinicos, CATEGORY_OPTIONS as CLINICO_CATEGORY_OPTIONS } from '@/features/inventarioClinico/useInsumosClinicos'
import { useMovimientosClinicos } from '@/features/inventarioClinico/useMovimientosClinicos'
import ServicioDrawer from '@/features/servicios/ServicioDrawer'
import { useServicios } from '@/features/servicios/useServicios'
import { Select } from '@/components/ui/select'

const TABS = [
  { id: 'resumen', label: 'Resumen' },
  { id: 'productos', label: 'Productos' },
  { id: 'servicios', label: 'Servicios' },
  { id: 'movimientos', label: 'Movimientos' },
  { id: 'facturas-compra', label: 'Facturas de Compra' },
]

// Menú de filtros (categoría + solo cantidad baja) para las tablas de inventario.
// Reemplaza la fila de pills por un ícono junto al buscador, con el mismo
// estilo de dropdown (radix-ui) usado en el selector de vista de Agenda.
function FiltroInventarioMenu({ categoryOptions, categoria, onCategoriaChange, bajoStock, onBajoStockChange }) {
  const filtroActivo = categoria !== 'todas' || bajoStock

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label="Filtrar por categoría"
          className={cn(
            'relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 data-[state=open]:bg-muted',
            filtroActivo && 'border-primary text-primary'
          )}
        >
          <Filter className="h-4 w-4" />
          {filtroActivo && (
            <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-primary" />
          )}
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={6}
          className="z-50 w-56 rounded-lg border border-border bg-card py-2 shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
        >
          <DropdownMenu.Label className="px-5 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Categoría
          </DropdownMenu.Label>
          {categoryOptions.map((opt) => (
            <DropdownMenu.Item
              key={opt.value}
              onSelect={() => onCategoriaChange(opt.value)}
              className={cn(
                'flex cursor-pointer items-center justify-between px-5 py-2.5 text-sm text-foreground outline-none transition hover:bg-muted focus:bg-muted',
                categoria === opt.value && 'font-medium text-primary'
              )}
            >
              {opt.label}
              {categoria === opt.value && <Check className="h-4 w-4" />}
            </DropdownMenu.Item>
          ))}

          <DropdownMenu.Separator className="my-2 h-px bg-border" />

          <DropdownMenu.CheckboxItem
            checked={bajoStock}
            onCheckedChange={onBajoStockChange}
            onSelect={(event) => event.preventDefault()}
            className="flex cursor-pointer items-center gap-3 px-5 py-2.5 text-sm text-foreground outline-none transition hover:bg-muted focus:bg-muted"
          >
            <span className="flex h-4 w-4 shrink-0 items-center justify-center">
              <DropdownMenu.ItemIndicator>
                <Check className="h-4 w-4" />
              </DropdownMenu.ItemIndicator>
            </span>
            Solo cantidad baja
          </DropdownMenu.CheckboxItem>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}

function StockBadge({ stock, stockMinimo }) {
  const num = Number(stock ?? 0)
  const min = Number(stockMinimo ?? 0)
  if (num === 0)
    return (
      <span className="inline-flex items-center gap-1 border border-red-200 dark:border-red-700/50 bg-red-50 dark:bg-red-900/20 px-2 py-0.5 text-xs font-semibold text-red-700 dark:text-red-300">
        0 / {min}
      </span>
    )
  if (num <= min)
    return (
      <span className="inline-flex items-center gap-1 border border-amber-200 dark:border-amber-700/50 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-300">
        {num} / {min}
      </span>
    )
  return (
    <span className="inline-flex items-center gap-1 border border-emerald-200 dark:border-emerald-700/50 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
      {num} / {min}
    </span>
  )
}

function TableSkeleton({ rows = 6 }) {
  return (
    <div className="divide-y divide-border">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex animate-pulse gap-4 px-4 py-3">
          <div className="h-4 flex-1 rounded bg-muted/70" />
          <div className="h-4 w-24 rounded bg-muted/70" />
          <div className="h-4 w-16 rounded bg-muted/70" />
          <div className="h-4 w-20 rounded bg-muted/70" />
        </div>
      ))}
    </div>
  )
}

function InventarioContextBar({ inventario, onCambiar }) {
  const esVentas = inventario === 'ventas'
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border border-border bg-muted/50 px-4 py-3">
      <span className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
        {esVentas ? (
          <PackagePlus className="h-4 w-4 text-primary" />
        ) : (
          <FlaskConical className="h-4 w-4 text-primary" />
        )}
        Inventario: {esVentas ? 'Ventas' : 'Clínica'}
      </span>
      <button
        type="button"
        onClick={onCambiar}
        className="inline-flex items-center gap-2 border border-border bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground"
      >
        <ArrowLeftRight className="h-4 w-4" />
        Cambiar de inventario
      </button>
    </div>
  )
}

// Pestañas Resumen/Productos/Servicios/... compactas para vivir en la barra
// superior de AdminShell (igual que en Agenda) en vez de una segunda fila
// debajo del título. Componente propio porque useAdminHeaderSlot lee el
// contexto que AdminShell provee a SUS hijos — InventarioPage es quien crea
// <AdminShell>, no un descendiente suyo, asi que llamar el hook ahi arriba
// siempre da null.
function InventarioHeaderTabs({ activeTab, onTabChange }) {
  const setHeaderCenter = useAdminHeaderSlot()

  useEffect(() => {
    if (!setHeaderCenter) return
    setHeaderCenter(
      <div className="flex items-center gap-1 rounded-full border border-border bg-muted p-0.5">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={`h-8 rounded-full px-3.5 text-sm font-semibold transition ${
              activeTab === tab.id
                ? 'bg-card text-primary shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    )
    return () => setHeaderCenter(null)
  }, [setHeaderCenter, activeTab, onTabChange])

  return null
}

function RestrictedInventoryPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <DashboardPanel
          title="Inventario"
          subtitle="Esta sección se reserva para administración o auxiliares autorizados."
        >
          <div className="border border-border bg-muted px-4 py-5 text-sm leading-7 text-muted-foreground">
            Tu acceso actual no tiene visibilidad completa de inventario. Si necesitas revisar cantidades,
            alertas o movimientos, solicita permisos al administrador principal o al auxiliar responsable.
          </div>
        </DashboardPanel>
      </div>
    </div>
  )
}

export default function InventarioPage() {
  const usuario = useAuthStore((state) => state.usuario)

  const [activeTab, setActiveTab] = useState('resumen')
  const [inventarioSeleccionado, setInventarioSeleccionado] = useState(null) // null | 'ventas' | 'clinica'
  const [selectorOpen, setSelectorOpen] = useState(false)

  const rolPermitido = hasAnyRole(usuario, ['admin', 'superadmin', 'auxiliar'])
  // Todos los planes incluyen inventario y reportes operativos.
  const puedeVerInventario = rolPermitido

  const resumenHook = useInventarioResumen({ enabled: puedeVerInventario })

  const movimientosHook = useInventarioMovimientos({ enabled: puedeVerInventario })

  const productosHook = useInventarioProductos({
    enabled: puedeVerInventario,
    onProductDeleted: (productoId) => {
      if (movimientosHook.selectedProduct?.id === productoId) {
        movimientosHook.clearSelection()
      }
    },
  })

  const importarInventarioHook = useImportarInventario()

  const movimientosClinicosHook = useMovimientosClinicos({ enabled: puedeVerInventario })

  const insumosClinicosHook = useInsumosClinicos({
    enabled: puedeVerInventario,
    onInsumoDeleted: (insumoId) => {
      if (movimientosClinicosHook.selectedInsumo?.id === insumoId) {
        movimientosClinicosHook.clearSelection()
      }
    },
  })

  const serviciosHook = useServicios({ enabled: puedeVerInventario })

  useEffect(() => {
    document.title = 'Inventario | Bourgelat'
  }, [])

  function handleTabClick(tabId) {
    setActiveTab(tabId)
    if (tabId === 'productos' && inventarioSeleccionado === null) {
      setSelectorOpen(true)
    }
  }

  function handleMovimientoClick(producto) {
    movimientosHook.selectProduct(producto)
    setActiveTab('movimientos')
  }

  if (!rolPermitido) return <RestrictedInventoryPage />

  const { resumen, categoriasData, alertsRows, reporteQuery, alertasQuery } = resumenHook
  const {
    productosQuery,
    productosRows,
    buscar, setBuscar,
    categoria, setCategoria,
    bajoStock, setBajoStock,
    pagina: paginaProductos, setPagina: setPaginaProductos,
    editingProduct,
    drawerOpen,
    confirmDialog, setConfirmDialog,
    openCreateDrawer,
    closeDrawer,
    openEditDrawer,
    openConfirmDelete,
    confirmDelete,
    handleDrawerSubmit,
    isPendingProduct,
    isPendingDelete,
  } = productosHook

  const {
    movimientosQuery,
    movimientosRows,
    detalleProducto,
    detalleMovimientosRows,
    motivosDisponibles,
    movementForm, setMovementForm,
    selectedProduct,
    pagina: paginaMovimientos, setPagina: setPaginaMovimientos,
    isPendingMovement,
    submitMovementForm,
    selectProduct,
  } = movimientosHook

  const facturaCompraHook = useFacturaCompra()

  return (
    <AdminShell
      currentKey="inventario"
      title="Inventario y control de cantidades"
      description="Revisa categorías, alertas, productos activos y movimientos de inventario con un lenguaje claro de oficina clínica."
      headerBadge={
        <StatusPill tone="border-primary/30 bg-primary/10 text-primary">Control operativo</StatusPill>
      }
      actions={
        <NavCta to="/finanzas" icon={Wallet}>
          Abrir caja
        </NavCta>
      }
      asideNote="Aquí se concentran alertas, productos y movimientos. Lo importante es cuidar el inventario antes de afectar la caja o la consulta."
    >
      <InventarioHeaderTabs activeTab={activeTab} onTabChange={handleTabClick} />
      {!puedeVerInventario ? (
        <EmptyState
          icon={<Sparkles />}
          title="Inventario no disponible en el plan actual"
          description="Para administrar productos, movimientos y alertas necesitas inventario y reportes operativos activos dentro de la suscripción."
          action={<NavCta to="/planes" icon={Sparkles}>Revisar planes</NavCta>}
        />
      ) : (
        <div className="space-y-5">
          {/* Error banners */}
          {(reporteQuery.isError || productosQuery.isError) && (
            <div className="grid gap-3">
              {reporteQuery.isError && (
                <div className="border border-amber-200 dark:border-amber-700/50 bg-amber-50 dark:bg-amber-900/20 px-4 py-4 text-sm leading-7 text-amber-800 dark:text-amber-300">
                  No fue posible cargar el resumen de inventario.
                </div>
              )}
              {productosQuery.isError && (
                <div className="border border-red-200 dark:border-red-700/50 bg-red-50 dark:bg-red-900/20 px-4 py-4 text-sm leading-7 text-red-700 dark:text-red-300">
                  No fue posible cargar la tabla de productos.
                </div>
              )}
            </div>
          )}

          {/* Navegación de tabs — solo movil, en escritorio vive en la barra superior */}
          <div className="flex gap-0 border-b border-border sm:hidden">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabClick(tab.id)}
                className={`-mb-px border-b-2 px-5 py-3 text-sm font-semibold transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab: Resumen */}
          {activeTab === 'resumen' && (
            <div className="space-y-5">
              <div className="grid gap-4 xl:grid-cols-4">
                <KpiCard
                  icon={Boxes}
                  label="Productos activos"
                  value={formatNumber(resumen.totalProductos || 0)}
                  helper="Productos actualmente activos en el inventario."
                />
                <KpiCard
                  icon={ShieldCheck}
                  label="Valor inventariado"
                  value={formatCurrency(resumen.valorTotalInventario || 0)}
                  helper="Valor estimado a precio de venta del inventario cargado."
                  tone="text-emerald-700 dark:text-emerald-400"
                />
                <KpiCard
                  icon={CircleAlert}
                  label="Cantidad baja"
                  value={formatNumber(resumen.bajoStock || 0)}
                  helper="Productos por debajo del mínimo definido."
                  tone="text-amber-700 dark:text-amber-400"
                />
                <KpiCard
                  icon={Sparkles}
                  label="Alertas totales"
                  value={formatNumber(alertsRows.length)}
                  helper="Suma de cantidad baja, próximos a vencer y vencidos."
                  tone="text-rose-700 dark:text-rose-400"
                />
              </div>

              {/* Fase 2b: breakpoint corregido de 2xl → xl */}
              <div className="grid gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
                <DonutCard
                  title="Categorías activas"
                  subtitle="Distribución de productos por categoría."
                  data={categoriasData}
                  centerLabel="Productos"
                  centerValue={formatNumber(resumen.totalProductos || 0)}
                  formatter={formatNumber}
                  emptyMessage="Aun no hay categorias para mostrar."
                />
                <DataTable
                  title="Alertas prioritarias"
                  subtitle="Lo que conviene revisar primero antes de abrir el detalle completo."
                  rows={alertsRows.slice(0, 10)}
                  columns={[
                    {
                      key: 'tipo',
                      label: 'Tipo',
                      render: (row) => (
                        <StatusPill
                          tone={
                            row.tipo === 'Vencido'
                              ? 'border-red-200 dark:border-red-700/50 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                              : row.tipo === 'Proximo a vencer'
                                ? 'border-amber-200 dark:border-amber-700/50 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300'
                                : 'border-cyan-200 dark:border-cyan-700/50 bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-300'
                          }
                        >
                          {row.tipo}
                        </StatusPill>
                      ),
                    },
                    { key: 'nombre', label: 'Producto' },
                    { key: 'categoria', label: 'Categoría' },
                    { key: 'detalle', label: 'Detalle' },
                  ]}
                  emptyTitle="No hay alertas activas"
                  emptyBody="Cuando las cantidades o los vencimientos requieran atención, aparecerán aquí."
                />
              </div>
            </div>
          )}

          {/* Tab: Productos — sin inventario seleccionado */}
          {activeTab === 'productos' && inventarioSeleccionado === null && (
            <DashboardPanel
              title="Elige el inventario a gestionar"
              subtitle="Selecciona Ventas o Clínica para trabajar con los datos correctos."
            >
              <div className="flex flex-col items-start gap-4 border border-dashed border-border bg-muted/40 px-5 py-6">
                <p className="text-sm leading-6 text-muted-foreground">
                  Cada inventario maneja sus propios productos y movimientos. Debes elegir uno para
                  continuar.
                </p>
                <button
                  type="button"
                  onClick={() => setSelectorOpen(true)}
                  className="inline-flex items-center gap-2 border border-border bg-foreground px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
                >
                  <ArrowLeftRight className="h-4 w-4" />
                  Elegir inventario
                </button>
              </div>
            </DashboardPanel>
          )}

          {/* Tab: Productos — inventario de ventas */}
          {activeTab === 'productos' && inventarioSeleccionado === 'ventas' && (
            <div className="space-y-4">
              <InventarioContextBar inventario="ventas" onCambiar={() => setSelectorOpen(true)} />
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex flex-1 items-center gap-2 min-w-0">
                  <div className="relative max-w-sm flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      id="buscar-productos"
                      type="text"
                      value={buscar}
                      onChange={(e) => { setBuscar(e.target.value); setPaginaProductos(1) }}
                      placeholder="Buscar por nombre, lote o laboratorio"
                      aria-label="Buscar productos"
                      className="h-11 w-full border border-border bg-card pl-10 pr-3 text-sm text-foreground outline-none transition focus:border-primary"
                    />
                  </div>
                  <FiltroInventarioMenu
                    categoryOptions={CATEGORY_OPTIONS}
                    categoria={categoria}
                    onCategoriaChange={(value) => { setCategoria(value); setPaginaProductos(1) }}
                    bajoStock={bajoStock}
                    onBajoStockChange={() => { setBajoStock((v) => !v); setPaginaProductos(1) }}
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={importarInventarioHook.openImportDialog}
                    className="inline-flex items-center gap-2 whitespace-nowrap border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground transition hover:bg-muted"
                  >
                    <FileSpreadsheet className="h-4 w-4" />
                    Importar Excel
                  </button>
                  <button
                    type="button"
                    onClick={openCreateDrawer}
                    className="inline-flex items-center gap-2 whitespace-nowrap border border-border bg-foreground px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
                  >
                    <PackagePlus className="h-4 w-4" />
                    Nuevo producto
                  </button>
                </div>
              </div>

              {productosQuery.isLoading ? (
                <DashboardPanel title="Productos activos" subtitle="Base operativa del inventario.">
                  <TableSkeleton rows={6} />
                </DashboardPanel>
              ) : (
                <DataTable
                  title="Productos activos"
                  subtitle="Base operativa del inventario."
                  rows={productosRows}
                  columns={[
                    { key: 'nombre', label: 'Producto' },
                    { key: 'categoria', label: 'Categoría' },
                    {
                      key: 'stock',
                      label: 'Cantidad / Mín.',
                      render: (row) => <StockBadge stock={row.stock} stockMinimo={row.stockMinimo} />,
                    },
                    { key: 'valor', label: 'Valor' },
                    {
                      key: 'alertas',
                      label: 'Alertas',
                      render: (row) =>
                        row.alertas.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {row.alertas.map((alerta) => (
                              <StatusPill
                                key={`${row.id}-${alerta}`}
                                tone={
                                  alerta === 'vencido'
                                    ? 'border-red-200 dark:border-red-700/50 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                                    : alerta === 'proximo_vencimiento'
                                      ? 'border-amber-200 dark:border-amber-700/50 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300'
                                      : 'border-cyan-200 dark:border-cyan-700/50 bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-300'
                                }
                              >
                                {alerta.replaceAll('_', ' ')}
                              </StatusPill>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400">Sin alertas</span>
                        ),
                    },
                    {
                      key: 'accion',
                      label: 'Acciones',
                      render: (row) => (
                        <div className="flex flex-wrap gap-3">
                          <button
                            type="button"
                            onClick={() => handleMovimientoClick(row.raw)}
                            className="text-sm font-semibold text-primary hover:underline"
                          >
                            Movimiento
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditDrawer(row.raw)}
                            className="text-sm font-semibold text-slate-700 hover:text-slate-900"
                          >
                            Editar
                          </button>
                          {/* Fase 2a: desactivar directo desde la tabla */}
                          <button
                            type="button"
                            onClick={() => openConfirmDelete(row.raw)}
                            className="text-sm font-semibold text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                          >
                            Desactivar
                          </button>
                        </div>
                      ),
                    },
                  ]}
                  emptyTitle="No hay productos para este filtro"
                  emptyBody="Ajusta la búsqueda o crea el primer producto con el botón Nuevo producto."
                />
              )}

              {/* Fase 3c: paginacion unificada */}
              <Paginacion
                pagina={productosQuery.data?.paginaActual || 1}
                paginas={productosQuery.data?.paginas || 1}
                onChange={setPaginaProductos}
              />
            </div>
          )}

          {/* Tab: Productos — inventario clinico */}
          {activeTab === 'productos' && inventarioSeleccionado === 'clinica' && (
            <div className="space-y-4">
              <InventarioContextBar inventario="clinica" onCambiar={() => setSelectorOpen(true)} />
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex flex-1 items-center gap-2 min-w-0">
                  <div className="relative max-w-sm flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      id="buscar-insumos-clinicos"
                      type="text"
                      value={insumosClinicosHook.buscar}
                      onChange={(e) => { insumosClinicosHook.setBuscar(e.target.value); insumosClinicosHook.setPagina(1) }}
                      placeholder="Buscar por nombre, lote o laboratorio"
                      aria-label="Buscar insumos clínicos"
                      className="h-11 w-full border border-border bg-card pl-10 pr-3 text-sm text-foreground outline-none transition focus:border-primary"
                    />
                  </div>
                  <FiltroInventarioMenu
                    categoryOptions={CLINICO_CATEGORY_OPTIONS}
                    categoria={insumosClinicosHook.categoria}
                    onCategoriaChange={(value) => { insumosClinicosHook.setCategoria(value); insumosClinicosHook.setPagina(1) }}
                    bajoStock={insumosClinicosHook.bajoStock}
                    onBajoStockChange={() => { insumosClinicosHook.setBajoStock((v) => !v); insumosClinicosHook.setPagina(1) }}
                  />
                </div>
                <button
                  type="button"
                  onClick={insumosClinicosHook.openCreateDrawer}
                  className="inline-flex items-center gap-2 whitespace-nowrap border border-border bg-foreground px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
                >
                  <FlaskConical className="h-4 w-4" />
                  Nuevo insumo clínico
                </button>
              </div>

              {insumosClinicosHook.insumosQuery.isLoading ? (
                <DashboardPanel title="Insumos clínicos" subtitle="Existencias de consumo interno para servicios y procedimientos.">
                  <TableSkeleton rows={6} />
                </DashboardPanel>
              ) : (
                <DataTable
                  title="Insumos clínicos"
                  subtitle="Existencias de consumo interno para servicios y procedimientos. No se venden: lo aplicado se descuenta al cerrar la historia clínica y se registra como gasto de insumos."
                  rows={insumosClinicosHook.insumosRows}
                  columns={[
                    { key: 'nombre', label: 'Insumo' },
                    { key: 'categoria', label: 'Categoría' },
                    {
                      key: 'stock',
                      label: 'Cantidad / Mín.',
                      render: (row) => (
                        <span className="text-sm text-foreground">
                          {formatNumber(row.stock)} / {formatNumber(row.stockMinimo)} {row.unidadBase}
                        </span>
                      ),
                    },
                    {
                      key: 'costo',
                      label: 'Costo unitario',
                      render: (row) => (
                        <span className="text-sm text-foreground">
                          {formatCurrency(row.precioUnitarioBase)} / {row.unidadBase}
                        </span>
                      ),
                    },
                    { key: 'valor', label: 'Valor del inventario' },
                    {
                      key: 'alertas',
                      label: 'Alertas',
                      render: (row) =>
                        row.alertas.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {row.alertas.map((alerta) => (
                              <StatusPill
                                key={`${row.id}-${alerta}`}
                                tone={
                                  alerta === 'vencido'
                                    ? 'border-red-200 dark:border-red-700/50 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                                    : alerta === 'proximo_vencimiento'
                                      ? 'border-amber-200 dark:border-amber-700/50 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300'
                                      : 'border-cyan-200 dark:border-cyan-700/50 bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-300'
                                }
                              >
                                {alerta.replaceAll('_', ' ')}
                              </StatusPill>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400">Sin alertas</span>
                        ),
                    },
                    {
                      key: 'accion',
                      label: 'Acciones',
                      render: (row) => (
                        <div className="flex flex-wrap gap-3">
                          <button
                            type="button"
                            onClick={() => insumosClinicosHook.openEditDrawer(row.raw)}
                            className="text-sm font-semibold text-slate-700 hover:text-slate-900"
                          >
                            Editar / Comprar
                          </button>
                          <button
                            type="button"
                            onClick={() => insumosClinicosHook.openConfirmDelete(row.raw)}
                            className="text-sm font-semibold text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                          >
                            Desactivar
                          </button>
                        </div>
                      ),
                    },
                  ]}
                  emptyTitle="No hay insumos clínicos para este filtro"
                  emptyBody="Ajusta la búsqueda o crea el primer insumo clínico con el botón Nuevo insumo clínico."
                />
              )}

              <Paginacion
                pagina={insumosClinicosHook.insumosQuery.data?.paginaActual || 1}
                paginas={insumosClinicosHook.insumosQuery.data?.paginas || 1}
                onChange={insumosClinicosHook.setPagina}
              />

              <DataTable
                title="Últimos movimientos de inventario clínico"
                subtitle="Historial de compras y consumos por servicios facturados."
                rows={movimientosClinicosHook.movimientosRows}
                columns={[
                  { key: 'fecha', label: 'Fecha' },
                  { key: 'insumo', label: 'Insumo' },
                  { key: 'tipo', label: 'Tipo' },
                  { key: 'motivo', label: 'Motivo' },
                  { key: 'cambio', label: 'Cantidad final' },
                ]}
                emptyTitle="Aún no hay movimientos registrados"
                emptyBody="Cuando registres compras o se facturen servicios que consuman insumos, verás el historial aquí."
              />
            </div>
          )}

          {/* Tab: Servicios */}
          {activeTab === 'servicios' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="relative max-w-sm flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={serviciosHook.buscar}
                    onChange={(e) => { serviciosHook.setBuscar(e.target.value); serviciosHook.setPagina(1) }}
                    placeholder="Buscar servicio por nombre"
                    aria-label="Buscar servicios"
                    className="h-11 w-full border border-border bg-card pl-10 pr-3 text-sm text-foreground outline-none transition focus:border-primary"
                  />
                </div>
                <button
                  type="button"
                  onClick={serviciosHook.openCreateDrawer}
                  className="inline-flex items-center gap-2 whitespace-nowrap border border-border bg-foreground px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
                >
                  <Plus className="h-4 w-4" />
                  Nuevo servicio
                </button>
              </div>

              <DataTable
                title="Catálogo de servicios"
                subtitle="Servicios predeterminados que, al facturarse, descuentan automáticamente el inventario clínico."
                rows={serviciosHook.serviciosRows}
                columns={[
                  { key: 'nombre', label: 'Servicio' },
                  { key: 'categoria', label: 'Categoría' },
                  { key: 'precioVenta', label: 'Precio de venta' },
                  { key: 'costoEstimado', label: 'Costo estimado' },
                  { key: 'insumos', label: 'Insumos en receta' },
                  {
                    key: 'accion',
                    label: 'Acciones',
                    render: (row) => (
                      <div className="flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={() => serviciosHook.openEditDrawer(row.raw)}
                          className="text-sm font-semibold text-slate-700 hover:text-slate-900"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => serviciosHook.openConfirmDelete(row.raw)}
                          className="text-sm font-semibold text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                        >
                          Desactivar
                        </button>
                      </div>
                    ),
                  },
                ]}
                emptyTitle="No hay servicios en el catálogo"
                emptyBody="Crea el primer servicio y define qué insumos clínicos consume."
              />

              <Paginacion
                pagina={serviciosHook.serviciosQuery.data?.paginaActual || 1}
                paginas={serviciosHook.serviciosQuery.data?.paginas || 1}
                onChange={serviciosHook.setPagina}
              />
            </div>
          )}

          {/* Tab: Movimientos */}
          {activeTab === 'movimientos' && (
            <div className="space-y-5">
              <div className="grid gap-5 xl:grid-cols-[420px_minmax(0,1fr)]">
                <DashboardPanel
                  title="Registrar movimiento"
                  subtitle="Entrada, salida o ajuste sobre la cantidad de un producto."
                >
                  <form className="grid gap-4" onSubmit={submitMovementForm}>
                    <div className="grid gap-1.5">
                      <label htmlFor="mov-producto" className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                        Producto *
                      </label>
                      <ProductoComboBox
                        id="mov-producto"
                        value={movementForm.productoId}
                        productoSeleccionado={selectedProduct}
                        onChange={(id, producto) => selectProduct(producto || { id })}
                        placeholder="Selecciona un producto"
                      />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="grid gap-1.5">
                        <label htmlFor="mov-tipo" className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                          Tipo de movimiento
                        </label>
                        <Select
                          variant="field"
                          id="mov-tipo"
                          className="h-11"
                          value={movementForm.tipo}
                          onValueChange={(nextType) => {
                            setMovementForm((cur) => ({
                              ...cur,
                              tipo: nextType,
                              motivo: (MOVEMENT_REASON_OPTIONS[nextType] || MOVEMENT_REASON_OPTIONS.entrada)[0].value,
                            }))
                          }}
                          options={MOVEMENT_TYPE_OPTIONS}
                        />
                      </div>
                      <div className="grid gap-1.5">
                        <label htmlFor="mov-motivo" className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                          Motivo
                        </label>
                        <Select
                          variant="field"
                          id="mov-motivo"
                          className="h-11"
                          value={movementForm.motivo}
                          onValueChange={(value) => setMovementForm((cur) => ({ ...cur, motivo: value }))}
                          options={motivosDisponibles}
                        />
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="grid gap-1.5">
                        <label htmlFor="mov-cantidad" className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                          {movementForm.tipo === 'ajuste' ? 'Cantidad final' : 'Cantidad'}
                        </label>
                        <input
                          id="mov-cantidad"
                          type="number"
                          min="0"
                          step="1"
                          value={movementForm.cantidad}
                          onChange={(e) => setMovementForm((cur) => ({ ...cur, cantidad: e.target.value }))}
                          placeholder="0"
                          className="h-11 border border-border bg-card px-3 text-sm text-foreground outline-none transition focus:border-primary"
                        />
                      </div>
                      <div className="grid gap-1.5">
                        <label htmlFor="mov-precio" className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                          Precio unitario
                        </label>
                        <input
                          id="mov-precio"
                          type="number"
                          min="0"
                          step="0.01"
                          value={movementForm.precioUnitario}
                          onChange={(e) => setMovementForm((cur) => ({ ...cur, precioUnitario: e.target.value }))}
                          placeholder="0"
                          className="h-11 border border-border bg-card px-3 text-sm text-foreground outline-none transition focus:border-primary"
                        />
                      </div>
                    </div>

                    <div className="grid gap-1.5">
                      <label htmlFor="mov-obs" className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                        Observaciones
                      </label>
                      <textarea
                        id="mov-obs"
                        value={movementForm.observaciones}
                        onChange={(e) => setMovementForm((cur) => ({ ...cur, observaciones: e.target.value }))}
                        placeholder="Notas adicionales del movimiento"
                        className="min-h-[88px] border border-border bg-card px-3 py-3 text-sm text-foreground outline-none transition focus:border-primary"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isPendingMovement}
                      className="border border-border bg-foreground px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isPendingMovement ? 'Registrando...' : 'Registrar movimiento'}
                    </button>
                  </form>
                </DashboardPanel>

                <DashboardPanel
                  title="Detalle del producto"
                  subtitle="Resumen rápido y últimos movimientos del producto seleccionado."
                >
                  {selectedProduct ? (
                    <div className="grid gap-4">
                      <div className="grid gap-3 border border-border bg-muted px-4 py-4 text-sm text-foreground sm:grid-cols-2">
                        <div>
                          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Producto</p>
                          <p className="mt-1 font-semibold">{detalleProducto?.nombre || selectedProduct.nombre}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Cantidad actual</p>
                          <p className="mt-1 font-semibold">{formatNumber(detalleProducto?.stock ?? selectedProduct.stock ?? 0)}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Cantidad mínima</p>
                          <p className="mt-1">{formatNumber(detalleProducto?.stockMinimo ?? selectedProduct.stockMinimo ?? 0)}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Laboratorio / lote</p>
                          <p className="mt-1">{detalleProducto?.laboratorio || '-'} / {detalleProducto?.lote || '-'}</p>
                        </div>
                      </div>

                      <DataTable
                        title="Últimos movimientos del producto"
                        subtitle="Vista rápida de entradas, salidas y ajustes recientes."
                        rows={detalleMovimientosRows}
                        columns={[
                          { key: 'fecha', label: 'Fecha' },
                          { key: 'tipo', label: 'Tipo' },
                          { key: 'motivo', label: 'Motivo' },
                          { key: 'cantidad', label: 'Cantidad' },
                          { key: 'cambio', label: 'Cantidad final' },
                        ]}
                        emptyTitle="Sin movimientos recientes"
                        emptyBody="Este producto aún no tiene movimientos registrados."
                      />
                    </div>
                  ) : (
                    <div className="border border-border bg-muted px-4 py-5 text-sm leading-7 text-muted-foreground">
                      Selecciona un producto en el selector de arriba para ver su detalle y los ultimos movimientos.
                    </div>
                  )}
                </DashboardPanel>
              </div>

              {movimientosQuery.isLoading ? (
                <DashboardPanel title="Últimos movimientos" subtitle="Historial de cambios en las cantidades.">
                  <TableSkeleton rows={4} />
                </DashboardPanel>
              ) : (
                <DataTable
                  title="Últimos movimientos"
                  subtitle="Historial de cambios en las cantidades."
                  rows={movimientosRows}
                  columns={[
                    { key: 'fecha', label: 'Fecha' },
                    { key: 'producto', label: 'Producto' },
                    { key: 'tipo', label: 'Tipo' },
                    { key: 'motivo', label: 'Motivo' },
                    { key: 'cambio', label: 'Cantidad final' },
                  ]}
                  emptyTitle="Aún no hay movimientos registrados"
                  emptyBody="Cuando se creen entradas, salidas o ajustes, esta tabla mostrará lo más reciente."
                  action={
                    <StatusPill tone="border-border bg-muted text-foreground">
                      Pagina {movimientosQuery.data?.paginaActual || 1}
                    </StatusPill>
                  }
                />
              )}

              {/* Fase 3c: paginacion unificada */}
              <Paginacion
                pagina={movimientosQuery.data?.paginaActual || 1}
                paginas={movimientosQuery.data?.paginas || 1}
                onChange={setPaginaMovimientos}
              />
            </div>
          )}
          {/* Tab: Facturas de Compra */}
          {activeTab === 'facturas-compra' && (
            <div className="space-y-4">

              {/* Banner de alertas de pago */}
              {(facturaCompraHook.alertasCompra.totalVencidas > 0 || facturaCompraHook.alertasCompra.totalProximas > 0) && (
                <div className="flex flex-wrap items-center gap-3 border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-700 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
                  <CircleAlert className="h-4 w-4 shrink-0" />
                  <span>
                    {facturaCompraHook.alertasCompra.totalVencidas > 0 && (
                      <button
                        type="button"
                        onClick={() => { facturaCompraHook.setFiltroEstado('confirmada'); facturaCompraHook.setPagina(1) }}
                        className="font-semibold text-red-700 dark:text-red-400 hover:underline mr-2"
                      >
                        {facturaCompraHook.alertasCompra.totalVencidas} {facturaCompraHook.alertasCompra.totalVencidas === 1 ? 'factura vencida' : 'facturas vencidas'}
                      </button>
                    )}
                    {facturaCompraHook.alertasCompra.totalVencidas > 0 && facturaCompraHook.alertasCompra.totalProximas > 0 && '·'}
                    {facturaCompraHook.alertasCompra.totalProximas > 0 && (
                      <button
                        type="button"
                        onClick={() => { facturaCompraHook.setFiltroEstado('confirmada'); facturaCompraHook.setPagina(1) }}
                        className="font-semibold hover:underline ml-2"
                      >
                        {facturaCompraHook.alertasCompra.totalProximas} {facturaCompraHook.alertasCompra.totalProximas === 1 ? 'factura vence' : 'facturas vencen'} en los próximos 7 días
                      </button>
                    )}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {['', 'borrador', 'confirmada', 'anulada'].map((estado) => (
                    <button
                      key={estado}
                      type="button"
                      onClick={() => { facturaCompraHook.setFiltroEstado(estado); facturaCompraHook.setPagina(1) }}
                      className={`border px-3 py-1.5 text-xs font-semibold transition ${
                        facturaCompraHook.filtroEstado === estado
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border bg-card text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      {estado === '' ? 'Todas' : estado.charAt(0).toUpperCase() + estado.slice(1)}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={facturaCompraHook.abrirNueva}
                  className="inline-flex items-center gap-2 whitespace-nowrap border border-border bg-foreground px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
                >
                  <ShoppingCart className="h-4 w-4" />
                  Nueva factura de compra
                </button>
              </div>

              {facturaCompraHook.isLoading ? (
                <DashboardPanel title="Facturas de compra" subtitle="Historial de compras a proveedores.">
                  <TableSkeleton rows={5} />
                </DashboardPanel>
              ) : (
                <DataTable
                  title="Facturas de compra"
                  subtitle="Historial de compras a proveedores. Confirma una factura para actualizar las cantidades."
                  rows={facturaCompraHook.facturas.map((f) => {
                    const hoy = new Date()
                    const plazo = f.fechaPagoFinal ? new Date(f.fechaPagoFinal) : null
                    const enSieteDias = new Date(); enSieteDias.setDate(hoy.getDate() + 7)
                    let plazoBadge = null
                    if (f.pagada) {
                      plazoBadge = <span className="inline-block rounded px-2 py-0.5 text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">Pagada · {f.fechaPago}</span>
                    } else if (plazo) {
                      if (plazo < hoy) {
                        plazoBadge = <span className="inline-block rounded px-2 py-0.5 text-xs font-semibold bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">Vencida · {f.fechaPagoFinal}</span>
                      } else if (plazo <= enSieteDias) {
                        plazoBadge = <span className="inline-block rounded px-2 py-0.5 text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">Vence {f.fechaPagoFinal}</span>
                      } else {
                        plazoBadge = <span className="text-sm text-muted-foreground">{f.fechaPagoFinal}</span>
                      }
                    }
                    return {
                      id: f.id,
                      numero: f.numero || <span className="text-muted-foreground">—</span>,
                      proveedor: f.proveedor,
                      fecha: f.fecha,
                      estado: f.estado,
                      plazo: plazoBadge || <span className="text-muted-foreground">—</span>,
                      items: f.items?.length ?? '—',
                      total: formatCurrency(Number(f.total || 0)),
                      raw: f,
                    }
                  })}
                  columns={[
                    { key: 'numero', label: 'N° Factura' },
                    { key: 'proveedor', label: 'Proveedor' },
                    { key: 'fecha', label: 'Fecha' },
                    {
                      key: 'estado',
                      label: 'Estado',
                      render: (row) => (
                        <span className={`inline-block rounded px-2 py-0.5 text-xs font-semibold ${ESTADO_COLORS[row.estado] || ''}`}>
                          {row.estado.charAt(0).toUpperCase() + row.estado.slice(1)}
                        </span>
                      ),
                    },
                    { key: 'plazo', label: 'Plazo de pago' },
                    { key: 'items', label: 'Ítems' },
                    { key: 'total', label: 'Total' },
                    {
                      key: 'acciones',
                      label: 'Acciones',
                      render: (row) => (
                        <div className="flex flex-wrap gap-3">
                          <button
                            type="button"
                            onClick={() => facturaCompraHook.abrirDetalle(row.raw)}
                            className="text-sm font-semibold text-slate-700 hover:text-slate-900"
                          >
                            Ver
                          </button>
                          {row.raw.estado === 'borrador' && (
                            <>
                              <button
                                type="button"
                                onClick={() => facturaCompraHook.abrirEditar(row.raw)}
                                className="text-sm font-semibold text-slate-700 hover:text-slate-900"
                              >
                                Editar
                              </button>
                              <button
                                type="button"
                                onClick={() => facturaCompraHook.pedirConfirmar(row.raw.id)}
                                className="text-sm font-semibold text-primary hover:underline"
                              >
                                Confirmar
                              </button>
                            </>
                          )}
                          {row.raw.estado === 'confirmada' && !row.raw.pagada && row.raw.fechaPagoFinal && (
                            <button
                              type="button"
                              onClick={() => facturaCompraHook.pedirPagar(row.raw.id)}
                              className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 hover:text-emerald-900 dark:hover:text-emerald-300"
                            >
                              Confirmar pago
                            </button>
                          )}
                          {row.raw.estado !== 'anulada' && (
                            <button
                              type="button"
                              onClick={() => facturaCompraHook.pedirAnular(row.raw.id)}
                              className="text-sm font-semibold text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                            >
                              Anular
                            </button>
                          )}
                        </div>
                      ),
                    },
                  ]}
                  emptyTitle="No hay facturas de compra"
                  emptyBody="Crea una nueva factura de compra para registrar el ingreso de mercancía al inventario."
                />
              )}

              <Paginacion
                pagina={facturaCompraHook.pagina}
                paginas={facturaCompraHook.paginas}
                onChange={facturaCompraHook.setPagina}
              />
            </div>
          )}
        </div>
      )}

      {/* Selector de inventario (Ventas / Clinica) */}
      <InventarioSelectorDialog
        open={selectorOpen}
        onOpenChange={setSelectorOpen}
        seleccionActual={inventarioSeleccionado}
        onSelect={(inv) => {
          setInventarioSeleccionado(inv)
          setSelectorOpen(false)
        }}
      />

      {/* Drawer de producto (Fase 3a+3b) */}
      <ProductoDrawer
        open={drawerOpen}
        editingProduct={editingProduct}
        onClose={closeDrawer}
        onSubmit={handleDrawerSubmit}
        isPending={isPendingProduct}
      />

      {/* Importacion masiva de inventario desde Excel */}
      <ImportarInventarioDialog
        open={importarInventarioHook.dialogOpen}
        onClose={importarInventarioHook.closeImportDialog}
        onConfirm={importarInventarioHook.confirmImport}
        isPending={importarInventarioHook.isPending}
        resultado={importarInventarioHook.resultado}
      />

      {/* Drawer de insumos clinicos */}
      <InsumoClinicoDrawer
        open={insumosClinicosHook.drawerOpen}
        editingInsumo={insumosClinicosHook.editingInsumo}
        onClose={insumosClinicosHook.closeDrawer}
        onSubmit={insumosClinicosHook.handleDrawerSubmit}
        onRegistrarCompra={insumosClinicosHook.handleRegistrarCompra}
        onRegistrarMerma={insumosClinicosHook.handleRegistrarMerma}
        isPending={insumosClinicosHook.isPendingInsumo}
        isPendingCompra={insumosClinicosHook.isPendingCompra}
        isPendingMerma={insumosClinicosHook.isPendingMerma}
      />

      {/* Drawer del catalogo de servicios */}
      <ServicioDrawer
        open={serviciosHook.drawerOpen}
        editingServicio={serviciosHook.editingServicio}
        onClose={serviciosHook.closeDrawer}
        onSubmit={serviciosHook.handleDrawerSubmit}
        isPending={serviciosHook.isPendingServicio}
        insumosDisponibles={insumosClinicosHook.insumosSelectorQuery.data?.insumos || []}
      />

      {/* ConfirmDialog desactivar servicio */}
      {serviciosHook.confirmDialog.open && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-sm border border-border bg-card p-6 shadow-xl">
            <p className="text-sm font-semibold text-foreground">
              Desactivar &ldquo;{serviciosHook.confirmDialog.servicio?.nombre}&rdquo;
            </p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Esta acción retirará el servicio del catálogo activo. Las facturas ya emitidas no se ven afectadas.
            </p>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={serviciosHook.confirmDelete}
                disabled={serviciosHook.isPendingDelete}
                className="flex-1 border border-red-300 dark:border-red-800 bg-red-600 dark:bg-red-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 dark:hover:bg-red-600 disabled:opacity-60"
              >
                {serviciosHook.isPendingDelete ? 'Desactivando...' : 'Desactivar'}
              </button>
              <button
                type="button"
                onClick={() => serviciosHook.setConfirmDialog({ open: false, servicio: null })}
                disabled={serviciosHook.isPendingDelete}
                className="flex-1 border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground transition hover:bg-muted"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Drawer de facturas de compra */}
      <FacturaCompraDrawer
        open={facturaCompraHook.drawerOpen}
        editingFactura={facturaCompraHook.editingFactura}
        form={facturaCompraHook.form}
        setForm={facturaCompraHook.setForm}
        onClose={facturaCompraHook.cerrarDrawer}
        onSubmit={facturaCompraHook.submitForm}
        isSaving={facturaCompraHook.isSaving}
        agregarItem={facturaCompraHook.agregarItem}
        actualizarItem={facturaCompraHook.actualizarItem}
        seleccionarProductoItem={facturaCompraHook.seleccionarProductoItem}
        actualizarItemDestino={facturaCompraHook.actualizarItemDestino}
        eliminarItem={facturaCompraHook.eliminarItem}
        totalCalculado={facturaCompraHook.totalCalculado}
        toggleItemEsNuevo={facturaCompraHook.toggleItemEsNuevo}
        actualizarItemProductoNuevo={facturaCompraHook.actualizarItemProductoNuevo}
        errorMsg={facturaCompraHook.errorMsg}
      />

      <FacturaCompraDetalleModal
        factura={facturaCompraHook.facturaDetalle}
        onClose={facturaCompraHook.cerrarDetalle}
      />

      {/* ConfirmDialog facturas de compra */}
      {facturaCompraHook.confirmDialog.open && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-sm border border-border bg-card p-6 shadow-xl">
            <p className="text-sm font-semibold text-foreground">
              {facturaCompraHook.confirmDialog.tipo === 'confirmar'
                ? '¿Confirmar factura de compra?'
                : facturaCompraHook.confirmDialog.tipo === 'pagar'
                  ? '¿Confirmar pago de esta factura?'
                  : '¿Anular factura de compra?'}
            </p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {facturaCompraHook.confirmDialog.tipo === 'confirmar'
                ? 'Al confirmar, la cantidad de cada producto se actualizará con lo que trae esta factura. Esta acción no se puede deshacer directamente.'
                : facturaCompraHook.confirmDialog.tipo === 'pagar'
                  ? 'Esta acción quedará registrada con la fecha de hoy como constancia del pago. No se puede revertir.'
                  : 'Al anular una factura confirmada, las entradas registradas se devolverán con ajustes de cantidad.'}
            </p>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={facturaCompraHook.ejecutarAccion}
                disabled={facturaCompraHook.isActuando}
                className={`flex-1 px-4 py-2.5 text-sm font-semibold text-white transition disabled:opacity-60 ${
                  facturaCompraHook.confirmDialog.tipo === 'anular'
                    ? 'border border-red-300 dark:border-red-800 bg-red-600 dark:bg-red-700 hover:bg-red-700 dark:hover:bg-red-600'
                    : 'border border-emerald-300 dark:border-emerald-800 bg-emerald-600 dark:bg-emerald-700 hover:bg-emerald-700 dark:hover:bg-emerald-600'
                }`}
              >
                {facturaCompraHook.isActuando
                  ? 'Procesando…'
                  : facturaCompraHook.confirmDialog.tipo === 'confirmar'
                    ? 'Sí, confirmar'
                    : facturaCompraHook.confirmDialog.tipo === 'pagar'
                      ? 'Sí, marcar como pagada'
                      : 'Sí, anular'}
              </button>
              <button
                type="button"
                onClick={facturaCompraHook.cancelarAccion}
                disabled={facturaCompraHook.isActuando}
                className="flex-1 border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground transition hover:bg-muted"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ConfirmDialog insumos clinicos */}
      {insumosClinicosHook.confirmDialog.open && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-sm border border-border bg-card p-6 shadow-xl">
            <p className="text-sm font-semibold text-foreground">
              Desactivar &ldquo;{insumosClinicosHook.confirmDialog.insumo?.nombre}&rdquo;
            </p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Esta acción retirará el insumo del inventario clínico activo. Los movimientos anteriores se conservan.
            </p>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={insumosClinicosHook.confirmDelete}
                disabled={insumosClinicosHook.isPendingDelete}
                className="flex-1 border border-red-300 dark:border-red-800 bg-red-600 dark:bg-red-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 dark:hover:bg-red-600 disabled:opacity-60"
              >
                {insumosClinicosHook.isPendingDelete ? 'Desactivando...' : 'Desactivar'}
              </button>
              <button
                type="button"
                onClick={() => insumosClinicosHook.setConfirmDialog({ open: false, insumo: null })}
                disabled={insumosClinicosHook.isPendingDelete}
                className="flex-1 border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground transition hover:bg-muted"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ConfirmDialog — Fase 3d: z-60 para quedar sobre el drawer */}
      {confirmDialog.open && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-dialog-title"
        >
          <div className="w-full max-w-sm border border-border bg-card p-6 shadow-xl">
            <p id="confirm-dialog-title" className="text-sm font-semibold text-foreground">
              Desactivar &ldquo;{confirmDialog.producto?.nombre}&rdquo;
            </p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Esta acción retirará el producto del inventario activo. Los movimientos anteriores se conservan.
            </p>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={confirmDelete}
                disabled={isPendingDelete}
                className="flex-1 border border-red-300 dark:border-red-800 bg-red-600 dark:bg-red-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 dark:hover:bg-red-600 disabled:opacity-60"
              >
                {isPendingDelete ? 'Desactivando...' : 'Desactivar'}
              </button>
              <button
                type="button"
                onClick={() => setConfirmDialog({ open: false, producto: null })}
                disabled={isPendingDelete}
                className="flex-1 border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground transition hover:bg-muted"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  )
}
