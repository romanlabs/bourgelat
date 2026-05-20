import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CircleAlert, PackagePlus, Search, ShieldCheck, Sparkles, Boxes } from 'lucide-react'
import AdminShell from '@/components/layout/AdminShell'
import {
  DashboardPanel,
  DataTable,
  DonutCard,
  EmptyModuleState,
  KpiCard,
  StatusPill,
} from '@/features/dashboard/dashboardComponents'
import { formatCurrency, formatNumber } from '@/features/dashboard/dashboardUtils'
import { useAuthStore } from '@/store/authStore'
import { hasAnyRole } from '@/lib/permissions'
import Paginacion from '@/components/shared/Paginacion'
import ProductoDrawer from '@/features/inventario/ProductoDrawer'
import { useInventarioResumen } from '@/features/inventario/useInventarioResumen'
import { useInventarioProductos, CATEGORY_OPTIONS } from '@/features/inventario/useInventarioProductos'
import {
  useInventarioMovimientos,
  MOVEMENT_TYPE_OPTIONS,
  MOVEMENT_REASON_OPTIONS,
} from '@/features/inventario/useInventarioMovimientos'

const TABS = [
  { id: 'resumen', label: 'Resumen' },
  { id: 'productos', label: 'Productos' },
  { id: 'movimientos', label: 'Movimientos' },
]

function StockBadge({ stock, stockMinimo }) {
  const num = Number(stock ?? 0)
  const min = Number(stockMinimo ?? 0)
  if (num === 0)
    return (
      <span className="inline-flex items-center gap-1 border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700">
        0 / {min}
      </span>
    )
  if (num <= min)
    return (
      <span className="inline-flex items-center gap-1 border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
        {num} / {min}
      </span>
    )
  return (
    <span className="inline-flex items-center gap-1 border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
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

function RestrictedInventoryPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <DashboardPanel
          title="Inventario"
          subtitle="Este modulo se reserva para administracion o auxiliares autorizados."
        >
          <div className="border border-border bg-muted px-4 py-5 text-sm leading-7 text-muted-foreground">
            Tu acceso actual no tiene visibilidad completa de inventario. Si necesitas revisar stock,
            alertas o movimientos, solicita permisos al administrador principal o al auxiliar responsable.
          </div>
        </DashboardPanel>
      </div>
    </div>
  )
}

export default function InventarioPage() {
  const usuario = useAuthStore((state) => state.usuario)
  const suscripcion = useAuthStore((state) => state.suscripcion)

  const [activeTab, setActiveTab] = useState('resumen')

  const rolPermitido = hasAnyRole(usuario, ['admin', 'superadmin', 'auxiliar'])
  const puedeVerInventario =
    rolPermitido &&
    Array.isArray(suscripcion?.funcionalidades) &&
    suscripcion.funcionalidades.includes('inventario') &&
    suscripcion.funcionalidades.includes('reportes_operativos')

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

  useEffect(() => {
    document.title = 'Inventario | Bourgelat'
  }, [])

  function handleMovimientoClick(producto) {
    movimientosHook.selectProduct(producto)
    setActiveTab('movimientos')
  }

  if (!rolPermitido) return <RestrictedInventoryPage />

  const { resumen, categoriasData, alertsRows, reporteQuery, alertasQuery } = resumenHook
  const {
    productosQuery,
    productosSelectorQuery,
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

  return (
    <AdminShell
      currentKey="inventario"
      title="Inventario y control de stock"
      description="Modulo administrativo para revisar categorias, alertas, productos activos y movimientos de stock con un lenguaje claro de oficina clinica."
      headerBadge={
        <StatusPill tone="border-primary/30 bg-primary/10 text-primary">Control operativo</StatusPill>
      }
      actions={
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 border border-border bg-foreground px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Volver al dashboard
        </Link>
      }
      asideNote="Aqui se concentran alertas, productos y movimientos. Lo importante es cuidar el stock antes de afectar caja o consulta."
    >
      {!puedeVerInventario ? (
        <EmptyModuleState
          title="Inventario no disponible en el plan actual"
          body="Para administrar productos, movimientos y alertas necesitas inventario y reportes operativos activos dentro de la suscripcion."
          ctaLabel="Revisar planes"
        />
      ) : (
        <div className="space-y-5">
          {/* Error banners */}
          {(reporteQuery.isError || productosQuery.isError) && (
            <div className="grid gap-3">
              {reporteQuery.isError && (
                <div className="border border-amber-200 bg-amber-50 px-4 py-4 text-sm leading-7 text-amber-800">
                  No fue posible cargar el resumen de inventario.
                </div>
              )}
              {productosQuery.isError && (
                <div className="border border-red-200 bg-red-50 px-4 py-4 text-sm leading-7 text-red-700">
                  No fue posible cargar la tabla de productos.
                </div>
              )}
            </div>
          )}

          {/* Tab navigation */}
          <div className="flex gap-0 border-b border-border">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
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
                  helper="Productos actualmente activos dentro del modulo."
                />
                <KpiCard
                  icon={ShieldCheck}
                  label="Valor inventariado"
                  value={formatCurrency(resumen.valorTotalInventario || 0)}
                  helper="Valor estimado a precio de venta del inventario cargado."
                  tone="text-emerald-700"
                />
                <KpiCard
                  icon={CircleAlert}
                  label="Bajo stock"
                  value={formatNumber(resumen.bajoStock || 0)}
                  helper="Productos por debajo del minimo definido."
                  tone="text-amber-700"
                />
                <KpiCard
                  icon={Sparkles}
                  label="Alertas totales"
                  value={formatNumber(alertsRows.length)}
                  helper="Suma de bajo stock, proximos a vencer y vencidos."
                  tone="text-rose-700"
                />
              </div>

              {/* Fase 2b: breakpoint corregido de 2xl → xl */}
              <div className="grid gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
                <DonutCard
                  title="Categorias activas"
                  subtitle="Distribucion de productos por categoria."
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
                              ? 'border-red-200 bg-red-50 text-red-700'
                              : row.tipo === 'Proximo a vencer'
                                ? 'border-amber-200 bg-amber-50 text-amber-700'
                                : 'border-cyan-200 bg-cyan-50 text-cyan-700'
                          }
                        >
                          {row.tipo}
                        </StatusPill>
                      ),
                    },
                    { key: 'nombre', label: 'Producto' },
                    { key: 'categoria', label: 'Categoria' },
                    { key: 'detalle', label: 'Detalle' },
                  ]}
                  emptyTitle="No hay alertas activas"
                  emptyBody="Cuando el stock o los vencimientos requieran atencion, apareceran aqui."
                />
              </div>
            </div>
          )}

          {/* Tab: Productos */}
          {activeTab === 'productos' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex flex-1 flex-col gap-3 min-w-0">
                  <div className="relative max-w-sm">
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
                  <div className="flex flex-wrap gap-2">
                    {CATEGORY_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => { setCategoria(opt.value); setPaginaProductos(1) }}
                        className={`border px-3 py-1.5 text-xs font-semibold transition ${
                          categoria === opt.value
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border bg-card text-muted-foreground hover:bg-muted'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => { setBajoStock((v) => !v); setPaginaProductos(1) }}
                      className={`border px-3 py-1.5 text-xs font-semibold transition ${
                        bajoStock
                          ? 'border-amber-400 bg-amber-50 text-amber-700'
                          : 'border-border bg-card text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      Solo bajo stock
                    </button>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={openCreateDrawer}
                  className="inline-flex items-center gap-2 whitespace-nowrap border border-border bg-foreground px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  <PackagePlus className="h-4 w-4" />
                  Nuevo producto
                </button>
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
                    { key: 'categoria', label: 'Categoria' },
                    {
                      key: 'stock',
                      label: 'Stock / Min',
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
                                    ? 'border-red-200 bg-red-50 text-red-700'
                                    : alerta === 'proximo_vencimiento'
                                      ? 'border-amber-200 bg-amber-50 text-amber-700'
                                      : 'border-cyan-200 bg-cyan-50 text-cyan-700'
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
                            className="text-sm font-semibold text-red-600 hover:text-red-800"
                          >
                            Desactivar
                          </button>
                        </div>
                      ),
                    },
                  ]}
                  emptyTitle="No hay productos para este filtro"
                  emptyBody="Ajusta la busqueda o crea el primer producto con el boton Nuevo producto."
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

          {/* Tab: Movimientos */}
          {activeTab === 'movimientos' && (
            <div className="space-y-5">
              <div className="grid gap-5 xl:grid-cols-[420px_minmax(0,1fr)]">
                <DashboardPanel
                  title="Registrar movimiento"
                  subtitle="Entrada, salida o ajuste sobre el stock de un producto."
                >
                  <form className="grid gap-4" onSubmit={submitMovementForm}>
                    <div className="grid gap-1.5">
                      <label htmlFor="mov-producto" className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                        Producto *
                      </label>
                      <select
                        id="mov-producto"
                        value={movementForm.productoId}
                        onChange={(e) => {
                          const prod = (productosSelectorQuery.data?.productos || []).find((p) => p.id === e.target.value)
                          selectProduct(prod || { id: e.target.value })
                        }}
                        className="h-11 border border-border bg-card px-3 text-sm text-foreground outline-none transition focus:border-primary"
                      >
                        <option value="">Selecciona un producto</option>
                        {(productosSelectorQuery.data?.productos || []).map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.nombre} — Stock: {p.stock}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="grid gap-1.5">
                        <label htmlFor="mov-tipo" className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                          Tipo de movimiento
                        </label>
                        <select
                          id="mov-tipo"
                          value={movementForm.tipo}
                          onChange={(e) => {
                            const nextType = e.target.value
                            setMovementForm((cur) => ({
                              ...cur,
                              tipo: nextType,
                              motivo: (MOVEMENT_REASON_OPTIONS[nextType] || MOVEMENT_REASON_OPTIONS.entrada)[0].value,
                            }))
                          }}
                          className="h-11 border border-border bg-card px-3 text-sm text-foreground outline-none transition focus:border-primary"
                        >
                          {MOVEMENT_TYPE_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                      </div>
                      <div className="grid gap-1.5">
                        <label htmlFor="mov-motivo" className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                          Motivo
                        </label>
                        <select
                          id="mov-motivo"
                          value={movementForm.motivo}
                          onChange={(e) => setMovementForm((cur) => ({ ...cur, motivo: e.target.value }))}
                          className="h-11 border border-border bg-card px-3 text-sm text-foreground outline-none transition focus:border-primary"
                        >
                          {motivosDisponibles.map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="grid gap-1.5">
                        <label htmlFor="mov-cantidad" className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                          {movementForm.tipo === 'ajuste' ? 'Nuevo stock final' : 'Cantidad'}
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
                      className="border border-border bg-foreground px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isPendingMovement ? 'Registrando...' : 'Registrar movimiento'}
                    </button>
                  </form>
                </DashboardPanel>

                <DashboardPanel
                  title="Detalle del producto"
                  subtitle="Resumen rapido y ultimos movimientos del producto seleccionado."
                >
                  {selectedProduct ? (
                    <div className="grid gap-4">
                      <div className="grid gap-3 border border-border bg-muted px-4 py-4 text-sm text-foreground sm:grid-cols-2">
                        <div>
                          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Producto</p>
                          <p className="mt-1 font-semibold">{detalleProducto?.nombre || selectedProduct.nombre}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Stock actual</p>
                          <p className="mt-1 font-semibold">{formatNumber(detalleProducto?.stock ?? selectedProduct.stock ?? 0)}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Stock minimo</p>
                          <p className="mt-1">{formatNumber(detalleProducto?.stockMinimo ?? selectedProduct.stockMinimo ?? 0)}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Laboratorio / lote</p>
                          <p className="mt-1">{detalleProducto?.laboratorio || '-'} / {detalleProducto?.lote || '-'}</p>
                        </div>
                      </div>

                      <DataTable
                        title="Ultimos movimientos del producto"
                        subtitle="Trazabilidad rapida de entradas, salidas y ajustes recientes."
                        rows={detalleMovimientosRows}
                        columns={[
                          { key: 'fecha', label: 'Fecha' },
                          { key: 'tipo', label: 'Tipo' },
                          { key: 'motivo', label: 'Motivo' },
                          { key: 'cantidad', label: 'Cantidad' },
                          { key: 'cambio', label: 'Cambio' },
                        ]}
                        emptyTitle="Sin movimientos recientes"
                        emptyBody="Este producto aun no tiene trazabilidad registrada."
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
                <DashboardPanel title="Ultimos movimientos" subtitle="Traza administrativa del cambio de stock.">
                  <TableSkeleton rows={4} />
                </DashboardPanel>
              ) : (
                <DataTable
                  title="Ultimos movimientos"
                  subtitle="Traza administrativa del cambio de stock."
                  rows={movimientosRows}
                  columns={[
                    { key: 'fecha', label: 'Fecha' },
                    { key: 'producto', label: 'Producto' },
                    { key: 'tipo', label: 'Tipo' },
                    { key: 'motivo', label: 'Motivo' },
                    { key: 'cambio', label: 'Cambio' },
                  ]}
                  emptyTitle="Aun no hay movimientos registrados"
                  emptyBody="Cuando se creen entradas, salidas o ajustes, esta tabla mostrara la traza reciente."
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
        </div>
      )}

      {/* Drawer de producto (Fase 3a+3b) */}
      <ProductoDrawer
        open={drawerOpen}
        editingProduct={editingProduct}
        onClose={closeDrawer}
        onSubmit={handleDrawerSubmit}
        isPending={isPendingProduct}
      />

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
              Esta accion retirara el producto del inventario activo. Los movimientos historicos se conservan.
            </p>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={confirmDelete}
                disabled={isPendingDelete}
                className="flex-1 border border-red-300 bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
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
