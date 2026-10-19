import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Search } from 'lucide-react'
import AdminShell from '@/components/layout/AdminShell'
import { DashboardPanel } from '@/features/dashboard/dashboardComponents'
import { formatLongDate, formatNumber } from '@/features/dashboard/dashboardUtils'
import { agendaApi } from '@/features/agenda/agendaApi'
import { historiasApi } from '@/features/historias/historiasApi'
import { useAuthStore } from '@/store/authStore'
import { canAccessModule } from '@/lib/permissions'
import { useHistoriasResumen } from '@/features/historias/useHistoriasResumen'
import { useDebouncedValue } from '@/lib/useDebouncedValue'
import { Select } from '@/components/ui/select'
import { cn } from '@/lib/utils'

// Cada chip es una pregunta operativa, no una metrica: al tocarlo filtra la
// tabla de abajo. 'pendientes' es el default porque una historia sin cerrar es
// inventario sin descontar y una consulta que todavia no se puede cobrar.
const FILTROS = {
  pendientes: { bloqueada: 'false' },
  controles: { conControlPendiente: 'true' },
  mes: {},
  todas: {},
}

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.errores?.[0]?.mensaje || error?.response?.data?.message || fallback

const FOCO = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

// Lo que le falta a una consulta abierta antes de cerrarla. Motivo, diagnóstico
// y tratamiento son obligatorios al guardar, así que solo se revisa lo opcional.
const faltantesDe = (historia) =>
  [
    !historia.peso && !historia.temperatura && 'signos vitales',
    !historia.examenFisicoDetalle && 'examen físico',
    !(Array.isArray(historia.medicamentos) && historia.medicamentos.length) && 'fórmula',
  ].filter(Boolean)

const CAMPO =
  'h-11 rounded-lg border border-input bg-card text-sm text-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-ring'

const BOTON_PAGINA =
  'inline-flex h-10 items-center rounded-lg bg-card px-4 text-sm font-semibold text-secondary-foreground outline-none transition hover:brightness-95 active:translate-y-px focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50'

const getCurrentMonthRange = () => {
  const now = new Date()
  const serialize = (date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

  return {
    fechaInicio: serialize(new Date(now.getFullYear(), now.getMonth(), 1)),
    fechaFin: serialize(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
  }
}

function RestrictedHistoriasPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <DashboardPanel
          title="Historias clínicas"
          subtitle="Esta sección se muestra a veterinarios, auxiliares o administración autorizada."
        >
          <div className="rounded-xl bg-muted px-4 py-4 text-[15px] leading-7 text-muted-foreground">
            Tu acceso actual no tiene visibilidad sobre la historia clínica. Solicita permisos al
            administrador o al médico responsable.
          </div>
        </DashboardPanel>
      </div>
    </div>
  )
}

export default function HistoriasPage() {
  const usuario = useAuthStore((state) => state.usuario)
  const [searchParams, setSearchParams] = useSearchParams()

  // El Dashboard entra aqui con ?estado=pendientes desde sus alertas.
  const estadoInicial = FILTROS[searchParams.get('estado')] ? searchParams.get('estado') : 'pendientes'

  const [filtro, setFiltro] = useState(estadoInicial)
  const [pagina, setPagina] = useState(1)
  const [veterinarioId, setVeterinarioId] = useState('todos')
  const [buscar, setBuscar] = useState('')
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin] = useState('')

  const buscarDiferido = useDebouncedValue(buscar.trim())

  const rolPermitido = canAccessModule(usuario, 'historias')
  // Todos los planes incluyen historias clínicas.
  const puedeVerHistorias = true

  useEffect(() => {
    document.title = 'Historias clínicas | Bourgelat'
  }, [])

  const aplicarFiltro = (siguiente) => {
    setFiltro(siguiente)
    setPagina(1)

    // El rango del mes es el unico chip que precarga fechas; los demas las
    // limpian para no arrastrar un recorte que esconda pendientes viejos.
    if (siguiente === 'mes') {
      const rango = getCurrentMonthRange()
      setFechaInicio(rango.fechaInicio)
      setFechaFin(rango.fechaFin)
    } else {
      setFechaInicio('')
      setFechaFin('')
    }

    setSearchParams(siguiente === 'pendientes' ? {} : { estado: siguiente }, { replace: true })
  }

  const filtrosActivos = FILTROS[filtro] || {}

  const historiasQuery = useQuery({
    queryKey: [
      'historias-listado',
      filtro,
      veterinarioId,
      buscarDiferido,
      fechaInicio,
      fechaFin,
      pagina,
    ],
    queryFn: () =>
      historiasApi.obtenerHistorias({
        ...filtrosActivos,
        veterinarioId: veterinarioId !== 'todos' ? veterinarioId : undefined,
        buscar: buscarDiferido || undefined,
        fechaInicio: fechaInicio || undefined,
        fechaFin: fechaFin || undefined,
        pagina,
        limite: 20,
      }),
    enabled: rolPermitido && puedeVerHistorias,
    placeholderData: (previousData) => previousData,
  })

  const veterinariosQuery = useQuery({
    queryKey: ['historias-equipo'],
    queryFn: agendaApi.obtenerEquipoAgenda,
    enabled: rolPermitido && puedeVerHistorias,
    placeholderData: (previousData) => previousData,
  })

  const resumen = useHistoriasResumen({ enabled: rolPermitido && puedeVerHistorias })

  const veterinarios = veterinariosQuery.data?.usuarios || []

  const historiasRows = useMemo(
    () =>
      (historiasQuery.data?.historias || []).map((historia) => ({
        id: historia.id,
        fecha: new Intl.DateTimeFormat('es-CO', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        }).format(new Date(historia.fechaConsulta)),
        paciente: historia.mascota?.nombre || 'Paciente',
        tutor: historia.propietario?.nombre || 'Sin tutor',
        profesional: historia.veterinario?.nombre || 'Sin profesional',
        motivo: historia.motivoConsulta,
        diagnostico: historia.diagnosticoPresuntivo || historia.diagnostico,
        faltantes: historia.bloqueada ? [] : faltantesDe(historia),
        proximaConsulta: historia.proximaConsulta
          ? formatLongDate(historia.proximaConsulta)
          : 'Sin control',
        bloqueada: historia.bloqueada,
        mascotaId: historia.mascota?.id || null,
      })),
    [historiasQuery.data]
  )

  if (!rolPermitido) {
    return <RestrictedHistoriasPage />
  }

  const totalResultados = historiasQuery.data?.total || 0

  const pestanas = [
    { id: 'pendientes', label: 'Sin cerrar', conteo: resumen.pendientesPorCerrar },
    { id: 'controles', label: 'Controles vencidos', conteo: resumen.controlesPendientes },
    { id: 'mes', label: 'Este mes', conteo: resumen.totalMes },
    { id: 'todas', label: 'Todas' },
  ]
  const descripcion = resumen.resumenQuery.isPending
    ? 'Consultas por cerrar, controles pendientes y búsqueda por diagnóstico.'
    : `${formatNumber(resumen.pendientesPorCerrar)} sin cerrar · ${formatNumber(resumen.totalMes)} este mes`
  const paginas = historiasQuery.data?.paginas || 1
  const paginaActual = historiasQuery.data?.paginaActual || 1

  return (
    <AdminShell
      currentKey="historias"
      title="Historias clínicas"
      description={descripcion}
      actions={
      <div role="tablist" aria-label="Qué historias ver" className="flex flex-wrap gap-1 rounded-[10px] bg-secondary p-1">
        {pestanas.map((pestana) => {
          const activa = filtro === pestana.id
          return (
            <button
              key={pestana.id}
              type="button"
              role="tab"
              aria-selected={activa}
              onClick={() => aplicarFiltro(pestana.id)}
              className={cn(
                'h-10 rounded-[7px] px-3.5 text-[13px] transition',
                FOCO,
                activa ? 'bg-card font-semibold text-foreground' : 'font-medium text-muted-foreground hover:text-foreground'
              )}
            >
              {pestana.label}
              {typeof pestana.conteo === 'number' ? (
                <span
                  className={cn(
                    'ml-1.5 tabular-nums',
                    pestana.id === 'controles' && pestana.conteo > 0 ? 'text-danger' : 'text-muted-foreground'
                  )}
                >
                  {formatNumber(pestana.conteo)}
                </span>
              ) : null}
            </button>
          )
        })}
      </div>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex h-12 min-w-0 flex-1 basis-60 items-center gap-2.5 rounded-[10px] border border-input bg-card px-4 text-muted-foreground focus-within:ring-2 focus-within:ring-ring">
            <Search className="h-[18px] w-[18px] shrink-0" />
            <input
              type="search"
              value={buscar}
              onChange={(e) => { setBuscar(e.target.value); setPagina(1) }}
              placeholder="Motivo o diagnóstico"
              aria-label="Buscar por motivo o diagnóstico"
              className="min-w-0 flex-1 bg-transparent text-[15px] text-foreground outline-none placeholder:text-muted-foreground"
            />
          </label>
          <input
            type="date"
            value={fechaInicio}
            onChange={(e) => { setFechaInicio(e.target.value); setPagina(1) }}
            aria-label="Desde"
            className={`${CAMPO} h-12 px-3`}
          />
          <input
            type="date"
            value={fechaFin}
            onChange={(e) => { setFechaFin(e.target.value); setPagina(1) }}
            aria-label="Hasta"
            className={`${CAMPO} h-12 px-3`}
          />
          <Select
            aria-label="Filtrar por médico"
            value={veterinarioId}
            onValueChange={(value) => { setVeterinarioId(value); setPagina(1) }}
            options={[
              { value: 'todos', label: 'Todos los médicos' },
              ...veterinarios.map((v) => ({ value: v.id, label: v.nombre })),
            ]}
          />
        </div>

        {historiasQuery.isError ? (
          <div role="alert" className="rounded-xl bg-danger-soft px-4 py-3.5 text-sm leading-6 text-danger">
            {getErrorMessage(historiasQuery.error, 'No fue posible cargar el listado de historias clínicas.')}
          </div>
        ) : null}
        {veterinariosQuery.isError ? (
          <div role="alert" className="rounded-xl bg-warning-soft px-4 py-3.5 text-sm leading-6 text-warning">
            {getErrorMessage(veterinariosQuery.error, 'No fue posible cargar el equipo veterinario.')}
          </div>
        ) : null}

        <section aria-label="Historias clínicas" className="overflow-hidden rounded-2xl bg-card">
          {historiasQuery.isLoading ? (
            <div className="flex flex-col gap-1 p-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-14 animate-pulse rounded-xl bg-muted" />
              ))}
            </div>
          ) : historiasRows.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <p className="text-base font-semibold text-foreground">
                {filtro === 'pendientes'
                  ? 'No hay consultas sin cerrar'
                  : filtro === 'controles'
                    ? 'No hay controles vencidos'
                    : 'No hay historias para este filtro'}
              </p>
              <p className="mt-1.5 text-sm text-muted-foreground">
                {filtro === 'pendientes'
                  ? 'Todas las consultas están cerradas y listas para cobrar.'
                  : filtro === 'controles'
                    ? 'Ningún paciente tiene un control vencido sin atender.'
                    : 'Ajusta el periodo, el médico o la búsqueda.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-sm">
                <thead>
                  <tr className="text-left text-[13px] text-muted-foreground">
                    <th scope="col" className="px-5 pb-3 pt-4 font-medium">Fecha</th>
                    <th scope="col" className="px-3 pb-3 pt-4 font-medium">Paciente</th>
                    <th scope="col" className="px-3 pb-3 pt-4 font-medium">Motivo y diagnóstico</th>
                    <th scope="col" className="px-3 pb-3 pt-4 font-medium">Médico</th>
                    <th scope="col" className="px-3 pb-3 pt-4 font-medium">Control</th>
                    <th scope="col" className="px-5 pb-3 pt-4 font-medium"><span className="sr-only">Acción</span></th>
                  </tr>
                </thead>
                <tbody>
                  {historiasRows.map((row) => {
                    const destino = row.mascotaId ? `/pacientes/${row.mascotaId}/historial?historiaId=${row.id}` : null
                    return (
                      <tr key={row.id} className="border-t border-border align-top transition hover:bg-muted">
                        <td className="whitespace-nowrap px-5 py-3.5 tabular-nums text-foreground">{row.fecha}</td>
                        <td className="px-3 py-3.5">
                          <span className="block font-semibold text-foreground">{row.paciente}</span>
                          <span className="block text-[13px] text-muted-foreground">{row.tutor}</span>
                        </td>
                        <td className="max-w-[340px] px-3 py-3.5">
                          <span className="block truncate font-medium text-foreground">{row.motivo || 'Sin motivo'}</span>
                          <span className="block truncate text-[13px] text-muted-foreground">{row.diagnostico || 'Sin diagnóstico'}</span>
                          {row.faltantes.length ? (
                            <span className="mt-1 block text-[13px] text-warning">Falta {row.faltantes.join(', ')}</span>
                          ) : null}
                        </td>
                        <td className="whitespace-nowrap px-3 py-3.5 text-foreground">{row.profesional}</td>
                        <td className="whitespace-nowrap px-3 py-3.5 text-muted-foreground">{row.proximaConsulta}</td>
                        <td className="px-5 py-3.5 text-right">
                          {destino ? (
                            <Link
                              to={destino}
                              className={cn(
                                'inline-flex h-9 items-center whitespace-nowrap rounded-lg px-3.5 text-[13px] font-semibold transition active:translate-y-px',
                                FOCO,
                                row.bloqueada
                                  ? 'bg-secondary text-secondary-foreground hover:brightness-95'
                                  : 'bg-primary text-primary-foreground hover:brightness-110'
                              )}
                            >
                              {row.bloqueada ? 'Ver' : 'Continuar'}
                            </Link>
                          ) : null}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 bg-muted px-5 py-4">
            <span className="text-sm text-muted-foreground">
              {formatNumber(totalResultados)} {totalResultados === 1 ? 'consulta' : 'consultas'}
              {paginas > 1 ? ` · página ${paginaActual} de ${paginas}` : ''}
            </span>
            {paginas > 1 ? (
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setPagina((p) => Math.max(p - 1, 1))}
                  disabled={paginaActual <= 1}
                  className={BOTON_PAGINA}
                >
                  Anterior
                </button>
                <button
                  type="button"
                  onClick={() => setPagina((p) => Math.min(p + 1, paginas))}
                  disabled={paginaActual >= paginas}
                  className={BOTON_PAGINA}
                >
                  Siguiente
                </button>
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </AdminShell>
  )
}
