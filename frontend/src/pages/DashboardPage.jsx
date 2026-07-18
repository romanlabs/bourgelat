import { useEffect, useId, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Area, AreaChart, ResponsiveContainer, Tooltip } from 'recharts'
import {
  ArrowRight,
  BarChart3,
  Boxes,
  CalendarClock,
  CircleAlert,
  FileText,
  LayoutDashboard,
  PawPrint,
  Receipt,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Users,
  Wallet,
} from 'lucide-react'
import AdminShell from '@/components/layout/AdminShell'
import { ALL_QUICK_ACTIONS } from '@/components/layout/quickActions'
import { agendaApi } from '@/features/agenda/agendaApi'
import { dashboardApi } from '@/features/dashboard/dashboardApi'
import {
  BarPanel,
  DashboardPanel,
  DataTable,
  DonutCard,
  EmptyModuleState,
  KpiCard,
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
  { id: 'resumen', label: 'Command Center', icon: LayoutDashboard },
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

function OpenModuleButton({ to, label }) {
  return (
    <div className="flex justify-end">
      <Link to={to} className={SECONDARY_BUTTON}>
        {label}
        <ArrowRight className="h-4 w-4" />
      </Link>
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
  if (estado === 'en_curso') return 'border-sky-200 bg-sky-50 text-sky-700'
  if (estado === 'confirmada') return 'border-primary/30 bg-primary/10 text-primary'
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

function SparklineTooltip({ active, payload, label, formatter }) {
  if (!active || !payload?.length) return null

  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2 text-xs shadow-dropdown">
      {label ? <p className="font-semibold text-card-foreground">{label}</p> : null}
      <p className="mt-1 text-muted-foreground">
        {formatter ? formatter(payload[0]?.value) : payload[0]?.value}
      </p>
    </div>
  )
}

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

function CommandKpiCard({
  label,
  value,
  helper,
  icon,
  data,
  color = '#0d9488',
  formatter,
  className = '',
  primary = false,
}) {
  const rawId = useId().replaceAll(':', '')
  const chartData = data?.length ? data : [{ label: '0', value: 0 }]
  const Icon = icon

  if (primary) {
    return (
      <div className={cn('flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-card', className)}>
        <div className="flex flex-1 flex-col justify-between p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
              <p className="mt-4 text-5xl font-bold tabular-nums text-card-foreground">{value}</p>
            </div>
            <span className="flex h-12 w-12 shrink-0 items-center justify-center border border-border bg-muted text-primary">
              <Icon className="h-5 w-5" />
            </span>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">{helper}</p>
        </div>
        <div className="h-24 border-t border-border px-2 pb-2 pt-3">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={rawId} x1="0" x2="0" y1="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.22} />
                  <stop offset="95%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Tooltip content={<SparklineTooltip formatter={formatter} />} cursor={false} />
              <Area
                type="monotone"
                dataKey="value"
                stroke={color}
                fill={`url(#${rawId})`}
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 3 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('flex flex-col rounded-2xl border border-border bg-card p-5 shadow-card', className)}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase leading-4 tracking-[0.1em] text-muted-foreground">
          {label}
        </p>
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${color}1a`, color }}
        >
          <Icon className="h-4 w-4" />
        </span>
      </div>

      <p className="mt-4 text-3xl font-bold tabular-nums text-card-foreground">{value}</p>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{helper}</p>
    </div>
  )
}

function TacticalAlertStrip({ alerts }) {
  if (alerts.length === 0) return null

  return (
    <section className="rounded-2xl border border-destructive/30 bg-destructive/5 px-5 py-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <div className="flex items-center gap-3 text-destructive">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10">
            <ShieldAlert className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em]">Tira tactica 8:00 AM</p>
            <p className="mt-1 text-sm text-destructive/80">
              Solo aparece cuando hay algo que puede romper la operacion de hoy.
            </p>
          </div>
        </div>

        <div className="grid flex-1 gap-3 lg:grid-cols-3">
          {alerts.map((alert) => (
            <div key={alert.id} className="rounded-2xl border border-destructive/20 bg-card/80 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-destructive">{alert.title}</p>
                <StatusPill tone="border-destructive/30 bg-destructive/10 text-destructive">Urgente</StatusPill>
              </div>
              <p className="mt-2 text-sm leading-6 text-destructive/80">{alert.detail}</p>
              <Link to={alert.to} className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-destructive">
                {alert.actionLabel}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function SectionTabs({ activeTab, setActiveTab, tabBadges }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-1.5 shadow-card">
      <div className="flex flex-wrap items-center gap-1">
        {TABS.map((tab) => {
          const Icon = tab.icon
          const active = tab.id === activeTab

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 whitespace-nowrap rounded-xl px-3.5 py-2 text-sm font-semibold transition',
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
          Cuando entren pacientes a la agenda, este puente mostrara acciones directas para atender y
          cobrar sin navegar de mas.
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
              Dashboard administrativo
            </p>
            <h1 className="mt-3 text-3xl font-semibold text-slate-950">{nombreClinica}</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
              Este panel de control esta reservado para administracion. Tu perfil puede seguir
              operando dentro de los modulos permitidos, pero el seguimiento financiero, reportes y
              decisiones de plan se concentran aqui.
            </p>
          </div>

          <div className="grid gap-4 p-6 md:grid-cols-2">
            <div className="border border-border bg-muted px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Acceso actual
              </p>
              <p className="mt-3 text-base font-semibold text-slate-950">{usuarioEmail || 'Sin email principal'}</p>
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
                La base clinica publicada ya puede usarse desde el equipo operativo.
              </p>
              <Link
                to="/pacientes"
                className="mt-4 inline-flex items-center gap-2 border border-border bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Abrir modulo
                <ArrowRight className="h-4 w-4" />
              </Link>
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
    document.title = 'Dashboard | Bourgelat'
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

  const nombreClinica = clinica?.nombreComercial || clinica?.nombre || 'Tu clinica'
  const ubicacionClinica = [clinica?.ciudad, clinica?.departamento].filter(Boolean).join(', ')

  const metaPlan = PLAN_META[suscripcion?.plan] || PLAN_META.inicio
  const resumen = dashboardQuery.data
  const usuariosActivos = resumen?.totales?.usuarios ?? 0
  const propietariosActivos = resumen?.totales?.propietarios ?? 0
  const mascotasActivas = resumen?.totales?.mascotas ?? 0
  const citasHoy = resumen?.hoy?.citasTotales ?? 0
  const citasPendientesHoy = resumen?.hoy?.citasPendientes ?? 0
  const ingresosMesActual = resumen?.mes?.ingresos ?? 0
  const alertasInventario = resumen?.alertas?.productosbajoStock ?? 0
  const limiteUsuarios = toNumber(suscripcion?.limiteUsuarios)
  const limiteMascotas = toNumber(suscripcion?.limiteMascotas)
  const cupoUsuarios = limiteUsuarios === null ? null : Math.max(limiteUsuarios - usuariosActivos, 0)
  const cupoMascotas = limiteMascotas === null ? null : Math.max(limiteMascotas - mascotasActivas, 0)
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

  const capacityRows = [
    {
      id: 'usuarios',
      area: 'Usuarios',
      uso: formatNumber(usuariosActivos),
      limite: limiteUsuarios === null ? 'Sin limite' : formatNumber(limiteUsuarios),
      estado: limiteUsuarios === null ? 'Abierto' : `${cupoUsuarios} disponibles`,
    },
    {
      id: 'pacientes',
      area: 'Pacientes',
      uso: formatNumber(mascotasActivas),
      limite: limiteMascotas === null ? 'Sin limite' : formatNumber(limiteMascotas),
      estado: limiteMascotas === null ? 'Abierto' : `${cupoMascotas} disponibles`,
    },
  ]

  const featureRows = getFeatureStateRows(funcionalidades)

  const tacticalAlerts = useMemo(() => {
    const rows = []

    if (typeof diasRestantes === 'number' && diasRestantes <= 7) {
      rows.push({
        id: 'vigencia',
        title: 'Plan por vencer',
        detail: `Quedan ${diasRestantes} dias para el cierre de la vigencia actual. Conviene resolver esto antes de afectar continuidad.`,
        to: '/planes',
        actionLabel: 'Revisar plan',
      })
    }

    if (alertasInventario > 0) {
      rows.push({
        id: 'inventario',
        title: 'Inventario critico',
        detail: `${formatNumber(alertasInventario)} productos estan por debajo del minimo y pueden trabar ventas o tratamientos hoy.`,
        to: '/inventario',
        actionLabel: 'Ver inventario',
      })
    }

    if (dianErrores > 0) {
      rows.push({
        id: 'dian',
        title: 'Errores DIAN / Factus',
        detail: `${formatNumber(dianErrores)} facturas quedaron rechazadas o con error tecnico. Requieren revision antes del siguiente corte.`,
        to: '/finanzas',
        actionLabel: 'Abrir caja',
      })
    }

    return rows
  }, [alertasInventario, dianErrores, diasRestantes])

  const sparklineIngresos = useMemo(
    () =>
      ingresosPorDia.slice(-10).map((item) => ({
        label: item.fecha,
        value: Number(item.total || 0),
      })),
    [ingresosPorDia]
  )

  const todayBridgeRows = useMemo(() => {
    const filtered = [...citasHoyRows]
      .filter((appointment) => ['programada', 'confirmada', 'en_curso'].includes(appointment.estado))
      .slice(0, 12)

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
        (c) => ['en_curso', 'completada'].includes(c.estado) && !c.historiaClinicaId
      ).length,
    [citasHoyRows]
  )

  const ingresosHoy = useMemo(() => {
    const entry = ingresosPorDia.find((d) => d.fecha === hoy)
    return entry?.total ?? 0
  }, [ingresosPorDia, hoy])

  if (!esAdministrador) {
    return <RestrictedDashboard nombreClinica={nombreClinica} usuarioEmail={usuario?.email} />
  }

  const renderSummaryOverview = () => {
    return (
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {tacticalAlerts.length > 0 ? (
          <div className="lg:col-span-12">
            <TacticalAlertStrip alerts={tacticalAlerts} />
          </div>
        ) : null}

        <CommandKpiCard
          primary
          className="lg:col-span-5"
          label="Ingresos del periodo"
          value={formatCurrency(ingresosMesActual)}
          helper="Tendencia diaria del mes actual."
          icon={Wallet}
          data={sparklineIngresos}
          color="#0d9488"
          formatter={formatCurrency}
        />

        <div
          className={cn(
            'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:col-span-7',
            (() => {
              const count = 2 + (mostrarDian ? 1 : 0) + (puedeAbrirHistorias ? 1 : 0)
              return { 2: 'lg:grid-cols-2', 3: 'lg:grid-cols-3', 4: 'lg:grid-cols-4' }[count]
            })()
          )}
        >
          <CommandKpiCard
            label="Citas de hoy"
            value={formatNumber(citasHoy)}
            helper={`${formatNumber(citasPendientesHoy)} pendientes`}
            icon={CalendarClock}
            color="#0f4c81"
          />
          <CommandKpiCard
            label="Stock crítico"
            value={formatNumber(alertasInventario)}
            helper="Bajo mínimo o en vigilancia"
            icon={Boxes}
            color="#ea580c"
          />
          {mostrarDian ? (
            <CommandKpiCard
              label="Control DIAN"
              value={formatNumber(dianErrores)}
              helper={`${formatNumber(dianPendientes)} pendientes`}
              icon={ShieldAlert}
              color="#7c3aed"
            />
          ) : null}
          {puedeAbrirHistorias ? (
            <CommandKpiCard
              label="Sin documentar"
              value={formatNumber(sinDocumentar)}
              helper="Consultas de hoy sin historia clínica"
              icon={FileText}
              color="#0891b2"
            />
          ) : null}
        </div>

        <CommandPanel
          className="lg:col-span-12 ring-1 ring-primary/15 shadow-lg"
          title="Puente operativo"
          subtitle="Pacientes agendados para hoy con salida directa a consulta y caja."
          action={
            <Link to="/agenda" className="text-sm font-semibold text-primary transition hover:text-primary/80">
              Ver agenda completa
            </Link>
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
        <EmptyModuleState
          title="Agenda y reportes de citas no disponibles"
          body="Este tablero agenda requiere reportes operativos activos para mostrar estados, tipos y tasa de asistencia."
          ctaLabel="Revisar planes"
        />
      )
    }

    return (
      <div className="space-y-5">
        <OpenModuleButton to="/agenda" label="Abrir agenda completa" />

        <div className="grid gap-4 xl:grid-cols-4">
          <KpiCard
            icon={CalendarClock}
            label="Citas del mes"
            value={formatNumber(citasQuery.data?.totalCitas || 0)}
            helper="Todas las citas registradas dentro del periodo actual."
          />
          <KpiCard
            icon={ShieldCheck}
            label="Asistencia"
            value={citasQuery.data?.tasaAsistencia || '0%'}
            helper="Relacion de citas completadas sobre el total del periodo."
            tone="text-emerald-700"
          />
          <KpiCard
            icon={Stethoscope}
            label="Citas de hoy"
            value={formatNumber(citasHoy)}
            helper="Corte diario directamente desde el dashboard general."
          />
          <KpiCard
            icon={CircleAlert}
            label="Pendientes hoy"
            value={formatNumber(citasPendientesHoy)}
            helper="Atenciones aun marcadas como programadas."
            tone="text-amber-700"
          />
        </div>

        <div className="grid gap-5 xl:grid-cols-2">
          <DonutCard
            title="Estado de citas"
            subtitle="Distribucion del periodo por estado operativo."
            data={estadosCita}
            centerLabel="Total"
            centerValue={formatNumber(citasQuery.data?.totalCitas || 0)}
            formatter={formatNumber}
            emptyMessage="Aun no hay citas registradas en este periodo."
          />
          <BarPanel
            title="Tipos de cita"
            subtitle="Que tipo de atencion se esta moviendo mas durante el mes."
            data={tiposCita}
            dataKey="value"
            color="#0f766e"
            formatter={formatNumber}
            emptyMessage="Todavia no hay datos por tipo de cita."
          />
        </div>

      </div>
    )
  }

  const renderIngresosTab = () => {
    if (!puedeVerIngresos) {
      return (
        <EmptyModuleState
          title="Caja y reportes financieros no disponibles"
          body="Activa facturacion interna y reportes operativos para ver comportamiento diario, metodos de pago y tabla de facturas."
          ctaLabel="Revisar planes"
        />
      )
    }

    const totalFacturas = ingresosQuery.data?.totalFacturas || 0
    const promedioFactura = totalFacturas > 0 ? (ingresosQuery.data?.totalIngresos || 0) / totalFacturas : 0

    return (
      <div className="space-y-5">
        <OpenModuleButton to="/finanzas" label="Abrir caja completa" />

        <div className="grid gap-4 xl:grid-cols-4">
          <KpiCard
            icon={Wallet}
            label="Ingresos del periodo"
            value={formatCurrency(ingresosQuery.data?.totalIngresos || 0)}
            helper="Suma total entre facturas emitidas y pagadas dentro del mes."
            tone="text-emerald-700"
          />
          <KpiCard
            icon={Receipt}
            label="Facturas"
            value={formatNumber(totalFacturas)}
            helper="Numero de facturas emitidas o pagadas en el periodo."
          />
          <KpiCard
            icon={BarChart3}
            label="Promedio por factura"
            value={formatCurrency(promedioFactura)}
            helper="Ticket promedio del mes actual."
            tone="text-primary"
          />
          <KpiCard
            icon={Wallet}
            label="Ingresos de hoy"
            value={formatCurrency(ingresosHoy)}
            helper="Facturado hoy en el modulo de caja."
            tone="text-primary"
          />
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_420px]">
          <LinePanel
            title="Evolucion diaria de ingresos"
            subtitle="Movimiento dia a dia del periodo seleccionado."
            data={ingresosPorDia}
            dataKey="total"
            color="#0f4c81"
            formatter={formatCurrency}
            emptyMessage="Todavia no hay movimiento financiero en este periodo."
          />
          <DonutCard
            title="Metodos de pago"
            subtitle="Distribucion de ingresos segun el metodo usado por la clinica."
            data={metodosPago}
            centerLabel="Total"
            centerValue={formatCurrency(ingresosQuery.data?.totalIngresos || 0)}
            formatter={formatCurrency}
            emptyMessage="No hay datos por metodo de pago disponibles."
          />
        </div>

        <DataTable
          title="Detalle de facturas"
          subtitle="Las mas recientes del periodo actual con su metodo de pago."
          rows={invoiceRows}
          columns={[
            { key: 'numero', label: 'Factura' },
            { key: 'fecha', label: 'Fecha' },
            { key: 'metodoPago', label: 'Metodo' },
            { key: 'total', label: 'Total' },
          ]}
          emptyTitle="No hay facturas registradas"
          emptyBody="A medida que la clinica facture, aqui se llenara la tabla administrativa del periodo."
          action={
            <Link
              to="/finanzas"
              className="text-sm font-semibold text-primary hover:text-primary"
            >
              Abrir modulo
            </Link>
          }
        />
      </div>
    )
  }

  const renderInventarioTab = () => {
    if (!puedeVerInventario) {
      return (
        <EmptyModuleState
          title="Inventario no disponible en el plan actual"
          body="Para revisar categorias, valor inventariado y alertas de stock necesitas inventario y reportes operativos activos."
          ctaLabel="Revisar planes"
        />
      )
    }

    const resumenInventario = inventarioQuery.data?.resumen || {}

    return (
      <div className="space-y-5">
        <OpenModuleButton to="/inventario" label="Abrir inventario completo" />

        <div className="grid gap-4 xl:grid-cols-4">
          <KpiCard
            icon={Boxes}
            label="Productos activos"
            value={formatNumber(resumenInventario.totalProductos || 0)}
            helper="Productos actualmente activos dentro del inventario."
          />
          <KpiCard
            icon={Wallet}
            label="Valor inventariado"
            value={formatCurrency(resumenInventario.valorTotalInventario || 0)}
            helper="Valor de venta estimado del inventario registrado."
            tone="text-emerald-700"
          />
          <KpiCard
            icon={CircleAlert}
            label="Bajo stock"
            value={formatNumber(resumenInventario.bajoStock || 0)}
            helper="Productos con stock por debajo del minimo definido."
            tone="text-amber-700"
          />
          <KpiCard
            icon={Receipt}
            label="Vencimientos"
            value={formatNumber((resumenInventario.vencidos || 0) + (resumenInventario.proximosVencer || 0))}
            helper="Suma entre productos vencidos y proximos a vencer."
            tone="text-rose-700"
          />
        </div>

        <div className="grid gap-5 xl:grid-cols-[420px_minmax(0,1.45fr)]">
          <DonutCard
            title="Categorias activas"
            subtitle="Distribucion actual del inventario por categoria."
            data={categoriasInventario}
            centerLabel="Productos"
            centerValue={formatNumber(resumenInventario.totalProductos || 0)}
            formatter={formatNumber}
            emptyMessage="Aun no hay categorias para mostrar."
          />
          <BarPanel
            title="Valor por categoria"
            subtitle="Lectura financiera del inventario segun su categoria."
            data={categoriasInventario}
            dataKey="valor"
            color="#0f4c81"
            formatter={formatCurrency}
            emptyMessage="No hay valor inventariado por categoria disponible."
          />
        </div>

        <DataTable
          title="Productos que requieren revision"
          subtitle="Stock bajo o fechas de vencimiento presentes en el inventario."
          rows={inventoryRows}
          columns={[
            { key: 'nombre', label: 'Producto' },
            { key: 'categoria', label: 'Categoria' },
            { key: 'stock', label: 'Stock' },
            { key: 'vencimiento', label: 'Vencimiento' },
            { key: 'valor', label: 'Valor' },
          ]}
          emptyTitle="No hay alertas de inventario"
          emptyBody="Cuando un producto quede bajo stock o tenga fecha sensible, aparecerá aqui."
          action={
            <Link
              to="/inventario"
              className="text-sm font-semibold text-primary hover:text-primary"
            >
              Abrir modulo
            </Link>
          }
        />
      </div>
    )
  }

  const renderPacientesTab = () => (
    <div className="space-y-5">
      <OpenModuleButton to="/pacientes" label="Abrir pacientes completo" />

      <div className="grid gap-4 xl:grid-cols-4">
        <KpiCard
          icon={PawPrint}
          label="Pacientes activos"
          value={formatNumber(mascotasActivas)}
          helper="Base clinica operativa lista para consulta y seguimiento."
        />
        <KpiCard
          icon={Users}
          label="Propietarios"
          value={formatNumber(propietariosActivos)}
          helper="Responsables activos asociados a la base de pacientes."
          tone="text-primary"
        />
        <KpiCard
          icon={ShieldCheck}
          label="Usuarios activos"
          value={formatNumber(usuariosActivos)}
          helper="Equipo actualmente activo en la clinica."
          tone="text-violet-700"
        />
        <KpiCard
          icon={Sparkles}
          label="Cupo restante"
          value={limiteMascotas === null ? 'Sin limite' : formatNumber(cupoMascotas)}
          helper={
            limiteMascotas === null
              ? 'La suscripcion actual no limita pacientes activos.'
              : 'Pacientes disponibles antes de exigir cambio de plan.'
          }
          tone="text-emerald-700"
        />
      </div>

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
          subtitle="Control simple del equipo activo frente al limite del plan."
          data={userCapacity.rows}
          centerLabel="Equipo"
          centerValue={userCapacity.centerValue}
          formatter={formatNumber}
          emptyMessage="No hay datos de capacidad disponibles."
        />
      </div>

      <DataTable
        title="Capacidad y estado"
        subtitle="Lectura ejecutiva para saber si la clinica esta llegando al limite."
        rows={capacityRows}
        columns={[
          { key: 'area', label: 'Area' },
          { key: 'uso', label: 'Uso actual' },
          { key: 'limite', label: 'Limite' },
          { key: 'estado', label: 'Estado' },
        ]}
        emptyTitle="Sin datos"
        emptyBody="No hay informacion de capacidad disponible."
      />
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
            <p className="mt-2 text-sm text-muted-foreground">{ubicacionClinica || 'Ubicacion pendiente'}</p>
          </div>
          <div className="border border-border bg-muted px-4 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Vigencia
            </p>
            <p className="mt-3 text-base font-semibold text-slate-950">
              {suscripcion?.fechaFin ? formatLongDate(suscripcion.fechaFin) : 'Sin fecha de cierre'}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {advertenciaPlan || 'El plan se encuentra sin alertas comerciales criticas.'}
            </p>
          </div>
          <div className="border border-border bg-muted px-4 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Accion recomendada
            </p>
            <p className="mt-3 text-base font-semibold text-slate-950">Gestion comercial</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Usa esta vista para decidir upgrades antes de bloquear operacion por cupos o modulos.
            </p>
            <Link
              to="/planes"
              className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary"
            >
              Revisar planes
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </DashboardPanel>

      <DataTable
        title="Funcionalidades habilitadas"
        subtitle="Cada modulo del producto segun la suscripcion activa de la clinica."
        rows={featureRows}
        columns={[
          { key: 'label', label: 'Modulo' },
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

  const activeView = {
    resumen: renderSummaryOverview(),
    agenda: renderAgendaTab(),
    ingresos: renderIngresosTab(),
    inventario: renderInventarioTab(),
    pacientes: renderPacientesTab(),
    plan: renderPlanTab(),
  }[activeTab]

  const tabBadges = {
    resumen: tacticalAlerts.length > 0 ? `${tacticalAlerts.length}` : null,
    agenda: citasHoy > 0 ? `${citasHoy}` : null,
    ingresos: puedeVerIngresos ? (dianErrores > 0 ? `${dianErrores}` : null) : 'Plan',
    inventario: alertasInventario > 0 ? `${alertasInventario}` : null,
    pacientes: limiteMascotas !== null ? `${Math.max(cupoMascotas, 0)}` : null,
    plan: typeof diasRestantes === 'number' && diasRestantes <= 60 ? `${diasRestantes}d` : null,
  }

  const queryErrors = [
    suscripcionQuery.isError
      ? getErrorMessage(
          suscripcionQuery.error,
          'No fue posible cargar la suscripcion activa de la clinica.'
        )
      : null,
    dashboardQuery.isError
      ? getErrorMessage(
          dashboardQuery.error,
          'No fue posible cargar el resumen administrativo del dashboard.'
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
          'No fue posible leer el estado de facturacion electronica.'
        )
      : null,
  ].filter(Boolean)

  return (
    <AdminShell
      currentKey="dashboard"
      title="Dashboard administrativo"
      description="Un command center para priorizar operacion, caja, inventario y continuidad sin perder tiempo en pantallas saturadas."
      headerBadge={
        <StatusPill tone="border-border bg-slate-100 text-foreground">
          Corte {formatShortDate(rangoMes.fechaFin)}
        </StatusPill>
      }
      actions={
        typeof diasRestantes === 'number' && diasRestantes <= 5 ? (
          <StatusPill tone="border-destructive/40 bg-destructive/10 text-destructive">
            Tu plan vence en {diasRestantes} {diasRestantes === 1 ? 'dia' : 'dias'}
          </StatusPill>
        ) : null
      }
      showQuickActions
      quickActions={quickActions}
      asideNote="Usa las acciones rapidas para entrar directo al modulo si necesitas mas contexto primero."
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

      {dashboardQuery.isLoading || suscripcionQuery.isLoading ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-4 lg:grid-cols-12">
          {[0, 1, 2, 3].map((item) => (
            <div
              key={item}
              className="h-44 animate-pulse rounded-2xl border border-border/60 bg-white shadow-sm lg:col-span-3"
            />
          ))}
          <div className="h-72 animate-pulse rounded-2xl border border-border/60 bg-white shadow-sm lg:col-span-8" />
          <div className="h-72 animate-pulse rounded-2xl border border-border/60 bg-white shadow-sm lg:col-span-4" />
        </div>
      ) : (
        activeView
      )}
    </AdminShell>
  )
}
