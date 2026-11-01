import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { historiasApi } from '@/features/historias/historiasApi'
import { estilosApi } from '@/features/estilos/estilosApi'
import {
  FileText,
  Plus,
  Search,
  Sparkles,
  Wallet,
} from 'lucide-react'
import AdminShell from '@/components/layout/AdminShell'
import { NavCta } from '@/components/shared/NavCta'
import {
  DashboardPanel,
  DataTable,
  StatusPill,
} from '@/features/dashboard/dashboardComponents'
import { formatCurrency } from '@/features/dashboard/dashboardUtils'
import { useFinanzasFacturacion } from '@/features/finanzas/useFinanzasFacturacion'
import {
  useFinanzasHistorial,
  STATUS_OPTIONS,
  ESTADO_LABELS,
  getEstadoTone,
} from '@/features/finanzas/useFinanzasHistorial'
import PosModal from '@/features/finanzas/PosModal'
import FacturaDetalleModal from '@/features/finanzas/FacturaDetalleModal'
import GastosRentabilidadPanel, { GastoForm } from '@/features/finanzas/GastosRentabilidadPanel'
import PorCobrarPanel from '@/features/finanzas/PorCobrarPanel'
import ResumenFinanzasPanel from '@/features/finanzas/ResumenFinanzasPanel'
import MediosPagoPanel from '@/features/finanzas/MediosPagoPanel'
import { useCajaTurno } from '@/features/caja/useCajaTurno'
import TurnoActivoPanel from '@/features/caja/TurnoActivoPanel'
import HistorialTurnosPanel from '@/features/caja/HistorialTurnosPanel'
import TurnosVencidosPanel from '@/features/caja/TurnosVencidosPanel'
import ReporteDescuadresPanel from '@/features/caja/ReporteDescuadresPanel'
import { EmptyState } from '@/components/shared/EmptyState'
import { canAccessModule, hasAnyRole } from '@/lib/permissions'
import { tieneFuncionalidad, FUNCIONALIDAD_DIAN } from '@/lib/suscripcion'
import { useAuthStore } from '@/store/authStore'
import { Select } from '@/components/ui/select'

// Caja es el trabajo diario de recepción (vender, turno, ventas hechas);
// Finanzas es la lectura del mes para administración.
const MODOS = {
  caja: {
    moduleKey: 'caja',
    titulo: 'Caja',
    tabInicial: 'facturacion',
    tabs: [
      { id: 'facturacion', label: 'Venta' },
      { id: 'turnos', label: 'Turno de caja' },
      { id: 'historial', label: 'Historial de ventas' },
      // Fiado: recepción recibe los abonos (el backend se lo permite).
      { id: 'cobrar', label: 'Por cobrar' },
    ],
  },
  finanzas: {
    moduleKey: 'finanzas',
    titulo: 'Finanzas',
    tabInicial: 'resumen',
    tabs: [
      { id: 'resumen', label: 'Resumen' },
      // Dónde entra la plata: solo administración (cruza con los gastos).
      { id: 'medios', label: 'Medios de pago', soloAdmin: true },
      { id: 'gastos', label: 'Gastos' },
      { id: 'cobrar', label: 'Por cobrar' },
    ],
  },
}


function RestrictedFinancePage() {
  return (
    <div className="min-h-screen bg-muted">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <DashboardPanel
          title="Caja y facturación"
          subtitle="Esta sección se muestra a perfiles operativos y administrativos autorizados."
        >
          <div className="rounded-xl bg-muted px-4 py-5 text-sm leading-7 text-muted-foreground">
            Tu acceso actual no tiene visibilidad financiera completa. Si necesitas revisar ingresos
            o facturas, solicita permisos al administrador principal o al facturador de la clínica.
          </div>
        </DashboardPanel>
      </div>
    </div>
  )
}

export default function FinanzasPage({ modo = 'caja' }) {
  const config = MODOS[modo] || MODOS.caja
  const esCaja = config.moduleKey === 'caja'
  const usuario = useAuthStore((state) => state.usuario)
  const esAdmin = hasAnyRole(usuario, ['admin', 'superadmin'])
  const TABS = config.tabs.filter((tab) => !tab.soloAdmin || esAdmin)
  const suscripcion = useAuthStore((state) => state.suscripcion)
  const location = useLocation()
  const navigate = useNavigate()
  // Otra pantalla puede abrir una pestaña concreta («Ver cuentas» → Por cobrar).
  const [activeTab, setActiveTab] = useState(() =>
    TABS.some((tab) => tab.id === location.state?.tab) ? location.state.tab : config.tabInicial
  )
  const [ventaExitosa, setVentaExitosa] = useState(false)
  // Factura recién emitida: el POS la muestra sin salir del flujo de venta.
  const [facturaCreadaId, setFacturaCreadaId] = useState(null)

  // La venta vive en la pestaña Venta: «Nueva venta» desde otra pestaña lleva
  // allá. Sin turno abierto, esa pestaña muestra cómo abrirlo.
  const abrirPos = () => {
    setActiveTab('facturacion')
  }

  useEffect(() => {
    document.title = `${config.titulo} | Bourgelat`
  }, [config.titulo])

  const rolPermitido = canAccessModule(usuario, config.moduleKey)
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

  // Cada módulo pide solo sus datos.
  const historialHook = useFinanzasHistorial({ enabled: puedeVerFinanzas && esCaja, puedeAnular, puedeEmitirElectronica })
  const cajaHook = useCajaTurno({ enabled: puedeVerFinanzas && esCaja, esAdmin: esAdminCaja })
  const facturacionHook = useFinanzasFacturacion({
    enabled: puedeVerFinanzas && esCaja,
    puedeConsultarInventario,
    emisionAutomaticaActiva,
    // La venta se cierra dentro del punto de venta (paso de vuelto), no saltamos de tab.
    onFacturaCreada: (facturaId) => {
      setFacturaCreadaId(facturaId)
      setVentaExitosa(true)
    },
  })

  // Llegada desde una historia clínica cerrada: precargamos el carrito con los
  // insumos que ya se le aplicaron al paciente y abrimos el POS.
  const historiaAFacturar = location.state?.facturarHistoriaId || null

  useEffect(() => {
    if (!historiaAFacturar || !puedeVerFinanzas || !esCaja) return

    let cancelado = false

    historiasApi
      .obtenerPreliquidacion(historiaAFacturar)
      .then((preliquidacion) => {
        if (cancelado) return
        facturacionHook.loadPreliquidacionHistoria(preliquidacion)
        setVentaExitosa(false)
        setActiveTab('facturacion')
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

  // Llegada desde un registro de estilos ya editable (no bloqueado): igual
  // que la historia clinica, pero aqui no hay insumos que precargar — el
  // cajero elige el servicio del catalogo y el vinculo lo hace
  // registroEstiloId al crear la factura.
  const estiloAFacturar = location.state?.facturarEstiloId || null

  useEffect(() => {
    if (!estiloAFacturar || !puedeVerFinanzas || !esCaja) return

    let cancelado = false

    estilosApi
      .obtenerPreliquidacion(estiloAFacturar)
      .then((preliquidacion) => {
        if (cancelado) return
        facturacionHook.loadPreliquidacionEstilo(preliquidacion)
        setVentaExitosa(false)
        setActiveTab('facturacion')
      })
      .catch((error) => {
        if (cancelado) return
        toast.error(
          error?.response?.data?.message || 'No fue posible cargar el servicio de estilos.'
        )
      })
      .finally(() => {
        // Limpiar el state evita recargar la preliquidacion al volver atras.
        if (!cancelado) navigate(location.pathname, { replace: true, state: {} })
      })

    return () => {
      cancelado = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estiloAFacturar, puedeVerFinanzas])

  // Filtros del historial de ventas: los mismos en la tabla (escritorio) y en
  // la lista de tarjetas (celular), donde ocupan todo el ancho.
  const filtrosHistorial = (
    <form onSubmit={historialHook.handleBuscar} className="flex flex-wrap items-center gap-3">
      <label className="relative w-full lg:w-auto">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={historialHook.buscarInput}
          onChange={(event) => historialHook.setBuscarInput(event.target.value)}
          placeholder="Buscar factura o cliente"
          aria-label="Buscar factura o cliente"
          className="h-11 w-full rounded-lg border border-input bg-card text-base text-foreground outline-none transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring pl-10 pr-3 lg:h-10 lg:w-auto lg:text-sm"
        />
      </label>
      <div className="flex w-full items-center gap-2 lg:w-auto">
        <input
          type="date"
          value={historialHook.fechaInicio}
          max={historialHook.fechaFin}
          onChange={(event) => historialHook.cambiarRango(event.target.value, null)}
          aria-label="Fecha inicial del filtro"
          className="h-11 min-w-0 flex-1 rounded-lg border border-input bg-card text-base text-foreground outline-none transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring px-3 tabular-nums lg:h-10 lg:min-w-[auto] lg:flex-initial lg:text-sm"
        />
        <span className="text-sm text-muted-foreground">a</span>
        <input
          type="date"
          value={historialHook.fechaFin}
          min={historialHook.fechaInicio}
          onChange={(event) => historialHook.cambiarRango(null, event.target.value)}
          aria-label="Fecha final del filtro"
          className="h-11 min-w-0 flex-1 rounded-lg border border-input bg-card text-base text-foreground outline-none transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring px-3 tabular-nums lg:h-10 lg:min-w-[auto] lg:flex-initial lg:text-sm"
        />
      </div>
      <Select
        aria-label="Filtrar por estado"
        className="h-11 min-w-0 flex-1 lg:h-10 lg:min-w-[auto] lg:flex-initial"
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
        className="inline-flex h-11 items-center px-4 rounded-lg bg-secondary text-sm font-semibold text-secondary-foreground transition hover:brightness-95 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:h-10"
      >
        Buscar
      </button>
    </form>
  )

  if (!rolPermitido) {
    return <RestrictedFinancePage />
  }

  return (
    <AdminShell
      currentKey={config.moduleKey}
      title={config.titulo}
      // En Venta el punto de venta necesita el alto: encabezado compacto, sin
      // frase ni etiqueta.
      // Caja es de uso continuo: título corto, pestañas y una sola acción en la
      // misma fila (sin frase, buscador global ni atajo a inventario).
      // Las dos pantallas usan encabezado compacto: título, pestañas y acción en
      // una fila. En Finanzas la cifra del periodo hace de titular.
      compactHeader
      hideSearch
      titleAside={
      <div
        role="tablist"
        aria-label="Secciones de caja y facturación"
        className="flex min-w-0 max-w-full gap-1 overflow-x-auto rounded-xl bg-secondary p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex h-11 shrink-0 items-center whitespace-nowrap rounded-lg px-3.5 text-sm transition lg:h-9 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              activeTab === tab.id
                ? 'bg-card font-semibold text-foreground'
                : 'font-medium text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      }
      actions={
        <div className="flex flex-wrap items-center gap-2">
        {/* En Venta el turno se ve como etiqueta en el encabezado: el punto de
            venta gana el alto y la pestaña Turno de caja ya lleva al detalle. */}
        {esCaja && activeTab === 'facturacion' && cajaHook.turnoActivo && !cajaHook.turnoActivo.vencido ? (
          <button
            type="button"
            onClick={() => setActiveTab('turnos')}
            title="Ver el turno de caja"
            className="inline-flex h-11 max-w-full items-center gap-x-3 whitespace-nowrap rounded-lg bg-card px-3.5 text-[13px] text-muted-foreground transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:h-10"
          >
            <span className="flex items-center gap-1.5 font-semibold text-success">
              <span aria-hidden className="h-2 w-2 rounded-full bg-success" />
              Turno abierto
            </span>
            {/* En celular no cabe todo en la fila: el fondo se ve en Turno de caja. */}
            <span className="hidden sm:inline">
              Fondo <span className="font-semibold tabular-nums text-foreground">{formatCurrency(cajaHook.turnoActivo.montoInicial)}</span>
            </span>
            <span>
              Efectivo <span className="font-semibold tabular-nums text-foreground">{formatCurrency(cajaHook.turnoActivo.totalVentasEfectivo || 0)}</span>
            </span>
          </button>
        ) : null}
        {esCaja && activeTab !== 'facturacion' ? (
          <button
            type="button"
            onClick={abrirPos}
            className="inline-flex h-11 shrink-0 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:brightness-110 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 lg:h-10"
          >
            <Plus className="h-4 w-4" />
            Nueva venta
          </button>
        ) : null}
        </div>
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
          {/* ── Tab: Resumen ── */}
          {activeTab === 'resumen' && (
            <ResumenFinanzasPanel onVerCuentas={() => setActiveTab('cobrar')} onVerMedios={() => setActiveTab('medios')} />
          )}

          {/* ── Tab: Medios de pago ── */}
          {activeTab === 'medios' && esAdmin && <MediosPagoPanel />}

          {/* ── Tab: Facturacion ── */}
          {activeTab === 'facturacion' && (
            cajaHook.turnoActivoQuery.isLoading ? (
              <div className="h-40 animate-pulse rounded-2xl bg-card" />
            ) : !cajaHook.turnoActivo ? (
              <div className="overflow-hidden rounded-2xl bg-card">
                <EmptyState
                  icon={<Wallet />}
                  variant="primary"
                  title="Necesitas abrir un turno de caja para facturar"
                  description="Abre tu turno registrando el fondo inicial en efectivo desde la pestaña Turnos de caja."
                  action={
                    <NavCta onClick={() => setActiveTab('turnos')} icon={Wallet}>
                      Ir a turnos de caja
                    </NavCta>
                  }
                />
              </div>
            ) : cajaHook.turnoActivo.vencido ? (
              <div className="overflow-hidden rounded-2xl bg-warning-soft">
                <EmptyState
                  icon={<Wallet />}
                  variant="primary"
                  title="Tu turno de caja quedó abierto desde un día anterior"
                  description="No puedes facturar hasta cerrarlo. Ve a Turnos de caja, cuenta el efectivo y ciérralo: así el corte del día queda correcto."
                  action={
                    <NavCta onClick={() => setActiveTab('turnos')} icon={Wallet}>
                      Cerrar turno vencido
                    </NavCta>
                  }
                />
              </div>
            ) : (
              <div className="space-y-3">
                {/* Punto de venta en la página: en escritorio llena el alto
                    disponible; en celular crece con el contenido y la página
                    hace scroll (la cuenta va fija abajo). */}
                <div className="lg:h-[calc(100dvh-8rem)] lg:min-h-[480px]">
                  <PosModal
                    embedded
                    open
                    onClose={() => {}}
                    facturacionHook={facturacionHook}
                    puedeConsultarInventario={puedeConsultarInventario}
                    ventaExitosa={ventaExitosa}
                    facturaCreadaId={facturaCreadaId}
                    onNuevaVenta={() => {
                      setVentaExitosa(false)
                      setFacturaCreadaId(null)
                    }}
                  />
                </div>
              </div>
            )
          )}

          {/* ── Tab: Gastos y rentabilidad ── */}
          {activeTab === 'gastos' && <GastosRentabilidadPanel />}

          {/* ── Tab: Por cobrar (fiado y abonos) ── */}
          {activeTab === 'cobrar' && <PorCobrarPanel />}

          {/* ── Tab: Turnos de caja ── */}
          {activeTab === 'turnos' && (
            <div className="space-y-5">
              <TurnoActivoPanel cajaHook={cajaHook} />
              {/* Gasto pagado desde la caja (o por otro medio): lo registra quien
                  lleva el turno; el listado completo de gastos está en Finanzas. */}
              <section aria-labelledby="caja-gasto" className="rounded-2xl bg-card p-5">
                <h2 id="caja-gasto" className="mb-3 text-lg font-semibold tracking-[-0.02em] text-foreground">Registrar gasto</h2>
                <GastoForm />
              </section>
              {esAdminCaja ? <TurnosVencidosPanel cajaHook={cajaHook} /> : null}
              <HistorialTurnosPanel cajaHook={cajaHook} esAdmin={esAdminCaja} />
              {esAdminCaja ? <ReporteDescuadresPanel cajaHook={cajaHook} /> : null}
            </div>
          )}

          {/* ── Tab: Historial ── */}
          {activeTab === 'historial' && (
            <div className="space-y-5">
              {historialHook.facturasQuery.isError ? (
                <div className="rounded-xl bg-danger-soft px-4 py-4 text-sm leading-6 text-danger">
                  No fue posible cargar la lista de facturas.
                </div>
              ) : null}

              <div className="hidden lg:block">
              <DataTable
                title="Facturas del periodo"
                subtitle="Busca por número, cliente o responsable y abre el detalle para operar."
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
                        className="inline-flex h-9 items-center px-3 rounded-lg bg-secondary text-sm font-semibold text-secondary-foreground transition hover:brightness-95 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring text-[13px]"
                      >
                        Ver detalle
                      </button>
                    ),
                  },
                ]}
                emptyTitle="Aún no hay facturas para este filtro"
                emptyBody="Cuando haya movimiento en el estado elegido, la tabla se llenará automáticamente."
                action={filtrosHistorial}
              />
              </div>

              {/* Celular: cada factura es una tarjeta que abre su detalle. */}
              <section aria-labelledby="historial-movil" className="overflow-hidden rounded-2xl bg-card lg:hidden">
                <div className="space-y-3 border-b border-border px-4 pb-4 pt-5">
                  <div>
                    <h2 id="historial-movil" className="text-lg font-semibold tracking-[-0.01em] text-card-foreground">Facturas del periodo</h2>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">Busca por número o cliente y toca una para ver el detalle.</p>
                  </div>
                  {filtrosHistorial}
                </div>
                {historialHook.facturasRows.length ? (
                  <ul className="divide-y divide-border">
                    {historialHook.facturasRows.map((row) => (
                      <li key={row.id}>
                        <button
                          type="button"
                          onClick={() => historialHook.seleccionarFactura(row.id)}
                          className="flex min-h-[64px] w-full items-start justify-between gap-3 px-4 py-3.5 text-left transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                        >
                          <span className="flex min-w-0 flex-col gap-1">
                            <span className="flex flex-wrap items-center gap-2">
                              <span className="text-[15px] font-semibold text-foreground">{row.numero}</span>
                              <StatusPill tone={getEstadoTone(row.estado)}>
                                {ESTADO_LABELS[row.estado] || row.estado}
                              </StatusPill>
                            </span>
                            <span className="truncate text-[13px] text-muted-foreground">
                              {row.cliente} · <span className="tabular-nums">{row.fecha}</span>
                            </span>
                            <span className="truncate text-[13px] text-muted-foreground">{row.usuario}</span>
                          </span>
                          <span className="shrink-0 text-[15px] font-semibold tabular-nums text-foreground">{row.total}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="p-4">
                    <div className="rounded-xl bg-muted px-4 py-5">
                      <p className="text-sm font-semibold text-card-foreground">Aún no hay facturas para este filtro</p>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        Cuando haya movimiento en el estado elegido, la lista se llenará automáticamente.
                      </p>
                    </div>
                  </div>
                )}
              </section>

              {(historialHook.facturasQuery.data?.paginas || 1) > 1 ? (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-card px-5 py-4">
                  <p className="text-sm tabular-nums text-muted-foreground">
                    Página {historialHook.facturasQuery.data?.paginaActual || 1} de{' '}
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
                      className="inline-flex h-11 items-center px-4 rounded-lg bg-secondary text-sm font-semibold text-secondary-foreground transition hover:brightness-95 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 lg:h-10"
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
                      className="inline-flex h-11 items-center px-4 rounded-lg bg-secondary text-sm font-semibold text-secondary-foreground transition hover:brightness-95 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 lg:h-10"
                    >
                      Siguiente
                    </button>
                  </div>
                </div>
              ) : null}

              {!puedeEmitirElectronica ? (
                <div className="rounded-2xl bg-card px-5 py-5">
                  <div className="flex items-start gap-3">
                    <FileText className="mt-0.5 h-5 w-5 text-muted-foreground" />
                    <div className="text-sm leading-6 text-muted-foreground">
                      La configuración técnica de la facturación electrónica ya no se modifica desde la clínica.
                      Si necesitas activar o corregir la integración, se hace desde soporte central
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

    </AdminShell>
  )
}
