import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BarChart3,
  Boxes,
  CalendarClock,
  ChevronDown,
  CircleAlert,
  History,
  LogOut,
  PawPrint,
  Receipt,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Users,
  Wallet,
} from 'lucide-react'
import { auditoriaApi } from '@/features/auditoria/auditoriaApi'
import { dashboardApi } from '@/features/dashboard/dashboardApi'
import {
  BarPanel,
  DashboardPanel,
  DataTable,
  DonutCard,
  EmptyModuleState,
  KpiCard,
  LinePanel,
  MiniDonutChart,
  SidebarTabButton,
  StatusPill,
} from '@/features/dashboard/dashboardComponents'
import {
  CITA_ESTADO_LABELS,
  CITA_TIPO_LABELS,
  FEATURE_LABELS,
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
import { useLogout } from '@/features/auth/useAuth'
import { useAuthStore } from '@/store/authStore'

const TABS = [
  { id: 'resumen', label: 'Resumen', icon: Stethoscope },
  { id: 'agenda', label: 'Agenda', icon: CalendarClock },
  { id: 'ingresos', label: 'Ingresos', icon: Wallet },
  { id: 'inventario', label: 'Inventario', icon: Boxes },
  { id: 'pacientes', label: 'Pacientes', icon: PawPrint },
  { id: 'plan', label: 'Plan y control', icon: ShieldCheck },
]

const TAB_GROUPS = [
  { key: 'lectura', label: 'Lectura diaria', items: ['resumen', 'agenda', 'pacientes'] },
  { key: 'gestion', label: 'Gestion y control', items: ['ingresos', 'inventario', 'plan'] },
]

const TAB_BY_ID = Object.fromEntries(TABS.map((tab) => [tab.id, tab]))

const EMPTY_LIST = []

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message || error?.message || fallback

const formatAuditAction = (value) =>
  String(value || 'SIN_ACCION')
    .toLowerCase()
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())

const buildCapacityChart = (used, limit, label) => {
  if (limit === null || limit === undefined) {
    return {
      centerValue: 'Sin limite',
      rows: [{ key: 'abierto', name: label, value: 1, color: '#0f766e' }],
    }
  }

  return {
    centerValue: `${getUsagePercentage(used, limit)}%`,
    rows: [
      { key: 'en_uso', name: 'En uso', value: used, color: '#0f4c81' },
      { key: 'disponible', name: 'Disponible', value: Math.max(limit - used, 0), color: '#cbd5e1' },
    ],
  }
}

function RestrictedDashboard({ nombreClinica, usuarioEmail }) {
  return (
    <div className="min-h-screen bg-slate-100">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              Dashboard administrativo
            </p>
            <h1 className="mt-3 text-3xl font-semibold text-slate-950">{nombreClinica}</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
              Este panel de control esta reservado para administracion. Tu perfil puede seguir
              operando dentro de los modulos permitidos, pero el seguimiento financiero, reportes y
              decisiones de plan se concentran aqui.
            </p>
          </div>

          <div className="grid gap-4 p-6 md:grid-cols-2">
            <div className="border border-slate-200 bg-slate-50 px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                Acceso actual
              </p>
              <p className="mt-3 text-base font-semibold text-slate-950">{usuarioEmail || 'Sin email principal'}</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Si necesitas ver reportes o controles de plan, solicita acceso al administrador.
              </p>
            </div>

            <div className="border border-slate-200 bg-slate-50 px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                Siguiente modulo
              </p>
              <p className="mt-3 text-base font-semibold text-slate-950">Pacientes y tutores</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                La base clinica publicada ya puede usarse desde el equipo operativo.
              </p>
              <Link
                to="/pacientes"
                className="mt-4 inline-flex items-center gap-2 border border-slate-200 bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
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
  const [openSidebarGroups, setOpenSidebarGroups] = useState(() =>
    TAB_GROUPS.reduce((acc, group) => {
      acc[group.key] = group.items.includes('resumen') || group.key === 'lectura'
      return acc
    }, {})
  )
  const usuario = useAuthStore((state) => state.usuario)
  const clinica = useAuthStore((state) => state.clinica)
  const suscripcionPersistida = useAuthStore((state) => state.suscripcion)
  const setSuscripcion = useAuthStore((state) => state.setSuscripcion)
  const { logout } = useLogout()

  const esAdministrador = ['admin', 'superadmin'].includes(usuario?.rol)
  const rangoMes = useMemo(() => getCurrentMonthRange(), [])

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

  const auditoriaRecienteQuery = useQuery({
    queryKey: ['dashboard-auditoria-reciente', rangoMes.fechaInicio, rangoMes.fechaFin],
    queryFn: () =>
      auditoriaApi.obtenerLogs({
        pagina: 1,
        limite: 6,
        desde: rangoMes.fechaInicio,
        hasta: rangoMes.fechaFin,
      }),
    enabled: esAdministrador,
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

  const recentAuditRows = useMemo(
    () =>
      (auditoriaRecienteQuery.data?.logs || []).map((log) => ({
        id: log.id,
        fecha: new Intl.DateTimeFormat('es-CO', {
          day: '2-digit',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        }).format(new Date(log.createdAt)),
        accion: formatAuditAction(log.accion),
        responsable: log.responsable?.nombre || 'Sistema',
        resultado: log.resultado,
      })),
    [auditoriaRecienteQuery.data?.logs]
  )

  const patientCapacity = buildCapacityChart(mascotasActivas, limiteMascotas, 'Pacientes')
  const userCapacity = buildCapacityChart(usuariosActivos, limiteUsuarios, 'Usuarios')
  const totalFacturasMes = ingresosQuery.data?.totalFacturas || 0

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
    {
      id: 'propietarios',
      area: 'Propietarios',
      uso: formatNumber(propietariosActivos),
      limite: 'No aplica',
      estado: 'Base activa',
    },
  ]

  const featureRows = getFeatureStateRows(funcionalidades)

  const adminAlerts = useMemo(() => {
    const rows = []

    if (typeof diasRestantes === 'number' && diasRestantes <= 5) {
      rows.push({
        id: 'trial',
        area: 'Plan',
        estado: 'Atencion',
        detalle: `Quedan ${diasRestantes} dias de prueba para la clinica.`,
        actionTo: '/planes',
        actionLabel: 'Ver planes',
      })
    }

    if (advertenciaPlan) {
      rows.push({
        id: 'warning-plan',
        area: 'Plan',
        estado: 'Seguimiento',
        detalle: advertenciaPlan,
        actionTo: '/planes',
        actionLabel: 'Gestionar',
      })
    }

    if (limiteMascotas !== null && cupoMascotas <= 10) {
      rows.push({
        id: 'pacientes',
        area: 'Pacientes',
        estado: 'Cupo bajo',
        detalle: `Solo quedan ${Math.max(cupoMascotas, 0)} cupos disponibles para pacientes activos.`,
        actionTo: '/pacientes',
        actionLabel: 'Abrir modulo',
      })
    }

    if (limiteUsuarios !== null && cupoUsuarios <= 2) {
      rows.push({
        id: 'usuarios',
        area: 'Equipo',
        estado: 'Cupo bajo',
        detalle: `Solo quedan ${Math.max(cupoUsuarios, 0)} cupos disponibles para usuarios activos.`,
        actionTo: '/usuarios',
        actionLabel: 'Abrir usuarios',
      })
    }

    if (alertasInventario > 0) {
      rows.push({
        id: 'inventario',
        area: 'Inventario',
        estado: 'Prioridad',
        detalle: `${alertasInventario} productos requieren atencion por stock bajo.`,
        actionTo: '/dashboard',
        actionLabel: 'Revisar inventario',
      })
    }

    if (rows.length === 0) {
      rows.push({
        id: 'ok',
        area: 'General',
        estado: 'Estable',
        detalle: 'No hay alertas administrativas criticas para el corte actual.',
        actionTo: '/pacientes',
        actionLabel: 'Abrir pacientes',
      })
    }

    return rows
  }, [advertenciaPlan, alertasInventario, cupoMascotas, cupoUsuarios, diasRestantes, limiteMascotas, limiteUsuarios])

  if (!esAdministrador) {
    return <RestrictedDashboard nombreClinica={nombreClinica} usuarioEmail={usuario?.email} />
  }

  const renderSummaryTab = () => {
    const agendaResueltas = Math.max(citasHoy - citasPendientesHoy, 0)
    const agendaProgress = citasHoy > 0 ? getUsagePercentage(agendaResueltas, citasHoy) : 100
    const diasConMovimiento = ingresosPorDia.filter((item) => Number(item.total || 0) > 0).length
    const diasTotalesConLectura = ingresosPorDia.length
    const finanzasProgress =
      diasTotalesConLectura > 0 ? getUsagePercentage(diasConMovimiento, diasTotalesConLectura) : 0
    const capacidadUsuarios =
      limiteUsuarios === null ? null : getUsagePercentage(usuariosActivos, limiteUsuarios)
    const capacidadPacientes =
      limiteMascotas === null ? null : getUsagePercentage(mascotasActivas, limiteMascotas)

    const focoCapacidad =
      capacidadUsuarios === null && capacidadPacientes === null
        ? null
        : capacidadPacientes === null
          ? {
              label: 'Usuarios',
              percentage: capacidadUsuarios,
              used: usuariosActivos,
              available: Math.max(cupoUsuarios, 0),
            }
          : capacidadUsuarios === null || capacidadPacientes >= capacidadUsuarios
            ? {
                label: 'Pacientes',
                percentage: capacidadPacientes,
                used: mascotasActivas,
                available: Math.max(cupoMascotas, 0),
              }
            : {
                label: 'Usuarios',
                percentage: capacidadUsuarios,
                used: usuariosActivos,
                available: Math.max(cupoUsuarios, 0),
              }

    const focusCards = [
      {
        id: 'agenda',
        label: 'Agenda del dia',
        resumen: `${formatNumber(citasHoy)} citas registradas hoy`,
        detalle:
          citasPendientesHoy > 0
            ? `${formatNumber(citasPendientesHoy)} siguen pendientes de atencion o confirmacion.`
            : 'La agenda no tiene pendientes criticos en este corte.',
        to: '/agenda',
        actionLabel: 'Abrir agenda',
        chart: {
          centerLabel: citasHoy > 0 ? 'Al dia' : 'Libre',
          centerValue: citasHoy > 0 ? `${agendaProgress}%` : 'Sin carga',
          data:
            citasHoy > 0
              ? [
                  { key: 'al_dia', name: 'Al dia', value: agendaResueltas, color: '#0f4c81' },
                  { key: 'pendientes', name: 'Pendientes', value: citasPendientesHoy, color: '#cbd5e1' },
                ]
              : [{ key: 'sin_citas', name: 'Sin citas', value: 1, color: '#cbd5e1' }],
        },
      },
      {
        id: 'finanzas',
        label: 'Flujo financiero',
        resumen: puedeVerIngresos
          ? `${formatCurrency(ingresosMesActual)} acumulados en el mes`
          : 'Caja y reportes no incluidos en el plan actual',
        detalle: puedeVerIngresos
          ? 'Revisa metodos de pago, facturas recientes y ticket promedio desde Finanzas.'
          : 'Conviene revisar el plan si la clinica ya necesita lectura financiera diaria.',
        to: puedeVerIngresos ? '/finanzas' : '/planes',
        actionLabel: puedeVerIngresos ? 'Abrir finanzas' : 'Revisar planes',
        chart: puedeVerIngresos
          ? {
              centerLabel: totalFacturasMes > 0 ? 'Movimiento' : 'Mes',
              centerValue: totalFacturasMes > 0 ? `${finanzasProgress}%` : 'Activo',
              data:
                diasTotalesConLectura > 0
                  ? [
                      { key: 'con_movimiento', name: 'Dias con movimiento', value: diasConMovimiento, color: '#0f4c81' },
                      {
                        key: 'sin_movimiento',
                        name: 'Dias sin movimiento',
                        value: Math.max(diasTotalesConLectura - diasConMovimiento, 0),
                        color: '#cbd5e1',
                      },
                    ]
                  : [{ key: 'sin_lectura', name: 'Sin lectura', value: 1, color: '#cbd5e1' }],
            }
          : {
              centerLabel: 'Caja',
              centerValue: 'Plan',
              data: [{ key: 'bloqueado', name: 'Bloqueado', value: 1, color: '#cbd5e1' }],
            },
      },
      {
        id: 'capacidad',
        label: 'Capacidad operativa',
        resumen:
          limiteUsuarios === null && limiteMascotas === null
            ? 'La operacion no tiene cupos restringidos'
            : `Usuarios ${limiteUsuarios === null ? 'sin limite' : formatNumber(Math.max(cupoUsuarios, 0))} disponibles / Pacientes ${limiteMascotas === null ? 'sin limite' : formatNumber(Math.max(cupoMascotas, 0))}`,
        detalle:
          limiteUsuarios === null && limiteMascotas === null
            ? 'Aun asi conviene revisar equipo y crecimiento desde Usuarios y Plan.'
            : 'Si el cupo baja demasiado, la continuidad de la clinica empieza a depender del plan.',
        to:
          limiteUsuarios !== null && cupoUsuarios <= 2
            ? '/usuarios'
            : limiteMascotas !== null && cupoMascotas <= 10
              ? '/pacientes'
              : '/planes',
        actionLabel:
          limiteUsuarios !== null && cupoUsuarios <= 2
            ? 'Revisar usuarios'
            : limiteMascotas !== null && cupoMascotas <= 10
              ? 'Revisar pacientes'
              : 'Ver plan',
        chart:
          focoCapacidad === null
            ? {
                centerLabel: 'Plan',
                centerValue: 'Libre',
                data: [{ key: 'abierto', name: 'Sin limite', value: 1, color: '#cbd5e1' }],
              }
            : {
                centerLabel: focoCapacidad.label,
                centerValue: `${focoCapacidad.percentage}%`,
                data: [
                  { key: 'en_uso', name: 'En uso', value: focoCapacidad.used, color: '#0f172a' },
                  { key: 'disponible', name: 'Disponible', value: focoCapacidad.available, color: '#cbd5e1' },
                ],
              },
      },
    ]

    const quickLinks = [
      {
        id: 'pacientes',
        label: 'Pacientes y tutores',
        detail: 'Registrar tutores, abrir fichas y mantener la base activa.',
        to: '/pacientes',
      },
      {
        id: 'historias',
        label: 'Historias clinicas',
        detail: 'Continuar consulta, diagnostico y tratamiento sin pasar por varias vistas.',
        to: '/historias',
      },
      {
        id: 'usuarios',
        label: 'Usuarios y permisos',
        detail: 'Crear equipo, revisar cupos y corregir roles sin salir del backoffice.',
        to: '/usuarios',
      },
      {
        id: 'configuracion',
        label: 'Configuracion de clinica',
        detail: 'Actualizar identidad, contacto institucional y ficha fiscal.',
        to: '/configuracion',
      },
    ]

    const moduleGroups = [
      {
        id: 'operacion',
        title: 'Operacion diaria',
        subtitle: 'Lo que el equipo usa en atencion, consulta y seguimiento.',
        items: [
          {
            id: 'agenda',
            label: 'Agenda',
            description: 'Programacion diaria, confirmaciones y reprogramaciones del equipo.',
            to: '/agenda',
          },
          {
            id: 'pacientes',
            label: 'Pacientes',
            description: 'Base activa para tutores, mascotas y acceso rapido a la ficha.',
            to: '/pacientes',
          },
          {
            id: 'historias',
            label: 'Historias y antecedentes',
            description: 'Consulta, tratamiento y contexto clinico permanente del paciente.',
            to: '/historias',
          },
        ],
      },
      {
        id: 'administracion',
        title: 'Gestion administrativa',
        subtitle: 'Finanzas, inventario y equipo en una lectura mas ordenada.',
        items: [
          {
            id: 'finanzas',
            label: 'Finanzas',
            description: 'Facturas, ingresos, caja y emision electronica cuando aplique.',
            to: '/finanzas',
          },
          {
            id: 'inventario',
            label: 'Inventario',
            description: 'Stock, vencimientos, movimientos y categorias activas.',
            to: '/inventario',
          },
          {
            id: 'usuarios',
            label: 'Usuarios',
            description: 'Altas, permisos, estado del equipo y continuidad administrativa.',
            to: '/usuarios',
          },
        ],
      },
      {
        id: 'control',
        title: 'Control y soporte',
        subtitle: 'Lo que sostiene trazabilidad, configuracion y crecimiento comercial.',
        items: [
          {
            id: 'configuracion',
            label: 'Clinica',
            description: 'Identidad institucional, contacto visible y perfil fiscal.',
            to: '/configuracion',
          },
          {
            id: 'auditoria',
            label: 'Auditoria',
            description: 'Actividad reciente, eventos fallidos y cambios sensibles.',
            to: '/auditoria',
          },
          {
            id: 'planes',
            label: 'Plan y capacidad',
            description: 'Vigencia, funcionalidades incluidas y decision de upgrade.',
            to: '/planes',
          },
        ],
      },
    ]

    return (
      <div className="space-y-5">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_400px]">
          <DashboardPanel
            title="Lo primero que conviene revisar"
            subtitle="Tres señales rapidas para saber si hoy la clinica necesita atencion operativa, comercial o administrativa."
            action={
              <StatusPill tone="border-slate-200 bg-slate-100 text-slate-700">
                Corte del dia
              </StatusPill>
            }
          >
            <div className="grid gap-4 md:grid-cols-2">
              {focusCards.map((card) => (
                <div
                  key={card.id}
                  className={`border border-slate-200 bg-white px-4 py-4 ${
                    card.id === 'capacidad' ? 'md:col-span-2' : ''
                  }`}
                >
                  <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_92px] sm:items-start">
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                        {card.label}
                      </p>
                      <p className="mt-3 text-base font-semibold text-slate-950">{card.resumen}</p>
                      <p className="mt-3 text-sm leading-6 text-slate-700">{card.detalle}</p>
                    </div>
                    <div className="justify-self-start sm:justify-self-end">
                      <MiniDonutChart
                        data={card.chart.data}
                        centerLabel={card.chart.centerLabel}
                        centerValue={card.chart.centerValue}
                      />
                    </div>
                  </div>
                  <Link
                    to={card.to}
                    className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-slate-950 hover:text-slate-700"
                  >
                    {card.actionLabel}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              ))}
            </div>
          </DashboardPanel>

          <DashboardPanel
            title="Accesos frecuentes"
            subtitle="Tareas que suelen abrir primero administracion, recepcion o gerencia."
          >
            <div className="grid gap-3">
              {quickLinks.map((item) => (
                <Link
                  key={item.id}
                  to={item.to}
                  className="flex items-start justify-between gap-4 border border-slate-200 bg-slate-50 px-4 py-4 transition hover:border-cyan-500 hover:bg-white"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-950">{item.label}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{item.detail}</p>
                  </div>
                  <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-cyan-700" />
                </Link>
              ))}
            </div>
          </DashboardPanel>
        </div>

        <div className="grid gap-4 xl:grid-cols-4">
          <KpiCard
            icon={Wallet}
            label="Ingresos del mes"
            value={formatCurrency(ingresosMesActual)}
            helper="Total acumulado del mes actual segun facturas emitidas o pagadas."
            tone="text-emerald-700"
          />
          <KpiCard
            icon={CalendarClock}
            label="Citas de hoy"
            value={formatNumber(citasHoy)}
            helper={`${formatNumber(citasPendientesHoy)} pendientes al corte del dia.`}
            tone="text-cyan-700"
          />
          <KpiCard
            icon={PawPrint}
            label="Pacientes activos"
            value={formatNumber(mascotasActivas)}
            helper={`${formatNumber(propietariosActivos)} propietarios activos registrados.`}
            tone="text-sky-700"
          />
          <KpiCard
            icon={Boxes}
            label="Alertas de inventario"
            value={formatNumber(alertasInventario)}
            helper="Productos por debajo del stock minimo registrado."
            tone="text-amber-700"
          />
        </div>

        <div className="grid gap-5 xl:grid-cols-3">
          {moduleGroups.map((group) => (
            <DashboardPanel key={group.id} title={group.title} subtitle={group.subtitle}>
              <div className="space-y-3">
                {group.items.map((item) => (
                  <Link
                    key={item.id}
                    to={item.to}
                    className="flex items-start justify-between gap-4 border border-slate-200 bg-slate-50 px-4 py-4 transition hover:border-cyan-500 hover:bg-white"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-950">{item.label}</p>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
                    </div>
                    <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-cyan-700" />
                  </Link>
                ))}
              </div>
            </DashboardPanel>
          ))}
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_420px]">
        {puedeVerIngresos ? (
          <LinePanel
            title="Comportamiento diario de ingresos"
            subtitle={`Movimiento del ${formatShortDate(rangoMes.fechaInicio)} al ${formatShortDate(rangoMes.fechaFin)}.`}
            data={ingresosPorDia}
            dataKey="total"
            color="#0f4c81"
            formatter={formatCurrency}
            emptyMessage="Aun no hay ingresos registrados en el periodo actual."
          />
        ) : (
          <EmptyModuleState
            title="Ingresos no disponibles en el plan actual"
            body="Para ver la evolucion financiera del mes y las facturas emitidas necesitas caja activa y reportes operativos."
            ctaLabel="Revisar planes"
          />
        )}

        <DonutCard
          title="Capacidad de pacientes"
          subtitle="Uso administrativo del cupo permitido por la suscripcion actual."
          data={patientCapacity.rows}
          centerLabel="Uso del plan"
          centerValue={patientCapacity.centerValue}
          formatter={(value) => formatNumber(value)}
          emptyMessage="No hay datos de capacidad disponibles."
        />
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <DataTable
          title="Alertas administrativas"
          subtitle="Lo que conviene revisar primero antes de pasar al detalle operativo."
          rows={adminAlerts}
          columns={[
            { key: 'area', label: 'Area' },
            { key: 'estado', label: 'Estado' },
            { key: 'detalle', label: 'Detalle' },
            {
              key: 'accion',
              label: 'Accion',
              render: (row) => (
                <Link to={row.actionTo} className="text-sm font-semibold text-cyan-700 hover:text-cyan-800">
                  {row.actionLabel}
                </Link>
              ),
            },
          ]}
          emptyTitle="Sin alertas relevantes"
          emptyBody="No hay alertas para mostrar en este momento."
        />

        <DataTable
          title="Ultimas facturas del mes"
          subtitle="Factura, fecha, total y metodo de pago visibles sin salir del panel."
          rows={invoiceRows}
          columns={[
            { key: 'numero', label: 'Factura' },
            { key: 'fecha', label: 'Fecha' },
            { key: 'metodoPago', label: 'Metodo' },
            { key: 'total', label: 'Total' },
          ]}
          emptyTitle="Aun no hay facturas en el mes"
          emptyBody="Cuando el flujo de caja empiece a moverse, aqui veras las ultimas facturas emitidas."
          action={
            puedeVerIngresos ? (
              <StatusPill tone="border-emerald-200 bg-emerald-50 text-emerald-700">
                Caja activa
              </StatusPill>
            ) : null
          }
        />
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <DataTable
          title="Actividad reciente"
          subtitle="Cambios y eventos del sistema registrados en el corte actual."
          rows={recentAuditRows}
          columns={[
            { key: 'fecha', label: 'Fecha' },
            { key: 'accion', label: 'Accion' },
            { key: 'responsable', label: 'Responsable' },
            {
              key: 'resultado',
              label: 'Resultado',
              render: (row) => (
                <StatusPill
                  tone={
                    row.resultado === 'fallido'
                      ? 'border-red-200 bg-red-50 text-red-700'
                      : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  }
                >
                  {row.resultado}
                </StatusPill>
              ),
            },
          ]}
          emptyTitle="Aun no hay actividad registrada"
          emptyBody="Cuando el equipo cree, edite o valide procesos del sistema, aqui veras la traza reciente."
          action={
            <Link to="/auditoria" className="text-sm font-semibold text-cyan-700 hover:text-cyan-800">
              Ver modulo
            </Link>
          }
        />

        <DashboardPanel
          title="Control interno"
          subtitle="Trazabilidad rapida para administracion y soporte."
          action={<History className="h-4 w-4 text-cyan-700" />}
        >
          <div className="space-y-4">
            <div className="border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-7 text-slate-600">
              La auditoria ya registra accesos, cambios de usuarios, movimientos sensibles y eventos fallidos sin salir del backoffice.
            </div>
            <div className="grid gap-3">
              <div className="border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                Eventos del corte: <span className="font-semibold text-slate-950">{formatNumber(auditoriaRecienteQuery.data?.resumen?.totalEventos || 0)}</span>
              </div>
              <div className="border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                Fallidos del corte: <span className="font-semibold text-slate-950">{formatNumber(auditoriaRecienteQuery.data?.resumen?.totalFallidos || 0)}</span>
              </div>
            </div>
            <Link
              to="/auditoria"
              className="inline-flex items-center gap-2 border border-slate-200 bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Abrir auditoria completa
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </DashboardPanel>
        </div>
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

        <DataTable
          title="Lectura operativa de agenda"
          subtitle="Resumen directo para recepcion y coordinacion del equipo."
          rows={estadosCita}
          columns={[
            { key: 'name', label: 'Estado' },
            { key: 'value', label: 'Cantidad', render: (row) => formatNumber(row.value) },
          ]}
          emptyTitle="No hay estados para mostrar"
          emptyBody="Cuando existan citas en el periodo, aqui veras una lectura simple del estado operativo."
        />
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
            tone="text-cyan-700"
          />
          <KpiCard
            icon={ShieldCheck}
            label="Metodos activos"
            value={formatNumber(metodosPago.length)}
            helper="Cantidad de formas de pago usadas en el periodo."
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
              className="text-sm font-semibold text-cyan-700 hover:text-cyan-800"
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
              className="text-sm font-semibold text-cyan-700 hover:text-cyan-800"
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
          tone="text-cyan-700"
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

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
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

        <DashboardPanel
          title="Modulo operativo publicado"
          subtitle="Acceso directo a la base real de pacientes y tutores."
        >
          <div className="space-y-4">
            <div className="border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-7 text-slate-600">
              La primera pantalla interna ya esta resuelta: registrar tutor, registrar paciente y
              consultar la base activa sin depender de cards decorativas.
            </div>
            <Link
              to="/pacientes"
              className="inline-flex items-center gap-2 border border-slate-200 bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Abrir pacientes y tutores
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </DashboardPanel>
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
                {diasRestantes} dias de prueba
              </StatusPill>
            ) : null}
          </div>
        }
      >
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="border border-slate-200 bg-slate-50 px-4 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              Clinica
            </p>
            <p className="mt-3 text-base font-semibold text-slate-950">{nombreClinica}</p>
            <p className="mt-2 text-sm text-slate-600">{ubicacionClinica || 'Ubicacion pendiente'}</p>
          </div>
          <div className="border border-slate-200 bg-slate-50 px-4 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              Vigencia
            </p>
            <p className="mt-3 text-base font-semibold text-slate-950">
              {suscripcion?.fechaFin ? formatLongDate(suscripcion.fechaFin) : 'Sin fecha de cierre'}
            </p>
            <p className="mt-2 text-sm text-slate-600">
              {advertenciaPlan || 'El plan se encuentra sin alertas comerciales criticas.'}
            </p>
          </div>
          <div className="border border-slate-200 bg-slate-50 px-4 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              Accion recomendada
            </p>
            <p className="mt-3 text-base font-semibold text-slate-950">Gestion comercial</p>
            <p className="mt-2 text-sm text-slate-600">
              Usa esta vista para decidir upgrades antes de bloquear operacion por cupos o modulos.
            </p>
            <Link
              to="/planes"
              className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-cyan-700 hover:text-cyan-800"
            >
              Revisar planes
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </DashboardPanel>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
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
                      : 'border-slate-200 bg-slate-100 text-slate-600'
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

        <DataTable
          title="Alertas comerciales"
          subtitle="Lo que puede afectar la continuidad operativa si no se revisa a tiempo."
          rows={adminAlerts}
          columns={[
            { key: 'area', label: 'Area' },
            { key: 'estado', label: 'Estado' },
            { key: 'detalle', label: 'Detalle' },
          ]}
          emptyTitle="Sin alertas"
          emptyBody="No hay alertas comerciales relevantes para mostrar."
        />
      </div>
    </div>
  )

  const activeView = {
    resumen: renderSummaryTab(),
    agenda: renderAgendaTab(),
    ingresos: renderIngresosTab(),
    inventario: renderInventarioTab(),
    pacientes: renderPacientesTab(),
    plan: renderPlanTab(),
  }[activeTab]

  const sidebarBadges = {
    resumen: adminAlerts.length > 0 ? `${adminAlerts.length}` : null,
    agenda: citasHoy > 0 ? `${citasHoy}` : null,
    ingresos: puedeVerIngresos ? null : 'Plan',
    inventario: alertasInventario > 0 ? `${alertasInventario}` : null,
    pacientes: limiteMascotas !== null ? `${Math.max(cupoMascotas, 0)}` : null,
    plan: typeof diasRestantes === 'number' ? `${diasRestantes}d` : null,
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="mx-auto max-w-[1600px] px-4 py-4 sm:px-6 lg:px-8">
        <div className="grid gap-5 xl:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="border border-slate-900 bg-slate-950 px-4 py-5 text-white shadow-sm">
            <div className="border-b border-slate-800 pb-5">
              <div className="flex h-12 w-12 items-center justify-center border border-slate-700 bg-slate-900 text-cyan-200">
                <Stethoscope className="h-5 w-5" />
              </div>
              <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Panel administrativo
              </p>
              <h1 className="mt-3 text-2xl font-semibold text-white">{nombreClinica}</h1>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                {ubicacionClinica || 'Ubicacion pendiente por completar'}
              </p>
            </div>

            <div className="mt-5 space-y-3">
              {TAB_GROUPS.map((group) => {
                const isOpen = openSidebarGroups[group.key] || group.items.includes(activeTab)
                const groupTabs = group.items.map((itemId) => TAB_BY_ID[itemId]).filter(Boolean)

                return (
                  <div key={group.key} className="border border-slate-800 bg-slate-950">
                    <button
                      type="button"
                      onClick={() =>
                        setOpenSidebarGroups((current) => ({
                          ...current,
                          [group.key]: !current[group.key],
                        }))
                      }
                      className="flex w-full items-center justify-between px-3 py-3 text-left"
                    >
                      <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                        {group.label}
                      </span>
                      <ChevronDown
                        className={`h-4 w-4 text-slate-500 transition ${isOpen ? 'rotate-180' : ''}`}
                      />
                    </button>

                    {isOpen ? (
                      <div className="space-y-3 border-t border-slate-800 p-3">
                        {groupTabs.map((tab) => (
                          <SidebarTabButton
                            key={tab.id}
                            icon={tab.icon}
                            label={tab.label}
                            active={activeTab === tab.id}
                            badge={sidebarBadges[tab.id]}
                            onClick={() => setActiveTab(tab.id)}
                          />
                        ))}
                      </div>
                    ) : null}
                  </div>
                )
              })}
            </div>

            <div className="mt-6 space-y-3 border-t border-slate-800 pt-5">
              <div className="border border-slate-800 bg-slate-900 px-3 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Plan actual
                </p>
                <p className="mt-2 text-sm font-semibold text-white">{metaPlan.nombre}</p>
              </div>
              <Link
                to="/pacientes"
                className="inline-flex w-full items-center justify-center gap-2 border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:border-slate-600 hover:bg-slate-800"
              >
                Abrir pacientes
                <ArrowRight className="h-4 w-4" />
              </Link>
              <button
                type="button"
                onClick={logout}
                className="inline-flex w-full items-center justify-center gap-2 border border-slate-700 bg-slate-950 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:border-slate-600 hover:bg-slate-900"
              >
                <LogOut className="h-4 w-4" />
                Cerrar sesion
              </button>
            </div>
          </aside>

          <div className="space-y-5">
            <header className="border border-slate-200 bg-white px-5 py-5 shadow-sm">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Vista ejecutiva
                  </p>
                  <h2 className="mt-3 text-3xl font-semibold text-slate-950">
                    Lo importante primero: operacion, ingresos y control.
                  </h2>
                  <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
                    Este dashboard ya no intenta adornar la pantalla. Organiza lo financiero, lo
                    operativo y lo comercial por pestañas para que el equipo vea rapido lo que de
                    verdad necesita gestionar.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <StatusPill tone={metaPlan.tone}>{metaPlan.nombre}</StatusPill>
                  {typeof diasRestantes === 'number' ? (
                    <StatusPill tone="border-amber-200 bg-amber-50 text-amber-700">
                      {diasRestantes} dias
                    </StatusPill>
                  ) : null}
                  <StatusPill tone="border-slate-200 bg-slate-100 text-slate-700">
                    Corte {formatShortDate(rangoMes.fechaFin)}
                  </StatusPill>
                </div>
              </div>
            </header>

            {(suscripcionQuery.isError || dashboardQuery.isError) ? (
              <div className="grid gap-4">
                {suscripcionQuery.isError ? (
                  <div className="border border-red-200 bg-red-50 px-4 py-4 text-sm leading-7 text-red-700">
                    {getErrorMessage(
                      suscripcionQuery.error,
                      'No fue posible cargar la suscripcion activa de la clinica.'
                    )}
                  </div>
                ) : null}
                {dashboardQuery.isError ? (
                  <div className="border border-amber-200 bg-amber-50 px-4 py-4 text-sm leading-7 text-amber-800">
                    {getErrorMessage(
                      dashboardQuery.error,
                      'No fue posible cargar el resumen administrativo del dashboard.'
                    )}
                  </div>
                ) : null}
              </div>
            ) : null}

            {dashboardQuery.isLoading || suscripcionQuery.isLoading ? (
              <DashboardPanel
                title="Cargando dashboard"
                subtitle="Estamos reuniendo el corte administrativo de la clinica."
              >
                <div className="grid gap-4 xl:grid-cols-4">
                  {[0, 1, 2, 3].map((item) => (
                    <div key={item} className="h-40 animate-pulse border border-slate-200 bg-slate-50" />
                  ))}
                </div>
              </DashboardPanel>
            ) : (
              activeView
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
