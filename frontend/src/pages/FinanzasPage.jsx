import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { historiasApi } from '@/features/historias/historiasApi'
import {
  Boxes,
  CircleAlert,
  Download,
  FileText,
  Plus,
  Receipt,
  Search,
  ShieldCheck,
  Sparkles,
  Wallet,
  X,
} from 'lucide-react'
import AdminShell from '@/components/layout/AdminShell'
import { NavCta } from '@/components/shared/NavCta'
import {
  DashboardPanel,
  DataTable,
  DonutCard,
  KpiCard,
  LinePanel,
  StatusPill,
} from '@/features/dashboard/dashboardComponents'
import {
  formatCurrency,
  formatNumber,
  formatShortDate,
} from '@/features/dashboard/dashboardUtils'
import { useFinanzasFacturacion } from '@/features/finanzas/useFinanzasFacturacion'
import {
  useFinanzasHistorial,
  STATUS_OPTIONS,
  ESTADO_LABELS,
  getEstadoTone,
} from '@/features/finanzas/useFinanzasHistorial'
import { useFinanzasResumen } from '@/features/finanzas/useFinanzasResumen'
import PosModal from '@/features/finanzas/PosModal'
import FacturaDetalleModal from '@/features/finanzas/FacturaDetalleModal'
import GastosRentabilidadPanel from '@/features/finanzas/GastosRentabilidadPanel'
import { useCajaTurno } from '@/features/caja/useCajaTurno'
import TurnoActivoPanel from '@/features/caja/TurnoActivoPanel'
import HistorialTurnosPanel from '@/features/caja/HistorialTurnosPanel'
import ReporteDescuadresPanel from '@/features/caja/ReporteDescuadresPanel'
import { EmptyState } from '@/components/shared/EmptyState'
import { hasAnyRole } from '@/lib/permissions'
import { tieneFuncionalidad, FUNCIONALIDAD_DIAN } from '@/lib/suscripcion'
import { useAuthStore } from '@/store/authStore'
import { Select } from '@/components/ui/select'

const TABS = [
  { id: 'resumen', label: 'Resumen' },
  { id: 'facturacion', label: 'Venta' },
  { id: 'gastos', label: 'Gastos y rentabilidad' },
  { id: 'turnos', label: 'Turnos de caja' },
  { id: 'historial', label: 'Historial' },
]


function RestrictedFinancePage() {
  return (
    <div className="min-h-screen bg-muted">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <DashboardPanel
          title="Caja y facturacion"
          subtitle="Esta sección se muestra a perfiles operativos y administrativos autorizados."
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
  const location = useLocation()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('facturacion')
  const [posOpen, setPosOpen] = useState(false)
  const [ventaExitosa, setVentaExitosa] = useState(false)
  // Factura recién emitida: el POS la muestra sin salir del flujo de venta.
  const [facturaCreadaId, setFacturaCreadaId] = useState(null)

  const abrirPos = () => {
    // Sin turno de caja no se puede facturar: llevamos al guard de la pestana.
    if (!cajaHook.turnoActivo) {
      setActiveTab('facturacion')
      return
    }
    setVentaExitosa(false)
    setFacturaCreadaId(null)
    setPosOpen(true)
  }
  const cerrarPos = () => {
    setPosOpen(false)
    setVentaExitosa(false)
    setFacturaCreadaId(null)
  }

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
  // Todos los planes traen caja, facturación interna, inventario y reportes.
  // La única funcionalidad que se compra aparte es la DIAN.
  const puedeVerFinanzas = rolPermitido
  const puedeConsultarInventario = puedeVerFinanzas
  const puedeEmitirElectronica =
    puedeVerFinanzas &&
    tieneFuncionalidad(suscripcion, FUNCIONALIDAD_DIAN) &&
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
    // La venta se cierra dentro del modal (paso de vuelto), no saltamos de tab.
    onFacturaCreada: (facturaId) => {
      setFacturaCreadaId(facturaId)
      setVentaExitosa(true)
    },
  })

  // Llegada desde una historia clínica cerrada: precargamos el carrito con los
  // insumos que ya se le aplicaron al paciente y abrimos el POS.
  const historiaAFacturar = location.state?.facturarHistoriaId || null

  useEffect(() => {
    if (!historiaAFacturar || !puedeVerFinanzas) return

    let cancelado = false

    historiasApi
      .obtenerPreliquidacion(historiaAFacturar)
      .then((preliquidacion) => {
        if (cancelado) return
        facturacionHook.loadPreliquidacionHistoria(preliquidacion)
        setActiveTab('facturacion')
        if (cajaHook.turnoActivo) {
          setVentaExitosa(false)
          setPosOpen(true)
        }
      })
      .catch((error) => {
        if (cancelado) return
        toast.error(
          error?.response?.data?.message || 'No fue posible cargar los insumos de la consulta.'
        )
      })
      .finally(() => {
        // Limpiar el state evita recargar la preliquidación al volver atrás.
        if (!cancelado) navigate(location.pathname, { replace: true, state: {} })
      })

    return () => {
      cancelado = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historiaAFacturar, puedeVerFinanzas])

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
        <NavCta to="/inventario" icon={Boxes}>
          Abrir inventario
        </NavCta>
      }
      asideNote="Usa esta sección para buscar facturas, revisar estados, emitir electrónicamente y controlar anulaciones dejando historial."
    >
      {!puedeVerFinanzas ? (
        <EmptyState
          icon={<Sparkles />}
          title="Finanzas no disponibles en el plan actual"
          description="La lectura de ingresos y facturas necesita caja activa y reportes operativos. Si quieres usar esta sección de forma permanente para gerencia, conviene subir de plan."
          action={<NavCta to="/planes" icon={Sparkles}>Revisar planes</NavCta>}
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
            <button
              type="button"
              onClick={abrirPos}
              className="mr-1 inline-flex items-center gap-1.5 border border-primary bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground transition hover:bg-primary/90"
            >
              <Plus className="h-3.5 w-3.5" />
              Nueva venta
            </button>
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
                    <NavCta onClick={() => setActiveTab('turnos')} icon={Wallet}>
                      Ir a turnos de caja
                    </NavCta>
                  }
                />
              </div>
            ) : (
              <div className="flex min-h-[24rem] items-center justify-center rounded-[28px] border border-dashed border-border bg-card px-6 py-12 shadow-card">
                <div className="max-w-sm text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Receipt className="h-8 w-8" />
                  </div>
                  <h2 className="mt-5 text-xl font-bold text-foreground">Registrar una venta</h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Abre el punto de venta para armar la compra, cobrar y calcular el vuelto — todo
                    en una sola ventana.
                  </p>
                  <button
                    type="button"
                    onClick={abrirPos}
                    className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-sm transition hover:bg-primary/90"
                  >
                    <Plus className="h-4 w-4" />
                    Nueva venta
                  </button>
                  <p className="mt-4 text-[11px] text-muted-foreground">
                    Turno de caja abierto · fondo {formatCurrency(cajaHook.turnoActivo.montoInicial)}
                  </p>
                </div>
              </div>
            )
          )}

          {/* ── Tab: Gastos y rentabilidad ── */}
          {activeTab === 'gastos' && <GastosRentabilidadPanel />}

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
              {historialHook.facturasQuery.isError ? (
                <div className="border border-red-200 bg-red-50 px-4 py-4 text-sm leading-7 text-red-700">
                  No fue posible cargar la tabla administrativa de facturas.
                </div>
              ) : null}

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
                        className="border border-border bg-card px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-foreground hover:bg-muted"
                      >
                        Ver detalle
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
                    <Select
                      aria-label="Filtrar por estado"
                      value={historialHook.estado}
                      onValueChange={(value) => {
                        historialHook.setEstado(value)
                        historialHook.setPagina(1)
                        historialHook.resetSeleccion()
                      }}
                      options={STATUS_OPTIONS}
                    />
                    <button
                      type="submit"
                      className="border border-border bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                    >
                      Buscar
                    </button>
                  </form>
                }
              />

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

              <FacturaDetalleModal historialHook={historialHook} />
            </div>
          )}

        </div>
      )}

      {/* Punto de venta: modal global, disponible desde cualquier pestana
          mientras haya turno de caja abierto. */}
      {cajaHook.turnoActivo ? (
        <PosModal
          open={posOpen}
          onClose={cerrarPos}
          facturacionHook={facturacionHook}
          puedeConsultarInventario={puedeConsultarInventario}
          ventaExitosa={ventaExitosa}
          facturaCreadaId={facturaCreadaId}
          onNuevaVenta={() => {
            setVentaExitosa(false)
            setFacturaCreadaId(null)
          }}
        />
      ) : null}
    </AdminShell>
  )
}
