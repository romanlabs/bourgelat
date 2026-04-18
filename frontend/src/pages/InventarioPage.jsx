import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { CircleAlert, PackagePlus, ShieldCheck, Sparkles, Boxes } from 'lucide-react'
import AdminShell from '@/components/layout/AdminShell'
import { ConfirmDialog, ErrorBanner, FieldError, LoadingButton } from '@/components/shared'
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

const CATEGORY_OPTIONS = [
  { value: 'todas', label: 'Todas las categorias' },
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
const MOVEMENT_REASON_OPTIONS = ['compra', 'venta', 'ajuste', 'consumo_interno', 'vencimiento', 'devolucion']

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
    <div className="min-h-screen bg-slate-100">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <DashboardPanel
          title="Inventario"
          subtitle="Este modulo se reserva para administracion o auxiliares autorizados."
        >
          <div className="border border-slate-200 bg-slate-50 px-4 py-5 text-sm leading-7 text-slate-600">
            Tu acceso actual no tiene visibilidad completa de inventario. Si necesitas revisar
            stock, alertas o movimientos, solicita permisos al administrador principal o al auxiliar
            responsable.
          </div>
        </DashboardPanel>
      </div>
    </div>
  )
}

export default function InventarioPage() {
  const usuario = useAuthStore((state) => state.usuario)
  const suscripcion = useAuthStore((state) => state.suscripcion)
  const queryClient = useQueryClient()
  const [buscar, setBuscar] = useState('')
  const [categoria, setCategoria] = useState('todas')
  const [bajoStock, setBajoStock] = useState(false)
  const [paginaProductos, setPaginaProductos] = useState(1)
  const [paginaMovimientos, setPaginaMovimientos] = useState(1)
  const [productoForm, setProductoForm] = useState(DEFAULT_PRODUCT_FORM)
  const [productoErrors, setProductoErrors] = useState({})
  const [movementForm, setMovementForm] = useState(DEFAULT_MOVEMENT_FORM)
  const [movementErrors, setMovementErrors] = useState({})
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [confirmMovement, setConfirmMovement] = useState(false)

  const busquedaDiferida = useDeferredValue(buscar.trim())
  const rolPermitido = hasAnyRole(usuario, ['admin', 'superadmin', 'auxiliar'])
  const puedeVerInventario =
    rolPermitido &&
    Array.isArray(suscripcion?.funcionalidades) &&
    suscripcion.funcionalidades.includes('inventario') &&
    suscripcion.funcionalidades.includes('reportes_operativos')

  useEffect(() => {
    document.title = 'Inventario | Bourgelat'
  }, [])

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

  const alertasQuery = useQuery({
    queryKey: ['inventario-alertas'],
    queryFn: inventarioApi.obtenerAlertas,
    enabled: puedeVerInventario,
    placeholderData: (previousData) => previousData,
  })

  const movimientosQuery = useQuery({
    queryKey: ['inventario-movimientos', paginaMovimientos],
    queryFn: () => inventarioApi.obtenerMovimientos({ pagina: paginaMovimientos, limite: 10 }),
    enabled: puedeVerInventario,
    placeholderData: (previousData) => previousData,
  })

  const crearProductoMutation = useMutation({
    mutationFn: inventarioApi.crearProducto,
    onSuccess: (data) => {
      toast.success(data?.message || 'Producto creado exitosamente')
      setProductoForm(DEFAULT_PRODUCT_FORM)
      setProductoErrors({})
      queryClient.invalidateQueries({ queryKey: ['inventario-productos'] })
      queryClient.invalidateQueries({ queryKey: ['inventario-reporte-completo'] })
      queryClient.invalidateQueries({ queryKey: ['inventario-alertas'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-inventario'] })
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'No fue posible crear el producto.'))
    },
  })

  const registrarMovimientoMutation = useMutation({
    mutationFn: ({ productoId, payload }) => inventarioApi.registrarMovimiento(productoId, payload),
    onSuccess: (data) => {
      toast.success(data?.message || 'Movimiento registrado exitosamente')
      setMovementForm(DEFAULT_MOVEMENT_FORM)
      setMovementErrors({})
      setSelectedProduct(null)
      queryClient.invalidateQueries({ queryKey: ['inventario-productos'] })
      queryClient.invalidateQueries({ queryKey: ['inventario-movimientos'] })
      queryClient.invalidateQueries({ queryKey: ['inventario-alertas'] })
      queryClient.invalidateQueries({ queryKey: ['inventario-reporte-completo'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-inventario'] })
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
    ;(alertasQuery.data?.bajoStock?.productos || []).forEach((producto) => {
      rows.push({
        id: `stock-${producto.id}`,
        tipo: 'Bajo stock',
        nombre: producto.nombre,
        categoria: producto.categoria,
        detalle: `${producto.stock}/${producto.stockMinimo}`,
      })
    })
    ;(alertasQuery.data?.proximosVencer?.productos || []).forEach((producto) => {
      rows.push({
        id: `proximo-${producto.id}`,
        tipo: 'Proximo a vencer',
        nombre: producto.nombre,
        categoria: producto.categoria,
        detalle: formatLongDate(producto.fechaVencimiento),
      })
    })
    ;(alertasQuery.data?.vencidos?.productos || []).forEach((producto) => {
      rows.push({
        id: `vencido-${producto.id}`,
        tipo: 'Vencido',
        nombre: producto.nombre,
        categoria: producto.categoria,
        detalle: formatLongDate(producto.fechaVencimiento),
      })
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
        laboratorio: producto.laboratorio || '-',
        alertas: producto.alertas || [],
        raw: producto,
      })),
    [productosQuery.data?.productos]
  )

  const movimientosRows = useMemo(
    () =>
      (movimientosQuery.data?.movimientos || []).map((movimiento) => ({
        id: movimiento.id,
        fecha: new Intl.DateTimeFormat('es-CO', {
          day: '2-digit',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        }).format(new Date(movimiento.createdAt)),
        producto: movimiento.producto?.nombre || 'Producto',
        tipo: movimiento.tipo,
        motivo: movimiento.motivo,
        cambio: `${movimiento.stockAnterior} -> ${movimiento.stockNuevo}`,
      })),
    [movimientosQuery.data?.movimientos]
  )

  const validateProductoNombre = (value = productoForm.nombre) => {
    const error = value.trim() ? '' : 'El nombre del producto es requerido.'
    setProductoErrors((prev) => ({ ...prev, nombre: error }))
    return !error
  }

  const validateMovementCantidad = (value = movementForm.cantidad) => {
    const error =
      !value || Number(value) <= 0 ? 'La cantidad debe ser mayor a 0.' : ''
    setMovementErrors((prev) => ({ ...prev, cantidad: error }))
    return !error
  }

  const validateMovementProducto = (value = movementForm.productoId) => {
    const error = value ? '' : 'Selecciona un producto de la tabla.'
    setMovementErrors((prev) => ({ ...prev, productoId: error }))
    return !error
  }

  const handleCreateProduct = (event) => {
    event.preventDefault()

    if (!validateProductoNombre() || !productoForm.categoria || !productoForm.unidadMedida) {
      if (!productoForm.categoria || !productoForm.unidadMedida) {
        toast.error('Completa categoria y unidad de medida.')
      }
      return
    }

    crearProductoMutation.mutate({
      nombre: productoForm.nombre.trim(),
      categoria: productoForm.categoria,
      unidadMedida: productoForm.unidadMedida,
      stock: productoForm.stock ? Number(productoForm.stock) : 0,
      stockMinimo: productoForm.stockMinimo ? Number(productoForm.stockMinimo) : 5,
      precioCompra: productoForm.precioCompra ? Number(productoForm.precioCompra) : 0,
      precioVenta: productoForm.precioVenta ? Number(productoForm.precioVenta) : 0,
      fechaVencimiento: productoForm.fechaVencimiento || undefined,
      lote: productoForm.lote.trim() || undefined,
      laboratorio: productoForm.laboratorio.trim() || undefined,
      requiereFormula: productoForm.requiereFormula,
    })
  }

  const handleRegisterMovement = (event) => {
    event.preventDefault()
    const productoOk = validateMovementProducto()
    const cantidadOk = validateMovementCantidad()
    if (!productoOk || !cantidadOk) return
    setConfirmMovement(true)
  }

  const handleConfirmMovement = () => {
    registrarMovimientoMutation.mutate(
      {
        productoId: movementForm.productoId,
        payload: {
          tipo: movementForm.tipo,
          cantidad: Number(movementForm.cantidad),
          motivo: movementForm.motivo,
          observaciones: movementForm.observaciones.trim() || undefined,
          precioUnitario: movementForm.precioUnitario ? Number(movementForm.precioUnitario) : 0,
        },
      },
      { onSettled: () => setConfirmMovement(false) },
    )
  }

  if (!rolPermitido) {
    return <RestrictedInventoryPage />
  }

  return (
    <AdminShell
      currentKey="inventario"
      title="Inventario y control de stock"
      description="Modulo administrativo para revisar categorias, alertas, productos activos y movimientos de stock con un lenguaje claro de oficina clinica."
      headerBadge={
        <StatusPill tone="border-cyan-200 bg-cyan-50 text-cyan-700">
          Control operativo
        </StatusPill>
      }
      actions={
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 border border-slate-200 bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
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
          {reporteQuery.isError || productosQuery.isError || alertasQuery.isError || movimientosQuery.isError ? (
            <div className="grid gap-4">
              {reporteQuery.isError ? (
                <ErrorBanner
                  variant="amber"
                  message={getErrorMessage(reporteQuery.error, 'No fue posible cargar el resumen de inventario.')}
                  onRetry={() => reporteQuery.refetch()}
                />
              ) : null}
              {productosQuery.isError ? (
                <ErrorBanner
                  message={getErrorMessage(productosQuery.error, 'No fue posible cargar la tabla de productos.')}
                  onRetry={() => productosQuery.refetch()}
                />
              ) : null}
              {alertasQuery.isError ? (
                <ErrorBanner
                  variant="amber"
                  message={getErrorMessage(alertasQuery.error, 'No fue posible cargar las alertas de inventario.')}
                  onRetry={() => alertasQuery.refetch()}
                />
              ) : null}
              {movimientosQuery.isError ? (
                <ErrorBanner
                  message={getErrorMessage(movimientosQuery.error, 'No fue posible cargar el historial de movimientos.')}
                  onRetry={() => movimientosQuery.refetch()}
                />
              ) : null}
            </div>
          ) : null}

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
              loading={alertasQuery.isLoading}
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

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_420px]">
            <DashboardPanel
              title="Productos"
              subtitle="Busca, filtra y selecciona un producto para registrar movimiento."
              action={
                <div className="flex flex-wrap gap-3">
                  <input
                    type="text"
                    value={buscar}
                    onChange={(event) => {
                      setBuscar(event.target.value)
                      setPaginaProductos(1)
                    }}
                    placeholder="Buscar por nombre, lote o laboratorio"
                    className="h-10 border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-cyan-500"
                  />
                  <select
                    value={categoria}
                    onChange={(event) => {
                      setCategoria(event.target.value)
                      setPaginaProductos(1)
                    }}
                    className="h-10 border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-cyan-500"
                  >
                    {CATEGORY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      setBajoStock((current) => !current)
                      setPaginaProductos(1)
                    }}
                    className={`border px-4 py-2 text-sm font-semibold transition ${
                      bajoStock
                        ? 'border-cyan-500 bg-cyan-50 text-cyan-700'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    Bajo stock
                  </button>
                </div>
              }
            >
              <DataTable
                title="Productos activos"
                subtitle="Base operativa del inventario."
                loading={productosQuery.isLoading}
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
                    label: 'Movimiento',
                    render: (row) => (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedProduct(row.raw)
                          setMovementForm((current) => ({
                            ...current,
                            productoId: row.raw.id,
                          }))
                        }}
                        className="text-sm font-semibold text-cyan-700 hover:text-cyan-800"
                      >
                        Registrar
                      </button>
                    ),
                  },
                ]}
                emptyTitle="No hay productos para este filtro"
                emptyBody="Ajusta la busqueda o crea el primer producto desde el panel derecho."
              />

              {(productosQuery.data?.paginas || 1) > 1 ? (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
                  <p className="text-sm text-slate-600">
                    Pagina {productosQuery.data?.paginaActual || 1} de {productosQuery.data?.paginas || 1}
                  </p>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setPaginaProductos((current) => Math.max(current - 1, 1))}
                      disabled={(productosQuery.data?.paginaActual || 1) <= 1}
                      className="border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Anterior
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setPaginaProductos((current) =>
                          Math.min(current + 1, productosQuery.data?.paginas || 1)
                        )
                      }
                      disabled={(productosQuery.data?.paginaActual || 1) >= (productosQuery.data?.paginas || 1)}
                      className="border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Siguiente
                    </button>
                  </div>
                </div>
              ) : null}
            </DashboardPanel>

            <div className="space-y-5">
              <DashboardPanel
                title="Crear producto"
                subtitle="Alta rapida para dejar el inventario listo sin salir de la pantalla."
                action={<PackagePlus className="h-4 w-4 text-cyan-700" />}
              >
                <form className="grid gap-4" onSubmit={handleCreateProduct}>
                  <div>
                    <input
                      type="text"
                      value={productoForm.nombre}
                      onChange={(event) => {
                        setProductoForm((current) => ({ ...current, nombre: event.target.value }))
                        if (productoErrors.nombre) validateProductoNombre(event.target.value)
                      }}
                      onBlur={() => validateProductoNombre()}
                      placeholder="Nombre del producto"
                      className={`h-11 w-full border bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-cyan-500 ${productoErrors.nombre ? 'border-red-400' : 'border-slate-200'}`}
                    />
                    <FieldError message={productoErrors.nombre} />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <select
                      value={productoForm.categoria}
                      onChange={(event) => setProductoForm((current) => ({ ...current, categoria: event.target.value }))}
                      className="h-11 border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-cyan-500"
                    >
                      {CATEGORY_OPTIONS.filter((option) => option.value !== 'todas').map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <select
                      value={productoForm.unidadMedida}
                      onChange={(event) => setProductoForm((current) => ({ ...current, unidadMedida: event.target.value }))}
                      className="h-11 border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-cyan-500"
                    >
                      {UNIT_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <input
                      type="number"
                      min="0"
                      value={productoForm.stock}
                      onChange={(event) => setProductoForm((current) => ({ ...current, stock: event.target.value }))}
                      placeholder="Stock inicial"
                      className="h-11 border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-cyan-500"
                    />
                    <input
                      type="number"
                      min="0"
                      value={productoForm.stockMinimo}
                      onChange={(event) => setProductoForm((current) => ({ ...current, stockMinimo: event.target.value }))}
                      placeholder="Stock minimo"
                      className="h-11 border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-cyan-500"
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={productoForm.precioCompra}
                      onChange={(event) => setProductoForm((current) => ({ ...current, precioCompra: event.target.value }))}
                      placeholder="Precio compra"
                      className="h-11 border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-cyan-500"
                    />
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={productoForm.precioVenta}
                      onChange={(event) => setProductoForm((current) => ({ ...current, precioVenta: event.target.value }))}
                      placeholder="Precio venta"
                      className="h-11 border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-cyan-500"
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <input
                      type="text"
                      value={productoForm.laboratorio}
                      onChange={(event) => setProductoForm((current) => ({ ...current, laboratorio: event.target.value }))}
                      placeholder="Laboratorio"
                      className="h-11 border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-cyan-500"
                    />
                    <input
                      type="text"
                      value={productoForm.lote}
                      onChange={(event) => setProductoForm((current) => ({ ...current, lote: event.target.value }))}
                      placeholder="Lote"
                      className="h-11 border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-cyan-500"
                    />
                  </div>
                  <input
                    type="date"
                    value={productoForm.fechaVencimiento}
                    onChange={(event) => setProductoForm((current) => ({ ...current, fechaVencimiento: event.target.value }))}
                    className="h-11 border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-cyan-500"
                  />
                  <label className="flex items-center gap-3 border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={productoForm.requiereFormula}
                      onChange={(event) => setProductoForm((current) => ({ ...current, requiereFormula: event.target.checked }))}
                    />
                    Requiere formula
                  </label>
                  <LoadingButton
                    type="submit"
                    loading={crearProductoMutation.isPending}
                    loadingLabel="Guardando..."
                    className="w-full border border-slate-200 bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    Guardar producto
                  </LoadingButton>
                </form>
              </DashboardPanel>

              <DashboardPanel
                title="Registrar movimiento"
                subtitle="Entrada, salida o ajuste sobre el producto seleccionado."
              >
                <form className="grid gap-4" onSubmit={handleRegisterMovement}>
                  <div>
                    <div className={`border bg-slate-50 px-3 py-3 text-sm leading-6 text-slate-600 ${movementErrors.productoId ? 'border-red-400' : 'border-slate-200'}`}>
                      {selectedProduct ? (
                        <>
                          <p className="font-semibold text-slate-900">{selectedProduct.nombre}</p>
                          <p>{selectedProduct.categoria}</p>
                        </>
                      ) : (
                        'Selecciona un producto desde la tabla para registrar el movimiento.'
                      )}
                    </div>
                    <FieldError message={movementErrors.productoId} />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <select
                      value={movementForm.tipo}
                      onChange={(event) => setMovementForm((current) => ({ ...current, tipo: event.target.value }))}
                      className="h-11 border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-cyan-500"
                    >
                      {MOVEMENT_TYPE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <select
                      value={movementForm.motivo}
                      onChange={(event) => setMovementForm((current) => ({ ...current, motivo: event.target.value }))}
                      className="h-11 border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-cyan-500"
                    >
                      {MOVEMENT_REASON_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={movementForm.cantidad}
                        onChange={(event) => {
                          setMovementForm((current) => ({ ...current, cantidad: event.target.value }))
                          if (movementErrors.cantidad) validateMovementCantidad(event.target.value)
                        }}
                        onBlur={() => validateMovementCantidad()}
                        placeholder="Cantidad"
                        className={`h-11 w-full border bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-cyan-500 ${movementErrors.cantidad ? 'border-red-400' : 'border-slate-200'}`}
                      />
                      <FieldError message={movementErrors.cantidad} />
                    </div>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={movementForm.precioUnitario}
                      onChange={(event) => setMovementForm((current) => ({ ...current, precioUnitario: event.target.value }))}
                      placeholder="Precio unitario"
                      className="h-11 border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-cyan-500"
                    />
                  </div>
                  <textarea
                    value={movementForm.observaciones}
                    onChange={(event) => setMovementForm((current) => ({ ...current, observaciones: event.target.value }))}
                    placeholder="Observaciones del movimiento"
                    className="min-h-[110px] border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700 outline-none transition focus:border-cyan-500"
                  />
                  <LoadingButton
                    type="submit"
                    loading={registrarMovimientoMutation.isPending}
                    loadingLabel="Registrando..."
                    className="w-full border border-slate-200 bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    Registrar movimiento
                  </LoadingButton>
                </form>
              </DashboardPanel>
            </div>
          </div>

          <DataTable
            title="Ultimos movimientos"
            subtitle="Traza administrativa del cambio de stock."
            loading={movimientosQuery.isLoading}
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
              <StatusPill tone="border-slate-200 bg-slate-100 text-slate-700">
                Pagina {movimientosQuery.data?.paginaActual || 1}
              </StatusPill>
            }
          />

          {(movimientosQuery.data?.paginas || 1) > 1 ? (
            <div className="flex flex-wrap items-center justify-between gap-3 border border-slate-200 bg-white px-4 py-4 shadow-sm">
              <p className="text-sm text-slate-600">
                Pagina {movimientosQuery.data?.paginaActual || 1} de {movimientosQuery.data?.paginas || 1}
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setPaginaMovimientos((current) => Math.max(current - 1, 1))}
                  disabled={(movimientosQuery.data?.paginaActual || 1) <= 1}
                  className="border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Anterior
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setPaginaMovimientos((current) =>
                      Math.min(current + 1, movimientosQuery.data?.paginas || 1)
                    )
                  }
                  disabled={(movimientosQuery.data?.paginaActual || 1) >= (movimientosQuery.data?.paginas || 1)}
                  className="border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Siguiente
                </button>
              </div>
            </div>
          ) : null}
        </div>
      )}

      <ConfirmDialog
        open={confirmMovement}
        onOpenChange={setConfirmMovement}
        title="Confirmar movimiento de stock"
        description={
          selectedProduct
            ? `Se registrara un movimiento de ${movementForm.tipo} de ${movementForm.cantidad} ${selectedProduct.unidadMedida || 'unidades'} sobre ${selectedProduct.nombre}. Esta accion no se puede deshacer.`
            : 'Confirma el movimiento de inventario.'
        }
        confirmLabel="Confirmar movimiento"
        variant="default"
        loading={registrarMovimientoMutation.isPending}
        onConfirm={handleConfirmMovement}
      />
    </AdminShell>
  )
}
