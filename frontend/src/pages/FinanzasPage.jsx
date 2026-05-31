import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Ban,
  CircleAlert,
  Download,
  FileText,
  Package,
  Plus,
  Printer,
  Receipt,
  Search,
  SendHorizontal,
  ShieldCheck,
  Wallet,
  X,
} from 'lucide-react'
import AdminShell from '@/components/layout/AdminShell'
import {
  DashboardPanel,
  DataTable,
  DonutCard,
  EmptyModuleState,
  KpiCard,
  LinePanel,
  StatusPill,
} from '@/features/dashboard/dashboardComponents'
import {
  PAYMENT_METHOD_LABELS,
  formatCurrency,
  formatLongDate,
  formatNumber,
  formatShortDate,
} from '@/features/dashboard/dashboardUtils'
import { useFinanzasFacturacion, PAYMENT_METHOD_OPTIONS } from '@/features/finanzas/useFinanzasFacturacion'
import { useFinanzasHistorial, STATUS_OPTIONS, PAYMENT_FORM_OPTIONS } from '@/features/finanzas/useFinanzasHistorial'
import { useFinanzasResumen } from '@/features/finanzas/useFinanzasResumen'
import ProductSelectorDrawer from '@/features/finanzas/ProductSelectorDrawer'
import TutorSelectorDrawer from '@/features/finanzas/TutorSelectorDrawer'
import { hasAnyRole } from '@/lib/permissions'
import { useAuthStore } from '@/store/authStore'

const TABS = [
  { id: 'resumen', label: 'Resumen' },
  { id: 'facturacion', label: 'Facturacion' },
  { id: 'historial', label: 'Historial' },
]

const ESTADO_LABELS = {
  borrador: 'Borrador',
  emitida: 'Emitida',
  pagada: 'Pagada',
  anulada: 'Anulada',
}

const ESTADO_ELECTRONICO_LABELS = {
  no_aplica: 'No aplica',
  pendiente: 'Pendiente',
  enviada: 'Enviada',
  validada: 'Validada',
  rechazada: 'Rechazada',
  error: 'Error',
}

const getEstadoTone = (estado) => {
  if (estado === 'pagada') return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  if (estado === 'anulada') return 'border-red-200 bg-red-50 text-red-700'
  if (estado === 'borrador') return 'border-border bg-muted text-foreground'
  return 'border-primary/30 bg-primary/10 text-primary'
}

const getEstadoElectronicoTone = (estado) => {
  if (estado === 'validada') return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  if (estado === 'rechazada' || estado === 'error') return 'border-red-200 bg-red-50 text-red-700'
  if (estado === 'pendiente' || estado === 'enviada') return 'border-amber-200 bg-amber-50 text-amber-700'
  return 'border-border bg-muted text-foreground'
}

const formatDateTime = (value) => {
  if (!value) return 'Sin fecha'
  try {
    return new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' }).format(
      new Date(value)
    )
  } catch {
    return 'Sin fecha'
  }
}

function RestrictedFinancePage() {
  return (
    <div className="min-h-screen bg-muted">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <DashboardPanel
          title="Caja y facturacion"
          subtitle="Este modulo se muestra a perfiles operativos y administrativos autorizados."
        >
          <div className="border border-border bg-muted px-4 py-5 text-sm leading-7 text-muted-foreground">
            Tu acceso actual no tiene visibilidad financiera completa. Si necesitas revisar ingresos
            o facturas, solicita permisos al administrador principal o al facturador de la clinica.
          </div>
        </DashboardPanel>
      </div>
    </div>
  )
}

export default function FinanzasPage() {
  const usuario = useAuthStore((state) => state.usuario)
  const suscripcion = useAuthStore((state) => state.suscripcion)
  const [activeTab, setActiveTab] = useState('resumen')

  useEffect(() => {
    document.title = 'Caja y facturacion | Bourgelat'
  }, [])

  const rolPermitido = hasAnyRole(usuario, [
    'admin',
    'superadmin',
    'facturador',
    'recepcionista',
    'auxiliar',
    'veterinario',
  ])
  const funcionalidades = Array.isArray(suscripcion?.funcionalidades) ? suscripcion.funcionalidades : []
  const puedeVerFinanzas =
    rolPermitido &&
    funcionalidades.includes('facturacion_interna') &&
    funcionalidades.includes('reportes_operativos')
  const puedeConsultarInventario = puedeVerFinanzas && funcionalidades.includes('inventario')
  const puedeEmitirElectronica =
    puedeVerFinanzas &&
    funcionalidades.includes('facturacion_electronica') &&
    hasAnyRole(usuario, ['admin', 'superadmin', 'facturador'])
  const puedeAnular = hasAnyRole(usuario, ['admin', 'superadmin'])
  const emisionAutomaticaActiva = puedeEmitirElectronica

  const resumenHook = useFinanzasResumen({ enabled: puedeVerFinanzas })
  const historialHook = useFinanzasHistorial({ enabled: puedeVerFinanzas, puedeAnular, puedeEmitirElectronica })
  const facturacionHook = useFinanzasFacturacion({
    enabled: puedeVerFinanzas,
    puedeConsultarInventario,
    emisionAutomaticaActiva,
    onFacturaCreada: (facturaId) => {
      historialHook.seleccionarFactura(facturaId)
      setActiveTab('historial')
    },
  })

  if (!rolPermitido) {
    return <RestrictedFinancePage />
  }

  return (
    <AdminShell
      currentKey="finanzas"
      title="Caja y facturacion"
      description="Operacion diaria de ventas, servicios, productos y control de facturas con una lectura mas natural para recepcion, auxiliares, medicos y facturacion."
      headerBadge={
        <StatusPill tone="border-emerald-200 bg-emerald-50 text-emerald-700">
          Corte mensual activo
        </StatusPill>
      }
      actions={
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 border border-border bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Volver al dashboard
        </Link>
      }
      asideNote="Usa este modulo para buscar facturas, revisar estados, emitir electronicamente y controlar anulaciones con trazabilidad."
    >
      {!puedeVerFinanzas ? (
        <EmptyModuleState
          title="Finanzas no disponibles en el plan actual"
          body="La lectura de ingresos y facturas necesita caja activa y reportes operativos. Si quieres usar esta area como modulo fijo de gerencia, conviene subir de plan."
          ctaLabel="Revisar planes"
        />
      ) : (
        <div className="space-y-5">
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

          {/* ── Tab: Resumen ── */}
          {activeTab === 'resumen' && (
            <div className="space-y-5">
              {resumenHook.ingresosQuery.isError || resumenHook.resumenQuery.isError ? (
                <div className="grid gap-4">
                  {resumenHook.ingresosQuery.isError ? (
                    <div className="border border-amber-200 bg-amber-50 px-4 py-4 text-sm leading-7 text-amber-800">
                      No fue posible cargar el reporte de ingresos del periodo.
                    </div>
                  ) : null}
                  {resumenHook.resumenQuery.isError ? (
                    <div className="border border-red-200 bg-red-50 px-4 py-4 text-sm leading-7 text-red-700">
                      No fue posible cargar el resumen de facturas.
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div className="grid gap-4 xl:grid-cols-4">
                <KpiCard
                  icon={Wallet}
                  label="Ingresos del mes"
                  value={formatCurrency(resumenHook.totalIngresos)}
                  helper="Suma total del periodo en curso para el cierre administrativo."
                  tone="text-emerald-700"
                />
                <KpiCard
                  icon={Receipt}
                  label="Facturas emitidas"
                  value={formatNumber(resumenHook.resumenEstados.emitida?.cantidad || 0)}
                  helper="Documentos listos para cobro o seguimiento financiero."
                  tone="text-cyan-700"
                />
                <KpiCard
                  icon={ShieldCheck}
                  label="Facturas pagadas"
                  value={formatNumber(resumenHook.resumenEstados.pagada?.cantidad || 0)}
                  helper="Documentos ya cerrados dentro del periodo actual."
                  tone="text-emerald-700"
                />
                <KpiCard
                  icon={CircleAlert}
                  label="Pendientes electronicos"
                  value={formatNumber(resumenHook.pendientesElectronicos)}
                  helper="Facturas con emision pendiente, rechazada o con error tecnico."
                  tone="text-amber-700"
                />
              </div>

              <div className="grid gap-5 2xl:grid-cols-[minmax(0,1.45fr)_380px]">
                <LinePanel
                  title="Evolucion diaria del ingreso"
                  subtitle={`Lectura del ${formatShortDate(resumenHook.rangoMes.fechaInicio)} al ${formatShortDate(resumenHook.rangoMes.fechaFin)}.`}
                  data={resumenHook.ingresosPorDia}
                  dataKey="total"
                  color="#0f4c81"
                  formatter={formatCurrency}
                  emptyMessage="Aun no hay ingresos registrados para el periodo actual."
                />
                <DonutCard
                  title="Metodos de pago"
                  subtitle="Distribucion del ingreso segun la forma de pago registrada."
                  data={resumenHook.metodosPago}
                  centerLabel="Ingreso total"
                  centerValue={formatCurrency(resumenHook.totalIngresos)}
                  formatter={formatCurrency}
                  emptyMessage="No hay metodos de pago disponibles para mostrar."
                />
              </div>
            </div>
          )}

          {/* ── Tab: Facturacion ── */}
          {activeTab === 'facturacion' && (
            <>
              <div className="grid gap-5 2xl:grid-cols-[minmax(0,1.28fr)_380px]">
                <DashboardPanel
                  title="Nueva factura"
                  subtitle="Caja operativa para consultas, peluqueria, productos, procedimientos y ventas mostrador."
                  action={
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={facturacionHook.addServiceItem}
                        className="inline-flex items-center gap-2 border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-muted"
                      >
                        <Plus className="h-4 w-4" />
                        Agregar servicio
                      </button>
                      <button
                        type="button"
                        onClick={facturacionHook.handleCrearFactura}
                        disabled={facturacionHook.crearFacturaMutation.isPending}
                        className="inline-flex items-center gap-2 border border-border bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Receipt className="h-4 w-4" />
                        {facturacionHook.crearFacturaMutation.isPending ? 'Guardando...' : 'Crear factura'}
                      </button>
                    </div>
                  }
                >
                  <div className="grid gap-4">
                    {/* Tutor — fila compacta */}
                    <div className="flex items-center gap-3 border border-border bg-muted px-4 py-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-border bg-secondary text-sm font-semibold text-primary">
                        {facturacionHook.selectedOwnerData?.nombre?.charAt(0)?.toUpperCase() || (
                          <Search className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                          Tutor
                        </p>
                        <p className="truncate text-sm font-semibold text-foreground">
                          {facturacionHook.selectedOwnerData?.nombre || 'Sin tutor seleccionado'}
                        </p>
                        {facturacionHook.selectedOwnerData?.email ? (
                          <p className="truncate text-xs text-muted-foreground">
                            {facturacionHook.selectedOwnerData.email}
                          </p>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        onClick={() => facturacionHook.setTutorDrawerOpen(true)}
                        className="shrink-0 border border-border bg-card px-3 py-2 text-sm font-semibold text-foreground transition hover:bg-muted"
                      >
                        {facturacionHook.selectedOwnerData ? 'Cambiar' : 'Seleccionar'}
                      </button>
                    </div>

                    {/* Método de pago + descuento + info */}
                    <div className="grid gap-4 xl:grid-cols-3">
                      <label className="grid gap-2">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                          Metodo de pago
                        </span>
                        <select
                          value={facturacionHook.invoiceForm.metodoPago}
                          onChange={(event) =>
                            facturacionHook.setInvoiceForm((curr) => ({
                              ...curr,
                              metodoPago: event.target.value,
                            }))
                          }
                          className="h-10 border border-border bg-card px-3 text-sm text-foreground outline-none transition focus:border-primary"
                        >
                          {PAYMENT_METHOD_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="grid gap-2">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                          Descuento general
                        </span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={facturacionHook.invoiceForm.descuentoGeneral}
                          onChange={(event) =>
                            facturacionHook.setInvoiceForm((curr) => ({
                              ...curr,
                              descuentoGeneral: event.target.value,
                            }))
                          }
                          className="h-10 border border-border bg-card px-3 text-sm text-foreground outline-none transition focus:border-primary"
                        />
                      </label>
                      <div className="border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                          Emision electronica
                        </p>
                        <p className="mt-2">
                          {emisionAutomaticaActiva
                            ? 'Activa — se emite automaticamente al crear.'
                            : 'No activa en este plan. Se guarda la factura interna.'}
                        </p>
                      </div>
                    </div>

                    {/* Observaciones */}
                    <label className="grid gap-2">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        Observaciones
                      </span>
                      <textarea
                        value={facturacionHook.invoiceForm.observaciones}
                        onChange={(event) =>
                          facturacionHook.setInvoiceForm((curr) => ({
                            ...curr,
                            observaciones: event.target.value,
                          }))
                        }
                        placeholder="Notas internas o detalle del servicio prestado."
                        rows={2}
                        className="border border-border bg-card px-3 py-3 text-sm leading-6 text-foreground outline-none transition focus:border-primary"
                      />
                    </label>

                    {/* Items — tabla compacta */}
                    <div>
                      <div className="overflow-x-auto">
                        {/* Header */}
                        <div
                          className="grid min-w-[580px] border-x border-t border-border bg-muted px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground"
                          style={{ gridTemplateColumns: '108px 1fr 88px 116px 88px 36px' }}
                        >
                          <span>Tipo</span>
                          <span className="pl-2">Descripcion</span>
                          <span>Cantidad</span>
                          <span>Precio unit.</span>
                          <span>Descuento</span>
                          <span />
                        </div>
                        {/* Rows */}
                        <div className="min-w-[580px] divide-y divide-border border border-border">
                          {facturacionHook.invoiceForm.items.map((item) => (
                            <div
                              key={item.id}
                              className="grid items-center gap-1 px-3 py-2"
                              style={{ gridTemplateColumns: '108px 1fr 88px 116px 88px 36px' }}
                            >
                              <select
                                value={item.tipo}
                                onChange={(event) =>
                                  facturacionHook.updateInvoiceItem(item.id, 'tipo', event.target.value)
                                }
                                className="h-9 border border-border bg-card px-2 text-xs text-foreground outline-none focus:border-primary"
                              >
                                <option value="servicio">Servicio</option>
                                <option value="producto">Producto</option>
                              </select>
                              <input
                                type="text"
                                value={item.descripcion}
                                onChange={(event) =>
                                  facturacionHook.updateInvoiceItem(
                                    item.id,
                                    'descripcion',
                                    event.target.value
                                  )
                                }
                                placeholder="Descripcion"
                                className="h-9 border border-border bg-card px-2 text-sm text-foreground outline-none focus:border-primary"
                              />
                              <input
                                type="number"
                                min="1"
                                step={item.tipo === 'producto' ? '1' : '0.01'}
                                max={
                                  item.tipo === 'producto' && item.stock != null
                                    ? item.stock
                                    : undefined
                                }
                                title={
                                  item.tipo === 'producto' && item.stock != null
                                    ? `Stock disponible: ${item.stock}`
                                    : undefined
                                }
                                value={item.cantidad}
                                onChange={(event) =>
                                  facturacionHook.updateInvoiceItem(
                                    item.id,
                                    'cantidad',
                                    event.target.value
                                  )
                                }
                                className={`h-9 border bg-card px-2 text-sm text-foreground outline-none focus:border-primary ${
                                  item.tipo === 'producto' &&
                                  item.stock != null &&
                                  Number(item.cantidad) > item.stock
                                    ? 'border-red-400 bg-red-50 text-red-700'
                                    : 'border-border'
                                }`}
                              />
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.precioUnitario}
                                onChange={(event) =>
                                  facturacionHook.updateInvoiceItem(
                                    item.id,
                                    'precioUnitario',
                                    event.target.value
                                  )
                                }
                                className="h-9 border border-border bg-card px-2 text-sm text-foreground outline-none focus:border-primary"
                              />
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.descuento}
                                onChange={(event) =>
                                  facturacionHook.updateInvoiceItem(
                                    item.id,
                                    'descuento',
                                    event.target.value
                                  )
                                }
                                className="h-9 border border-border bg-card px-2 text-sm text-foreground outline-none focus:border-primary"
                              />
                              <button
                                type="button"
                                onClick={() => facturacionHook.removeInvoiceItem(item.id)}
                                disabled={facturacionHook.invoiceForm.items.length === 1}
                                className="flex h-9 w-9 items-center justify-center border border-border bg-card text-muted-foreground transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Botones debajo de la tabla */}
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={facturacionHook.addServiceItem}
                          className="inline-flex items-center gap-2 border border-border bg-card px-3 py-2 text-sm font-semibold text-foreground transition hover:bg-muted"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Agregar servicio
                        </button>
                        {puedeConsultarInventario ? (
                          <button
                            type="button"
                            onClick={() => facturacionHook.setProductDrawerOpen(true)}
                            className="inline-flex items-center gap-2 border border-border bg-card px-3 py-2 text-sm font-semibold text-foreground transition hover:bg-muted"
                          >
                            <Package className="h-3.5 w-3.5" />
                            Desde inventario
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </DashboardPanel>

                {/* Panel resumen del borrador */}
                <DashboardPanel
                  title="Resumen del borrador"
                  subtitle="Lectura rápida antes de crear la factura o exportar el corte financiero."
                  action={
                    <button
                      type="button"
                      onClick={historialHook.exportCurrentCut}
                      className="inline-flex items-center gap-2 border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-muted"
                    >
                      <Download className="h-4 w-4" />
                      Exportar CSV
                    </button>
                  }
                >
                  <div className="space-y-4">
                    <div className="grid gap-3">
                      <div className="flex items-center justify-between gap-4 border border-border bg-muted px-4 py-3 text-sm text-foreground">
                        <span className="font-medium text-muted-foreground">Tutor</span>
                        <span className="min-w-0 text-right font-semibold text-slate-950">
                          {facturacionHook.selectedOwnerData?.nombre || 'Pendiente de seleccionar'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-4 border border-border bg-muted px-4 py-3 text-sm text-foreground">
                        <span className="font-medium text-muted-foreground">Metodo</span>
                        <span className="min-w-0 text-right font-semibold text-slate-950">
                          {PAYMENT_METHOD_LABELS[facturacionHook.invoiceForm.metodoPago] ||
                            facturacionHook.invoiceForm.metodoPago}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-4 border border-border bg-muted px-4 py-3 text-sm text-foreground">
                        <span className="font-medium text-muted-foreground">Lineas</span>
                        <span className="font-semibold text-slate-950">
                          {formatNumber(facturacionHook.invoiceForm.items.length)}
                        </span>
                      </div>
                    </div>

                    <div className="grid gap-3">
                      <div className="flex items-center justify-between gap-4 border border-border bg-card px-4 py-3 text-sm text-foreground">
                        <span className="font-medium text-muted-foreground">Subtotal</span>
                        <span className="font-semibold text-slate-950">
                          {formatCurrency(facturacionHook.invoiceTotals.subtotal)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-4 border border-border bg-card px-4 py-3 text-sm text-foreground">
                        <span className="font-medium text-muted-foreground">Descuento general</span>
                        <span className="font-semibold text-slate-950">
                          {formatCurrency(facturacionHook.invoiceTotals.descuentoGeneral)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-4 border border-slate-900 bg-slate-950 px-4 py-3 text-sm text-slate-100">
                        <span className="font-medium text-muted-foreground">Total estimado</span>
                        <span className="font-semibold">
                          {formatCurrency(facturacionHook.invoiceTotals.total)}
                        </span>
                      </div>
                    </div>

                    <div className="border border-border bg-muted px-4 py-4 text-sm leading-7 text-muted-foreground">
                      El exportable descarga el corte actual filtrado. La creación guiada guarda la
                      factura interna y luego puedes abrirla en detalle para emisión electrónica o
                      control de anulación.
                    </div>
                  </div>
                </DashboardPanel>
              </div>

              {/* Drawers del tab de facturacion */}
              <TutorSelectorDrawer
                open={facturacionHook.tutorDrawerOpen}
                onClose={() => facturacionHook.setTutorDrawerOpen(false)}
                propietariosQuery={facturacionHook.propietariosQuery}
                ownerSearch={facturacionHook.ownerSearch}
                setOwnerSearch={facturacionHook.setOwnerSearch}
                selectedId={facturacionHook.invoiceForm.propietarioId}
                onSelect={(propietario) => {
                  facturacionHook.selectOwner(propietario)
                  facturacionHook.setTutorDrawerOpen(false)
                }}
              />

              {puedeConsultarInventario ? (
                <ProductSelectorDrawer
                  open={facturacionHook.productDrawerOpen}
                  onClose={() => facturacionHook.setProductDrawerOpen(false)}
                  productosDisponibles={facturacionHook.productosDisponibles}
                  productosQuery={facturacionHook.productosQuery}
                  productSearch={facturacionHook.productSearch}
                  setProductSearch={facturacionHook.setProductSearch}
                  barcodeInput={facturacionHook.barcodeInput}
                  setBarcodeInput={facturacionHook.setBarcodeInput}
                  onAddProduct={facturacionHook.addProductToInvoice}
                  onBarcodeScan={facturacionHook.handleBarcodeScan}
                  buscarProductoPorBarcodeMutation={facturacionHook.buscarProductoPorBarcodeMutation}
                />
              ) : null}
            </>
          )}

          {/* ── Tab: Historial ── */}
          {activeTab === 'historial' && (
            <div className="space-y-5">
              {historialHook.facturasQuery.isError || historialHook.facturaDetalleQuery.isError ? (
                <div className="grid gap-4">
                  {historialHook.facturasQuery.isError ? (
                    <div className="border border-red-200 bg-red-50 px-4 py-4 text-sm leading-7 text-red-700">
                      No fue posible cargar la tabla administrativa de facturas.
                    </div>
                  ) : null}
                  {historialHook.facturaDetalleQuery.isError ? (
                    <div className="border border-red-200 bg-red-50 px-4 py-4 text-sm leading-7 text-red-700">
                      No fue posible cargar el detalle de la factura seleccionada.
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div className="grid gap-5 2xl:grid-cols-[minmax(0,1.35fr)_380px]">
                <DataTable
                  title="Facturas del periodo"
                  subtitle="Busca por numero, cliente o responsable y abre el detalle para operar."
                  rows={historialHook.facturasRows}
                  columns={[
                    { key: 'numero', label: 'Factura' },
                    { key: 'fecha', label: 'Fecha' },
                    { key: 'cliente', label: 'Cliente' },
                    { key: 'usuario', label: 'Responsable' },
                    {
                      key: 'estado',
                      label: 'Estado',
                      render: (row) => (
                        <StatusPill tone={getEstadoTone(row.estado)}>
                          {ESTADO_LABELS[row.estado] || row.estado}
                        </StatusPill>
                      ),
                    },
                    { key: 'total', label: 'Total' },
                    {
                      key: 'acciones',
                      label: 'Acciones',
                      render: (row) => (
                        <button
                          type="button"
                          onClick={() => historialHook.seleccionarFactura(row.id)}
                          className={`border px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] ${
                            historialHook.currentFacturaId === row.id
                              ? 'border-primary/30 bg-primary/10 text-primary'
                              : 'border-border bg-card text-foreground hover:bg-muted'
                          }`}
                        >
                          {historialHook.currentFacturaId === row.id ? 'Abierta' : 'Ver detalle'}
                        </button>
                      ),
                    },
                  ]}
                  emptyTitle="Aun no hay facturas para este filtro"
                  emptyBody="Cuando haya movimiento en el estado elegido, la tabla se llenara automaticamente."
                  action={
                    <form onSubmit={historialHook.handleBuscar} className="flex flex-wrap gap-3">
                      <label className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <input
                          type="text"
                          value={historialHook.buscarInput}
                          onChange={(event) => historialHook.setBuscarInput(event.target.value)}
                          placeholder="Buscar factura o cliente"
                          className="h-10 border border-border bg-card pl-10 pr-3 text-sm text-foreground outline-none transition focus:border-primary"
                        />
                      </label>
                      <select
                        value={historialHook.estado}
                        onChange={(event) => {
                          historialHook.setEstado(event.target.value)
                          historialHook.setPagina(1)
                          historialHook.resetSeleccion()
                        }}
                        className="h-10 border border-border bg-card px-3 text-sm text-foreground outline-none transition focus:border-primary"
                      >
                        {STATUS_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <button
                        type="submit"
                        className="border border-border bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                      >
                        Buscar
                      </button>
                    </form>
                  }
                />

                <DashboardPanel
                  title="Detalle de factura"
                  subtitle="Desde aqui revisas la venta, imprimes la tirilla y solo intervienes la emision electronica si hubo pendiente o error."
                >
                  {!historialHook.currentFacturaId ? (
                    <div className="border border-dashed border-border bg-muted px-4 py-6 text-sm leading-7 text-muted-foreground">
                      Elige una factura de la tabla para abrir su detalle operativo.
                    </div>
                  ) : historialHook.facturaDetalleQuery.isLoading &&
                    !historialHook.facturaSeleccionada ? (
                    <div className="space-y-3">
                      {[0, 1, 2].map((item) => (
                        <div
                          key={item}
                          className="h-16 animate-pulse border border-border bg-muted"
                        />
                      ))}
                    </div>
                  ) : historialHook.facturaSeleccionada ? (
                    <div className="space-y-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-lg font-semibold text-slate-950">
                            {historialHook.facturaSeleccionada.numero}
                          </p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {historialHook.facturaSeleccionada.propietario?.nombre ||
                              'Sin propietario'}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={historialHook.handlePrintReceipt}
                            className="inline-flex items-center gap-2 border border-border bg-card px-3 py-2 text-sm font-semibold text-foreground transition hover:bg-muted"
                          >
                            <Printer className="h-4 w-4" />
                            Imprimir tirilla
                          </button>
                          <StatusPill
                            tone={getEstadoTone(historialHook.facturaSeleccionada.estado)}
                          >
                            {ESTADO_LABELS[historialHook.facturaSeleccionada.estado] ||
                              historialHook.facturaSeleccionada.estado}
                          </StatusPill>
                          <StatusPill
                            tone={getEstadoElectronicoTone(
                              historialHook.facturaSeleccionada.estadoElectronico
                            )}
                          >
                            {ESTADO_ELECTRONICO_LABELS[
                              historialHook.facturaSeleccionada.estadoElectronico
                            ] || historialHook.facturaSeleccionada.estadoElectronico}
                          </StatusPill>
                        </div>
                      </div>

                      <div className="grid gap-3">
                        <div className="border border-border bg-muted px-4 py-3 text-sm text-foreground">
                          Fecha:{' '}
                          <span className="font-semibold text-slate-950">
                            {formatLongDate(historialHook.facturaSeleccionada.fecha)}
                          </span>
                        </div>
                        <div className="border border-border bg-muted px-4 py-3 text-sm text-foreground">
                          Metodo de pago:{' '}
                          <span className="font-semibold text-slate-950">
                            {PAYMENT_METHOD_LABELS[
                              historialHook.facturaSeleccionada.metodoPago
                            ] || 'Sin definir'}
                          </span>
                        </div>
                        <div className="border border-border bg-muted px-4 py-3 text-sm text-foreground">
                          Responsable:{' '}
                          <span className="font-semibold text-slate-950">
                            {historialHook.facturaSeleccionada.usuario?.nombre ||
                              'Sin usuario asignado'}
                          </span>
                        </div>
                        <div className="border border-border bg-muted px-4 py-3 text-sm text-foreground">
                          Total:{' '}
                          <span className="font-semibold text-slate-950">
                            {formatCurrency(historialHook.facturaSeleccionada.total)}
                          </span>
                        </div>
                      </div>

                      <div className="overflow-x-auto border border-border">
                        <table className="min-w-full divide-y divide-border text-sm">
                          <thead className="bg-muted">
                            <tr>
                              <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                                Item
                              </th>
                              <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                                Cantidad
                              </th>
                              <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                                Precio
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {(historialHook.facturaSeleccionada.items || []).map((item) => (
                              <tr key={item.id}>
                                <td className="px-3 py-3 text-foreground">{item.descripcion}</td>
                                <td className="px-3 py-3 text-foreground">
                                  {formatNumber(item.cantidad)}
                                </td>
                                <td className="px-3 py-3 text-foreground">
                                  {formatCurrency(item.subtotal)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {historialHook.facturaSeleccionada.observaciones ? (
                        <div className="border border-border bg-muted px-4 py-4 text-sm leading-7 text-muted-foreground">
                          {historialHook.facturaSeleccionada.observaciones}
                        </div>
                      ) : null}

                      <div className="space-y-3 border-t border-border pt-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                          Estado electronico
                        </p>
                        <div className="grid gap-3">
                          <div className="border border-border bg-card px-4 py-3 text-sm text-foreground">
                            CUFE:{' '}
                            <span className="font-semibold text-slate-950">
                              {historialHook.facturaSeleccionada.cufe || 'Pendiente'}
                            </span>
                          </div>
                          <div className="border border-border bg-card px-4 py-3 text-sm text-foreground">
                            Validada en:{' '}
                            <span className="font-semibold text-slate-950">
                              {historialHook.facturaSeleccionada.fechaValidacionElectronica
                                ? formatDateTime(
                                    historialHook.facturaSeleccionada.fechaValidacionElectronica
                                  )
                                : 'Sin validacion'}
                            </span>
                          </div>
                          {historialHook.facturaSeleccionada.mensajeElectronico ? (
                            <div className="border border-border bg-muted px-4 py-4 text-sm leading-7 text-muted-foreground">
                              {historialHook.facturaSeleccionada.mensajeElectronico}
                            </div>
                          ) : null}
                          {historialHook.facturaSeleccionada.motivoAnulacion ? (
                            <div className="border border-red-200 bg-red-50 px-4 py-4 text-sm leading-7 text-red-700">
                              Motivo de anulacion:{' '}
                              {historialHook.facturaSeleccionada.motivoAnulacion}
                            </div>
                          ) : null}
                        </div>
                      </div>

                      {historialHook.canEmitInvoice ? (
                        <div className="space-y-4 border-t border-border pt-4">
                          <div className="flex items-center gap-2">
                            <SendHorizontal className="h-4 w-4 text-primary" />
                            <p className="text-sm font-semibold text-slate-950">
                              Reintentar emision electronica
                            </p>
                          </div>
                          <div className="border border-border bg-muted px-4 py-4 text-sm leading-7 text-muted-foreground">
                            La emision electronica normalmente sale automatica al crear la factura
                            cuando la clinica tiene esta funcionalidad activa. Este bloque solo
                            sirve para pendientes, rechazos o reintentos controlados.
                          </div>
                          <div className="grid gap-4 sm:grid-cols-2">
                            <label className="grid gap-2">
                              <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                                Forma de pago
                              </span>
                              <select
                                value={historialHook.emisionForm.formaPagoCodigo}
                                onChange={(event) =>
                                  historialHook.setEmisionForm((curr) => ({
                                    ...curr,
                                    formaPagoCodigo: event.target.value,
                                    fechaVencimientoPago:
                                      event.target.value === '1'
                                        ? ''
                                        : curr.fechaVencimientoPago,
                                  }))
                                }
                                className="h-10 border border-border bg-card px-3 text-sm text-foreground outline-none transition focus:border-primary"
                              >
                                {PAYMENT_FORM_OPTIONS.map((option) => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <label className="grid gap-2">
                              <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                                Vencimiento
                              </span>
                              <input
                                type="date"
                                value={historialHook.emisionForm.fechaVencimientoPago}
                                onChange={(event) =>
                                  historialHook.setEmisionForm((curr) => ({
                                    ...curr,
                                    fechaVencimientoPago: event.target.value,
                                  }))
                                }
                                disabled={historialHook.emisionForm.formaPagoCodigo !== '2'}
                                className="h-10 border border-border bg-card px-3 text-sm text-foreground outline-none transition focus:border-primary disabled:bg-muted"
                              />
                            </label>
                          </div>
                          <label className="flex items-center gap-3 border border-border bg-muted px-4 py-3 text-sm text-foreground">
                            <input
                              type="checkbox"
                              checked={historialHook.emisionForm.enviarEmail}
                              onChange={(event) =>
                                historialHook.setEmisionForm((curr) => ({
                                  ...curr,
                                  enviarEmail: event.target.checked,
                                }))
                              }
                              className="h-4 w-4 border-border text-primary focus:ring-primary"
                            />
                            Enviar email al tutor al emitir electronicamente
                          </label>
                          <button
                            type="button"
                            onClick={historialHook.handleEmitirFactura}
                            disabled={historialHook.emitirFacturaMutation.isPending}
                            className="inline-flex items-center gap-2 border border-border bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <SendHorizontal className="h-4 w-4" />
                            {historialHook.emitirFacturaMutation.isPending
                              ? 'Emitiendo...'
                              : 'Reintentar emision'}
                          </button>
                        </div>
                      ) : null}

                      {historialHook.canVoidInvoice ? (
                        <div className="space-y-4 border-t border-border pt-4">
                          <div className="flex items-center gap-2">
                            <Ban className="h-4 w-4 text-red-700" />
                            <p className="text-sm font-semibold text-slate-950">Anular factura</p>
                          </div>
                          <textarea
                            value={historialHook.motivoAnulacion}
                            onChange={(event) =>
                              historialHook.setMotivoAnulacion(event.target.value)
                            }
                            placeholder="Describe el motivo de anulacion para auditoria y control interno."
                            className="min-h-24 w-full border border-border bg-card px-3 py-3 text-sm leading-6 text-foreground outline-none transition focus:border-primary"
                          />
                          <button
                            type="button"
                            onClick={historialHook.handleAnularFactura}
                            disabled={historialHook.anularFacturaMutation.isPending}
                            className="inline-flex items-center gap-2 border border-red-200 bg-red-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <Ban className="h-4 w-4" />
                            {historialHook.anularFacturaMutation.isPending
                              ? 'Anulando...'
                              : 'Anular factura'}
                          </button>
                        </div>
                      ) : historialHook.facturaSeleccionada?.estadoElectronico === 'validada' &&
                        historialHook.facturaSeleccionada?.cufe ? (
                        <div className="border border-amber-200 bg-amber-50 px-4 py-4 text-sm leading-7 text-amber-800">
                          Esta factura ya fue validada electronicamente. No se puede anular desde
                          caja: requiere un flujo tributario controlado como nota credito.
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <div className="border border-dashed border-border bg-muted px-4 py-6 text-sm leading-7 text-muted-foreground">
                      No fue posible abrir el detalle de esta factura.
                    </div>
                  )}
                </DashboardPanel>
              </div>

              {(historialHook.facturasQuery.data?.paginas || 1) > 1 ? (
                <div className="flex flex-wrap items-center justify-between gap-3 border border-border bg-card px-5 py-4 shadow-sm">
                  <p className="text-sm text-muted-foreground">
                    Pagina {historialHook.facturasQuery.data?.paginaActual || 1} de{' '}
                    {historialHook.facturasQuery.data?.paginas || 1}
                  </p>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        historialHook.resetSeleccion()
                        historialHook.setPagina((curr) => Math.max(curr - 1, 1))
                      }}
                      disabled={(historialHook.facturasQuery.data?.paginaActual || 1) <= 1}
                      className="border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Anterior
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        historialHook.resetSeleccion()
                        historialHook.setPagina((curr) =>
                          Math.min(curr + 1, historialHook.facturasQuery.data?.paginas || 1)
                        )
                      }}
                      disabled={
                        (historialHook.facturasQuery.data?.paginaActual || 1) >=
                        (historialHook.facturasQuery.data?.paginas || 1)
                      }
                      className="border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Siguiente
                    </button>
                  </div>
                </div>
              ) : null}

              {!puedeEmitirElectronica ? (
                <div className="border border-border bg-card px-5 py-5 shadow-sm">
                  <div className="flex items-start gap-3">
                    <FileText className="mt-0.5 h-5 w-5 text-muted-foreground" />
                    <div className="text-sm leading-7 text-muted-foreground">
                      La configuracion tecnica de DIAN y Factus ya no se modifica desde la clinica.
                      Si necesitas activar o corregir la integracion, se hace desde soporte central
                      con un perfil superadmin.
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>
      )}
    </AdminShell>
  )
}
