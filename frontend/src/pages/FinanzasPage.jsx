import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Ban,
  CircleAlert,
  Download,
  FileText,
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
import { useFinanzasFacturacion } from '@/features/finanzas/useFinanzasFacturacion'
import { useFinanzasHistorial, STATUS_OPTIONS, PAYMENT_FORM_OPTIONS } from '@/features/finanzas/useFinanzasHistorial'
import { useFinanzasResumen } from '@/features/finanzas/useFinanzasResumen'
import QuickSaleLayout from '@/features/finanzas/QuickSaleLayout'
import { useCajaTurno } from '@/features/caja/useCajaTurno'
import TurnoActivoPanel from '@/features/caja/TurnoActivoPanel'
import HistorialTurnosPanel from '@/features/caja/HistorialTurnosPanel'
import ReporteDescuadresPanel from '@/features/caja/ReporteDescuadresPanel'
import { EmptyState } from '@/components/shared/EmptyState'
import { hasAnyRole } from '@/lib/permissions'
import { useAuthStore } from '@/store/authStore'

const TABS = [
  { id: 'resumen', label: 'Resumen' },
  { id: 'facturacion', label: 'Facturacion' },
  { id: 'turnos', label: 'Turnos de caja' },
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
  const [activeTab, setActiveTab] = useState('facturacion')

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
  const esAdminCaja = hasAnyRole(usuario, ['admin', 'superadmin'])
  const emisionAutomaticaActiva = puedeEmitirElectronica

  const resumenHook = useFinanzasResumen({ enabled: puedeVerFinanzas })
  const historialHook = useFinanzasHistorial({ enabled: puedeVerFinanzas, puedeAnular, puedeEmitirElectronica })
  const cajaHook = useCajaTurno({ enabled: puedeVerFinanzas, esAdmin: esAdminCaja })
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
          to="/inventario"
          className="inline-flex items-center gap-2 border border-border bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Abrir inventario
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
          <div className="flex items-center justify-between border-b border-border">
            <div className="flex gap-0">
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
            {activeTab !== 'facturacion' && (
              <button
                type="button"
                onClick={() => setActiveTab('facturacion')}
                className="mr-1 inline-flex items-center gap-1.5 border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-primary/10 hover:text-primary hover:border-primary/30"
              >
                <Plus className="h-3.5 w-3.5" />
                Nueva factura
              </button>
            )}
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
            cajaHook.turnoActivoQuery.isLoading ? (
              <div className="h-40 animate-pulse rounded-[28px] border border-border bg-muted" />
            ) : !cajaHook.turnoActivo ? (
              <div className="overflow-hidden rounded-[28px] border border-border bg-card shadow-card">
                <EmptyState
                  icon={<Wallet />}
                  variant="primary"
                  title="Necesitas abrir un turno de caja para facturar"
                  description="Abre tu turno registrando el fondo inicial en efectivo desde la pestana Turnos de caja."
                  action={
                    <button
                      type="button"
                      onClick={() => setActiveTab('turnos')}
                      className="inline-flex items-center gap-2 border border-border bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                    >
                      <Wallet className="h-4 w-4" />
                      Ir a turnos de caja
                    </button>
                  }
                />
              </div>
            ) : (
              <QuickSaleLayout
                facturacionHook={facturacionHook}
                puedeConsultarInventario={puedeConsultarInventario}
                emisionAutomaticaActiva={emisionAutomaticaActiva}
              />
            )
          )}

          {/* ── Tab: Turnos de caja ── */}
          {activeTab === 'turnos' && (
            <div className="space-y-5">
              <TurnoActivoPanel cajaHook={cajaHook} />
              <HistorialTurnosPanel cajaHook={cajaHook} esAdmin={esAdminCaja} />
              {esAdminCaja ? <ReporteDescuadresPanel cajaHook={cajaHook} /> : null}
            </div>
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
                    <form onSubmit={historialHook.handleBuscar} className="flex flex-wrap items-center gap-3">
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
                      <div className="flex items-center gap-2">
                        <input
                          type="date"
                          value={historialHook.fechaInicio}
                          max={historialHook.fechaFin}
                          onChange={(event) => historialHook.cambiarRango(event.target.value, null)}
                          aria-label="Fecha inicial del filtro"
                          className="h-10 border border-border bg-card px-3 text-sm text-foreground outline-none transition focus:border-primary"
                        />
                        <span className="text-xs text-muted-foreground">a</span>
                        <input
                          type="date"
                          value={historialHook.fechaFin}
                          min={historialHook.fechaInicio}
                          onChange={(event) => historialHook.cambiarRango(null, event.target.value)}
                          aria-label="Fecha final del filtro"
                          className="h-10 border border-border bg-card px-3 text-sm text-foreground outline-none transition focus:border-primary"
                        />
                      </div>
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

                      <div className="flex items-end justify-between border border-border bg-muted px-4 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                          Total facturado
                        </p>
                        <p className="text-2xl font-bold tabular-nums text-slate-950">
                          {formatCurrency(historialHook.facturaSeleccionada.total)}
                        </p>
                      </div>

                      <dl className="grid grid-cols-2 gap-px border border-border bg-border sm:grid-cols-3">
                        <div className="bg-card px-4 py-3">
                          <dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                            Fecha
                          </dt>
                          <dd className="mt-1 text-sm font-semibold text-slate-950">
                            {formatLongDate(historialHook.facturaSeleccionada.fecha)}
                          </dd>
                        </div>
                        <div className="bg-card px-4 py-3">
                          <dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                            Pago
                          </dt>
                          <dd className="mt-1 text-sm font-semibold text-slate-950">
                            {PAYMENT_METHOD_LABELS[
                              historialHook.facturaSeleccionada.metodoPago
                            ] || 'Sin definir'}
                          </dd>
                        </div>
                        <div className="bg-card px-4 py-3">
                          <dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                            Responsable
                          </dt>
                          <dd className="mt-1 truncate text-sm font-semibold text-slate-950">
                            {historialHook.facturaSeleccionada.usuario?.nombre ||
                              'Sin usuario asignado'}
                          </dd>
                        </div>
                      </dl>

                      <div className="overflow-x-auto border border-border">
                        <table className="min-w-full divide-y divide-border text-sm">
                          <thead className="bg-muted">
                            <tr>
                              <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                                Item
                              </th>
                              <th className="px-3 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                                Cantidad
                              </th>
                              <th className="px-3 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                                Subtotal
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {(historialHook.facturaSeleccionada.items || []).map((item) => (
                              <tr key={item.id}>
                                <td className="px-3 py-3 text-foreground">{item.descripcion}</td>
                                <td className="px-3 py-3 text-right tabular-nums text-foreground">
                                  {formatNumber(item.cantidad)}
                                </td>
                                <td className="px-3 py-3 text-right tabular-nums text-foreground">
                                  {formatCurrency(item.subtotal)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="border-t border-border bg-muted">
                              <td className="px-3 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground" colSpan={2}>
                                Total
                              </td>
                              <td className="px-3 py-3 text-right font-bold tabular-nums text-slate-950">
                                {formatCurrency(historialHook.facturaSeleccionada.total)}
                              </td>
                            </tr>
                          </tfoot>
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

                      {historialHook.canRegisterPayment ? (
                        <div className="space-y-4 border-t border-border pt-4">
                          <div className="flex items-center gap-2">
                            <Wallet className="h-4 w-4 text-primary" />
                            <p className="text-sm font-semibold text-slate-950">Registrar pago</p>
                          </div>
                          <select
                            value={historialHook.pagoMetodo}
                            onChange={(event) => historialHook.setPagoMetodo(event.target.value)}
                            className="w-full border border-border bg-card px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary"
                          >
                            <option value="">Método de pago (opcional)</option>
                            <option value="efectivo">Efectivo</option>
                            <option value="transferencia">Transferencia</option>
                            <option value="nequi">Nequi</option>
                            <option value="daviplata">Daviplata</option>
                            <option value="tarjeta_debito">Tarjeta débito</option>
                            <option value="tarjeta_credito">Tarjeta crédito</option>
                            <option value="otro">Otro</option>
                          </select>
                          <button
                            type="button"
                            onClick={historialHook.handleRegistrarPago}
                            disabled={historialHook.registrarPagoMutation.isPending}
                            className="inline-flex items-center gap-2 border border-primary bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <Wallet className="h-4 w-4" />
                            {historialHook.registrarPagoMutation.isPending
                              ? 'Registrando...'
                              : 'Marcar como pagada'}
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
