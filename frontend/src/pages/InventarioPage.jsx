import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { CircleAlert, PackagePlus, ShieldCheck, Sparkles, Boxes } from 'lucide-react'
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
  const [movementForm, setMovementForm] = useState(DEFAULT_MOVEMENT_FORM)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [editingProduct, setEditingProduct] = useState(null)

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

  const crearProductoMutation = useMutation({
    mutationFn: inventarioApi.crearProducto,
    onSuccess: (data) => {
      toast.success(data?.message || 'Producto creado exitosamente')
      setProductoForm(DEFAULT_PRODUCT_FORM)
      queryClient.invalidateQueries({ queryKey: ['inventario-productos'] })
      queryClient.invalidateQueries({ queryKey: ['inventario-producto-detalle'] })
      queryClient.invalidateQueries({ queryKey: ['inventario-reporte-completo'] })
      queryClient.invalidateQueries({ queryKey: ['inventario-alertas'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-inventario'] })
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'No fue posible crear el producto.'))
    },
  })

  const editarProductoMutation = useMutation({
    mutationFn: ({ productoId, payload }) => inventarioApi.editarProducto(productoId, payload),
    onSuccess: (data) => {
      toast.success(data?.message || 'Producto actualizado exitosamente')
      setProductoForm(DEFAULT_PRODUCT_FORM)
      setEditingProduct(null)
      queryClient.invalidateQueries({ queryKey: ['inventario-productos'] })
      queryClient.invalidateQueries({ queryKey: ['inventario-producto-detalle'] })
      queryClient.invalidateQueries({ queryKey: ['inventario-reporte-completo'] })
      queryClient.invalidateQueries({ queryKey: ['inventario-alertas'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-inventario'] })
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'No fue posible actualizar el producto.'))
    },
  })

  const eliminarProductoMutation = useMutation({
    mutationFn: inventarioApi.eliminarProducto,
    onSuccess: (data, productoId) => {
      toast.success(data?.message || 'Producto desactivado exitosamente')
      if (editingProduct?.id === productoId) {
        setEditingProduct(null)
        setProductoForm(DEFAULT_PRODUCT_FORM)
      }
      if (selectedProduct?.id === productoId) {
        setSelectedProduct(null)
        setMovementForm(DEFAULT_MOVEMENT_FORM)
      }
      queryClient.invalidateQueries({ queryKey: ['inventario-productos'] })
      queryClient.invalidateQueries({ queryKey: ['inventario-producto-detalle'] })
      queryClient.invalidateQueries({ queryKey: ['inventario-movimientos'] })
      queryClient.invalidateQueries({ queryKey: ['inventario-alertas'] })
      queryClient.invalidateQueries({ queryKey: ['inventario-reporte-completo'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-inventario'] })
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
      queryClient.invalidateQueries({ queryKey: ['inventario-productos'] })
      queryClient.invalidateQueries({ queryKey: ['inventario-producto-detalle'] })
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

  const detalleProducto = productoDetalleQuery.data?.producto || selectedProduct
  const detalleMovimientosRows = useMemo(
    () =>
      (productoDetalleQuery.data?.producto?.movimientos || []).map((movimiento) => ({
        id: movimiento.id,
        fecha: new Intl.DateTimeFormat('es-CO', {
          day: '2-digit',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        }).format(new Date(movimiento.createdAt)),
        tipo: movimiento.tipo,
        motivo: movimiento.motivo.replaceAll('_', ' '),
        cantidad: formatNumber(movimiento.cantidad),
        cambio: `${movimiento.stockAnterior} -> ${movimiento.stockNuevo}`,
      })),
    [productoDetalleQuery.data?.producto?.movimientos]
  )

  const handleCreateProduct = (event) => {
    event.preventDefault()

    if (!productoForm.nombre.trim() || !productoForm.categoria || !productoForm.unidadMedida) {
      toast.error('Completa nombre, categoria y unidad de medida.')
      return
    }

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
      editarProductoMutation.mutate({
        productoId: editingProduct.id,
        payload,
      })
      return
    }

    crearProductoMutation.mutate({
      ...payload,
      stock: productoForm.stock ? Number(productoForm.stock) : 0,
    })
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

  const handleEditProduct = (producto) => {
    setEditingProduct(producto)
    setProductoForm(buildProductForm(producto))
  }

  const handleCancelEditProduct = () => {
    setEditingProduct(null)
    setProductoForm(DEFAULT_PRODUCT_FORM)
  }

  const handleDeleteProduct = (producto) => {
    const confirmed = window.confirm(`Se desactivara "${producto.nombre}" del inventario activo. ¿Deseas continuar?`)
    if (!confirmed) return
    eliminarProductoMutation.mutate(producto.id)
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
          {reporteQuery.isError || productosQuery.isError || alertasQuery.isError || movimientosQuery.isError ? (
            <div className="grid gap-4">
              {reporteQuery.isError ? (
                <div className="border border-amber-200 bg-amber-50 px-4 py-4 text-sm leading-7 text-amber-800">
                  {getErrorMessage(reporteQuery.error, 'No fue posible cargar el resumen de inventario.')}
                </div>
              ) : null}
              {productosQuery.isError ? (
                <div className="border border-red-200 bg-red-50 px-4 py-4 text-sm leading-7 text-red-700">
                  {getErrorMessage(productosQuery.error, 'No fue posible cargar la tabla de productos.')}
                </div>
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
                            : 'border-primary/30 bg-primary/10 text-primary'
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
                    className="h-10 border border-border bg-card px-3 text-sm text-foreground outline-none transition focus:border-primary"
                  />
                  <select
                    value={categoria}
                    onChange={(event) => {
                      setCategoria(event.target.value)
                      setPaginaProductos(1)
                    }}
                    className="h-10 border border-border bg-card px-3 text-sm text-foreground outline-none transition focus:border-primary"
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
                          onClick={() => {
                            setSelectedProduct(row.raw)
                            setMovementForm((current) => ({
                              ...DEFAULT_MOVEMENT_FORM,
                              tipo: current.tipo,
                              motivo: (MOVEMENT_REASON_OPTIONS[current.tipo] || MOVEMENT_REASON_OPTIONS.entrada)[0].value,
                              productoId: row.raw.id,
                            }))
                          }}
                          className="text-sm font-semibold text-primary hover:text-primary"
                        >
                          Movimiento
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedProduct(row.raw)}
                          className="text-sm font-semibold text-emerald-700 hover:text-emerald-800"
                        >
                          Ver detalle
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEditProduct(row.raw)}
                          className="text-sm font-semibold text-slate-700 hover:text-slate-900"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteProduct(row.raw)}
                          className="text-sm font-semibold text-red-700 hover:text-red-800"
                        >
                          Desactivar
                        </button>
                      </div>
                    ),
                  },
                ]}
                emptyTitle="No hay productos para este filtro"
                emptyBody="Ajusta la busqueda o crea el primer producto desde el panel derecho."
              />

              {(productosQuery.data?.paginas || 1) > 1 ? (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
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
                      onClick={() =>
                        setPaginaProductos((current) =>
                          Math.min(current + 1, productosQuery.data?.paginas || 1)
                        )
                      }
                      disabled={(productosQuery.data?.paginaActual || 1) >= (productosQuery.data?.paginas || 1)}
                      className="border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Siguiente
                    </button>
                  </div>
                </div>
              ) : null}
            </DashboardPanel>

            <div className="space-y-5">
              <DashboardPanel
                title={editingProduct ? 'Editar producto' : 'Crear producto'}
                subtitle={
                  editingProduct
                    ? 'Ajusta los datos del producto. El stock se modifica desde movimientos.'
                    : 'Alta rapida para dejar el inventario listo sin salir de la pantalla.'
                }
                action={<PackagePlus className="h-4 w-4 text-cyan-700" />}
              >
                <form className="grid gap-4" onSubmit={handleCreateProduct}>
                  <input
                    type="text"
                    value={productoForm.nombre}
                    onChange={(event) => setProductoForm((current) => ({ ...current, nombre: event.target.value }))}
                    placeholder="Nombre del producto"
                    className="h-11 border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-cyan-500"
                  />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <select
                      value={productoForm.categoria}
                      onChange={(event) => setProductoForm((current) => ({ ...current, categoria: event.target.value }))}
                      className="h-11 border border-border bg-card px-3 text-sm text-foreground outline-none transition focus:border-primary"
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
                      className="h-11 border border-border bg-card px-3 text-sm text-foreground outline-none transition focus:border-primary"
                    >
                      {UNIT_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {!editingProduct ? (
                      <input
                        type="number"
                        min="0"
                        value={productoForm.stock}
                        onChange={(event) => setProductoForm((current) => ({ ...current, stock: event.target.value }))}
                        placeholder="Stock inicial"
                        className="h-11 border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-cyan-500"
                      />
                    ) : (
                      <div className="flex h-11 items-center border border-slate-200 bg-slate-50 px-3 text-sm text-slate-600">
                        Stock actual: {formatNumber(editingProduct.stock || 0)}
                      </div>
                    )}
                    <input
                      type="number"
                      min="0"
                      value={productoForm.stockMinimo}
                      onChange={(event) => setProductoForm((current) => ({ ...current, stockMinimo: event.target.value }))}
                      placeholder="Stock minimo"
                      className="h-11 border border-border bg-card px-3 text-sm text-foreground outline-none transition focus:border-primary"
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
                      className="h-11 border border-border bg-card px-3 text-sm text-foreground outline-none transition focus:border-primary"
                    />
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={productoForm.precioVenta}
                      onChange={(event) => setProductoForm((current) => ({ ...current, precioVenta: event.target.value }))}
                      placeholder="Precio venta"
                      className="h-11 border border-border bg-card px-3 text-sm text-foreground outline-none transition focus:border-primary"
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <input
                      type="text"
                      value={productoForm.laboratorio}
                      onChange={(event) => setProductoForm((current) => ({ ...current, laboratorio: event.target.value }))}
                      placeholder="Laboratorio"
                      className="h-11 border border-border bg-card px-3 text-sm text-foreground outline-none transition focus:border-primary"
                    />
                    <input
                      type="text"
                      value={productoForm.lote}
                      onChange={(event) => setProductoForm((current) => ({ ...current, lote: event.target.value }))}
                      placeholder="Lote"
                      className="h-11 border border-border bg-card px-3 text-sm text-foreground outline-none transition focus:border-primary"
                    />
                  </div>
                  <input
                    type="date"
                    value={productoForm.fechaVencimiento}
                    onChange={(event) => setProductoForm((current) => ({ ...current, fechaVencimiento: event.target.value }))}
                    className="h-11 border border-border bg-card px-3 text-sm text-foreground outline-none transition focus:border-primary"
                  />
                  <label className="flex items-center gap-3 border border-border bg-muted px-3 py-3 text-sm text-foreground">
                    <input
                      type="checkbox"
                      checked={productoForm.requiereFormula}
                      onChange={(event) => setProductoForm((current) => ({ ...current, requiereFormula: event.target.checked }))}
                    />
                    Requiere formula
                  </label>
                  {editingProduct ? (
                    <div className="flex gap-3">
                      <button
                        type="submit"
                        disabled={editarProductoMutation.isPending}
                        className="flex-1 border border-slate-200 bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {editarProductoMutation.isPending ? 'Guardando...' : 'Actualizar producto'}
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelEditProduct}
                        className="border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <button
                      type="submit"
                      disabled={crearProductoMutation.isPending}
                      className="border border-slate-200 bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {crearProductoMutation.isPending ? 'Guardando...' : 'Guardar producto'}
                    </button>
                  )}
                </form>
              </DashboardPanel>

              <DashboardPanel
                title="Registrar movimiento"
                subtitle="Entrada, salida o ajuste sobre el producto seleccionado."
              >
                <form className="grid gap-4" onSubmit={handleRegisterMovement}>
                  <div className="border border-slate-200 bg-slate-50 px-3 py-3 text-sm leading-6 text-slate-600">
                    {selectedProduct ? (
                      <>
                        <p className="font-semibold text-slate-900">{detalleProducto?.nombre || selectedProduct.nombre}</p>
                        <p>
                          {(detalleProducto?.categoria || selectedProduct.categoria)} · Stock actual {formatNumber(detalleProducto?.stock || selectedProduct.stock || 0)}
                        </p>
                      </>
                    ) : (
                      'Selecciona un producto desde la tabla para registrar el movimiento.'
                    )}
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <select
                      value={movementForm.tipo}
                      onChange={(event) => {
                        const nextType = event.target.value
                        setMovementForm((current) => ({
                          ...current,
                          tipo: nextType,
                          motivo: (MOVEMENT_REASON_OPTIONS[nextType] || MOVEMENT_REASON_OPTIONS.entrada)[0].value,
                        }))
                      }}
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
                      className="h-11 border border-border bg-card px-3 text-sm text-foreground outline-none transition focus:border-primary"
                    >
                      {motivosDisponibles.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={movementForm.cantidad}
                      onChange={(event) => setMovementForm((current) => ({ ...current, cantidad: event.target.value }))}
                      placeholder={movementForm.tipo === 'ajuste' ? 'Nuevo stock final' : 'Cantidad'}
                      className="h-11 border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-cyan-500"
                    />
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={movementForm.precioUnitario}
                      onChange={(event) => setMovementForm((current) => ({ ...current, precioUnitario: event.target.value }))}
                      placeholder="Precio unitario"
                      className="h-11 border border-border bg-card px-3 text-sm text-foreground outline-none transition focus:border-primary"
                    />
                  </div>
                  <textarea
                    value={movementForm.observaciones}
                    onChange={(event) => setMovementForm((current) => ({ ...current, observaciones: event.target.value }))}
                    placeholder="Observaciones del movimiento"
                    className="min-h-[110px] border border-border bg-card px-3 py-3 text-sm text-foreground outline-none transition focus:border-primary"
                  />
                  <button
                    type="submit"
                    disabled={registrarMovimientoMutation.isPending}
                    className="border border-slate-200 bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
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
                    <div className="grid gap-3 border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700 sm:grid-cols-2">
                      <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Producto</p>
                        <p className="mt-1 font-semibold text-slate-900">{detalleProducto?.nombre || selectedProduct.nombre}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Stock actual</p>
                        <p className="mt-1 font-semibold text-slate-900">{formatNumber(detalleProducto?.stock || selectedProduct.stock || 0)}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Stock minimo</p>
                        <p className="mt-1">{formatNumber(detalleProducto?.stockMinimo || selectedProduct.stockMinimo || 0)}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Laboratorio / lote</p>
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
                  <div className="border border-slate-200 bg-slate-50 px-4 py-5 text-sm leading-7 text-slate-600">
                    Selecciona un producto desde la tabla para ver su detalle y los ultimos movimientos.
                  </div>
                )}
              </DashboardPanel>
            </div>
          </div>

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

          {(movimientosQuery.data?.paginas || 1) > 1 ? (
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
                  onClick={() =>
                    setPaginaMovimientos((current) =>
                      Math.min(current + 1, movimientosQuery.data?.paginas || 1)
                    )
                  }
                  disabled={(movimientosQuery.data?.paginaActual || 1) >= (movimientosQuery.data?.paginas || 1)}
                  className="border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Siguiente
                </button>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </AdminShell>
  )
}
