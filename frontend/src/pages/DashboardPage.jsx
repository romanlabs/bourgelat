import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BarChart3,
  Boxes,
  CalendarClock,
  CalendarX,
  CircleAlert,
  FileText,
  LayoutDashboard,
  PawPrint,
  Receipt,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  UserX,
  Users,
  Wallet,
} from 'lucide-react'
import AdminShell from '@/components/layout/AdminShell'
import { NavCta, NavCtaLink } from '@/components/shared/NavCta'
import { EmptyState } from '@/components/shared/EmptyState'
import { ALL_QUICK_ACTIONS } from '@/components/layout/quickActions'
import { agendaApi } from '@/features/agenda/agendaApi'
import { dashboardApi } from '@/features/dashboard/dashboardApi'
import {
  BarPanel,
  DashboardPanel,
  DataTable,
  DonutCard,
  KpiCard,
  KpiGrid,
  LinePanel,
  StatusPill,
} from '@/features/dashboard/dashboardComponents'
import {
  CITA_ESTADO_LABELS,
  CITA_TIPO_LABELS,
  PAYMENT_METHOD_LABELS,
  PLAN_META,
  formatCurrency,
  formatLongDate,
  formatNumber,
  formatShortDate,
  getCurrentMonthRange,
  getFeatureStateRows,
  getUsagePercentage,
  mapIngresosPorDia,
  objectToChartData,
  toNumber,
} from '@/features/dashboard/dashboardUtils'
import { finanzasApi } from '@/features/finanzas/finanzasApi'
import { hasAnyRole } from '@/lib/permissions'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'

const TABS = [
  { id: 'resumen', label: 'Resumen del día', icon: LayoutDashboard },
  { id: 'agenda', label: 'Agenda', icon: CalendarClock },
  { id: 'ingresos', label: 'Caja', icon: Wallet },
  { id: 'inventario', label: 'Inventario', icon: Boxes },
  { id: 'pacientes', label: 'Pacientes', icon: PawPrint },
  { id: 'plan', label: 'Plan y control', icon: ShieldCheck },
]


const EMPTY_LIST = []
const EMPTY_RECORD = {}
const PRIMARY_BUTTON =
  'inline-flex items-center gap-2 rounded-xl bg-primary px-3.5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90'
const SECONDARY_BUTTON =
  'inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm font-semibold text-foreground transition hover:bg-muted'

const MODULE_ICONS = {
  '/agenda': CalendarClock,
  '/finanzas': Wallet,
  '/inventario': Boxes,
  '/pacientes': PawPrint,
}

function OpenModuleButton({ to, label }) {
  return (
    <div className="flex justify-end">
      <NavCta to={to} icon={MODULE_ICONS[to]}>
        {label}
      </NavCta>
    </div>
  )
}

const serializeDate = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message || error?.message || fallback


const formatTime = (value) => {
  if (!value) return 'Sin hora'
  return String(value).slice(0, 5)
}

const getAppointmentTone = (estado) => {
  if (estado === 'completada') return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  if (estado === 'en_espera') return 'border-sky-200 bg-sky-50 text-sky-700'
  if (estado === 'cancelada' || estado === 'no_asistio') {
    return 'border-red-200 bg-red-50 text-red-700'
  }
  return 'border-amber-200 bg-amber-50 text-amber-700'
}

const buildCapacityChart = (used, limit, label) => {
  if (limit === null || limit === undefined) {
    return {
      centerValue: 'Sin limite',
      rows: [{ key: 'abierto', name: label, value: 1, color: '#0d9488' }],
    }
  }

  return {
    centerValue: `${getUsagePercentage(used, limit)}%`,
    rows: [
      { key: 'en_uso', name: 'En uso', value: used, color: '#0f766e' },
      { key: 'disponible', name: 'Disponible', value: Math.max(limit - used, 0), color: '#cbd5e1' },
    ],
  }
}

const buildHistoryHref = (appointment) =>
  appointment?.mascota?.id
    ? `/pacientes/${appointment.mascota.id}/historial`
    : '/pacientes'

const buildBillingHref = (appointment) =>
  `/finanzas?propietarioId=${appointment?.propietario?.id || ''}&mascotaId=${appointment?.mascota?.id || ''}&citaId=${appointment?.id || ''}`

function CommandPanel({ title, subtitle, action, className = '', children }) {
  return (
    <section className={cn('overflow-hidden rounded-2xl border border-border bg-card shadow-card', className)}>
      <div className="flex flex-col gap-3 border-b border-border px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{title}</p>
          {subtitle ? <p className="mt-2 text-sm leading-6 text-muted-foreground">{subtitle}</p> : null}
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </section>
  )
}

/**
 * Bloque unico del dia: primero lo que puede romper la operacion (alertas
 * urgentes) y debajo el pulso compacto de hoy. A diferencia de la tira tactica
 * anterior, se renderiza siempre, porque aunque no haya alertas el resumen del
 * dia sigue siendo la razon de ser del Command Center.
 */
function TodayAlerts({ alerts, summary }) {
  const hayAlertas = alerts.length > 0
  const chips = summary.filter(Boolean)

  return (
    <section
      className={cn(
        'overflow-hidden rounded-xl border',
        hayAlertas ? 'border-destructive/30 bg-destructive/5' : 'border-border bg-card shadow-card'
      )}
    >
      {hayAlertas ? (
        <div className="px-4 py-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
              <ShieldAlert className="h-3.5 w-3.5" />
            </span>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-destructive">
              Requiere acción hoy
            </p>
          </div>

          <div className="mt-3 flex flex-wrap gap-2.5">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className="flex min-w-[260px] flex-1 items-center gap-3 rounded-lg border border-destructive/20 bg-card/80 px-3.5 py-2.5"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold text-destructive">{alert.title}</p>
                    <span className="shrink-0 rounded-full border border-destructive/30 bg-destructive/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-destructive">
                      Urgente
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-destructive/70">{alert.detail}</p>
                </div>
                <NavCtaLink
                  to={alert.to}
                  tone="destructive"
                  size="sm"
                  icon={ArrowRight}
                  className="shrink-0"
                >
                  {alert.actionLabel}
                </NavCtaLink>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div
        className={cn(
          'flex flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3',
          hayAlertas ? 'border-t border-destructive/20 bg-card/60' : ''
        )}
      >
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Hoy
        </p>

        {chips.map((chip) => {
          const Icon = chip.icon
          const Wrapper = chip.to ? Link : 'div'
          const wrapperProps = chip.to ? { to: chip.to } : {}

          return (
            <Wrapper
              key={chip.id}
              {...wrapperProps}
              title={chip.helper}
              className={cn(
                'flex items-center gap-2.5 rounded-lg',
                chip.to ? 'transition hover:opacity-70' : ''
              )}
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground">
                <Icon className="h-4 w-4" />
              </span>
              <span className="flex min-w-0 flex-col leading-tight">
                <span className="truncate text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  {chip.label}
                </span>
                <span className="text-base font-bold tabular-nums text-card-foreground">
                  {chip.value}
                </span>
              </span>
            </Wrapper>
          )
        })}
      </div>
    </section>
  )
}

function SectionTabs({ activeTab, setActiveTab, tabBadges }) {
  const tabRefs = useRef({})

  // Patron de tabs de WAI-ARIA: una sola parada de tabulacion en el grupo y
  // movimiento entre pestanas con flechas, Inicio y Fin.
  const handleKeyDown = (event) => {
    const offsets = { ArrowRight: 1, ArrowLeft: -1 }
    let destino = null

    if (event.key === 'Home') destino = TABS[0]
    else if (event.key === 'End') destino = TABS[TABS.length - 1]
    else if (offsets[event.key]) {
      const actual = TABS.findIndex((tab) => tab.id === activeTab)
      destino = TABS[(actual + offsets[event.key] + TABS.length) % TABS.length]
    }

    if (!destino) return
    event.preventDefault()
    setActiveTab(destino.id)
    tabRefs.current[destino.id]?.focus()
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-1.5 shadow-card">
      <div
        role="tablist"
        aria-label="Secciones del panel de control"
        onKeyDown={handleKeyDown}
        className="flex flex-wrap items-center gap-1"
      >
        {TABS.map((tab) => {
          const Icon = tab.icon
          const active = tab.id === activeTab

          return (
            <button
              key={tab.id}
              ref={(node) => {
                tabRefs.current[tab.id] = node
              }}
              type="button"
              role="tab"
              id={`dashboard-tab-${tab.id}`}
              aria-selected={active}
              aria-controls={`dashboard-panel-${tab.id}`}
              tabIndex={active ? 0 : -1}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 whitespace-nowrap rounded-xl px-3.5 py-2 text-sm font-semibold transition',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
                active
                  ? 'bg-foreground text-background shadow-sm'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <Icon
                className={cn('h-4 w-4 shrink-0', active ? 'text-primary' : 'text-muted-foreground')}
              />
              <span>{tab.label}</span>

              {tabBadges[tab.id] ? (
                <span
                  className={cn(
                    'rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums',
                    active ? 'bg-background/15 text-background' : 'bg-primary/10 text-primary'
                  )}
                >
                  {tabBadges[tab.id]}
                </span>
              ) : null}
            </button>
          )
        })}
      </div>
    </section>
  )
}

function OperationalBridge({ rows, loading, canUseHistories, canUseBilling }) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="h-20 animate-pulse rounded-2xl border border-border bg-muted" />
        ))}
      </div>
    )
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-muted p-6">
        <p className="text-sm font-semibold text-card-foreground">Sin citas pendientes para hoy</p>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Cuando entren pacientes a la agenda, aquí verás acciones directas para atenderlos y
          cobrar sin dar vueltas.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="hidden grid-cols-[96px_minmax(0,1.25fr)_minmax(0,1fr)_110px_auto] gap-4 px-4 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground md:grid">
        <span>Hora</span>
        <span>Paciente</span>
        <span>Profesional</span>
        <span>Estado</span>
        <span className="text-right">Acciones</span>
      </div>

      {rows.map((appointment) => (
        <div
          key={appointment.id}
          className="grid gap-4 rounded-2xl border border-border bg-card p-4 transition hover:bg-muted/50 md:grid-cols-[96px_minmax(0,1.25fr)_minmax(0,1fr)_110px_auto] md:items-center"
        >
          <div>
            <p className="text-sm font-semibold text-card-foreground">{formatTime(appointment.horaInicio)}</p>
            <p className="mt-1 text-xs text-muted-foreground">{appointment.tipoCita || 'Consulta'}</p>
          </div>

          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-card-foreground">
              {appointment.mascota?.nombre || 'Paciente sin nombre'}
            </p>
            <p className="mt-1 truncate text-sm text-muted-foreground">
              {appointment.propietario?.nombre || 'Tutor pendiente'} · {appointment.mascota?.especie || 'Sin especie'}
            </p>
          </div>

          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">
              {appointment.veterinario?.nombre || 'Profesional por asignar'}
            </p>
            <p className="mt-1 truncate text-xs text-muted-foreground">
              {appointment.motivo || 'Sin motivo registrado'}
            </p>
          </div>

          <StatusPill tone={getAppointmentTone(appointment.estado)}>
            {CITA_ESTADO_LABELS[appointment.estado] || appointment.estado || 'Programada'}
          </StatusPill>

          <div className="flex flex-wrap justify-end gap-2">
            <Link
              to={canUseHistories ? buildHistoryHref(appointment) : '/planes'}
              className={PRIMARY_BUTTON}
            >
              <Stethoscope className="h-4 w-4" />
              {canUseHistories ? 'Atender' : 'Activar historias'}
            </Link>
            <Link
              to={canUseBilling ? buildBillingHref(appointment) : '/planes'}
              className={SECONDARY_BUTTON}
            >
              <Receipt className="h-4 w-4" />
              {canUseBilling ? 'Cobrar' : 'Activar caja'}
            </Link>
          </div>
        </div>
      ))}
    </div>
  )
}

function RestrictedDashboard({ nombreClinica, usuarioEmail }) {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="border border-border bg-card shadow-sm">
          <div className="border-b border-border px-6 py-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Panel de control
            </p>
            <h1 className="mt-3 text-3xl font-semibold text-slate-950">{nombreClinica}</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
              Este panel de control está reservado para administración. Tu perfil puede seguir
              trabajando en las secciones permitidas, pero el seguimiento financiero, los reportes y
              las decisiones de plan se concentran aquí.
            </p>
          </div>

          <div className="grid gap-4 p-6 md:grid-cols-2">
            <div className="border border-border bg-muted px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Acceso actual
              </p>
              <p className="mt-3 text-base font-semibold text-slate-950">{usuarioEmail || 'Sin correo principal'}</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Si necesitas ver reportes o controles de plan, solicita acceso al administrador.
              </p>
            </div>

            <div className="border border-border bg-muted px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Siguiente modulo
              </p>
              <p className="mt-3 text-base font-semibold text-slate-950">Pacientes y tutores</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                La base clínica publicada ya puede usarse desde el equipo operativo.
              </p>
              <NavCta to="/pacientes" icon={PawPrint} className="mt-4">
                Abrir modulo
              </NavCta>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState('resumen')
  const usuario = useAuthStore((state) => state.usuario)
  const clinica = useAuthStore((state) => state.clinica)
  const suscripcionPersistida = useAuthStore((state) => state.suscripcion)
  const setSuscripcion = useAuthStore((state) => state.setSuscripcion)

  const esAdministrador = hasAnyRole(usuario, ['admin', 'superadmin'])
  const rangoMes = useMemo(() => getCurrentMonthRange(), [])
  const hoy = useMemo(() => serializeDate(new Date()), [])

  useEffect(() => {
    document.title = 'Panel de control | Bourgelat'
  }, [])

  const suscripcionQuery = useQuery({
    queryKey: ['suscripcion-activa'],
    queryFn: dashboardApi.obtenerSuscripcionActiva,
    enabled: esAdministrador,
  })

  const dashboardQuery = useQuery({
    queryKey: ['dashboard-general'],
    queryFn: dashboardApi.obtenerDashboardGeneral,
    enabled: esAdministrador,
  })

  useEffect(() => {
    if (suscripcionQuery.data?.suscripcion) {
      setSuscripcion(suscripcionQuery.data.suscripcion)
    }
  }, [setSuscripcion, suscripcionQuery.data?.suscripcion])

  const suscripcion = suscripcionQuery.data?.suscripcion || suscripcionPersistida
  const funcionalidades = Array.isArray(suscripcion?.funcionalidades)
    ? suscripcion.funcionalidades
    : EMPTY_LIST
  const featureSet = useMemo(() => new Set(funcionalidades), [funcionalidades])
  const puedeVerAgenda = esAdministrador && featureSet.has('reportes_operativos')
  const puedeVerIngresos =
    esAdministrador && featureSet.has('facturacion_interna') && featureSet.has('reportes_operativos')
  const puedeVerInventario =
    esAdministrador && featureSet.has('inventario') && featureSet.has('reportes_operativos')
  const puedeAbrirAgenda = esAdministrador && featureSet.has('citas')
  const puedeAbrirHistorias = esAdministrador && featureSet.has('historias')
  const puedeAbrirCaja = esAdministrador && featureSet.has('facturacion_interna')
  // Solo mostramos el control DIAN cuando el plan incluye facturacion electronica (v1 sin DIAN).
  const mostrarDian = puedeVerIngresos && featureSet.has('facturacion_electronica')

  const quickActions = useMemo(() => {
    const keys = ['agenda', 'paciente', 'historia', 'facturar']
    if (puedeVerInventario) keys.splice(1, 0, 'inventario')
    return keys.map((key) => ALL_QUICK_ACTIONS[key])
  }, [puedeVerInventario])

  const ingresosQuery = useQuery({
    queryKey: ['dashboard-ingresos', rangoMes.fechaInicio, rangoMes.fechaFin],
    queryFn: () => dashboardApi.obtenerReporteIngresos(rangoMes),
    enabled: puedeVerIngresos,
    placeholderData: (previousData) => previousData,
  })

  const citasQuery = useQuery({
    queryKey: ['dashboard-citas', rangoMes.fechaInicio, rangoMes.fechaFin],
    queryFn: () => dashboardApi.obtenerReporteCitas(rangoMes),
    enabled: puedeVerAgenda,
    placeholderData: (previousData) => previousData,
  })

  const inventarioQuery = useQuery({
    queryKey: ['dashboard-inventario'],
    queryFn: dashboardApi.obtenerReporteInventario,
    enabled: puedeVerInventario,
    placeholderData: (previousData) => previousData,
  })

  const agendaHoyQuery = useQuery({
    queryKey: ['dashboard-citas-hoy-detalle', hoy],
    queryFn: () => agendaApi.obtenerCitas({ fecha: hoy, pagina: 1, limite: 40 }),
    enabled: puedeAbrirAgenda,
    placeholderData: (previousData) => previousData,
  })

  const facturacionEstadoQuery = useQuery({
    queryKey: ['dashboard-facturacion-estado', rangoMes.fechaInicio, rangoMes.fechaFin],
    queryFn: () =>
      finanzasApi.obtenerFacturas({
        fechaInicio: rangoMes.fechaInicio,
        fechaFin: rangoMes.fechaFin,
        pagina: 1,
        limite: 1,
      }),
    enabled: puedeVerIngresos,
    placeholderData: (previousData) => previousData,
  })

  const nombreClinica = clinica?.nombreComercial || clinica?.nombre || 'Tu clínica'
  const ubicacionClinica = [clinica?.ciudad, clinica?.departamento].filter(Boolean).join(', ')

  const metaPlan = PLAN_META[suscripcion?.plan] || PLAN_META.inicio
  const resumen = dashboardQuery.data
  const usuariosActivos = resumen?.totales?.usuarios ?? 0
  const propietariosActivos = resumen?.totales?.propietarios ?? 0
  const mascotasActivas = resumen?.totales?.mascotas ?? 0
  const citasHoy = resumen?.hoy?.citasTotales ?? 0
  const citasPendientesHoy = resumen?.hoy?.citasPendientes ?? 0
  const alertasInventario = resumen?.alertas?.productosbajoStock ?? 0
  const limiteUsuarios = toNumber(suscripcion?.limiteUsuarios)
  const limiteMascotas = toNumber(suscripcion?.limiteMascotas)
  const diasRestantes = suscripcionQuery.data?.diasRestantes
  const advertenciaPlan = suscripcionQuery.data?.advertencia

  const ingresosPorDia = useMemo(
    () => mapIngresosPorDia(ingresosQuery.data?.ingresosPorDia),
    [ingresosQuery.data?.ingresosPorDia]
  )
  const metodosPago = useMemo(
    () => objectToChartData(ingresosQuery.data?.ingresosPorMetodoPago, PAYMENT_METHOD_LABELS),
    [ingresosQuery.data?.ingresosPorMetodoPago]
  )
  const estadosCita = useMemo(
    () => objectToChartData(citasQuery.data?.citasPorEstado, CITA_ESTADO_LABELS),
    [citasQuery.data?.citasPorEstado]
  )
  const tiposCita = useMemo(
    () => objectToChartData(citasQuery.data?.citasPorTipo, CITA_TIPO_LABELS),
    [citasQuery.data?.citasPorTipo]
  )
  const categoriasInventario = useMemo(
    () =>
      Object.entries(inventarioQuery.data?.porCategoria || {}).map(([key, value], index) => ({
        key,
        name: key,
        total: Number(value?.total || 0),
        valor: Number(value?.valor || 0),
        value: Number(value?.total || 0),
        color: ['#0f4c81', '#0f766e', '#f59e0b', '#7c3aed', '#dc2626', '#64748b'][index % 6],
      })),
    [inventarioQuery.data?.porCategoria]
  )

  const invoiceRows = useMemo(
    () =>
      [...(ingresosQuery.data?.facturas || [])]
        .slice(-8)
        .reverse()
        .map((factura) => ({
          id: factura.id,
          numero: factura.numero,
          fecha: formatShortDate(factura.fecha),
          total: formatCurrency(factura.total),
          metodoPago: PAYMENT_METHOD_LABELS[factura.metodoPago] || factura.metodoPago || 'Otro',
        })),
    [ingresosQuery.data?.facturas]
  )

  const inventoryRows = useMemo(
    () =>
      (inventarioQuery.data?.productos || [])
        .filter(
          (producto) =>
            producto.stock <= producto.stockMinimo ||
            Boolean(producto.fechaVencimiento)
        )
        .slice(0, 10)
        .map((producto) => ({
          id: producto.id,
          nombre: producto.nombre,
          categoria: producto.categoria,
          stock: `${producto.stock}/${producto.stockMinimo}`,
          vencimiento: producto.fechaVencimiento ? formatLongDate(producto.fechaVencimiento) : 'Sin fecha',
          valor: formatCurrency(Number(producto.precioVenta || 0) * Number(producto.stock || 0)),
        })),
    [inventarioQuery.data?.productos]
  )

  const patientCapacity = buildCapacityChart(mascotasActivas, limiteMascotas, 'Pacientes')
  const userCapacity = buildCapacityChart(usuariosActivos, limiteUsuarios, 'Usuarios')
  const citasHoyRows = useMemo(() => agendaHoyQuery.data?.citas ?? EMPTY_LIST, [agendaHoyQuery.data?.citas])
  const resumenElectronico = useMemo(
    () => facturacionEstadoQuery.data?.resumenElectronico ?? EMPTY_RECORD,
    [facturacionEstadoQuery.data?.resumenElectronico]
  )
  const dianErrores =
    Number(resumenElectronico.rechazada || 0) + Number(resumenElectronico.error || 0)
  const dianPendientes =
    Number(resumenElectronico.pendiente || 0) + Number(resumenElectronico.enviada || 0)

  const featureRows = getFeatureStateRows(funcionalidades)

  const urgenciasSinHistoria = useMemo(
    () =>
      citasHoyRows.filter(
        (c) => c.tipoCita === 'urgencia' && c.estado === 'completada' && !c.historia?.id
      ).length,
    [citasHoyRows]
  )

  const tacticalAlerts = useMemo(() => {
    const rows = []

    if (urgenciasSinHistoria > 0) {
      rows.push({
        id: 'urgencias-sin-historia',
        title: 'Urgencias sin historia clínica',
        detail:
          urgenciasSinHistoria === 1
            ? '1 urgencia atendida hoy aún no tiene historia clínica registrada. Ciérrala antes de que se pierda el detalle clínico.'
            : `${formatNumber(urgenciasSinHistoria)} urgencias atendidas hoy aún no tienen historia clínica registrada. Ciérralas antes de que se pierda el detalle clínico.`,
        to: '/historias',
        actionLabel: 'Documentar urgencias',
      })
    }

    if (typeof diasRestantes === 'number' && diasRestantes <= 7) {
      rows.push({
        id: 'vigencia',
        title: 'Plan por vencer',
        detail: `Quedan ${diasRestantes} días para el cierre de la vigencia actual. Conviene resolverlo antes de que afecte la continuidad.`,
        to: '/planes',
        actionLabel: 'Revisar plan',
      })
    }

    if (alertasInventario > 0) {
      rows.push({
        id: 'inventario',
        title: 'Inventario crítico',
        detail:
          alertasInventario === 1
            ? '1 producto está por debajo del mínimo y puede trabar ventas o tratamientos hoy.'
            : `${formatNumber(alertasInventario)} productos están por debajo del mínimo y pueden trabar ventas o tratamientos hoy.`,
        to: '/inventario',
        actionLabel: 'Ver inventario',
      })
    }

    if (dianErrores > 0) {
      rows.push({
        id: 'dian',
        title: 'Facturas con problema',
        detail: `${formatNumber(dianErrores)} facturas fueron rechazadas o no se pudieron enviar a la DIAN. Requieren revisión antes del siguiente corte.`,
        to: '/finanzas',
        actionLabel: 'Abrir caja',
      })
    }

    return rows
  }, [alertasInventario, dianErrores, diasRestantes, urgenciasSinHistoria])

  const todayBridgeRows = useMemo(() => {
    // Tope de 5 para que el Command Center entre sin scroll en 1366x768.
    // "Ver agenda completa" es la salida cuando el dia trae mas pacientes.
    const filtered = [...citasHoyRows]
      .filter((appointment) => ['programada', 'en_espera'].includes(appointment.estado))
      .slice(0, 5)

    if (usuario?.rol === 'veterinario' && usuario?.id) {
      return [
        ...filtered.filter((c) => c.veterinario?.id === usuario.id),
        ...filtered.filter((c) => c.veterinario?.id !== usuario.id),
      ]
    }
    return filtered
  }, [citasHoyRows, usuario])

  const sinDocumentar = useMemo(
    () =>
      citasHoyRows.filter(
        (c) => ['en_espera', 'completada'].includes(c.estado) && !c.historia?.id
      ).length,
    [citasHoyRows]
  )

  const ingresosHoy = useMemo(() => {
    const entry = ingresosPorDia.find((d) => d.fechaISO === hoy)
    return entry?.total ?? 0
  }, [ingresosPorDia, hoy])

  // Pulso del dia: el Command Center es el unico dueno de estas cifras.
  const todaySummary = useMemo(
    () => [
      {
        id: 'citas-hoy',
        icon: CalendarClock,
        label: 'Citas de hoy',
        value: formatNumber(citasHoy),
        helper: 'Citas agendadas para la fecha de hoy.',
        to: puedeAbrirAgenda ? '/agenda' : null,
      },
      {
        id: 'pendientes',
        icon: CircleAlert,
        label: 'Pendientes',
        value: formatNumber(citasPendientesHoy),
        helper: 'Atenciones de hoy aún marcadas como programadas.',
        to: puedeAbrirAgenda ? '/agenda' : null,
      },
      puedeAbrirHistorias && {
        id: 'sin-documentar',
        icon: FileText,
        label: 'Sin documentar',
        value: formatNumber(sinDocumentar),
        helper: 'Consultas de hoy sin historia clínica registrada.',
        to: '/historias',
      },
      {
        id: 'stock-critico',
        icon: Boxes,
        label: 'Cantidad crítica',
        value: formatNumber(alertasInventario),
        helper: 'Productos por debajo del mínimo definido.',
        to: puedeVerInventario ? '/inventario' : null,
      },
      puedeVerIngresos && {
        id: 'ingresos-hoy',
        icon: Wallet,
        label: 'Ingresos de hoy',
        value: formatCurrency(ingresosHoy),
        helper: 'Facturado hoy en la sección de caja.',
        to: puedeAbrirCaja ? '/finanzas' : null,
      },
    ],
    [
      alertasInventario,
      citasHoy,
      citasPendientesHoy,
      ingresosHoy,
      puedeAbrirAgenda,
      puedeAbrirCaja,
      puedeAbrirHistorias,
      puedeVerIngresos,
      puedeVerInventario,
      sinDocumentar,
    ]
  )

  if (!esAdministrador) {
    return <RestrictedDashboard nombreClinica={nombreClinica} usuarioEmail={usuario?.email} />
  }

  const renderSummaryOverview = () => {
    return (
      <div className="space-y-5">
        <TodayAlerts alerts={tacticalAlerts} summary={todaySummary} />

        <CommandPanel
          className="ring-1 ring-primary/15 shadow-lg"
          title="Puente operativo"
          subtitle="Pacientes agendados para hoy con salida directa a consulta y caja."
          action={
            <NavCtaLink to="/agenda">Ver agenda completa</NavCtaLink>
          }
        >
          <OperationalBridge
            rows={todayBridgeRows}
            loading={agendaHoyQuery.isLoading}
            canUseHistories={puedeAbrirHistorias}
            canUseBilling={puedeAbrirCaja}
          />
        </CommandPanel>
      </div>
    )
  }

  const renderAgendaTab = () => {
    if (!puedeVerAgenda) {
      return (
        <EmptyState
          icon={<Sparkles />}
          title="Agenda y reportes de citas no disponibles"
          description="Esta vista de agenda requiere reportes operativos activos para mostrar estados, tipos y tasa de asistencia."
          action={<NavCta to="/planes" icon={Sparkles}>Revisar planes</NavCta>}
        />
      )
    }

    return (
      <div className="space-y-5">
        <KpiGrid
          action={<OpenModuleButton to="/agenda" label="Abrir agenda completa" />}
          items={[
            {
              id: 'citas-mes',
              icon: CalendarClock,
              label: 'Citas del mes',
              value: formatNumber(citasQuery.data?.totalCitas || 0),
              helper: 'Todas las citas registradas dentro del período actual.',
            },
            {
              id: 'asistencia',
              icon: ShieldCheck,
              label: 'Asistencia',
              value: citasQuery.data?.tasaAsistencia || '0%',
              helper: 'Relación de citas completadas sobre el total del período.',
              tone: 'text-emerald-700',
            },
            {
              id: 'canceladas',
              icon: CalendarX,
              label: 'Canceladas',
              value: formatNumber(citasQuery.data?.citasPorEstado?.cancelada || 0),
              helper: 'Citas anuladas dentro del período actual.',
              tone: 'text-rose-700',
            },
            {
              id: 'no-asistio',
              icon: UserX,
              label: 'No asistio',
              value: formatNumber(citasQuery.data?.citasPorEstado?.no_asistio || 0),
              helper: 'Pacientes que no se presentaron a su cita en el período.',
              tone: 'text-amber-700',
            },
          ]}
        />

        <div className="grid gap-5 xl:grid-cols-2">
          <DonutCard
            title="Estado de citas"
            subtitle="Distribución del período por estado operativo."
            data={estadosCita}
            centerLabel="Total"
            centerValue={formatNumber(citasQuery.data?.totalCitas || 0)}
            formatter={formatNumber}
            emptyMessage="Aún no hay citas registradas en este período."
          />
          <BarPanel
            title="Tipos de cita"
            subtitle="Qué tipo de atención se está moviendo más durante el mes."
            data={tiposCita}
            dataKey="value"
            color="#0f766e"
            formatter={formatNumber}
            emptyMessage="Todavía no hay datos por tipo de cita."
          />
        </div>

      </div>
    )
  }

  const renderIngresosTab = () => {
    if (!puedeVerIngresos) {
      return (
        <EmptyState
          icon={<Sparkles />}
          title="Caja y reportes financieros no disponibles"
          description="Activa facturación interna y reportes operativos para ver el comportamiento diario, los métodos de pago y la tabla de facturas."
          action={<NavCta to="/planes" icon={Sparkles}>Revisar planes</NavCta>}
        />
      )
    }

    const totalFacturas = ingresosQuery.data?.totalFacturas || 0
    const promedioFactura = totalFacturas > 0 ? (ingresosQuery.data?.totalIngresos || 0) / totalFacturas : 0

    return (
      <div className="space-y-5">
        <KpiGrid
          action={<OpenModuleButton to="/finanzas" label="Abrir caja completa" />}
          items={[
            {
              id: 'ingresos-periodo',
              icon: Wallet,
              label: 'Ingresos del período',
              value: formatCurrency(ingresosQuery.data?.totalIngresos || 0),
              helper: 'Suma total entre facturas emitidas y pagadas dentro del mes.',
              tone: 'text-emerald-700',
            },
            {
              id: 'facturas',
              icon: Receipt,
              label: 'Facturas',
              value: formatNumber(totalFacturas),
              helper: 'Número de facturas emitidas o pagadas en el período.',
            },
            {
              id: 'promedio-factura',
              icon: BarChart3,
              label: 'Promedio por factura',
              value: formatCurrency(promedioFactura),
              helper: 'Valor promedio de cada factura del mes actual.',
              tone: 'text-primary',
            },
            mostrarDian && {
              id: 'control-dian',
              icon: ShieldAlert,
              label: 'Control DIAN',
              value: formatNumber(dianErrores),
              helper: `Facturas rechazadas o que no se pudieron enviar. ${formatNumber(dianPendientes)} siguen pendientes de respuesta.`,
              tone: 'text-violet-700',
            },
          ]}
        />

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_420px]">
          <LinePanel
            title="Evolución diaria de ingresos"
            subtitle="Movimiento día a día del período seleccionado."
            data={ingresosPorDia}
            dataKey="total"
            color="#0f4c81"
            formatter={formatCurrency}
            emptyMessage="Todavía no hay movimiento financiero en este período."
          />
          <DonutCard
            title="Metodos de pago"
            subtitle="Distribución de ingresos según el método usado por la clínica."
            data={metodosPago}
            centerLabel="Total"
            centerValue={formatCurrency(ingresosQuery.data?.totalIngresos || 0)}
            formatter={formatCurrency}
            emptyMessage="No hay datos por método de pago disponibles."
          />
        </div>

        <DataTable
          title="Detalle de facturas"
          subtitle="Las más recientes del período actual con su método de pago."
          rows={invoiceRows}
          columns={[
            { key: 'numero', label: 'Factura' },
            { key: 'fecha', label: 'Fecha' },
            { key: 'metodoPago', label: 'Metodo' },
            { key: 'total', label: 'Total' },
          ]}
          emptyTitle="No hay facturas registradas"
          emptyBody="A medida que la clínica facture, aquí se llenará la tabla del período."
          action={
            <NavCtaLink to="/finanzas">Abrir modulo</NavCtaLink>
          }
        />
      </div>
    )
  }

  const renderInventarioTab = () => {
    if (!puedeVerInventario) {
      return (
        <EmptyState
          icon={<Sparkles />}
          title="Inventario no disponible en el plan actual"
          description="Para revisar categorías, valor inventariado y alertas de cantidad necesitas inventario y reportes operativos activos."
          action={<NavCta to="/planes" icon={Sparkles}>Revisar planes</NavCta>}
        />
      )
    }

    const resumenInventario = inventarioQuery.data?.resumen || {}

    return (
      <div className="space-y-5">
        <KpiGrid
          action={<OpenModuleButton to="/inventario" label="Abrir inventario completo" />}
          items={[
            {
              id: 'productos-activos',
              icon: Boxes,
              label: 'Productos activos',
              value: formatNumber(resumenInventario.totalProductos || 0),
              helper: 'Productos actualmente activos dentro del inventario.',
            },
            {
              id: 'valor-inventariado',
              icon: Wallet,
              label: 'Valor inventariado',
              value: formatCurrency(resumenInventario.valorTotalInventario || 0),
              helper: 'Valor de venta estimado del inventario registrado.',
              tone: 'text-emerald-700',
            },
            {
              id: 'bajo-stock',
              icon: CircleAlert,
              label: 'Cantidad baja',
              value: formatNumber(resumenInventario.bajoStock || 0),
              helper: 'Productos con cantidad por debajo del mínimo definido.',
              tone: 'text-amber-700',
            },
            {
              id: 'vencimientos',
              icon: Receipt,
              label: 'Vencimientos',
              value: formatNumber((resumenInventario.vencidos || 0) + (resumenInventario.proximosVencer || 0)),
              helper: 'Suma entre productos vencidos y próximos a vencer.',
              tone: 'text-rose-700',
            },
          ]}
        />

        <div className="grid gap-5 xl:grid-cols-[420px_minmax(0,1.45fr)]">
          <DonutCard
            title="Categorías activas"
            subtitle="Distribución actual del inventario por categoría."
            data={categoriasInventario}
            centerLabel="Productos"
            centerValue={formatNumber(resumenInventario.totalProductos || 0)}
            formatter={formatNumber}
            emptyMessage="Aún no hay categorías para mostrar."
          />
          <BarPanel
            title="Valor por categoría"
            subtitle="Lectura financiera del inventario según su categoría."
            data={categoriasInventario}
            dataKey="valor"
            color="#0f4c81"
            formatter={formatCurrency}
            emptyMessage="No hay valor inventariado por categoría disponible."
          />
        </div>

        <DataTable
          title="Productos que requieren revisión"
          subtitle="Cantidad baja o fechas de vencimiento presentes en el inventario."
          rows={inventoryRows}
          columns={[
            { key: 'nombre', label: 'Producto' },
            { key: 'categoria', label: 'Categoría' },
            { key: 'stock', label: 'Cantidad / Mín.' },
            { key: 'vencimiento', label: 'Vencimiento' },
            { key: 'valor', label: 'Valor' },
          ]}
          emptyTitle="No hay alertas de inventario"
          emptyBody="Cuando un producto quede con cantidad baja o tenga fecha próxima a vencer, aparecerá aquí."
          action={
            <NavCtaLink to="/inventario">Abrir modulo</NavCtaLink>
          }
        />
      </div>
    )
  }

  const renderPacientesTab = () => (
    <div className="space-y-5">
      <KpiGrid
        action={<OpenModuleButton to="/pacientes" label="Abrir pacientes completo" />}
        items={[
          {
            id: 'pacientes-activos',
            icon: PawPrint,
            label: 'Pacientes activos',
            value: formatNumber(mascotasActivas),
            helper: 'Base clínica lista para consulta y seguimiento.',
          },
          {
            id: 'propietarios',
            icon: Users,
            label: 'Propietarios',
            value: formatNumber(propietariosActivos),
            helper: 'Responsables activos asociados a la base de pacientes.',
            tone: 'text-primary',
          },
          {
            id: 'usuarios-activos',
            icon: ShieldCheck,
            label: 'Usuarios activos',
            value: formatNumber(usuariosActivos),
            helper: 'Equipo actualmente activo en la clínica.',
            tone: 'text-violet-700',
          },
        ]}
      />

      <div className="grid gap-5 xl:grid-cols-2">
        <DonutCard
          title="Uso de pacientes"
          subtitle="Lectura administrativa del cupo actual."
          data={patientCapacity.rows}
          centerLabel="Plan"
          centerValue={patientCapacity.centerValue}
          formatter={formatNumber}
          emptyMessage="No hay datos de capacidad disponibles."
        />
        <DonutCard
          title="Uso de usuarios"
          subtitle="Control simple del equipo activo frente al límite del plan."
          data={userCapacity.rows}
          centerLabel="Equipo"
          centerValue={userCapacity.centerValue}
          formatter={formatNumber}
          emptyMessage="No hay datos de capacidad disponibles."
        />
      </div>
    </div>
  )

  const renderPlanTab = () => (
    <div className="space-y-5">
      <DashboardPanel
        title="Plan actual"
        subtitle="Visibilidad directa sobre el estado comercial, la vigencia y la capacidad disponible."
        action={
          <div className="flex flex-wrap gap-2">
            <StatusPill tone={metaPlan.tone}>{metaPlan.nombre}</StatusPill>
            {typeof diasRestantes === 'number' ? (
              <StatusPill tone="border-amber-200 bg-amber-50 text-amber-700">
                {diasRestantes} dias restantes
              </StatusPill>
            ) : null}
          </div>
        }
      >
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="border border-border bg-muted px-4 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Clinica
            </p>
            <p className="mt-3 text-base font-semibold text-slate-950">{nombreClinica}</p>
            <p className="mt-2 text-sm text-muted-foreground">{ubicacionClinica || 'Ubicación pendiente'}</p>
          </div>
          <div className="border border-border bg-muted px-4 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Vigencia
            </p>
            <p className="mt-3 text-base font-semibold text-slate-950">
              {suscripcion?.fechaFin ? formatLongDate(suscripcion.fechaFin) : 'Sin fecha de cierre'}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {advertenciaPlan || 'El plan no tiene alertas comerciales por ahora.'}
            </p>
          </div>
          <div className="border border-border bg-muted px-4 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Acción recomendada
            </p>
            <p className="mt-3 text-base font-semibold text-slate-950">Gestion comercial</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Usa esta vista para decidir si necesitas un plan mayor, antes de quedarte sin cupos o sin secciones disponibles.
            </p>
            <NavCtaLink to="/planes" icon={ArrowRight} className="mt-4">
              Revisar planes
            </NavCtaLink>
          </div>
        </div>
      </DashboardPanel>

      <DataTable
        title="Funcionalidades habilitadas"
        subtitle="Cada sección de Bourgelat según la suscripción activa de la clínica."
        rows={featureRows}
        columns={[
          { key: 'label', label: 'Sección' },
          {
            key: 'enabled',
            label: 'Estado',
            render: (row) => (
              <StatusPill
                tone={
                  row.enabled
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    : 'border-border bg-slate-100 text-muted-foreground'
                }
              >
                {row.enabled ? 'Incluido' : 'No incluido'}
              </StatusPill>
            ),
          },
        ]}
        emptyTitle="Sin funcionalidades"
        emptyBody="No fue posible cargar el estado de funcionalidades del plan."
      />
    </div>
  )

  // Se resuelve solo la pestana visible: el objeto anterior construia los seis
  // arboles en cada render para descartar cinco.
  const renderActiveView = () => {
    switch (activeTab) {
      case 'agenda':
        return renderAgendaTab()
      case 'ingresos':
        return renderIngresosTab()
      case 'inventario':
        return renderInventarioTab()
      case 'pacientes':
        return renderPacientesTab()
      case 'plan':
        return renderPlanTab()
      default:
        return renderSummaryOverview()
    }
  }

  const tabBadges = {
    resumen: tacticalAlerts.length > 0 ? `${tacticalAlerts.length}` : null,
    agenda: citasHoy > 0 ? `${citasHoy}` : null,
    ingresos: puedeVerIngresos ? (dianErrores > 0 ? `${dianErrores}` : null) : 'Plan',
    inventario: alertasInventario > 0 ? `${alertasInventario}` : null,
    // Sin badge: el cupo lo comunican los medidores "Uso de pacientes/usuarios"
    // dentro de la pestana, que son su unica fuente de verdad.
    pacientes: null,
    plan: typeof diasRestantes === 'number' && diasRestantes <= 60 ? `${diasRestantes}d` : null,
  }

  const queryErrors = [
    suscripcionQuery.isError
      ? getErrorMessage(
          suscripcionQuery.error,
          'No fue posible cargar la suscripción activa de la clínica.'
        )
      : null,
    dashboardQuery.isError
      ? getErrorMessage(
          dashboardQuery.error,
          'No fue posible cargar el resumen del panel de control.'
        )
      : null,
    agendaHoyQuery.isError
      ? getErrorMessage(
          agendaHoyQuery.error,
          'No fue posible cargar el detalle de la agenda de hoy.'
        )
      : null,
    facturacionEstadoQuery.isError
      ? getErrorMessage(
          facturacionEstadoQuery.error,
          'No fue posible leer el estado de la facturación electrónica.'
        )
      : null,
  ].filter(Boolean)

  return (
    <AdminShell
      currentKey="dashboard"
      title="Panel de control"
      description="Todo lo importante del día en un solo lugar: operación, caja, inventario y continuidad, sin perder tiempo en pantallas saturadas."
      headerBadge={
        <StatusPill tone="border-border bg-slate-100 text-foreground">
          Corte {formatShortDate(rangoMes.fechaFin)}
        </StatusPill>
      }
      actions={
        typeof diasRestantes === 'number' && diasRestantes <= 5 ? (
          <StatusPill tone="border-destructive/40 bg-destructive/10 text-destructive">
            Tu plan vence en {diasRestantes} {diasRestantes === 1 ? 'día' : 'días'}
          </StatusPill>
        ) : null
      }
      showQuickActions
      quickActions={quickActions}
    >
      <SectionTabs activeTab={activeTab} setActiveTab={setActiveTab} tabBadges={tabBadges} />

      {queryErrors.length > 0 ? (
        <div className="space-y-3">
          {queryErrors.map((message) => (
            <div
              key={message}
              className="rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm leading-7 text-red-700 shadow-sm"
            >
              {message}
            </div>
          ))}
        </div>
      ) : null}

      <div
        role="tabpanel"
        id={`dashboard-panel-${activeTab}`}
        aria-labelledby={`dashboard-tab-${activeTab}`}
      >
        {dashboardQuery.isLoading || suscripcionQuery.isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[0, 1, 2, 3].map((item) => (
              <div
                key={item}
                className="h-20 animate-pulse rounded-xl border border-border bg-card shadow-card"
              />
            ))}
            <div className="h-72 animate-pulse rounded-2xl border border-border bg-card shadow-card sm:col-span-2 lg:col-span-4" />
          </div>
        ) : (
          renderActiveView()
        )}
      </div>
    </AdminShell>
  )
}
