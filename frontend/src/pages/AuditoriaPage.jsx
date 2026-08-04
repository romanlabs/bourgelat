import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Activity, CircleAlert, ScanSearch, ShieldCheck, UserRoundCog } from 'lucide-react'
import AdminShell from '@/components/layout/AdminShell'
import { NavCta } from '@/components/shared/NavCta'
import {
  DashboardPanel,
  DataTable,
  DonutCard,
  KpiCard,
  StatusPill,
} from '@/features/dashboard/dashboardComponents'
import {
  formatNumber,
  getCurrentMonthRange,
  objectToChartData,
} from '@/features/dashboard/dashboardUtils'
import { auditoriaApi } from '@/features/auditoria/auditoriaApi'
import { useAuthStore } from '@/store/authStore'
import { hasAnyRole } from '@/lib/permissions'

const RESULT_OPTIONS = [
  { value: 'todos', label: 'Todos los resultados' },
  { value: 'exitoso', label: 'Exitosos' },
  { value: 'fallido', label: 'Fallidos' },
]

const ENTITY_LABELS = {
  Usuario: 'Usuarios',
  Factura: 'Facturas',
  Cita: 'Agenda',
  HistoriaClinica: 'Historias',
  Antecedente: 'Antecedentes',
  Clinica: 'Clínica',
  IntegracionFacturacion: 'Facturación electrónica',
  Auth: 'Ingreso al sistema',
}

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message || error?.message || fallback

const formatAuditDate = (value) => {
  if (!value) return 'Sin fecha'

  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

const formatActionLabel = (value) =>
  String(value || 'SIN_ACCION')
    .toLowerCase()
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())

const formatEntityLabel = (value) => ENTITY_LABELS[value] || value || 'Sin sección'

function RestrictedAuditPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <DashboardPanel
          title="Auditoría y actividad"
          subtitle="Esta sección se reserva para la administración principal."
        >
          <div className="border border-border bg-muted px-4 py-5 text-sm leading-7 text-muted-foreground">
            Tu acceso actual no tiene permisos para consultar el historial de cambios delicados ni la actividad del sistema.
          </div>
        </DashboardPanel>
      </div>
    </div>
  )
}

export default function AuditoriaPage() {
  const usuario = useAuthStore((state) => state.usuario)
  const [buscar, setBuscar] = useState('')
  const [resultado, setResultado] = useState('todos')
  const [entidad, setEntidad] = useState('todas')
  const [accion, setAccion] = useState('todas')
  const [pagina, setPagina] = useState(1)

  const rangoMes = useMemo(() => getCurrentMonthRange(), [])
  const [desde, setDesde] = useState(rangoMes.fechaInicio)
  const [hasta, setHasta] = useState(rangoMes.fechaFin)

  const rolPermitido = hasAnyRole(usuario, ['admin', 'superadmin'])

  useEffect(() => {
    document.title = 'Auditoria | Bourgelat'
  }, [])

  const auditoriaQuery = useQuery({
    queryKey: ['auditoria', pagina, buscar, resultado, entidad, accion, desde, hasta],
    queryFn: () =>
      auditoriaApi.obtenerLogs({
        pagina,
        limite: 14,
        buscar: buscar.trim() || undefined,
        resultado: resultado !== 'todos' ? resultado : undefined,
        entidad: entidad !== 'todas' ? entidad : undefined,
        accion: accion !== 'todas' ? accion : undefined,
        desde,
        hasta,
      }),
    enabled: rolPermitido,
    placeholderData: (previousData) => previousData,
  })

  const logsRows = useMemo(
    () =>
      (auditoriaQuery.data?.logs || []).map((log) => ({
        id: log.id,
        fecha: formatAuditDate(log.createdAt),
        accion: formatActionLabel(log.accion),
        entidad: formatEntityLabel(log.entidad),
        responsable: log.responsable?.nombre || 'Sistema',
        responsableEmail: log.responsable?.email || '',
        resultado: log.resultado,
        descripcion: log.descripcion || 'Sin descripción adicional',
      })),
    [auditoriaQuery.data?.logs]
  )

  const resultData = useMemo(
    () => [
      {
        key: 'exitoso',
        name: 'Exitosos',
        value: Number(auditoriaQuery.data?.resumen?.totalExitosos || 0),
        color: '#0f766e',
      },
      {
        key: 'fallido',
        name: 'Fallidos',
        value: Number(auditoriaQuery.data?.resumen?.totalFallidos || 0),
        color: '#dc2626',
      },
    ],
    [auditoriaQuery.data?.resumen?.totalExitosos, auditoriaQuery.data?.resumen?.totalFallidos]
  )

  const entityData = useMemo(
    () => objectToChartData(auditoriaQuery.data?.resumen?.porEntidad, ENTITY_LABELS),
    [auditoriaQuery.data?.resumen?.porEntidad]
  )

  const topActionRows = useMemo(
    () =>
      Object.entries(auditoriaQuery.data?.resumen?.porAccion || {})
        .slice(0, 8)
        .map(([key, value]) => ({
          id: key,
          accion: formatActionLabel(key),
          total: formatNumber(value),
        })),
    [auditoriaQuery.data?.resumen?.porAccion]
  )

  const accionesDisponibles = auditoriaQuery.data?.accionesDisponibles || []
  const entidadesDisponibles = auditoriaQuery.data?.entidadesDisponibles || []

  if (!rolPermitido) {
    return <RestrictedAuditPage />
  }

  return (
    <AdminShell
      currentKey="auditoria"
      title="Auditoría y actividad"
      description="Vista para seguir cambios delicados del sistema, responsables, intentos fallidos y el historial de la operación de la clínica."
      headerBadge={
        <StatusPill tone="border-primary/30 bg-primary/10 text-primary">
          Historial activo
        </StatusPill>
      }
      actions={
        <NavCta to="/usuarios" icon={UserRoundCog}>
          Abrir usuarios
        </NavCta>
      }
      asideNote="Usa esta vista para seguir cambios de acceso, caja, historias e inventario sin depender de memoria o revisiones manuales."
    >
      {auditoriaQuery.isError ? (
        <div className="border border-red-200 bg-red-50 px-4 py-4 text-sm leading-7 text-red-700">
          {getErrorMessage(auditoriaQuery.error, 'No fue posible cargar la auditoría de la clínica.')}
        </div>
      ) : null}

      <div className="space-y-5">
        <div className="grid gap-4 xl:grid-cols-4">
          <KpiCard
            icon={Activity}
            label="Eventos del filtro"
            value={formatNumber(auditoriaQuery.data?.resumen?.totalEventos || 0)}
            helper="Total de movimientos según el rango y los filtros activos."
            tone="text-primary"
          />
          <KpiCard
            icon={ShieldCheck}
            label="Exitosos"
            value={formatNumber(auditoriaQuery.data?.resumen?.totalExitosos || 0)}
            helper="Cambios o accesos registrados sin error."
            tone="text-emerald-700"
          />
          <KpiCard
            icon={CircleAlert}
            label="Fallidos"
            value={formatNumber(auditoriaQuery.data?.resumen?.totalFallidos || 0)}
            helper="Intentos con error o resultado no exitoso."
            tone="text-rose-700"
          />
          <KpiCard
            icon={UserRoundCog}
            label="Usuarios involucrados"
            value={formatNumber(auditoriaQuery.data?.resumen?.usuariosInvolucrados || 0)}
            helper="Cantidad de cuentas distintas presentes en el corte."
            tone="text-violet-700"
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <DonutCard
            title="Resultado del evento"
            subtitle="Lectura rápida entre acciones exitosas y fallidas."
            data={resultData}
            centerLabel="Eventos"
            centerValue={formatNumber(auditoriaQuery.data?.resumen?.totalEventos || 0)}
            formatter={formatNumber}
            emptyMessage="Aun no hay datos para mostrar."
            chartSize={140}
          />
          <DonutCard
            title="Distribución por sección"
            subtitle="Qué sección generó más movimientos en el corte."
            data={entityData}
            centerLabel="Secciones"
            centerValue={formatNumber(entityData.length)}
            formatter={formatNumber}
            emptyMessage="Aún no hay secciones para mostrar."
            chartSize={140}
          />
        </div>

        <DashboardPanel
          title="Criterio de seguimiento"
          subtitle="La auditoría sirve para reconstruir qué pasó, quién lo hizo y si el sistema aceptó o rechazó la acción."
        >
          <div className="grid gap-3 lg:grid-cols-3">
            <div className="border border-border bg-muted px-4 py-4 text-sm leading-7 text-muted-foreground">
              Prioriza eventos <span className="font-semibold text-foreground">fallidos</span> en autenticacion, cambios de usuarios, anulaciones y bloqueos clinicos.
            </div>
            <div className="border border-border bg-muted px-4 py-4 text-sm leading-7 text-muted-foreground">
              Cuando una accion afecte caja, historias o permisos, esta vista te da responsable, momento y descripcion en un solo lugar.
            </div>
            <div className="border border-border bg-muted px-4 py-4 text-sm leading-7 text-muted-foreground">
              Mantener activo este seguimiento ayuda a soporte, control interno y decisiones de operacion sin depender de capturas o recuerdos.
            </div>
          </div>
        </DashboardPanel>

        <DashboardPanel
          title="Actividad registrada"
          subtitle="Filtra los eventos recientes por sección, resultado o responsable."
          action={
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center border border-border bg-card px-3">
                <ScanSearch className="h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  value={buscar}
                  onChange={(event) => {
                    setBuscar(event.target.value)
                    setPagina(1)
                  }}
                  placeholder="Buscar por acción o descripción"
                  className="h-10 w-[220px] border-0 bg-transparent px-3 text-sm text-foreground outline-none"
                />
              </div>
              <select
                value={resultado}
                onChange={(event) => {
                  setResultado(event.target.value)
                  setPagina(1)
                }}
                className="h-10 border border-border bg-card px-3 text-sm text-foreground outline-none transition focus:border-primary"
              >
                {RESULT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <select
                value={entidad}
                onChange={(event) => {
                  setEntidad(event.target.value)
                  setPagina(1)
                }}
                className="h-10 border border-border bg-card px-3 text-sm text-foreground outline-none transition focus:border-primary"
              >
                <option value="todas">Todas las secciones</option>
                {entidadesDisponibles.map((item) => (
                  <option key={item} value={item}>
                    {formatEntityLabel(item)}
                  </option>
                ))}
              </select>
              <select
                value={accion}
                onChange={(event) => {
                  setAccion(event.target.value)
                  setPagina(1)
                }}
                className="h-10 border border-border bg-card px-3 text-sm text-foreground outline-none transition focus:border-primary"
              >
                <option value="todas">Todas las acciones</option>
                {accionesDisponibles.map((item) => (
                  <option key={item} value={item}>
                    {formatActionLabel(item)}
                  </option>
                ))}
              </select>
              <input
                type="date"
                value={desde}
                onChange={(event) => {
                  setDesde(event.target.value)
                  setPagina(1)
                }}
                className="h-10 border border-border bg-card px-3 text-sm text-foreground outline-none transition focus:border-primary"
              />
              <input
                type="date"
                value={hasta}
                onChange={(event) => {
                  setHasta(event.target.value)
                  setPagina(1)
                }}
                className="h-10 border border-border bg-card px-3 text-sm text-foreground outline-none transition focus:border-primary"
              />
            </div>
          }
        >
          <DataTable
            title="Eventos"
            subtitle="Detalle cronologico del sistema para el corte actual."
            rows={logsRows}
            columns={[
              { key: 'fecha', label: 'Fecha' },
              { key: 'accion', label: 'Acción' },
              { key: 'entidad', label: 'Sección' },
              {
                key: 'responsable',
                label: 'Responsable',
                render: (row) => (
                  <div>
                    <p className="font-medium text-foreground">{row.responsable}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{row.responsableEmail || 'Sin correo asociado'}</p>
                  </div>
                ),
              },
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
              {
                key: 'descripcion',
                label: 'Descripción',
                render: (row) => <span className="text-sm text-muted-foreground">{row.descripcion}</span>,
              },
            ]}
            emptyTitle="No hay eventos para este filtro"
            emptyBody="Ajusta fechas o filtros para revisar otra parte del historial."
            action={
              <StatusPill tone="border-border bg-slate-100 text-foreground">
                Página {auditoriaQuery.data?.paginaActual || 1}
              </StatusPill>
            }
          />

          {(auditoriaQuery.data?.paginas || 1) > 1 ? (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
              <p className="text-sm text-muted-foreground">
                Página {auditoriaQuery.data?.paginaActual || 1} de {auditoriaQuery.data?.paginas || 1}
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setPagina((current) => Math.max(current - 1, 1))}
                  disabled={(auditoriaQuery.data?.paginaActual || 1) <= 1}
                  className="border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Anterior
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setPagina((current) => Math.min(current + 1, auditoriaQuery.data?.paginas || 1))
                  }
                  disabled={(auditoriaQuery.data?.paginaActual || 1) >= (auditoriaQuery.data?.paginas || 1)}
                  className="border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Siguiente
                </button>
              </div>
            </div>
          ) : null}
        </DashboardPanel>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <DataTable
            title="Acciones mas frecuentes"
            subtitle="Las acciones que más movimiento registraron en el corte."
            rows={topActionRows}
            columns={[
              { key: 'accion', label: 'Accion' },
              { key: 'total', label: 'Eventos' },
            ]}
            emptyTitle="Sin acciones agrupadas"
            emptyBody="Todavía no hay suficientes movimientos para construir este resumen."
          />

          <DashboardPanel
            title="Uso recomendado"
            subtitle="Dónde aporta más valor esta pantalla dentro de la operación diaria."
          >
            <div className="grid gap-4 xl:grid-cols-3">
              <div className="border border-border bg-muted px-4 py-4 text-sm leading-7 text-muted-foreground">
                Revisar altas, cambios de rol y desactivaciones de usuarios cuando el equipo cambie turnos o permisos.
              </div>
              <div className="border border-border bg-muted px-4 py-4 text-sm leading-7 text-muted-foreground">
                Auditar anulaciones, errores de caja o validaciones fallidas cuando el cierre administrativo no cuadre.
              </div>
              <div className="border border-border bg-muted px-4 py-4 text-sm leading-7 text-muted-foreground">
                Seguir bloqueos, historias o integraciones para soporte interno sin tener que revisar los datos uno por uno.
              </div>
            </div>
          </DashboardPanel>
        </div>
      </div>
    </AdminShell>
  )
}
