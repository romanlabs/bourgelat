import { useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Boxes, CalendarClock, CalendarPlus, PawPrint, Receipt, Stethoscope, Wallet } from 'lucide-react'
import AdminShell from '@/components/layout/AdminShell'
import { cajaApi } from '@/features/caja/cajaApi'
import { agendaApi } from '@/features/agenda/agendaApi'
import { dashboardApi } from '@/features/dashboard/dashboardApi'
import { StatusPill } from '@/features/dashboard/dashboardComponents'
import {
  PAYMENT_METHOD_LABELS,
  formatNumber,
} from '@/features/dashboard/dashboardUtils'
import JornadaHoy from '@/features/dashboard/JornadaHoy'
import TirarParaRefrescar from '@/components/movil/TirarParaRefrescar'
import { canAccessModule, hasAnyRole } from '@/lib/permissions'
import { useAuthStore } from '@/store/authStore'

const EMPTY_LIST = []

const serializeDate = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message || error?.message || fallback

// Dentro de AdminShell como el resto de la app: sin él, los roles no admin
// entraban a una página sin menú, sin buscador y sin forma de cerrar sesión.
// Accesos del panel para roles no admin, filtrados por permisos: antes la
// tarjeta llevaba siempre a Pacientes, aunque el rol (ej. facturador) no
// tuviera acceso y rebotara.
const MODULOS_OPERATIVOS = [
  { key: 'agenda', to: '/agenda', icon: CalendarClock, titulo: 'Agenda', descripcion: 'Citas del día, sala de espera y recepción.' },
  { key: 'pacientes', to: '/pacientes', icon: PawPrint, titulo: 'Pacientes y tutores', descripcion: 'Fichas de pacientes y datos de sus tutores.' },
  { key: 'historias', to: '/historias', icon: Stethoscope, titulo: 'Historias clínicas', descripcion: 'Consultas, fórmulas y exámenes de cada paciente.' },
  { key: 'caja', to: '/caja', icon: Wallet, titulo: 'Caja', descripcion: 'Ventas, cobros y tu turno de caja.' },
  { key: 'inventario', to: '/inventario', icon: Boxes, titulo: 'Inventario', descripcion: 'Productos, insumos y facturas de compra.' },
]

// Hoy para los roles que no administran: la misma jornada del admin, sin la
// caja del día ni los reportes. Los accesos a módulos solo salen si el rol no
// ve la agenda: con la jornada en pantalla repetían el menú lateral.
function RestrictedDashboard({ usuario }) {
  const hoy = useMemo(() => serializeDate(new Date()), [])
  const puedeVerAgenda = canAccessModule(usuario, 'agenda')
  const modulos = MODULOS_OPERATIVOS.filter((modulo) => canAccessModule(usuario, modulo.key))

  const agendaHoyQuery = useQuery({
    queryKey: ['dashboard-citas-hoy-detalle', hoy],
    queryFn: () => agendaApi.obtenerCitas({ fecha: hoy, pagina: 1, limite: 40 }),
    enabled: puedeVerAgenda,
  })
  const citas = agendaHoyQuery.data?.citas ?? EMPTY_LIST

  // El veterinario ve sus pacientes y los que aún no tienen profesional.
  const citasOrdenadas = useMemo(() => {
    if (!usuario?.id || !hasAnyRole(usuario, ['veterinario'])) return citas
    return citas.filter((c) => !c.veterinario?.id || c.veterinario.id === usuario.id)
  }, [citas, usuario])

  const enEspera = citasOrdenadas.filter((c) => c.estado === 'en_espera').length
  const atendidas = citasOrdenadas.filter((c) => c.estado === 'completada').length
  const total = citasOrdenadas.length
  const fechaHoy = new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })
  const titulo = !puedeVerAgenda
    ? `Hola, ${usuario?.nombre?.split(' ')[0] || 'bienvenido'}`
    : total === 0
      ? 'Sin citas hoy'
      : total === 1
        ? '1 cita hoy'
        : `${formatNumber(total)} citas hoy`
  const descripcion = [
    fechaHoy.charAt(0).toUpperCase() + fechaHoy.slice(1),
    total > 0 ? `${formatNumber(atendidas)} ${atendidas === 1 ? 'atendida' : 'atendidas'}` : null,
    enEspera > 0 ? `${formatNumber(enEspera)} en espera` : null,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <AdminShell currentKey="dashboard" title={titulo} description={descripcion}>
      <TirarParaRefrescar onRefrescar={() => agendaHoyQuery.refetch()} className="space-y-4 lg:space-y-6 bajo:space-y-4">
      {puedeVerAgenda ? (
        <JornadaHoy
          citas={citasOrdenadas}
          loading={agendaHoyQuery.isLoading}
          puedeAtender={canAccessModule(usuario, 'historias')}
          puedeCobrar={canAccessModule(usuario, 'caja')}
          puedeVerCaja={false}
        />
      ) : null}

      {!puedeVerAgenda && modulos.length > 0 ? (
        <section aria-labelledby="hoy-modulos" className="flex flex-col gap-3">
          <h2 id="hoy-modulos" className="text-lg font-semibold tracking-[-0.01em]">
            Tus módulos
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {modulos.map((modulo) => {
              const Icon = modulo.icon
              return (
                <Link
                  key={modulo.key}
                  to={modulo.to}
                  className="group flex flex-col gap-3 rounded-2xl bg-card p-5 transition hover:bg-accent active:translate-y-px"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-primary group-hover:bg-card">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="text-base font-semibold">{modulo.titulo}</span>
                  <span className="text-sm leading-5 text-muted-foreground">{modulo.descripcion}</span>
                </Link>
              )
            })}
          </div>
        </section>
      ) : null}
      </TirarParaRefrescar>
    </AdminShell>
  )
}


// Hoy del administrador: la jornada y la caja del día. Lo que hay que revisar
// (historias sin cerrar, stock, fiado) está en la campanita del encabezado.
// Los reportes del mes viven en Finanzas; las pestañas que los repetían aquí
// se quitaron.
export default function DashboardPage() {
  const usuario = useAuthStore((state) => state.usuario)
  const setSuscripcion = useAuthStore((state) => state.setSuscripcion)

  const esAdministrador = hasAnyRole(usuario, ['admin', 'superadmin'])
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

  const agendaHoyQuery = useQuery({
    queryKey: ['dashboard-citas-hoy-detalle', hoy],
    queryFn: () => agendaApi.obtenerCitas({ fecha: hoy, pagina: 1, limite: 40 }),
    enabled: esAdministrador,
    placeholderData: (previousData) => previousData,
  })

  const ingresosHoyQuery = useQuery({
    queryKey: ['dashboard-ingresos', hoy, hoy],
    queryFn: () => dashboardApi.obtenerReporteIngresos({ fechaInicio: hoy, fechaFin: hoy }),
    enabled: esAdministrador,
  })

  const turnoActivoQuery = useQuery({
    queryKey: ['caja-turno-activo'],
    queryFn: () => cajaApi.obtenerTurnoActivo(),
    enabled: esAdministrador,
  })

  const refrescarHoy = () =>
    Promise.all([
      dashboardQuery.refetch(),
      agendaHoyQuery.refetch(),
      ingresosHoyQuery.refetch(),
      turnoActivoQuery.refetch(),
    ])

  const resumen = dashboardQuery.data
  const citasHoy = resumen?.hoy?.citasTotales ?? 0
  const diasRestantes = suscripcionQuery.data?.diasRestantes

  const citasHoyRows = useMemo(() => agendaHoyQuery.data?.citas ?? EMPTY_LIST, [agendaHoyQuery.data?.citas])
  const cajaHoy = useMemo(() => {
    const porMetodo = Object.entries(ingresosHoyQuery.data?.ingresosPorMetodoPago || {})
      .map(([key, valor]) => ({ key, label: PAYMENT_METHOD_LABELS[key] || key, valor: Number(valor) || 0 }))
      .filter((metodo) => metodo.valor > 0)
      .sort((a, b) => b.valor - a.valor)
    const apertura = turnoActivoQuery.data?.turno?.fechaApertura
    return {
      total: porMetodo.length
        ? porMetodo.reduce((suma, metodo) => suma + metodo.valor, 0)
        : Number(ingresosHoyQuery.data?.totalIngresos) || 0,
      porMetodo,
      turnoApertura: apertura
        ? new Date(apertura).toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' })
        : null,
    }
  }, [ingresosHoyQuery.data?.ingresosPorMetodoPago, turnoActivoQuery.data?.turno?.fechaApertura, ingresosHoyQuery.data?.totalIngresos])

  if (!esAdministrador) {
    return <RestrictedDashboard usuario={usuario} />
  }

  const esVeterinario = hasAnyRole(usuario, ['veterinario'])

  // El encabezado responde lo primero que se pregunta al llegar: cuántas citas
  // hay y cómo va el día.
  const atendidasHoy = citasHoyRows.filter((c) => c.estado === 'completada').length
  const enEsperaHoy = citasHoyRows.filter((c) => c.estado === 'en_espera').length
  const enConsultaHoy = citasHoyRows.find((c) => c.estado === 'en_atencion')
  const tituloHoy =
    citasHoy === 0 ? 'Sin citas hoy' : citasHoy === 1 ? '1 cita hoy' : `${formatNumber(citasHoy)} citas hoy`
  const fechaHoy = new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })
  const descripcionHoy = [
    fechaHoy.charAt(0).toUpperCase() + fechaHoy.slice(1),
    citasHoy > 0 ? `${formatNumber(atendidasHoy)} ${atendidasHoy === 1 ? 'atendida' : 'atendidas'}` : null,
    enConsultaHoy?.mascota?.nombre ? `${enConsultaHoy.mascota.nombre} en consulta` : null,
    enEsperaHoy > 0 ? `${formatNumber(enEsperaHoy)} en espera` : null,
  ]
    .filter(Boolean)
    .join(' · ')

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
  ].filter(Boolean)

  return (
    <AdminShell
      currentKey="dashboard"
      title={tituloHoy}
      description={descripcionHoy}
      actions={
        <>
          {typeof diasRestantes === 'number' && diasRestantes <= 5 ? (
            <StatusPill tone="bg-danger-soft text-danger">
              Tu plan vence en {diasRestantes} {diasRestantes === 1 ? 'día' : 'días'}
            </StatusPill>
          ) : null}
          <Link
            to="/caja"
            className="hidden h-10 items-center gap-2 rounded-lg bg-secondary px-4 text-sm font-semibold text-secondary-foreground transition hover:brightness-95 active:translate-y-px lg:inline-flex"
          >
            <Receipt className="h-4 w-4" />
            Cobrar
          </Link>
          <Link
            to="/agenda?nueva=1"
            className="hidden h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:brightness-110 active:translate-y-px lg:inline-flex"
          >
            <CalendarPlus className="h-4 w-4" />
            Nueva cita
          </Link>
        </>
      }
    >
      <TirarParaRefrescar onRefrescar={refrescarHoy} className="space-y-4 lg:space-y-6 bajo:space-y-4">
      <div className="grid grid-cols-2 gap-2 lg:hidden">
        <Link
          to="/agenda?nueva=1"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary text-[15px] font-semibold text-primary-foreground active:scale-[0.98]"
        >
          <CalendarPlus className="h-4 w-4" />
          Nueva cita
        </Link>
        <Link
          to="/caja"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-secondary text-[15px] font-semibold text-secondary-foreground active:scale-[0.98]"
        >
          <Receipt className="h-4 w-4" />
          Cobrar
        </Link>
      </div>

      {queryErrors.length > 0 ? (
        <div className="space-y-3">
          {queryErrors.map((message) => (
            <div
              key={message}
              className="rounded-2xl border border-danger/30 bg-danger-soft px-4 py-4 text-sm leading-7 text-danger shadow-sm"
            >
              {message}
            </div>
          ))}
        </div>
      ) : null}

      {dashboardQuery.isLoading || suscripcionQuery.isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((item) => (
            <div
              key={item}
              className="h-20 animate-pulse rounded-xl border border-border bg-card shadow-panel"
            />
          ))}
          <div className="h-72 animate-pulse rounded-2xl border border-border bg-card shadow-panel sm:col-span-2 lg:col-span-4" />
        </div>
      ) : (
        <JornadaHoy
          citas={citasHoyRows}
          loading={agendaHoyQuery.isLoading}
          cajaHoy={cajaHoy}
          puedeAtender
          puedeCobrar
          puedeVerCaja
          usuarioIdMios={esVeterinario ? usuario?.id : null}
        />
      )}
      </TirarParaRefrescar>
    </AdminShell>
  )
}
