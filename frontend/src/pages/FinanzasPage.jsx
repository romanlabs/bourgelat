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
import GastosRentabilidadPanel, { CuentasPorCobrarPanel, GastoForm } from '@/features/finanzas/GastosRentabilidadPanel'
import ResumenFinanzasPanel from '@/features/finanzas/ResumenFinanzasPanel'
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
  const TABS = config.tabs
  const usuario = useAuthStore((state) => state.usuario)
  const suscripcion = useAuthStore((state) => state.suscripcion)
  const location = useLocation()
  const navigate = useNavigate()
  // Otra pantalla puede abrir una pestaña concreta («Ver cuentas» → Por cobrar).
  const [activeTab, setActiveTab] = useState(() =>
    config.tabs.some((tab) => tab.id === location.state?.tab) ? location.state.tab : config.tabInicial
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
        className="flex min-w-0 max-w-full gap-1 overflow-x-auto rounded-xl bg-secondary p-1"
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex h-9 shrink-0 items-center whitespace-nowrap rounded-lg px-3.5 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
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
        {esCaja && activeTab !== 'facturacion' ? (
          <button
            type="button"
            onClick={abrirPos}
            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:brightness-110 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
          {activeTab === 'resumen' && <ResumenFinanzasPanel onVerCuentas={() => setActiveTab('cobrar')} />}

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
                {/* Franja del turno: el cajero ve de un vistazo que puede cobrar. */}
                <div className="flex flex-wrap items-center justify-between gap-x-7 gap-y-2 rounded-2xl bg-card px-5 py-2.5">
                  <div className="flex flex-wrap items-center gap-x-7 gap-y-2 text-sm">
                    <span className="flex items-center gap-2 font-semibold text-success">
                      <span aria-hidden className="h-2 w-2 rounded-full bg-success" />
                      Turno abierto
                    </span>
                    <span className="text-muted-foreground">
                      Fondo{' '}
                      <span className="font-semibold tabular-nums text-foreground">
                        {formatCurrency(cajaHook.turnoActivo.montoInicial)}
                      </span>
                    </span>
                    <span className="text-muted-foreground">
                      Ventas en efectivo{' '}
                      <span className="font-semibold tabular-nums text-foreground">
                        {formatCurrency(cajaHook.turnoActivo.totalVentasEfectivo || 0)}
                      </span>
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('turnos')}
                    className="inline-flex h-9 items-center px-3.5 rounded-lg bg-secondary text-sm font-semibold text-secondary-foreground transition hover:brightness-95 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    Ver turno de caja
                  </button>
                </div>

                {/* Punto de venta en la página: llena el alto disponible y deja
                    ver el turno arriba. En celular alterna productos y cuenta. */}
                <div className="h-[calc(100dvh-11rem)] min-h-[480px]">
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
          {activeTab === 'cobrar' && <CuentasPorCobrarPanel />}

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
                action={
                  <form onSubmit={historialHook.handleBuscar} className="flex flex-wrap items-center gap-3">
                    <label className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <input
                        type="text"
                        value={historialHook.buscarInput}
                        onChange={(event) => historialHook.setBuscarInput(event.target.value)}
                        placeholder="Buscar factura o cliente"
                        aria-label="Buscar factura o cliente"
                        className="h-10 rounded-lg border border-input bg-card text-sm text-foreground outline-none transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring pl-10 pr-3"
                      />
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="date"
                        value={historialHook.fechaInicio}
                        max={historialHook.fechaFin}
                        onChange={(event) => historialHook.cambiarRango(event.target.value, null)}
                        aria-label="Fecha inicial del filtro"
                        className="h-10 rounded-lg border border-input bg-card text-sm text-foreground outline-none transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring px-3 tabular-nums"
                      />
                      <span className="text-sm text-muted-foreground">a</span>
                      <input
                        type="date"
                        value={historialHook.fechaFin}
                        min={historialHook.fechaInicio}
                        onChange={(event) => historialHook.cambiarRango(null, event.target.value)}
                        aria-label="Fecha final del filtro"
                        className="h-10 rounded-lg border border-input bg-card text-sm text-foreground outline-none transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring px-3 tabular-nums"
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
                      className="inline-flex h-10 items-center px-4 rounded-lg bg-secondary text-sm font-semibold text-secondary-foreground transition hover:brightness-95 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      Buscar
                    </button>
                  </form>
                }
              />

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
                      className="inline-flex h-10 items-center px-4 rounded-lg bg-secondary text-sm font-semibold text-secondary-foreground transition hover:brightness-95 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
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
                      className="inline-flex h-10 items-center px-4 rounded-lg bg-secondary text-sm font-semibold text-secondary-foreground transition hover:brightness-95 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
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
