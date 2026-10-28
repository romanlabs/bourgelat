import { useEffect, useState } from 'react'
import { DropdownMenu } from 'radix-ui'
import { ArrowLeftRight, Check, CircleAlert, Download, FileSpreadsheet, Filter, MoreHorizontal, PackagePlus, Plus, Sparkles, ShoppingCart, FlaskConical } from 'lucide-react'
import { cn } from '@/lib/utils'
import AdminShell from '@/components/layout/AdminShell'
import { NavCta } from '@/components/shared/NavCta'
import { EmptyState } from '@/components/shared/EmptyState'
import { DataTable } from '@/components/shared/DataTable'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import SearchInput from '@/components/shared/SearchInput'
import { Button } from '@/components/ui/button'
import { DashboardPanel } from '@/features/dashboard/dashboardComponents'
import { formatCurrency, formatNumber } from '@/features/dashboard/dashboardUtils'
import { useAuthStore } from '@/store/authStore'
import { canAccessModule } from '@/lib/permissions'
import Paginacion from '@/components/shared/Paginacion'
import ProductoComboBox from '@/components/shared/ProductoComboBox'
import InventarioSelectorDialog from '@/components/shared/InventarioSelectorDialog'
import ProductoDrawer from '@/features/inventario/ProductoDrawer'
import FacturaCompraDrawer from '@/features/inventario/FacturaCompraDrawer'
import FacturaCompraDetalleModal from '@/features/inventario/FacturaCompraDetalleModal'
import ImportarInventarioDialog from '@/features/inventario/ImportarInventarioDialog'
import ActualizarVencimientoDialog from '@/features/inventario/ActualizarVencimientoDialog'
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
  { id: 'productos', label: 'Productos' },
  { id: 'servicios', label: 'Servicios' },
  { id: 'movimientos', label: 'Movimientos' },
  { id: 'facturas-compra', label: 'Facturas de compra' },
]

// Inputs del rediseño: llevan borde (las tarjetas no). Enlaces de acción en
// tabla con foco visible.
const FOCO = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background'
const INPUT = 'h-11 w-full rounded-lg border border-input bg-card px-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring'
const ENLACE = `rounded-md text-sm font-semibold transition hover:underline ${FOCO}`

// Alertas de la tabla → variante de StatusBadge. «Vence pronto» no está en el
// mapa compartido: se pinta en lila (info) como en el mockup.
const ALERTA_BADGE = {
  agotado: { variant: 'agotado' },
  vencido: { variant: 'vencido' },
  bajo_stock: { variant: 'bajo_stock', label: 'Bajo el mínimo' },
  proximo_vencimiento: { variant: 'proximo_vencimiento', label: 'Vence pronto', className: 'bg-info-soft text-info' },
}

// "2027-03-14" → "14 mar. 2027". Se parte a mano para no correr un día por la zona horaria.
const formatoFecha = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })
function fechaLegible(valor) {
  if (!valor) return null
  const [a, m, d] = String(valor).slice(0, 10).split('-').map(Number)
  if (!a || !m || !d) return String(valor)
  return formatoFecha.format(new Date(a, m - 1, d))
}

// Menú de filtros (categoría + solo cantidad baja) para las tablas de inventario.
// Reemplaza la fila de pills por un ícono junto al buscador, con el mismo
// estilo de dropdown (radix-ui) usado en el selector de vista de Agenda.
const CLAVE_INVENTARIO = 'bourgelat:inventario-elegido'

function leerInventarioGuardado() {
  try {
    const valor = localStorage.getItem(CLAVE_INVENTARIO)
    return valor === 'ventas' || valor === 'clinica' ? valor : null
  } catch {
    return null
  }
}

function guardarInventario(valor) {
  try {
    localStorage.setItem(CLAVE_INVENTARIO, valor)
  } catch {
    // Sin almacenamiento (modo privado): se vuelve a preguntar la proxima vez.
  }
}

function FiltroInventarioMenu({ categoryOptions, categoria, onCategoriaChange, bajoStock, onBajoStockChange }) {
  const filtroActivo = categoria !== 'todas' || bajoStock

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label="Filtrar por categoría"
          className={cn(
            'relative flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground transition hover:bg-secondary/80 active:translate-y-px data-[state=open]:bg-accent',
            FOCO,
            filtroActivo && 'bg-accent text-primary'
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
          className="z-50 w-56 rounded-xl bg-popover p-1.5 shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
        >
          <DropdownMenu.Label className="px-3 py-1.5 text-[13px] font-semibold text-muted-foreground">
            Categoría
          </DropdownMenu.Label>
          {categoryOptions.map((opt) => (
            <DropdownMenu.Item
              key={opt.value}
              onSelect={() => onCategoriaChange(opt.value)}
              className={cn(
                'flex cursor-pointer items-center justify-between rounded-lg px-3 py-2.5 text-sm text-foreground outline-none transition hover:bg-muted focus:bg-muted',
                categoria === opt.value && 'font-medium text-primary'
              )}
            >
              {opt.label}
              {categoria === opt.value && <Check className="h-4 w-4" />}
            </DropdownMenu.Item>
          ))}

          <DropdownMenu.Separator className="mx-1.5 my-1.5 h-px bg-border" />

          <DropdownMenu.CheckboxItem
            checked={bajoStock}
            onCheckedChange={onBajoStockChange}
            onSelect={(event) => event.preventDefault()}
            className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-foreground outline-none transition hover:bg-muted focus:bg-muted"
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

// Cantidad frente al mínimo: cifra y barra corta. Agotado en ladrillo, bajo el
// mínimo en miel; lo sano va en petróleo.
function CantidadMinimo({ stock, stockMinimo, unidad }) {
  const num = Number(stock ?? 0)
  const min = Number(stockMinimo ?? 0)
  const agotado = num <= 0
  const bajo = !agotado && num <= min
  const ancho = min > 0 ? Math.max(4, Math.min(100, Math.round((num / (min * 2)) * 100))) : agotado ? 4 : 100
  return (
    <span className="flex min-w-[110px] flex-col gap-1.5">
      <span className="whitespace-nowrap tabular-nums">
        <span className={cn('font-semibold', agotado ? 'text-danger' : bajo ? 'text-warning' : 'text-foreground')}>
          {formatNumber(num)}
        </span>
        <span className="text-muted-foreground"> / {formatNumber(min)}{unidad ? ` ${unidad}` : ''}</span>
      </span>
      <span className="flex h-1.5 rounded-full bg-muted" aria-hidden="true">
        <span
          className={cn('block h-1.5 rounded-full', agotado ? 'bg-danger' : bajo ? 'bg-warning' : 'bg-primary')}
          style={{ width: `${ancho}%` }}
        />
      </span>
    </span>
  )
}

function AlertaChips({ row }) {
  const agotado = Number(row.stock ?? 0) <= 0
  const claves = row.alertas.map((alerta) => (alerta === 'bajo_stock' && agotado ? 'agotado' : alerta))
  if (claves.length === 0) return <StatusBadge variant="disponible" label="Bien" />
  return (
    <span className="flex flex-wrap gap-1.5">
      {claves.map((clave) => {
        const config = ALERTA_BADGE[clave] || { variant: clave, label: clave.replaceAll('_', ' ') }
        return <StatusBadge key={`${row.id}-${clave}`} {...config} />
      })}
    </span>
  )
}

function Vencimiento({ row }) {
  const fecha = fechaLegible(row.raw?.fechaVencimiento)
  if (!fecha) return <span className="text-muted-foreground">—</span>
  const tono = row.alertas.includes('vencido')
    ? 'font-semibold text-danger'
    : row.alertas.includes('proximo_vencimiento')
      ? 'font-semibold text-info'
      : 'text-foreground'
  return <span className={cn('whitespace-nowrap tabular-nums', tono)}>{fecha}</span>
}

// Cambio de cantidad con signo: lo que entra en verde, lo que sale en ladrillo.
function CambioCantidad({ delta }) {
  if (delta === null || delta === undefined) return <span className="text-muted-foreground">—</span>
  const positivo = delta > 0
  return (
    <span className={cn('whitespace-nowrap font-semibold tabular-nums', positivo ? 'text-success' : delta < 0 ? 'text-danger' : 'text-muted-foreground')}>
      {positivo ? '+' : delta < 0 ? '−' : ''}
      {formatNumber(Math.abs(delta))}
    </span>
  )
}

const TONO_TIPO = {
  entrada: 'bg-success-soft text-success',
  salida: 'bg-danger-soft text-danger',
  ajuste: 'bg-info-soft text-info',
}

// Acciones de una fila en un menú «⋯»: la tabla queda limpia y las acciones
// siguen a un clic.
function AccionesFila({ nombre, acciones }) {
  const visibles = acciones.filter(Boolean)
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label={`Acciones de ${nombre}`}
          className={cn('flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground data-[state=open]:bg-muted', FOCO)}
        >
          <MoreHorizontal className="h-[18px] w-[18px]" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          className="z-50 min-w-[200px] rounded-xl bg-popover p-1.5 shadow-dropdown data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
        >
          {visibles.map((accion) => (
            <DropdownMenu.Item
              key={accion.label}
              onSelect={accion.onSelect}
              className={cn(
                'flex cursor-pointer items-center rounded-lg px-3 py-2.5 text-sm outline-none transition hover:bg-muted focus:bg-muted',
                accion.peligro ? 'text-danger' : 'text-foreground'
              )}
            >
              {accion.label}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}

// Tarjeta con título sobre la tabla compartida. La paginación es del servidor
// (Paginacion debajo), así que la tabla recibe la página completa sin cortarla.
function TablaInventario({ title, subtitle, columns, rows, emptyTitle, emptyBody, action }) {
  return (
    <section className="overflow-hidden rounded-2xl bg-card">
      {title || action ? (
        <div className="flex flex-col gap-2 px-6 pt-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            {title ? (
              <h2 className="text-lg font-semibold tracking-[-0.02em] text-card-foreground">{title}</h2>
            ) : null}
            {subtitle ? <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">{subtitle}</p> : null}
          </div>
          {action}
        </div>
      ) : null}
      <DataTable
        columns={columns}
        rows={rows}
        pageSize={Math.max(rows.length, 1)}
        emptyTitle={emptyTitle}
        emptyDescription={emptyBody}
        className="rounded-none"
      />
    </section>
  )
}

// Nombre en negrita y, debajo, el dato que lo distingue (laboratorio, lote).
function NombreProducto({ nombre, detalle }) {
  return (
    <span className="flex min-w-[160px] flex-col gap-0.5">
      <span className="text-[15px] font-semibold text-foreground">{nombre}</span>
      {detalle ? <span className="text-[13px] text-muted-foreground">{detalle}</span> : null}
    </span>
  )
}

function TableSkeleton({ rows = 6 }) {
  return (
    <div className="grid gap-1">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex animate-pulse gap-4 rounded-xl px-3 py-3">
          <div className="h-4 flex-1 rounded bg-muted" />
          <div className="h-4 w-24 rounded bg-muted" />
          <div className="h-4 w-16 rounded bg-muted" />
          <div className="h-4 w-20 rounded bg-muted" />
        </div>
      ))}
    </div>
  )
}

function InventarioContextBar({ inventario, onCambiar }) {
  const esVentas = inventario === 'ventas'
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-card px-5 py-3">
      <span className="inline-flex items-center gap-2.5 text-[15px] font-semibold text-foreground">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-primary">
          {esVentas ? <PackagePlus className="h-4 w-4" /> : <FlaskConical className="h-4 w-4" />}
        </span>
        Inventario de {esVentas ? 'ventas' : 'la clínica'}
      </span>
      <Button type="button" variant="secondary" onClick={onCambiar}>
        <ArrowLeftRight />
        Cambiar de inventario
      </Button>
    </div>
  )
}

// Pestañas como control segmentado: fondo suave y la activa en hoja blanca.
function InventarioTabs({ activeTab, onTabChange }) {
  return (
    <div className="-mx-1 overflow-x-auto px-1 pb-1">
      <div role="tablist" aria-label="Inventario" className="inline-flex gap-1 rounded-xl bg-secondary p-1">
        {TABS.map((tab) => {
          const activa = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activa}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                'h-10 shrink-0 whitespace-nowrap rounded-lg px-4 text-sm transition',
                FOCO,
                activa
                  ? 'bg-card font-semibold text-foreground'
                  : 'font-medium text-muted-foreground hover:text-foreground'
              )}
            >
              {tab.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function RestrictedInventoryPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <DashboardPanel
          title="Inventario"
          subtitle="Esta sección se reserva para administración o auxiliares autorizados."
        >
          <div className="rounded-xl bg-muted px-4 py-5 text-sm leading-7 text-muted-foreground">
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

  const [activeTab, setActiveTab] = useState('productos')
  // Se recuerda la ultima eleccion: preguntar en cada visita a Productos costaba un clic
  // de mas. 'Cambiar de inventario' sigue a mano para alternar.
  const [inventarioSeleccionado, setInventarioSeleccionado] = useState(leerInventarioGuardado) // null | 'ventas' | 'clinica'
  const [selectorOpen, setSelectorOpen] = useState(false)
  const [relevoVencimiento, setRelevoVencimiento] = useState(null) // null | { item, tipo }

  const rolPermitido = canAccessModule(usuario, 'inventario')
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

  function abrirRelevoVencimiento(item, tipo) {
    setRelevoVencimiento({
      tipo,
      item: {
        id: item.id,
        nombre: item.nombre,
        stock: item.stock,
        fechaVencimiento: item.fechaVencimiento,
        unidad: tipo === 'insumo' ? item.unidadBase : undefined,
      },
    })
  }

  function handleMovimientoClick(producto) {
    movimientosHook.selectProduct(producto)
    setActiveTab('movimientos')
  }

  // Antes del return por rol: un hook despues de un return condicional rompe
  // el orden de hooks si el rol cambia entre renders (p. ej. al refrescar /me).
  const facturaCompraHook = useFacturaCompra({ enabled: rolPermitido })

  if (!rolPermitido) return <RestrictedInventoryPage />

  const { resumen, alertsRows, reporteQuery } = resumenHook
  const {
    productosQuery,
    productosRows,
    buscar, setBuscar,
    categoria, setCategoria,
    bajoStock, setBajoStock,
    setPagina: setPaginaProductos,
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
    setPagina: setPaginaMovimientos,
    isPendingMovement,
    submitMovementForm,
    selectProduct,
  } = movimientosHook

  // El título dice cuánto hay en el inventario elegido; las altas van en la
  // fila del título (sin buscador global, que sigue en Ctrl K) para no
  // repetirlas en cada pestaña.
  const esClinica = inventarioSeleccionado === 'clinica'
  const totalInsumos = insumosClinicosHook.insumosQuery.data?.total
  const titulo = esClinica
    ? typeof totalInsumos === 'number'
      ? `${formatNumber(totalInsumos)} ${totalInsumos === 1 ? 'insumo clínico' : 'insumos clínicos'}`
      : 'Inventario de la clínica'
    : inventarioSeleccionado === 'ventas' && !reporteQuery.isPending
      ? `${formatNumber(resumen.totalProductos || 0)} ${resumen.totalProductos === 1 ? 'producto' : 'productos'} en bodega`
      : 'Inventario'
  const descripcion = esClinica
    ? 'Lo que se usa en consulta y procedimientos; se descuenta al cerrar la historia.'
    : inventarioSeleccionado === 'ventas' && !reporteQuery.isPending
      ? [
          `Valen ${formatCurrency(resumen.valorTotalInventario || 0)} a precio de venta`,
          resumen.bajoStock ? `${formatNumber(resumen.bajoStock)} bajo el mínimo` : null,
        ].filter(Boolean).join(' · ')
      : 'Productos, insumos, servicios y compras.'

  const accionesEncabezado = (
    <div className="flex flex-wrap items-center gap-2">
      {inventarioSeleccionado === 'ventas' || activeTab === 'servicios' ? (
        <>
          <Button type="button" variant="secondary" className="h-10 px-3.5" onClick={importarInventarioHook.openImportDialog}>
            <FileSpreadsheet />
            Importar Excel
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="h-10 px-3.5"
            onClick={importarInventarioHook.exportarExcel}
            disabled={importarInventarioHook.exportando}
          >
            <Download />
            {importarInventarioHook.exportando ? 'Generando…' : 'Exportar Excel'}
          </Button>
        </>
      ) : null}
      <Button type="button" variant="secondary" className="h-10 px-3.5" onClick={facturaCompraHook.abrirNueva}>
        <ShoppingCart />
        Registrar compra
      </Button>
      {inventarioSeleccionado === 'ventas' ? (
        <Button type="button" className="h-10 px-3.5" onClick={openCreateDrawer}>
          <PackagePlus />
          Nuevo producto
        </Button>
      ) : esClinica ? (
        <Button type="button" className="h-10 px-3.5" onClick={insumosClinicosHook.openCreateDrawer}>
          <FlaskConical />
          Nuevo insumo
        </Button>
      ) : null}
    </div>
  )

  return (
    <AdminShell
      currentKey="inventario"
      title={titulo}
      description={descripcion}
      actions={accionesEncabezado}
      hideSearch
      asideNote="Aquí se concentran alertas, productos y movimientos. Lo importante es cuidar el inventario antes de afectar la caja o la consulta."
    >
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
                <div role="alert" className="rounded-xl bg-warning-soft px-4 py-3 text-sm font-medium leading-6 text-warning">
                  No fue posible cargar el resumen de inventario.
                </div>
              )}
              {productosQuery.isError && (
                <div role="alert" className="rounded-xl bg-danger-soft px-4 py-3 text-sm font-medium leading-6 text-danger">
                  No fue posible cargar la tabla de productos.
                </div>
              )}
            </div>
          )}

          <InventarioTabs activeTab={activeTab} onTabChange={handleTabClick} />

          {/* Tab: Productos — sin inventario seleccionado */}
          {activeTab === 'productos' && inventarioSeleccionado === null && (
            <DashboardPanel
              title="Elige el inventario a gestionar"
              subtitle="Selecciona Ventas o Clínica para trabajar con los datos correctos."
            >
              <div className="flex flex-col items-start gap-4 rounded-xl bg-muted px-5 py-6">
                <p className="text-sm leading-6 text-muted-foreground">
                  Cada inventario maneja sus propios productos y movimientos. Debes elegir uno para
                  continuar.
                </p>
                <Button type="button" size="lg" onClick={() => setSelectorOpen(true)}>
                  <ArrowLeftRight />
                  Elegir inventario
                </Button>
              </div>
            </DashboardPanel>
          )}

          {/* Tab: Productos — inventario de ventas */}
          {activeTab === 'productos' && inventarioSeleccionado === 'ventas' && (
            <div className="space-y-4">
              <InventarioContextBar inventario="ventas" onCambiar={() => setSelectorOpen(true)} />
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <SearchInput
                    value={buscar}
                    onChange={(valor) => { setBuscar(valor); setPaginaProductos(1) }}
                    placeholder="Buscar por nombre, lote o laboratorio"
                    ariaLabel="Buscar productos"
                    className="max-w-md flex-1"
                  />
                  <FiltroInventarioMenu
                    categoryOptions={CATEGORY_OPTIONS}
                    categoria={categoria}
                    onCategoriaChange={(value) => { setCategoria(value); setPaginaProductos(1) }}
                    bajoStock={bajoStock}
                    onBajoStockChange={() => { setBajoStock((v) => !v); setPaginaProductos(1) }}
                  />
                </div>
              </div>

              {productosQuery.isLoading ? (
                <DashboardPanel title="Productos activos">
                  <TableSkeleton rows={6} />
                </DashboardPanel>
              ) : (
                <TablaInventario
                  title="Productos activos"
                  subtitle="Lo que hay en bodega para vender, con su mínimo y su vencimiento."
                  rows={productosRows}
                  columns={[
                    {
                      key: 'nombre',
                      label: 'Producto',
                      render: (row) => (
                        <NombreProducto
                          nombre={row.nombre}
                          detalle={[row.categoria, row.raw?.laboratorio].filter(Boolean).join(' · ')}
                        />
                      ),
                    },
                    {
                      key: 'stock',
                      label: 'Cantidad / mínimo',
                      render: (row) => <CantidadMinimo stock={row.stock} stockMinimo={row.stockMinimo} />,
                    },
                    {
                      key: 'vence',
                      label: 'Vence',
                      render: (row) => <Vencimiento row={row} />,
                    },
                    {
                      key: 'costo',
                      label: 'Costo',
                      align: 'right',
                      render: (row) => (
                        <span className="whitespace-nowrap tabular-nums text-muted-foreground">
                          {formatCurrency(Number(row.raw?.precioCompra || 0))}
                        </span>
                      ),
                    },
                    {
                      key: 'precio',
                      label: 'Precio',
                      align: 'right',
                      render: (row) => (
                        <span className="whitespace-nowrap font-semibold tabular-nums">
                          {formatCurrency(Number(row.raw?.precioVenta || 0))}
                        </span>
                      ),
                    },
                    {
                      key: 'alertas',
                      label: 'Alerta',
                      render: (row) => <AlertaChips row={row} />,
                    },
                    {
                      key: 'accion',
                      label: <span className="sr-only">Acciones</span>,
                      align: 'right',
                      render: (row) => (
                        <AccionesFila
                          nombre={row.nombre}
                          acciones={[
                            (row.alertas.includes('vencido') || row.alertas.includes('proximo_vencimiento')) && {
                              label: 'Actualizar vencimiento',
                              onSelect: () => abrirRelevoVencimiento(row.raw, 'producto'),
                            },
                            { label: 'Registrar movimiento', onSelect: () => handleMovimientoClick(row.raw) },
                            { label: 'Editar', onSelect: () => openEditDrawer(row.raw) },
                            { label: 'Desactivar', onSelect: () => openConfirmDelete(row.raw), peligro: true },
                          ]}
                        />
                      ),
                    },
                  ]}
                  emptyTitle={
                    buscar.trim() || categoria !== 'todas' || bajoStock
                      ? 'No hay productos para este filtro'
                      : 'Aún no hay productos'
                  }
                  emptyBody="Ajusta la búsqueda o crea el primer producto con el botón Nuevo producto."
                />
              )}

              {/* Fase 3c: paginacion unificada */}
              <Paginacion
                pagina={productosQuery.data?.paginaActual || 1}
                paginas={productosQuery.data?.paginas || 1}
                onChange={setPaginaProductos}
              />

              <div className="grid items-start gap-4 lg:grid-cols-2">
                <section aria-labelledby="inv-movimientos" className="flex flex-col gap-3 rounded-2xl bg-card p-5">
                  <div className="flex items-center justify-between gap-3">
                    <h2 id="inv-movimientos" className="text-lg font-semibold tracking-[-0.02em] text-foreground">Últimos movimientos</h2>
                    <button type="button" onClick={() => setActiveTab('movimientos')} className={cn(ENLACE, 'text-primary')}>
                      Ver todos
                    </button>
                  </div>
                  {movimientosRows.length === 0 ? (
                    <p className="rounded-xl bg-muted px-4 py-3.5 text-sm text-muted-foreground">Aún no hay movimientos.</p>
                  ) : (
                    <ul className="flex flex-col divide-y divide-border">
                      {movimientosRows.slice(0, 5).map((m) => (
                        <li key={m.id} className="flex items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                          <span className="min-w-0">
                            <span className="block truncate text-[15px] font-semibold text-foreground">{m.producto}</span>
                            <span className="block truncate text-[13px] text-muted-foreground">
                              {[m.motivoLabel, m.fecha].filter(Boolean).join(' · ')}
                            </span>
                          </span>
                          <span className="shrink-0 text-[13px] tabular-nums text-muted-foreground">Quedan {m.cambio}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                <section aria-labelledby="inv-vencen" className="flex flex-col gap-3 rounded-2xl bg-card p-5">
                  <h2 id="inv-vencen" className="text-lg font-semibold tracking-[-0.02em] text-foreground">Vencen pronto</h2>
                  {alertsRows.filter((a) => a.tipo === 'Vencido' || a.tipo === 'Próximo a vencer').length === 0 ? (
                    <p className="rounded-xl bg-muted px-4 py-3.5 text-sm text-muted-foreground">Nada vence en los próximos días.</p>
                  ) : (
                    <ul className="flex flex-col divide-y divide-border">
                      {alertsRows
                        .filter((a) => a.tipo === 'Vencido' || a.tipo === 'Próximo a vencer')
                        .slice(0, 5)
                        .map((a) => (
                          <li key={a.id} className="flex items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                            <span className="min-w-0">
                              <span className="block truncate text-[15px] font-semibold text-foreground">{a.nombre}</span>
                              <span className="block truncate text-[13px] text-muted-foreground">
                                {[a.inventario === 'clinico' ? 'Inventario de la clínica' : 'Inventario de ventas', a.raw?.lote ? `Lote ${a.raw.lote}` : null]
                                  .filter(Boolean)
                                  .join(' · ')}
                              </span>
                            </span>
                            <button
                              type="button"
                              onClick={() => abrirRelevoVencimiento(a.raw, a.inventario === 'clinico' ? 'insumo' : 'producto')}
                              className={cn(
                                'shrink-0 whitespace-nowrap rounded-md text-[13px] font-semibold tabular-nums hover:underline',
                                FOCO,
                                a.tipo === 'Vencido' ? 'text-danger' : 'text-info'
                              )}
                              title="Actualizar vencimiento"
                            >
                              {a.tipo === 'Vencido' ? `Venció ${a.detalle}` : a.detalle}
                            </button>
                          </li>
                        ))}
                    </ul>
                  )}
                </section>
              </div>
            </div>
          )}

          {/* Tab: Productos — inventario clinico */}
          {activeTab === 'productos' && inventarioSeleccionado === 'clinica' && (
            <div className="space-y-4">
              <InventarioContextBar inventario="clinica" onCambiar={() => setSelectorOpen(true)} />
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <SearchInput
                    value={insumosClinicosHook.buscar}
                    onChange={(valor) => { insumosClinicosHook.setBuscar(valor); insumosClinicosHook.setPagina(1) }}
                    placeholder="Buscar por nombre, lote o laboratorio"
                    ariaLabel="Buscar insumos clínicos"
                    className="max-w-md flex-1"
                  />
                  <FiltroInventarioMenu
                    categoryOptions={CLINICO_CATEGORY_OPTIONS}
                    categoria={insumosClinicosHook.categoria}
                    onCategoriaChange={(value) => { insumosClinicosHook.setCategoria(value); insumosClinicosHook.setPagina(1) }}
                    bajoStock={insumosClinicosHook.bajoStock}
                    onBajoStockChange={() => { insumosClinicosHook.setBajoStock((v) => !v); insumosClinicosHook.setPagina(1) }}
                  />
                </div>
              </div>

              {insumosClinicosHook.insumosQuery.isLoading ? (
                <DashboardPanel title="Insumos clínicos">
                  <TableSkeleton rows={6} />
                </DashboardPanel>
              ) : (
                <TablaInventario
                  title="Insumos clínicos"
                  subtitle="Lo que se usa en consulta y procedimientos. No se vende: lo aplicado se descuenta al cerrar la historia clínica y queda como gasto de insumos."
                  rows={insumosClinicosHook.insumosRows}
                  columns={[
                    {
                      key: 'nombre',
                      label: 'Insumo',
                      render: (row) => (
                        <NombreProducto
                          nombre={row.nombre}
                          detalle={[row.categoria, row.raw?.laboratorio].filter(Boolean).join(' · ')}
                        />
                      ),
                    },
                    {
                      key: 'stock',
                      label: 'Cantidad / mínimo',
                      render: (row) => (
                        <CantidadMinimo stock={row.stock} stockMinimo={row.stockMinimo} unidad={row.unidadBase} />
                      ),
                    },
                    {
                      key: 'vence',
                      label: 'Vence',
                      render: (row) => <Vencimiento row={row} />,
                    },
                    {
                      key: 'costo',
                      label: 'Costo unitario',
                      align: 'right',
                      render: (row) => (
                        <span className="flex flex-col items-end gap-0.5 whitespace-nowrap tabular-nums">
                          <span className="font-semibold">
                            {formatCurrency(row.precioUnitarioBase)} / {row.unidadBase}
                          </span>
                          <span className="text-[13px] text-muted-foreground">Total {row.valor}</span>
                        </span>
                      ),
                    },
                    {
                      key: 'alertas',
                      label: 'Alerta',
                      render: (row) => <AlertaChips row={row} />,
                    },
                    {
                      key: 'accion',
                      label: <span className="sr-only">Acciones</span>,
                      align: 'right',
                      render: (row) => (
                        <AccionesFila
                          nombre={row.nombre}
                          acciones={[
                            (row.alertas.includes('vencido') || row.alertas.includes('proximo_vencimiento')) && {
                              label: 'Actualizar vencimiento',
                              onSelect: () => abrirRelevoVencimiento(row.raw, 'insumo'),
                            },
                            { label: 'Editar o comprar', onSelect: () => insumosClinicosHook.openEditDrawer(row.raw) },
                            { label: 'Desactivar', onSelect: () => insumosClinicosHook.openConfirmDelete(row.raw), peligro: true },
                          ]}
                        />
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

              <TablaInventario
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
                <SearchInput
                  value={serviciosHook.buscar}
                  onChange={(valor) => { serviciosHook.setBuscar(valor); serviciosHook.setPagina(1) }}
                  placeholder="Buscar servicio por nombre"
                  ariaLabel="Buscar servicios"
                  className="max-w-md flex-1"
                />
                <Button type="button" size="lg" className="px-4" onClick={serviciosHook.openCreateDrawer}>
                  <Plus />
                  Nuevo servicio
                </Button>
              </div>

              <TablaInventario
                title="Catálogo de servicios"
                subtitle="Al facturar un servicio se descuentan solos los insumos de su receta, si la tiene."
                rows={serviciosHook.serviciosRows}
                columns={[
                  {
                    key: 'nombre',
                    label: 'Servicio',
                    render: (row) => <NombreProducto nombre={row.nombre} detalle={row.categoria} />,
                  },
                  {
                    key: 'precioVenta',
                    label: 'Precio de venta',
                    align: 'right',
                    render: (row) => <span className="font-semibold">{row.precioVenta}</span>,
                  },
                  {
                    key: 'costoEstimado',
                    label: 'Costo estimado',
                    align: 'right',
                    render: (row) => (row.insumos > 0 ? row.costoEstimado : <span className="text-muted-foreground">—</span>),
                  },
                  {
                    key: 'insumos',
                    label: 'Insumos en receta',
                    render: (row) => (row.insumos > 0 ? row.insumos : <span className="text-muted-foreground">Sin insumos</span>),
                  },
                  {
                    key: 'accion',
                    label: 'Acciones',
                    render: (row) => (
                      <div className="flex flex-wrap gap-x-3 gap-y-1">
                        <button
                          type="button"
                          onClick={() => serviciosHook.openEditDrawer(row.raw)}
                          className={cn(ENLACE, 'text-foreground')}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => serviciosHook.openConfirmDelete(row.raw)}
                          className={cn(ENLACE, 'text-danger')}
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
              <div className="grid items-start gap-5 xl:grid-cols-[420px_minmax(0,1fr)]">
                <DashboardPanel
                  title="Registrar movimiento"
                  subtitle="Entrada, salida o ajuste sobre la cantidad de un producto."
                >
                  <form className="grid gap-4" onSubmit={submitMovementForm}>
                    <div className="grid gap-1.5">
                      <label htmlFor="mov-producto" className="text-[13px] font-semibold text-muted-foreground">
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
                        <label htmlFor="mov-tipo" className="text-[13px] font-semibold text-muted-foreground">
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
                              motivoOtro: '',
                            }))
                          }}
                          options={MOVEMENT_TYPE_OPTIONS}
                        />
                      </div>
                      <div className="grid gap-1.5">
                        <label htmlFor="mov-motivo" className="text-[13px] font-semibold text-muted-foreground">
                          Motivo
                        </label>
                        <Select
                          variant="field"
                          id="mov-motivo"
                          className="h-11"
                          value={movementForm.motivo}
                          onValueChange={(value) => setMovementForm((cur) => ({ ...cur, motivo: value, motivoOtro: '' }))}
                          options={motivosDisponibles}
                        />
                      </div>
                    </div>

                    {movementForm.motivo === 'otro' ? (
                      <div className="grid gap-1.5">
                        <label htmlFor="mov-motivo-otro" className="text-[13px] font-semibold text-muted-foreground">
                          ¿Cuál motivo? *
                        </label>
                        <input
                          id="mov-motivo-otro"
                          type="text"
                          maxLength={80}
                          value={movementForm.motivoOtro ?? ''}
                          onChange={(e) => setMovementForm((cur) => ({ ...cur, motivoOtro: e.target.value }))}
                          placeholder="Donación, préstamo a otra sede, muestra médica…"
                          className={INPUT}
                        />
                      </div>
                    ) : null}

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="grid gap-1.5">
                        <label htmlFor="mov-cantidad" className="text-[13px] font-semibold text-muted-foreground">
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
                          className={INPUT}
                        />
                      </div>
                      <div className="grid gap-1.5">
                        <label htmlFor="mov-precio" className="text-[13px] font-semibold text-muted-foreground">
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
                          className={INPUT}
                        />
                      </div>
                    </div>

                    <div className="grid gap-1.5">
                      <label htmlFor="mov-obs" className="text-[13px] font-semibold text-muted-foreground">
                        Observaciones
                      </label>
                      <textarea
                        id="mov-obs"
                        value={movementForm.observaciones}
                        onChange={(e) => setMovementForm((cur) => ({ ...cur, observaciones: e.target.value }))}
                        placeholder="Notas adicionales del movimiento"
                        className={cn(INPUT, 'h-auto min-h-[88px] py-3')}
                      />
                    </div>

                    <Button type="submit" size="lg" disabled={isPendingMovement}>
                      {isPendingMovement ? 'Registrando…' : 'Registrar movimiento'}
                    </Button>
                  </form>
                </DashboardPanel>

                <DashboardPanel
                  title="Detalle del producto"
                  subtitle="Resumen rápido y últimos movimientos del producto seleccionado."
                >
                  {selectedProduct ? (
                    <div className="grid gap-4">
                      <div className="grid gap-3 rounded-xl bg-muted px-4 py-4 text-sm text-foreground sm:grid-cols-2">
                        <div>
                          <p className="text-[13px] text-muted-foreground">Producto</p>
                          <p className="mt-1 font-semibold">{detalleProducto?.nombre || selectedProduct.nombre}</p>
                        </div>
                        <div>
                          <p className="text-[13px] text-muted-foreground">Cantidad actual</p>
                          <p className="mt-1 text-[22px] font-semibold leading-none tracking-[-0.03em] tabular-nums">{formatNumber(detalleProducto?.stock ?? selectedProduct.stock ?? 0)}</p>
                        </div>
                        <div>
                          <p className="text-[13px] text-muted-foreground">Cantidad mínima</p>
                          <p className="mt-1 tabular-nums">{formatNumber(detalleProducto?.stockMinimo ?? selectedProduct.stockMinimo ?? 0)}</p>
                        </div>
                        <div>
                          <p className="text-[13px] text-muted-foreground">Laboratorio / lote</p>
                          <p className="mt-1">{detalleProducto?.laboratorio || '-'} / {detalleProducto?.lote || '-'}</p>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-[15px] font-semibold text-foreground">Últimos movimientos del producto</h3>
                        {detalleMovimientosRows.length === 0 ? (
                          <p className="mt-2 rounded-xl bg-muted px-4 py-3.5 text-sm text-muted-foreground">
                            Este producto aún no tiene movimientos registrados.
                          </p>
                        ) : (
                          <ul className="mt-2 flex flex-col divide-y divide-border">
                            {detalleMovimientosRows.map((m) => (
                              <li key={m.id} className="flex items-center justify-between gap-3 py-2.5">
                                <span className="min-w-0">
                                  <span className="block truncate text-sm font-semibold text-foreground">{m.motivoLabel}</span>
                                  <span className="block text-[13px] text-muted-foreground">{m.tipoLabel} · {m.fecha}</span>
                                </span>
                                <span className="flex shrink-0 items-baseline gap-2 text-sm">
                                  <CambioCantidad delta={m.delta} />
                                  <span className="text-[13px] tabular-nums text-muted-foreground">queda {m.cambio}</span>
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl bg-muted px-4 py-5 text-sm leading-6 text-muted-foreground">
                      Elige un producto en el formulario para ver su cantidad y sus últimos movimientos.
                    </div>
                  )}
                </DashboardPanel>
              </div>

              {movimientosQuery.isLoading ? (
                <DashboardPanel title="Últimos movimientos" subtitle="Historial de cambios en las cantidades.">
                  <TableSkeleton rows={4} />
                </DashboardPanel>
              ) : (
                <TablaInventario
                  title="Últimos movimientos"
                  subtitle="Historial de cambios en las cantidades."
                  rows={movimientosRows}
                  columns={[
                    {
                      key: 'fecha',
                      label: 'Fecha',
                      render: (row) => <span className="whitespace-nowrap tabular-nums text-muted-foreground">{row.fecha}</span>,
                    },
                    {
                      key: 'producto',
                      label: 'Producto',
                      render: (row) => <span className="font-semibold text-foreground">{row.producto}</span>,
                    },
                    {
                      key: 'tipo',
                      label: 'Movimiento',
                      render: (row) => (
                        <span className="flex flex-wrap items-center gap-2">
                          <span className={cn('rounded-md px-2 py-0.5 text-[13px] font-semibold', TONO_TIPO[row.tipo] || 'bg-muted text-muted-foreground')}>
                            {row.tipoLabel}
                          </span>
                          <span className="text-foreground">{row.motivoLabel}</span>
                        </span>
                      ),
                    },
                    {
                      key: 'delta',
                      label: 'Cantidad',
                      align: 'right',
                      render: (row) => <CambioCantidad delta={row.delta} />,
                    },
                    {
                      key: 'cambio',
                      label: 'Queda',
                      align: 'right',
                      render: (row) => <span className="tabular-nums text-foreground">{row.cambio}</span>,
                    },
                  ]}
                  emptyTitle="Aún no hay movimientos registrados"
                  emptyBody="Cuando se creen entradas, salidas o ajustes, esta tabla mostrará lo más reciente."
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

              {/* Error de confirmar / anular / pagar */}
              {facturaCompraHook.errorAccion && (
                <div role="alert" className="flex items-start gap-3 rounded-xl bg-danger-soft px-4 py-3 text-sm font-medium leading-6 text-danger">
                  <CircleAlert className="mt-1 h-4 w-4 shrink-0" />
                  <span className="flex-1">{facturaCompraHook.errorAccion}</span>
                  <button
                    type="button"
                    onClick={facturaCompraHook.limpiarErroresAccion}
                    className={cn(ENLACE, 'shrink-0')}
                  >
                    Cerrar
                  </button>
                </div>
              )}

              {/* Banner de alertas de pago */}
              {(facturaCompraHook.alertasCompra.totalVencidas > 0 || facturaCompraHook.alertasCompra.totalProximas > 0) && (
                <div role="status" className="flex flex-wrap items-center gap-3 rounded-xl bg-warning-soft px-4 py-3 text-sm text-warning">
                  <CircleAlert className="h-4 w-4 shrink-0" />
                  <span>
                    {facturaCompraHook.alertasCompra.totalVencidas > 0 && (
                      <button
                        type="button"
                        onClick={() => { facturaCompraHook.setFiltroEstado('confirmada'); facturaCompraHook.setPagina(1) }}
                        className={cn(ENLACE, 'mr-2 text-danger')}
                      >
                        {facturaCompraHook.alertasCompra.totalVencidas} {facturaCompraHook.alertasCompra.totalVencidas === 1 ? 'factura vencida' : 'facturas vencidas'}
                      </button>
                    )}
                    {facturaCompraHook.alertasCompra.totalVencidas > 0 && facturaCompraHook.alertasCompra.totalProximas > 0 && '·'}
                    {facturaCompraHook.alertasCompra.totalProximas > 0 && (
                      <button
                        type="button"
                        onClick={() => { facturaCompraHook.setFiltroEstado('confirmada'); facturaCompraHook.setPagina(1) }}
                        className={cn(ENLACE, 'ml-2')}
                      >
                        {facturaCompraHook.alertasCompra.totalProximas} {facturaCompraHook.alertasCompra.totalProximas === 1 ? 'factura vence' : 'facturas vencen'} en los próximos 7 días
                      </button>
                    )}
                  </span>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div role="group" aria-label="Filtrar por estado" className="inline-flex gap-1 rounded-xl bg-secondary p-1">
                  {['', 'borrador', 'confirmada', 'anulada'].map((estado) => {
                    const activo = facturaCompraHook.filtroEstado === estado
                    return (
                      <button
                        key={estado}
                        type="button"
                        aria-pressed={activo}
                        onClick={() => { facturaCompraHook.setFiltroEstado(estado); facturaCompraHook.setPagina(1) }}
                        className={cn(
                          'h-9 rounded-lg px-3.5 text-sm transition',
                          FOCO,
                          activo ? 'bg-card font-semibold text-foreground' : 'font-medium text-muted-foreground hover:text-foreground'
                        )}
                      >
                        {estado === '' ? 'Todas' : estado.charAt(0).toUpperCase() + estado.slice(1)}
                      </button>
                    )
                  })}
                </div>
                <Button type="button" size="lg" className="px-4" onClick={facturaCompraHook.abrirNueva}>
                  <ShoppingCart />
                  Nueva factura de compra
                </Button>
              </div>

              {facturaCompraHook.isLoading ? (
                <DashboardPanel title="Facturas de compra">
                  <TableSkeleton rows={5} />
                </DashboardPanel>
              ) : (
                <TablaInventario
                  title="Facturas de compra"
                  subtitle="Compras a proveedores. Al confirmar una factura se suman las cantidades al inventario."
                  rows={facturaCompraHook.facturas.map((f) => {
                    const hoy = new Date()
                    const plazo = f.fechaPagoFinal ? new Date(f.fechaPagoFinal) : null
                    const enSieteDias = new Date(); enSieteDias.setDate(hoy.getDate() + 7)
                    let plazoBadge = null
                    if (f.pagada) {
                      plazoBadge = <StatusBadge variant="pagada" label={`Pagada · ${f.fechaPago}`} />
                    } else if (plazo) {
                      if (plazo < hoy) {
                        plazoBadge = <StatusBadge variant="vencida" label={`Vencida · ${f.fechaPagoFinal}`} />
                      } else if (plazo <= enSieteDias) {
                        plazoBadge = <StatusBadge variant="pendiente" label={`Vence ${f.fechaPagoFinal}`} />
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
                    { key: 'numero', label: 'N.º de factura' },
                    {
                      key: 'proveedor',
                      label: 'Proveedor',
                      render: (row) => <span className="font-semibold">{row.proveedor}</span>,
                    },
                    { key: 'fecha', label: 'Fecha' },
                    {
                      key: 'estado',
                      label: 'Estado',
                      render: (row) => (
                        <StatusBadge
                          variant={row.estado}
                          label={row.estado.charAt(0).toUpperCase() + row.estado.slice(1)}
                          className={ESTADO_COLORS[row.estado]}
                        />
                      ),
                    },
                    { key: 'plazo', label: 'Plazo de pago' },
                    { key: 'items', label: 'Ítems', align: 'right' },
                    {
                      key: 'total',
                      label: 'Total',
                      align: 'right',
                      render: (row) => <span className="whitespace-nowrap font-semibold">{row.total}</span>,
                    },
                    {
                      key: 'acciones',
                      label: 'Acciones',
                      render: (row) => (
                        <div className="flex flex-wrap gap-x-3 gap-y-1">
                          <button
                            type="button"
                            onClick={() => facturaCompraHook.abrirDetalle(row.raw)}
                            className={cn(ENLACE, 'text-foreground')}
                          >
                            Ver
                          </button>
                          {row.raw.estado === 'borrador' && (
                            <>
                              <button
                                type="button"
                                onClick={() => facturaCompraHook.abrirEditar(row.raw)}
                                className={cn(ENLACE, 'text-foreground')}
                              >
                                Editar
                              </button>
                              <button
                                type="button"
                                onClick={() => facturaCompraHook.pedirConfirmar(row.raw.id)}
                                className={cn(ENLACE, 'text-primary')}
                              >
                                Confirmar
                              </button>
                            </>
                          )}
                          {row.raw.estado === 'confirmada' && !row.raw.pagada && row.raw.fechaPagoFinal && (
                            <button
                              type="button"
                              onClick={() => facturaCompraHook.pedirPagar(row.raw.id)}
                              className={cn(ENLACE, 'text-success')}
                            >
                              Confirmar pago
                            </button>
                          )}
                          {row.raw.estado !== 'anulada' && (
                            <button
                              type="button"
                              onClick={() => facturaCompraHook.pedirAnular(row.raw.id)}
                              className={cn(ENLACE, 'text-danger')}
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
          guardarInventario(inv)
          setSelectorOpen(false)
        }}
      />

      <ActualizarVencimientoDialog
        item={relevoVencimiento?.item ?? null}
        tipo={relevoVencimiento?.tipo}
        onClose={() => setRelevoVencimiento(null)}
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

      {/* Confirmación: desactivar servicio */}
      <ConfirmDialog
        open={serviciosHook.confirmDialog.open}
        onOpenChange={(abierto) => {
          if (!abierto && !serviciosHook.isPendingDelete) serviciosHook.setConfirmDialog({ open: false, servicio: null })
        }}
        title={`Desactivar «${serviciosHook.confirmDialog.servicio?.nombre ?? ''}»`}
        description="El servicio sale del catálogo activo. Las facturas ya emitidas no cambian."
        confirmLabel={serviciosHook.isPendingDelete ? 'Desactivando…' : 'Desactivar'}
        loading={serviciosHook.isPendingDelete}
        onConfirm={serviciosHook.confirmDelete}
      />

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

      {/* Confirmación: facturas de compra */}
      <ConfirmDialog
        open={facturaCompraHook.confirmDialog.open}
        onOpenChange={(abierto) => {
          if (!abierto && !facturaCompraHook.isActuando) facturaCompraHook.cancelarAccion()
        }}
        variant={facturaCompraHook.confirmDialog.tipo === 'anular' ? 'destructive' : 'default'}
        title={
          facturaCompraHook.confirmDialog.tipo === 'confirmar'
            ? '¿Confirmar factura de compra?'
            : facturaCompraHook.confirmDialog.tipo === 'pagar'
              ? '¿Confirmar pago de esta factura?'
              : '¿Anular factura de compra?'
        }
        description={
          facturaCompraHook.confirmDialog.tipo === 'confirmar'
            ? 'Al confirmar, la cantidad de cada producto se actualizará con lo que trae esta factura. Esta acción no se puede deshacer directamente.'
            : facturaCompraHook.confirmDialog.tipo === 'pagar'
              ? 'Esta acción quedará registrada con la fecha de hoy como constancia del pago. No se puede revertir.'
              : 'Al anular una factura confirmada, las entradas registradas se devolverán con ajustes de cantidad.'
        }
        confirmLabel={
          facturaCompraHook.isActuando
            ? 'Procesando…'
            : facturaCompraHook.confirmDialog.tipo === 'confirmar'
              ? 'Sí, confirmar'
              : facturaCompraHook.confirmDialog.tipo === 'pagar'
                ? 'Sí, marcar como pagada'
                : 'Sí, anular'
        }
        loading={facturaCompraHook.isActuando}
        onConfirm={facturaCompraHook.ejecutarAccion}
      />

      {/* Confirmación: desactivar insumo clínico */}
      <ConfirmDialog
        open={insumosClinicosHook.confirmDialog.open}
        onOpenChange={(abierto) => {
          if (!abierto && !insumosClinicosHook.isPendingDelete) insumosClinicosHook.setConfirmDialog({ open: false, insumo: null })
        }}
        title={`Desactivar «${insumosClinicosHook.confirmDialog.insumo?.nombre ?? ''}»`}
        description="El insumo sale del inventario clínico activo. Los movimientos anteriores se conservan."
        confirmLabel={insumosClinicosHook.isPendingDelete ? 'Desactivando…' : 'Desactivar'}
        loading={insumosClinicosHook.isPendingDelete}
        onConfirm={insumosClinicosHook.confirmDelete}
      />

      {/* Confirmación: desactivar producto (va en un portal, sobre el drawer) */}
      <ConfirmDialog
        open={confirmDialog.open}
        onOpenChange={(abierto) => {
          if (!abierto && !isPendingDelete) setConfirmDialog({ open: false, producto: null })
        }}
        title={`Desactivar «${confirmDialog.producto?.nombre ?? ''}»`}
        description="El producto sale del inventario activo. Los movimientos anteriores se conservan."
        confirmLabel={isPendingDelete ? 'Desactivando…' : 'Desactivar'}
        loading={isPendingDelete}
        onConfirm={confirmDelete}
      />
    </AdminShell>
  )
}
