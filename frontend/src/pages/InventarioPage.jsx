import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { CircleAlert, PackagePlus, Plus, Search, ShieldCheck, Sparkles, Boxes, X } from 'lucide-react'
import AdminShell from '@/components/layout/AdminShell'
import {
  DashboardPanel,
  DataTable,
  DonutCard,
  EmptyModuleState,
  KpiCard,
  StatusPill,
} from '@/features/dashboard/dashboardComponents'
import {
  formatCurrency,
  formatLongDate,
  formatNumber,
} from '@/features/dashboard/dashboardUtils'
import { dashboardApi } from '@/features/dashboard/dashboardApi'
import { inventarioApi } from '@/features/inventario/inventarioApi'
import { useAuthStore } from '@/store/authStore'
import { hasAnyRole } from '@/lib/permissions'

const TABS = [
  { id: 'resumen', label: 'Resumen' },
  { id: 'productos', label: 'Productos' },
  { id: 'movimientos', label: 'Movimientos' },
]

const CATEGORY_OPTIONS = [
  { value: 'todas', label: 'Todas' },
  { value: 'medicamento', label: 'Medicamentos' },
  { value: 'vacuna', label: 'Vacunas' },
  { value: 'insumo', label: 'Insumos' },
  { value: 'alimento', label: 'Alimentos' },
  { value: 'antiparasitario', label: 'Antiparasitarios' },
  { value: 'suplemento', label: 'Suplementos' },
  { value: 'accesorio', label: 'Accesorios' },
  { value: 'otro', label: 'Otros' },
]

const UNIT_OPTIONS = ['unidad', 'caja', 'frasco', 'ml', 'kg', 'bolsa']
const MOVEMENT_TYPE_OPTIONS = [
  { value: 'entrada', label: 'Entrada' },
  { value: 'salida', label: 'Salida' },
  { value: 'ajuste', label: 'Ajuste' },
]
const MOVEMENT_REASON_OPTIONS = {
  entrada: [
    { value: 'compra', label: 'Compra' },
    { value: 'devolucion', label: 'Devolucion' },
    { value: 'otro', label: 'Otro' },
  ],
  salida: [
    { value: 'venta', label: 'Venta' },
    { value: 'uso_clinico', label: 'Uso clinico' },
    { value: 'vencimiento', label: 'Vencimiento' },
    { value: 'otro', label: 'Otro' },
  ],
  ajuste: [
    { value: 'ajuste_inventario', label: 'Ajuste de inventario' },
    { value: 'otro', label: 'Otro' },
  ],
}

const DEFAULT_PRODUCT_FORM = {
  nombre: '',
  categoria: 'medicamento',
  unidadMedida: 'unidad',
  stock: '',
  stockMinimo: '5',
  precioCompra: '',
  precioVenta: '',
  fechaVencimiento: '',
  lote: '',
  laboratorio: '',
  requiereFormula: false,
}

const buildProductForm = (producto) => ({
  nombre: producto?.nombre || '',
  categoria: producto?.categoria || 'medicamento',
  unidadMedida: producto?.unidadMedida || 'unidad',
  stock: '',
  stockMinimo: producto?.stockMinimo != null ? String(producto.stockMinimo) : '5',
  precioCompra: producto?.precioCompra != null ? String(producto.precioCompra) : '',
  precioVenta: producto?.precioVenta != null ? String(producto.precioVenta) : '',
  fechaVencimiento: producto?.fechaVencimiento || '',
  lote: producto?.lote || '',
  laboratorio: producto?.laboratorio || '',
  requiereFormula: Boolean(producto?.requiereFormula),
})

const DEFAULT_MOVEMENT_FORM = {
  productoId: '',
  tipo: 'entrada',
  cantidad: '',
  motivo: 'compra',
  observaciones: '',
  precioUnitario: '',
}

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message || error?.message || fallback

function RestrictedInventoryPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <DashboardPanel
          title="Inventario"
          subtitle="Este modulo se reserva para administracion o auxiliares autorizados."
        >
          <div className="border border-border bg-muted px-4 py-5 text-sm leading-7 text-muted-foreground">
            Tu acceso actual no tiene visibilidad completa de inventario. Si necesitas revisar
            stock, alertas o movimientos, solicita permisos al administrador principal o al auxiliar
            responsable.
          </div>
        </DashboardPanel>
      </div>
    </div>
  )
}

function TableSkeleton({ rows = 6 }) {
  return (
    <div className="divide-y divide-border">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 px-4 py-3 animate-pulse">
          <div className="h-4 bg-muted/70 rounded flex-1" />
          <div className="h-4 bg-muted/70 rounded w-24" />
          <div className="h-4 bg-muted/70 rounded w-16" />
          <div className="h-4 bg-muted/70 rounded w-20" />
        </div>
      ))}
    </div>
  )
}

export default function InventarioPage() {
  const usuario = useAuthStore((state) => state.usuario)
  const suscripcion = useAuthStore((state) => state.suscripcion)
  const queryClient = useQueryClient()

  const [activeTab, setActiveTab] = useState('resumen')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [formErrors, setFormErrors] = useState({})
  const [confirmDialog, setConfirmDialog] = useState({ open: false, producto: null })

  const [buscar, setBuscar] = useState('')
  const [categoria, setCategoria] = useState('todas')
  const [bajoStock, setBajoStock] = useState(false)
  const [paginaProductos, setPaginaProductos] = useState(1)
  const [paginaMovimientos, setPaginaMovimientos] = useState(1)
  const [productoForm, setProductoForm] = useState(DEFAULT_PRODUCT_FORM)
  const [movementForm, setMovementForm] = useState(DEFAULT_MOVEMENT_FORM)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [editingProduct, setEditingProduct] = useState(null)
  const [additionalOpen, setAdditionalOpen] = useState(false)

  const busquedaDiferida = useDeferredValue(buscar.trim())
  const motivosDisponibles = MOVEMENT_REASON_OPTIONS[movementForm.tipo] || MOVEMENT_REASON_OPTIONS.entrada
  const rolPermitido = hasAnyRole(usuario, ['admin', 'superadmin', 'auxiliar'])
  const puedeVerInventario =
    rolPermitido &&
    Array.isArray(suscripcion?.funcionalidades) &&
    suscripcion.funcionalidades.includes('inventario') &&
    suscripcion.funcionalidades.includes('reportes_operativos')

  useEffect(() => {
    document.title = 'Inventario | Bourgelat'
  }, [])

  useEffect(() => {
    if (!drawerOpen) return
    const onKey = (e) => { if (e.key === 'Escape') handleCloseDrawer() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [drawerOpen])

  const reporteQuery = useQuery({
    queryKey: ['inventario-reporte-completo'],
    queryFn: dashboardApi.obtenerReporteInventario,
    enabled: puedeVerInventario,
    placeholderData: (previousData) => previousData,
  })

  const productosQuery = useQuery({
    queryKey: ['inventario-productos', busquedaDiferida, categoria, bajoStock, paginaProductos],
    queryFn: () =>
      inventarioApi.obtenerProductos({
        buscar: busquedaDiferida || undefined,
        categoria: categoria !== 'todas' ? categoria : undefined,
        bajoStock: bajoStock ? 'true' : undefined,
        pagina: paginaProductos,
        limite: 12,
      }),
    enabled: puedeVerInventario,
    placeholderData: (previousData) => previousData,
  })

  const productosSelectorQuery = useQuery({
    queryKey: ['inventario-productos-selector'],
    queryFn: () => inventarioApi.obtenerProductos({ limite: 100 }),
    enabled: puedeVerInventario,
    placeholderData: (previousData) => previousData,
  })

  const alertasQuery = useQuery({
    queryKey: ['inventario-alertas'],
    queryFn: inventarioApi.obtenerAlertas,
    enabled: puedeVerInventario,
    placeholderData: (previousData) => previousData,
  })

  const productoDetalleQuery = useQuery({
    queryKey: ['inventario-producto-detalle', selectedProduct?.id],
    queryFn: () => inventarioApi.obtenerProducto(selectedProduct.id),
    enabled: puedeVerInventario && Boolean(selectedProduct?.id),
  })

  const movimientosQuery = useQuery({
    queryKey: ['inventario-movimientos', paginaMovimientos],
    queryFn: () => inventarioApi.obtenerMovimientos({ pagina: paginaMovimientos, limite: 10 }),
    enabled: puedeVerInventario,
    placeholderData: (previousData) => previousData,
  })

  const invalidateInventario = () => {
    queryClient.invalidateQueries({ queryKey: ['inventario-productos'] })
    queryClient.invalidateQueries({ queryKey: ['inventario-productos-selector'] })
    queryClient.invalidateQueries({ queryKey: ['inventario-producto-detalle'] })
    queryClient.invalidateQueries({ queryKey: ['inventario-reporte-completo'] })
    queryClient.invalidateQueries({ queryKey: ['inventario-alertas'] })
    queryClient.invalidateQueries({ queryKey: ['dashboard-inventario'] })
  }

  const crearProductoMutation = useMutation({
    mutationFn: inventarioApi.crearProducto,
    onSuccess: (data) => {
      toast.success(data?.message || 'Producto creado exitosamente')
      handleCloseDrawer()
      invalidateInventario()
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'No fue posible crear el producto.'))
    },
  })

  const editarProductoMutation = useMutation({
    mutationFn: ({ productoId, payload }) => inventarioApi.editarProducto(productoId, payload),
    onSuccess: (data) => {
      toast.success(data?.message || 'Producto actualizado exitosamente')
      handleCloseDrawer()
      invalidateInventario()
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'No fue posible actualizar el producto.'))
    },
  })

  const eliminarProductoMutation = useMutation({
    mutationFn: inventarioApi.eliminarProducto,
    onSuccess: (data, productoId) => {
      toast.success(data?.message || 'Producto desactivado exitosamente')
      setConfirmDialog({ open: false, producto: null })
      if (editingProduct?.id === productoId) handleCloseDrawer()
      if (selectedProduct?.id === productoId) {
        setSelectedProduct(null)
        setMovementForm(DEFAULT_MOVEMENT_FORM)
      }
      invalidateInventario()
      queryClient.invalidateQueries({ queryKey: ['inventario-movimientos'] })
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'No fue posible desactivar el producto.'))
    },
  })

  const registrarMovimientoMutation = useMutation({
    mutationFn: ({ productoId, payload }) => inventarioApi.registrarMovimiento(productoId, payload),
    onSuccess: (data) => {
      toast.success(data?.message || 'Movimiento registrado exitosamente')
      setMovementForm(DEFAULT_MOVEMENT_FORM)
      setSelectedProduct(null)
      invalidateInventario()
      queryClient.invalidateQueries({ queryKey: ['inventario-movimientos'] })
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'No fue posible registrar el movimiento.'))
    },
  })

  const resumen = reporteQuery.data?.resumen || {}
  const categoriasData = useMemo(
    () =>
      Object.entries(reporteQuery.data?.porCategoria || {}).map(([key, value], index) => ({
        key,
        name: key,
        value: Number(value?.total || 0),
        valor: Number(value?.valor || 0),
        color: ['#0f4c81', '#0f766e', '#f59e0b', '#7c3aed', '#dc2626', '#64748b'][index % 6],
      })),
    [reporteQuery.data?.porCategoria]
  )

  const alertsRows = useMemo(() => {
    const rows = []
    ;(alertasQuery.data?.vencidos?.productos || []).forEach((producto) => {
      rows.push({ id: `vencido-${producto.id}`, tipo: 'Vencido', nombre: producto.nombre, categoria: producto.categoria, detalle: formatLongDate(producto.fechaVencimiento) })
    })
    ;(alertasQuery.data?.proximosVencer?.productos || []).forEach((producto) => {
      rows.push({ id: `proximo-${producto.id}`, tipo: 'Proximo a vencer', nombre: producto.nombre, categoria: producto.categoria, detalle: formatLongDate(producto.fechaVencimiento) })
    })
    ;(alertasQuery.data?.bajoStock?.productos || []).forEach((producto) => {
      rows.push({ id: `stock-${producto.id}`, tipo: 'Bajo stock', nombre: producto.nombre, categoria: producto.categoria, detalle: `${producto.stock}/${producto.stockMinimo}` })
    })
    return rows
  }, [alertasQuery.data])

  const productosRows = useMemo(
    () =>
      (productosQuery.data?.productos || []).map((producto) => ({
        id: producto.id,
        nombre: producto.nombre,
        categoria: producto.categoria,
        stock: `${producto.stock}/${producto.stockMinimo}`,
        valor: formatCurrency(Number(producto.precioVenta || 0) * Number(producto.stock || 0)),
        alertas: producto.alertas || [],
        raw: producto,
      })),
    [productosQuery.data?.productos]
  )

  const movimientosRows = useMemo(
    () =>
      (movimientosQuery.data?.movimientos || []).map((movimiento) => ({
        id: movimiento.id,
        fecha: new Intl.DateTimeFormat('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(movimiento.createdAt)),
        producto: movimiento.producto?.nombre || 'Producto',
        tipo: movimiento.tipo,
        motivo: movimiento.motivo,
        cambio: `${movimiento.stockAnterior} → ${movimiento.stockNuevo}`,
      })),
    [movimientosQuery.data?.movimientos]
  )

  const detalleProducto = productoDetalleQuery.data?.producto || selectedProduct
  const detalleMovimientosRows = useMemo(
    () =>
      (productoDetalleQuery.data?.producto?.movimientos || []).map((movimiento) => ({
        id: movimiento.id,
        fecha: new Intl.DateTimeFormat('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(movimiento.createdAt)),
        tipo: movimiento.tipo,
        motivo: movimiento.motivo.replaceAll('_', ' '),
        cantidad: formatNumber(movimiento.cantidad),
        cambio: `${movimiento.stockAnterior} → ${movimiento.stockNuevo}`,
      })),
    [productoDetalleQuery.data?.producto?.movimientos]
  )

  const handleOpenCreateDrawer = () => {
    setEditingProduct(null)
    setProductoForm(DEFAULT_PRODUCT_FORM)
    setAdditionalOpen(false)
    setFormErrors({})
    setDrawerOpen(true)
  }

  const handleCloseDrawer = () => {
    setDrawerOpen(false)
    setEditingProduct(null)
    setProductoForm(DEFAULT_PRODUCT_FORM)
    setAdditionalOpen(false)
    setFormErrors({})
  }

  const handleEditProduct = (producto) => {
    setEditingProduct(producto)
    setProductoForm(buildProductForm(producto))
    setAdditionalOpen(Boolean(producto.laboratorio || producto.lote || producto.fechaVencimiento || producto.requiereFormula))
    setFormErrors({})
    setDrawerOpen(true)
  }

  const handleMovimientoClick = (producto) => {
    setSelectedProduct(producto)
    setMovementForm({
      ...DEFAULT_MOVEMENT_FORM,
      tipo: movementForm.tipo,
      motivo: (MOVEMENT_REASON_OPTIONS[movementForm.tipo] || MOVEMENT_REASON_OPTIONS.entrada)[0].value,
      productoId: producto.id,
    })
    setActiveTab('movimientos')
  }

  const handleCreateProduct = (event) => {
    event.preventDefault()
    const errors = {}
    if (!productoForm.nombre.trim()) errors.nombre = 'El nombre es requerido'
    if (!productoForm.categoria) errors.categoria = 'La categoria es requerida'
    if (!productoForm.unidadMedida) errors.unidadMedida = 'La unidad es requerida'
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      return
    }
    setFormErrors({})
    const payload = {
      nombre: productoForm.nombre.trim(),
      categoria: productoForm.categoria,
      unidadMedida: productoForm.unidadMedida,
      stockMinimo: productoForm.stockMinimo ? Number(productoForm.stockMinimo) : 5,
      precioCompra: productoForm.precioCompra ? Number(productoForm.precioCompra) : 0,
      precioVenta: productoForm.precioVenta ? Number(productoForm.precioVenta) : 0,
      fechaVencimiento: productoForm.fechaVencimiento || undefined,
      lote: productoForm.lote.trim() || undefined,
      laboratorio: productoForm.laboratorio.trim() || undefined,
      requiereFormula: productoForm.requiereFormula,
    }
    if (editingProduct) {
      editarProductoMutation.mutate({ productoId: editingProduct.id, payload })
      return
    }
    crearProductoMutation.mutate({ ...payload, stock: productoForm.stock ? Number(productoForm.stock) : 0 })
  }

  const handleRegisterMovement = (event) => {
    event.preventDefault()
    if (!movementForm.productoId) {
      toast.error('Selecciona un producto antes de registrar el movimiento.')
      return
    }
    if (!movementForm.cantidad || Number(movementForm.cantidad) <= 0) {
      toast.error('La cantidad del movimiento debe ser mayor a 0.')
      return
    }
    registrarMovimientoMutation.mutate({
      productoId: movementForm.productoId,
      payload: {
        tipo: movementForm.tipo,
        cantidad: Number(movementForm.cantidad),
        motivo: movementForm.motivo,
        observaciones: movementForm.observaciones.trim() || undefined,
        precioUnitario: movementForm.precioUnitario ? Number(movementForm.precioUnitario) : 0,
      },
    })
  }

  const handleDeleteProduct = (producto) => {
    setConfirmDialog({ open: true, producto })
  }

  const handleConfirmDelete = () => {
    eliminarProductoMutation.mutate(confirmDialog.producto.id)
  }

  const isPendingProduct = crearProductoMutation.isPending || editarProductoMutation.isPending

  if (!rolPermitido) {
    return <RestrictedInventoryPage />
  }

  return (
    <AdminShell
      currentKey="inventario"
      title="Inventario y control de stock"
      description="Modulo administrativo para revisar categorias, alertas, productos activos y movimientos de stock con un lenguaje claro de oficina clinica."
      headerBadge={
        <StatusPill tone="border-primary/30 bg-primary/10 text-primary">
          Control operativo
        </StatusPill>
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
                  {getErrorMessage(reporteQuery.error, 'No fue posible cargar el resumen de inventario.')}
                </div>
              )}
              {productosQuery.isError && (
                <div className="border border-red-200 bg-red-50 px-4 py-4 text-sm leading-7 text-red-700">
                  {getErrorMessage(productosQuery.error, 'No fue posible cargar la tabla de productos.')}
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
                className={`px-5 py-3 text-sm font-semibold transition-colors -mb-px border-b-2 ${
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
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

              <div className="grid gap-5 2xl:grid-cols-[420px_minmax(0,1fr)]">
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
                      onChange={(event) => {
                        setBuscar(event.target.value)
                        setPaginaProductos(1)
                      }}
                      placeholder="Buscar por nombre, lote o laboratorio"
                      aria-label="Buscar productos"
                      className="h-11 w-full border border-border bg-card pl-10 pr-3 text-sm text-foreground outline-none transition focus:border-primary"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {CATEGORY_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          setCategoria(option.value)
                          setPaginaProductos(1)
                        }}
                        className={`border px-3 py-1.5 text-xs font-semibold transition ${
                          categoria === option.value
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border bg-card text-muted-foreground hover:bg-muted'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        setBajoStock((current) => !current)
                        setPaginaProductos(1)
                      }}
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
                  onClick={handleOpenCreateDrawer}
                  className="inline-flex items-center gap-2 border border-border bg-foreground px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 whitespace-nowrap"
                >
                  <Plus className="h-4 w-4" />
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
                    { key: 'stock', label: 'Stock' },
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
                            onClick={() => handleEditProduct(row.raw)}
                            className="text-sm font-semibold text-slate-700 hover:text-slate-900"
                          >
                            Editar
                          </button>
                        </div>
                      ),
                    },
                  ]}
                  emptyTitle="No hay productos para este filtro"
                  emptyBody="Ajusta la busqueda o crea el primer producto con el boton Nuevo producto."
                />
              )}

              {(productosQuery.data?.paginas || 1) > 1 && (
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                  <p className="text-sm text-muted-foreground">
                    Pagina {productosQuery.data?.paginaActual || 1} de {productosQuery.data?.paginas || 1}
                  </p>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setPaginaProductos((current) => Math.max(current - 1, 1))}
                      disabled={(productosQuery.data?.paginaActual || 1) <= 1}
                      className="border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Anterior
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaginaProductos((current) => Math.min(current + 1, productosQuery.data?.paginas || 1))}
                      disabled={(productosQuery.data?.paginaActual || 1) >= (productosQuery.data?.paginas || 1)}
                      className="border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Siguiente
                    </button>
                  </div>
                </div>
              )}
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
                  <form className="grid gap-4" onSubmit={handleRegisterMovement}>
                    <div className="grid gap-1.5">
                      <label
                        htmlFor="movimiento-producto"
                        className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground"
                      >
                        Producto *
                      </label>
                      <select
                        id="movimiento-producto"
                        value={movementForm.productoId}
                        onChange={(e) => {
                          const prod = (productosSelectorQuery.data?.productos || []).find((p) => p.id === e.target.value)
                          setSelectedProduct(prod || null)
                          setMovementForm((current) => ({ ...current, productoId: e.target.value }))
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
                        <label
                          htmlFor="movimiento-tipo"
                          className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground"
                        >
                          Tipo de movimiento
                        </label>
                        <select
                          id="movimiento-tipo"
                          value={movementForm.tipo}
                          onChange={(event) => {
                            const nextType = event.target.value
                            setMovementForm((current) => ({
                              ...current,
                              tipo: nextType,
                              motivo: (MOVEMENT_REASON_OPTIONS[nextType] || MOVEMENT_REASON_OPTIONS.entrada)[0].value,
                            }))
                          }}
                          className="h-11 border border-border bg-card px-3 text-sm text-foreground outline-none transition focus:border-primary"
                        >
                          {MOVEMENT_TYPE_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                      </div>
                      <div className="grid gap-1.5">
                        <label
                          htmlFor="movimiento-motivo"
                          className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground"
                        >
                          Motivo
                        </label>
                        <select
                          id="movimiento-motivo"
                          value={movementForm.motivo}
                          onChange={(event) => setMovementForm((current) => ({ ...current, motivo: event.target.value }))}
                          className="h-11 border border-border bg-card px-3 text-sm text-foreground outline-none transition focus:border-primary"
                        >
                          {motivosDisponibles.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="grid gap-1.5">
                        <label
                          htmlFor="movimiento-cantidad"
                          className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground"
                        >
                          {movementForm.tipo === 'ajuste' ? 'Nuevo stock final' : 'Cantidad'}
                        </label>
                        <input
                          id="movimiento-cantidad"
                          type="number"
                          min="0"
                          step="1"
                          value={movementForm.cantidad}
                          onChange={(event) => setMovementForm((current) => ({ ...current, cantidad: event.target.value }))}
                          placeholder="0"
                          className="h-11 border border-border bg-card px-3 text-sm text-foreground outline-none transition focus:border-primary"
                        />
                      </div>
                      <div className="grid gap-1.5">
                        <label
                          htmlFor="movimiento-precio"
                          className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground"
                        >
                          Precio unitario
                        </label>
                        <input
                          id="movimiento-precio"
                          type="number"
                          min="0"
                          step="0.01"
                          value={movementForm.precioUnitario}
                          onChange={(event) => setMovementForm((current) => ({ ...current, precioUnitario: event.target.value }))}
                          placeholder="0"
                          className="h-11 border border-border bg-card px-3 text-sm text-foreground outline-none transition focus:border-primary"
                        />
                      </div>
                    </div>

                    <div className="grid gap-1.5">
                      <label
                        htmlFor="movimiento-observaciones"
                        className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground"
                      >
                        Observaciones
                      </label>
                      <textarea
                        id="movimiento-observaciones"
                        value={movementForm.observaciones}
                        onChange={(event) => setMovementForm((current) => ({ ...current, observaciones: event.target.value }))}
                        placeholder="Notas adicionales del movimiento"
                        className="min-h-[88px] border border-border bg-card px-3 py-3 text-sm text-foreground outline-none transition focus:border-primary"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={registrarMovimientoMutation.isPending}
                      className="border border-border bg-foreground px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {registrarMovimientoMutation.isPending ? 'Registrando...' : 'Registrar movimiento'}
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

                      <div className="border-t border-border pt-3">
                        <button
                          type="button"
                          onClick={() => handleDeleteProduct(selectedProduct)}
                          disabled={eliminarProductoMutation.isPending}
                          className="text-sm font-semibold text-red-700 transition hover:text-red-800 disabled:opacity-50"
                        >
                          {eliminarProductoMutation.isPending ? 'Desactivando...' : 'Desactivar producto'}
                        </button>
                      </div>
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

              {(movimientosQuery.data?.paginas || 1) > 1 && (
                <div className="flex flex-wrap items-center justify-between gap-3 border border-border bg-card px-4 py-4 shadow-sm">
                  <p className="text-sm text-muted-foreground">
                    Pagina {movimientosQuery.data?.paginaActual || 1} de {movimientosQuery.data?.paginas || 1}
                  </p>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setPaginaMovimientos((current) => Math.max(current - 1, 1))}
                      disabled={(movimientosQuery.data?.paginaActual || 1) <= 1}
                      className="border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Anterior
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaginaMovimientos((current) => Math.min(current + 1, movimientosQuery.data?.paginas || 1))}
                      disabled={(movimientosQuery.data?.paginaActual || 1) >= (movimientosQuery.data?.paginas || 1)}
                      className="border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Siguiente
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Drawer overlay */}
      <div
        className={`fixed inset-0 z-40 bg-black/30 transition-opacity duration-300 ${
          drawerOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={handleCloseDrawer}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={editingProduct ? `Editar ${editingProduct.nombre}` : 'Nuevo producto'}
        className={`fixed right-0 top-0 z-50 flex h-full w-full flex-col bg-card shadow-2xl transition-transform duration-300 sm:w-[460px] sm:border-l sm:border-border ${
          drawerOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <p className="text-sm font-semibold text-foreground">
              {editingProduct ? 'Editar producto' : 'Nuevo producto'}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {editingProduct
                ? 'Ajusta los datos. El stock se modifica desde movimientos.'
                : 'Alta rapida para dejar el inventario listo.'}
            </p>
          </div>
          <button
            type="button"
            onClick={handleCloseDrawer}
            aria-label="Cerrar formulario"
            className="flex h-8 w-8 items-center justify-center border border-border bg-muted text-muted-foreground transition hover:bg-muted/80 hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Drawer body */}
        <div className="flex-1 overflow-y-auto px-5 py-5">
          <form id="product-drawer-form" className="grid gap-5" onSubmit={handleCreateProduct}>
            {/* Seccion: Informacion basica */}
            <div className="grid gap-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Informacion basica
              </p>

              <div className="grid gap-1.5">
                <label htmlFor="producto-nombre" className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Nombre del producto *
                </label>
                <input
                  id="producto-nombre"
                  type="text"
                  value={productoForm.nombre}
                  onChange={(e) => {
                    setProductoForm((current) => ({ ...current, nombre: e.target.value }))
                    if (formErrors.nombre) setFormErrors((current) => ({ ...current, nombre: undefined }))
                  }}
                  placeholder="Ej. Meloxicam suspension oral"
                  aria-describedby={formErrors.nombre ? 'error-nombre' : undefined}
                  className={`h-11 border bg-card px-3 text-sm text-foreground outline-none transition focus:border-primary ${
                    formErrors.nombre ? 'border-red-400' : 'border-border'
                  }`}
                />
                {formErrors.nombre && (
                  <p id="error-nombre" className="text-xs text-red-600">{formErrors.nombre}</p>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <label htmlFor="producto-categoria" className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Categoria *
                  </label>
                  <select
                    id="producto-categoria"
                    value={productoForm.categoria}
                    onChange={(e) => {
                      setProductoForm((current) => ({ ...current, categoria: e.target.value }))
                      if (formErrors.categoria) setFormErrors((current) => ({ ...current, categoria: undefined }))
                    }}
                    aria-describedby={formErrors.categoria ? 'error-categoria' : undefined}
                    className={`h-11 border bg-card px-3 text-sm text-foreground outline-none transition focus:border-primary ${
                      formErrors.categoria ? 'border-red-400' : 'border-border'
                    }`}
                  >
                    {CATEGORY_OPTIONS.filter((option) => option.value !== 'todas').map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                  {formErrors.categoria && (
                    <p id="error-categoria" className="text-xs text-red-600">{formErrors.categoria}</p>
                  )}
                </div>
                <div className="grid gap-1.5">
                  <label htmlFor="producto-unidad" className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Unidad de medida *
                  </label>
                  <select
                    id="producto-unidad"
                    value={productoForm.unidadMedida}
                    onChange={(e) => setProductoForm((current) => ({ ...current, unidadMedida: e.target.value }))}
                    className="h-11 border border-border bg-card px-3 text-sm text-foreground outline-none transition focus:border-primary"
                  >
                    {UNIT_OPTIONS.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Seccion: Stock y precios */}
            <div className="grid gap-4 border-t border-border pt-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Stock y precios
              </p>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <label htmlFor="producto-stock" className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    {editingProduct ? 'Stock actual' : 'Stock inicial'}
                  </label>
                  {!editingProduct ? (
                    <input
                      id="producto-stock"
                      type="number"
                      min="0"
                      value={productoForm.stock}
                      onChange={(e) => setProductoForm((current) => ({ ...current, stock: e.target.value }))}
                      placeholder="0"
                      className="h-11 border border-border bg-card px-3 text-sm text-foreground outline-none transition focus:border-primary"
                    />
                  ) : (
                    <div id="producto-stock" className="flex h-11 items-center border border-border bg-muted px-3 text-sm text-muted-foreground">
                      {formatNumber(editingProduct.stock || 0)} unidades
                    </div>
                  )}
                </div>
                <div className="grid gap-1.5">
                  <label htmlFor="producto-stock-minimo" className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Stock minimo
                  </label>
                  <input
                    id="producto-stock-minimo"
                    type="number"
                    min="0"
                    value={productoForm.stockMinimo}
                    onChange={(e) => setProductoForm((current) => ({ ...current, stockMinimo: e.target.value }))}
                    placeholder="5"
                    title="Alerta cuando el stock baje de este numero"
                    className="h-11 border border-border bg-card px-3 text-sm text-foreground outline-none transition focus:border-primary"
                  />
                  <p className="text-[11px] text-muted-foreground">Alerta cuando baje de este numero</p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <label htmlFor="producto-precio-compra" className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Precio compra
                  </label>
                  <input
                    id="producto-precio-compra"
                    type="number"
                    min="0"
                    step="0.01"
                    value={productoForm.precioCompra}
                    onChange={(e) => setProductoForm((current) => ({ ...current, precioCompra: e.target.value }))}
                    placeholder="0"
                    className="h-11 border border-border bg-card px-3 text-sm text-foreground outline-none transition focus:border-primary"
                  />
                </div>
                <div className="grid gap-1.5">
                  <label htmlFor="producto-precio-venta" className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Precio venta
                  </label>
                  <input
                    id="producto-precio-venta"
                    type="number"
                    min="0"
                    step="0.01"
                    value={productoForm.precioVenta}
                    onChange={(e) => setProductoForm((current) => ({ ...current, precioVenta: e.target.value }))}
                    placeholder="0"
                    className="h-11 border border-border bg-card px-3 text-sm text-foreground outline-none transition focus:border-primary"
                  />
                </div>
              </div>
            </div>

            {/* Seccion: Informacion adicional (colapsable) */}
            <div className="border-t border-border pt-4">
              <button
                type="button"
                onClick={() => setAdditionalOpen((current) => !current)}
                className="flex w-full items-center gap-2 border border-dashed border-border bg-muted px-3 py-2.5 text-xs font-semibold text-muted-foreground transition hover:bg-muted/80"
              >
                {additionalOpen
                  ? '− Ocultar lote, laboratorio y vencimiento'
                  : '+ Agregar lote, laboratorio y vencimiento'}
              </button>

              {additionalOpen && (
                <div className="mt-4 grid gap-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="grid gap-1.5">
                      <label htmlFor="producto-laboratorio" className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                        Laboratorio
                      </label>
                      <input
                        id="producto-laboratorio"
                        type="text"
                        value={productoForm.laboratorio}
                        onChange={(e) => setProductoForm((current) => ({ ...current, laboratorio: e.target.value }))}
                        placeholder="Ej. Bayer"
                        className="h-11 border border-border bg-card px-3 text-sm text-foreground outline-none transition focus:border-primary"
                      />
                    </div>
                    <div className="grid gap-1.5">
                      <label htmlFor="producto-lote" className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                        Lote
                      </label>
                      <input
                        id="producto-lote"
                        type="text"
                        value={productoForm.lote}
                        onChange={(e) => setProductoForm((current) => ({ ...current, lote: e.target.value }))}
                        placeholder="Ej. LOT-2024-001"
                        className="h-11 border border-border bg-card px-3 text-sm text-foreground outline-none transition focus:border-primary"
                      />
                    </div>
                  </div>
                  <div className="grid gap-1.5">
                    <label htmlFor="producto-vencimiento" className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      Fecha de vencimiento
                    </label>
                    <input
                      id="producto-vencimiento"
                      type="date"
                      value={productoForm.fechaVencimiento}
                      onChange={(e) => setProductoForm((current) => ({ ...current, fechaVencimiento: e.target.value }))}
                      className="h-11 border border-border bg-card px-3 text-sm text-foreground outline-none transition focus:border-primary"
                    />
                  </div>
                  <label htmlFor="producto-formula" className="flex cursor-pointer items-center gap-3 border border-border bg-muted px-3 py-3 text-sm text-foreground transition hover:bg-muted/80">
                    <input
                      id="producto-formula"
                      type="checkbox"
                      checked={productoForm.requiereFormula}
                      onChange={(e) => setProductoForm((current) => ({ ...current, requiereFormula: e.target.checked }))}
                    />
                    Requiere formula medica
                  </label>
                </div>
              )}
            </div>
          </form>
        </div>

        {/* Drawer footer */}
        <div className="flex gap-3 border-t border-border px-5 py-4">
          <button
            type="submit"
            form="product-drawer-form"
            disabled={isPendingProduct}
            className="flex-1 border border-border bg-foreground px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPendingProduct
              ? 'Guardando...'
              : editingProduct
                ? 'Actualizar producto'
                : 'Guardar producto'}
          </button>
          <button
            type="button"
            onClick={handleCloseDrawer}
            className="border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-muted"
          >
            Cancelar
          </button>
        </div>
      </div>

      {/* ConfirmDialog */}
      {confirmDialog.open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
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
                onClick={handleConfirmDelete}
                disabled={eliminarProductoMutation.isPending}
                className="flex-1 border border-red-300 bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
              >
                {eliminarProductoMutation.isPending ? 'Desactivando...' : 'Desactivar'}
              </button>
              <button
                type="button"
                onClick={() => setConfirmDialog({ open: false, producto: null })}
                disabled={eliminarProductoMutation.isPending}
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
