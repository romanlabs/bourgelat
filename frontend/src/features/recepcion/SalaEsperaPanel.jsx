import { useEffect, useMemo, useState } from 'react'
import { MoreHorizontal, Search, TriangleAlert, Users } from 'lucide-react'
import { DashboardPanel } from '@/features/dashboard/dashboardComponents'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { EmptyState } from '@/components/shared/EmptyState'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { DetalleCitaDrawer } from './DetalleCitaDrawer'
import {
  ACCION_LABELS,
  ACCION_PRIMARIA,
  ESTADOS_RESUELTOS,
  GRUPOS,
  ORIGEN_LABELS,
  TRANSICIONES,
} from './recepcionConstants'

const formatTime = (value) => value?.slice(0, 5) || '--:--'

const matchesSearch = (cita, term) => {
  if (!term) return true
  const haystack = [
    cita.mascota?.nombre,
    cita.propietario?.nombre,
    cita.veterinario?.nombre,
  ].filter(Boolean).join(' ').toLowerCase()
  return haystack.includes(term)
}

const WALK_IN_ACTIVOS = ['en_espera', 'en_atencion']

const seSolapan = (a, b) => a.horaInicio < b.horaFin && a.horaFin > b.horaInicio

/**
 * Deteccion puramente derivada, en el cliente, de posibles cruces entre un
 * walk-in en curso y una cita programada del mismo veterinario. Devuelve un
 * mapa citaId -> mensaje para mostrar un aviso en la fila correspondiente.
 */
const detectarCruces = (citas) => {
  const cruces = new Map()

  const walkInsActivos = citas.filter((c) => c.origen === 'walk_in' && WALK_IN_ACTIVOS.includes(c.estado))
  const programadas = citas.filter((c) => c.origen === 'programada' && c.estado !== 'cancelada' && c.estado !== 'no_asistio')

  walkInsActivos.forEach((walkIn) => {
    programadas.forEach((programada) => {
      if (walkIn.veterinarioId !== programada.veterinarioId) return
      if (!seSolapan(walkIn, programada)) return

      cruces.set(walkIn.id, `Posible cruce con cita programada de las ${formatTime(programada.horaInicio)}`)
      cruces.set(programada.id, `Posible cruce con walk-in en curso (${formatTime(walkIn.horaInicio)})`)
    })
  })

  return cruces
}

const MINUTOS_ATRASO = 15

const horaAMinutos = (value) => {
  if (!value) return null
  const [h, m] = value.slice(0, 5).split(':').map(Number)
  return h * 60 + m
}

/** Solo resaltado visual: no cambia el estado de la cita, recepcion decide manualmente. */
const esCitaAtrasada = (cita, ahoraMinutos) => {
  if (cita.origen !== 'programada' || cita.estado !== 'programada') return false
  const inicio = horaAMinutos(cita.horaInicio)
  if (inicio === null) return false
  return ahoraMinutos - inicio >= MINUTOS_ATRASO
}

const formatDuracion = (minutos) => {
  if (minutos === null || minutos < 0) return null
  if (minutos < 60) return `${minutos} min`
  const horas = Math.floor(minutos / 60)
  const resto = minutos % 60
  return resto === 0 ? `${horas} h` : `${horas} h ${String(resto).padStart(2, '0')} min`
}

const minutosDesde = (hora, ahoraMinutos) => {
  const inicio = horaAMinutos(hora)
  if (inicio === null || ahoraMinutos === null) return null
  return ahoraMinutos - inicio
}

/**
 * Texto de tiempo de cada fila. Todo se deriva en el cliente de horaLlegada,
 * horaInicioAtencion y horaInicio, que el endpoint ya devuelve: no requiere
 * ningun campo nuevo del backend.
 */
const tiempoDeFila = (cita, ahoraMinutos) => {
  if (cita.estado === 'en_atencion') {
    const texto = formatDuracion(minutosDesde(cita.horaInicioAtencion || cita.horaLlegada, ahoraMinutos))
    return texto ? { texto: `${texto} en consulta`, tone: 'text-violet-700 dark:text-violet-300' } : null
  }

  if (cita.estado === 'en_espera') {
    const texto = formatDuracion(minutosDesde(cita.horaLlegada || cita.horaInicio, ahoraMinutos))
    return texto ? { texto: `${texto} esperando`, tone: 'text-blue-700 dark:text-blue-300' } : null
  }

  if (cita.estado === 'programada') {
    const diferencia = minutosDesde(cita.horaInicio, ahoraMinutos)
    if (diferencia === null) return null
    if (diferencia >= MINUTOS_ATRASO) {
      return { texto: `${formatDuracion(diferencia)} de atraso`, tone: 'text-red-600 dark:text-red-400' }
    }
    if (diferencia >= 0) return { texto: 'A esta hora', tone: 'text-muted-foreground' }
    return { texto: `En ${formatDuracion(Math.abs(diferencia))}`, tone: 'text-muted-foreground' }
  }

  return null
}

const AVATAR_TONE = {
  programada: 'bg-warm-100 text-warm-700',
  en_espera: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200',
  en_atencion: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-200',
  completada: 'bg-warm-100 text-warm-600',
  cancelada: 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-300',
  no_asistio: 'bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-300',
}

const ACTION_TONE = {
  en_espera: 'border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:border-blue-600 dark:bg-blue-900/30 dark:text-blue-200 dark:hover:bg-blue-900/50',
  en_atencion: 'border-violet-300 bg-violet-50 text-violet-700 hover:bg-violet-100 dark:border-violet-600 dark:bg-violet-900/30 dark:text-violet-200 dark:hover:bg-violet-900/50',
  completada: 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-200 dark:hover:bg-emerald-900/50',
  cancelada: 'border-red-300 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-600 dark:bg-red-900/30 dark:text-red-200 dark:hover:bg-red-900/50',
  no_asistio: 'border-orange-300 bg-orange-50 text-orange-700 hover:bg-orange-100 dark:border-orange-600 dark:bg-orange-900/30 dark:text-orange-200 dark:hover:bg-orange-900/50',
}

function AccionesMenu({ acciones, disabled, onSelect }) {
  const [open, setOpen] = useState(false)

  if (acciones.length === 0) return null

  return (
    <div className="relative">
      <button
        type="button"
        disabled={disabled}
        aria-label="Mas acciones"
        aria-expanded={open}
        onClick={(event) => {
          event.stopPropagation()
          setOpen((current) => !current)
        }}
        className="flex h-9 w-9 items-center justify-center border border-border bg-card text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>

      {open ? (
        <>
          <div className="fixed inset-0 z-30" onClick={(event) => { event.stopPropagation(); setOpen(false) }} aria-hidden="true" />
          <div className="absolute right-0 top-10 z-40 w-48 border border-border bg-card py-1 shadow-lg">
            {acciones.map((estado) => (
              <button
                key={estado}
                type="button"
                onClick={(event) => {
                  event.stopPropagation()
                  setOpen(false)
                  onSelect(estado)
                }}
                className="block w-full px-4 py-2 text-left text-sm text-foreground transition hover:bg-muted"
              >
                {ACCION_LABELS[estado]}
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  )
}

function FilaCita({ cita, ahoraMinutos, cruce, puedeGestionarEstado, isPending, onAccion, onSeleccionar, seleccionada }) {
  const atrasada = esCitaAtrasada(cita, ahoraMinutos)
  const tiempo = tiempoDeFila(cita, ahoraMinutos)
  const transiciones = TRANSICIONES[cita.estado] || []
  const primaria = puedeGestionarEstado ? ACCION_PRIMARIA[cita.estado] : undefined
  const secundarias = puedeGestionarEstado ? transiciones.filter((estado) => estado !== primaria) : []
  const resuelta = ESTADOS_RESUELTOS.includes(cita.estado)

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSeleccionar(cita)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onSeleccionar(cita)
        }
      }}
      className={`flex w-full items-center gap-4 border-b border-border px-4 py-3 text-left transition hover:bg-muted/50 focus:outline-none focus-visible:bg-muted/50 ${
        seleccionada ? 'bg-muted/60' : ''
      } ${resuelta ? 'opacity-60' : ''} ${atrasada ? 'shadow-[inset_3px_0_0_#ef4444]' : ''}`}
    >
      <span className="w-12 shrink-0 text-sm font-semibold tabular-nums text-foreground">
        {formatTime(cita.horaLlegada || cita.horaInicio)}
      </span>

      <span
        className={`hidden h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold sm:flex ${
          AVATAR_TONE[cita.estado] || 'bg-muted text-muted-foreground'
        }`}
        aria-hidden="true"
      >
        {(cita.mascota?.nombre || '?').charAt(0).toUpperCase()}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-[15px] font-semibold leading-6 text-foreground">
            {cita.mascota?.nombre || 'Paciente'}
          </p>
          {cita.origen === 'walk_in' ? (
            <span className="shrink-0 rounded-full border border-caramel-200 bg-caramel-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-caramel-700">
              {ORIGEN_LABELS.walk_in}
            </span>
          ) : null}
          {atrasada ? <StatusBadge variant="atrasada" size="sm" /> : null}
          {resuelta ? <StatusBadge variant={cita.estado} size="sm" /> : null}
          {cruce ? (
            <TriangleAlert className="h-4 w-4 shrink-0 text-amber-500" aria-label={cruce} title={cruce} />
          ) : null}
        </div>
        <p className="truncate text-xs text-muted-foreground">{cita.propietario?.nombre || 'Sin tutor'}</p>
      </div>

      <p className="hidden w-52 shrink-0 text-xs leading-5 text-muted-foreground lg:block">
        {cita.veterinario?.nombre || 'Sin profesional'}
        <br />
        {cita.consultorio?.nombre || 'Sin consultorio'}
      </p>

      <p className={`hidden w-32 shrink-0 text-xs font-semibold sm:block ${tiempo?.tone || 'text-muted-foreground'}`}>
        {tiempo?.texto || '—'}
      </p>

      <div className="flex shrink-0 items-center gap-2" onClick={(event) => event.stopPropagation()}>
        {primaria ? (
          <button
            type="button"
            disabled={isPending}
            onClick={() => onAccion(cita, primaria)}
            className={`border px-3 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${ACTION_TONE[primaria]}`}
          >
            {ACCION_LABELS[primaria]}
          </button>
        ) : null}
        <AccionesMenu
          acciones={secundarias}
          disabled={isPending}
          onSelect={(estado) => onAccion(cita, estado)}
        />
      </div>
    </div>
  )
}

export function SalaEsperaPanel({
  citas,
  resumen,
  isLoading,
  isError,
  errorMessage,
  puedeGestionarEstado,
  actualizarEstadoMutation,
  lastUpdatedAt,
  headerActions,
}) {
  const [search, setSearch] = useState('')
  const [cancelTarget, setCancelTarget] = useState(null)
  const [motivoCancelacion, setMotivoCancelacion] = useState('')
  const [mostrarResueltas, setMostrarResueltas] = useState(false)
  const [citaSeleccionadaId, setCitaSeleccionadaId] = useState(null)
  const [ahoraMinutos, setAhoraMinutos] = useState(() => horaAMinutos(new Date().toTimeString()))

  useEffect(() => {
    const interval = setInterval(() => {
      setAhoraMinutos(horaAMinutos(new Date().toTimeString()))
    }, 60000)
    return () => clearInterval(interval)
  }, [])

  const term = search.trim().toLowerCase()
  const resueltasOcultas = useMemo(
    () => citas.filter((cita) => ESTADOS_RESUELTOS.includes(cita.estado)).length,
    [citas]
  )
  const citasFiltradas = useMemo(
    () =>
      citas.filter((cita) => {
        if (!mostrarResueltas && ESTADOS_RESUELTOS.includes(cita.estado)) return false
        return matchesSearch(cita, term)
      }),
    [citas, term, mostrarResueltas]
  )
  const cruces = useMemo(() => detectarCruces(citas), [citas])

  /** Agrupa por etapa manteniendo el orden por hora que ya trae el backend. */
  const grupos = useMemo(() => {
    const activos = GRUPOS.map((grupo) => ({
      ...grupo,
      citas: citasFiltradas.filter((cita) => cita.estado === grupo.estado),
    }))
    const resueltas = citasFiltradas.filter((cita) => ESTADOS_RESUELTOS.includes(cita.estado))
    if (resueltas.length > 0) {
      activos.push({ estado: 'resueltas', label: 'Resueltas del dia', dot: 'bg-warm-300', text: 'text-warm-600', citas: resueltas })
    }
    return activos.filter((grupo) => grupo.citas.length > 0)
  }, [citasFiltradas])

  const citaSeleccionada = useMemo(
    () => citas.find((cita) => cita.id === citaSeleccionadaId) || null,
    [citas, citaSeleccionadaId]
  )

  const handleAction = (cita, estado) => {
    if (estado === 'cancelada') {
      setCancelTarget(cita)
      setMotivoCancelacion('')
      return
    }
    actualizarEstadoMutation.mutate({ citaId: cita.id, payload: { estado }, cita })
  }

  const confirmCancelacion = () => {
    if (!motivoCancelacion.trim()) return
    actualizarEstadoMutation.mutate(
      { citaId: cancelTarget.id, payload: { estado: 'cancelada', motivoCancelacion: motivoCancelacion.trim() }, cita: cancelTarget },
      { onSuccess: () => setCancelTarget(null) }
    )
  }

  return (
    <DashboardPanel
      title="Sala de espera del dia"
      action={
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar paciente o tutor"
              className="h-10 w-full border border-border bg-card pl-9 pr-3 text-sm text-foreground outline-none transition focus:border-primary"
            />
          </div>
          {headerActions}
        </div>
      }
    >
      <div className="-m-5">
        <div className="flex flex-wrap items-center gap-5 border-b border-border px-5 py-3">
          <div className="flex items-baseline gap-2">
            <span className="text-[22px] font-bold leading-none tabular-nums text-violet-700 dark:text-violet-300">{resumen.enAtencion}</span>
            <span className="text-xs text-muted-foreground">en atencion</span>
          </div>
          <span className="h-6 w-px bg-border" aria-hidden="true" />
          <div className="flex items-baseline gap-2">
            <span className="text-[22px] font-bold leading-none tabular-nums text-blue-700 dark:text-blue-300">{resumen.enEspera}</span>
            <span className="text-xs text-muted-foreground">en espera</span>
          </div>
          <span className="h-6 w-px bg-border" aria-hidden="true" />
          <div className="flex items-baseline gap-2">
            <span className="text-[22px] font-bold leading-none tabular-nums text-warm-700">{resumen.programadas}</span>
            <span className="text-xs text-muted-foreground">por llegar</span>
          </div>
          {lastUpdatedAt ? (
            <p className="ml-auto text-xs text-muted-foreground">
              Actualizado {lastUpdatedAt.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
            </p>
          ) : null}
        </div>

        {isError ? (
          <div className="border-b border-red-200 bg-red-50 px-5 py-4 text-sm leading-7 text-red-700 dark:border-red-700 dark:bg-red-900/30 dark:text-red-200">
            {errorMessage}
          </div>
        ) : null}

        {isLoading ? (
          <div className="divide-y divide-border">
            {[0, 1, 2].map((row) => (
              <div key={row} className="flex items-center gap-4 px-4 py-3">
                <div className="h-4 w-12 animate-pulse bg-muted" />
                <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-40 animate-pulse bg-muted" />
                  <div className="h-3 w-28 animate-pulse bg-muted" />
                </div>
                <div className="h-9 w-32 animate-pulse bg-muted" />
              </div>
            ))}
          </div>
        ) : null}

        {!isLoading && citasFiltradas.length === 0 ? (
          <div className="p-5">
            <EmptyState
              icon={<Users />}
              title={citas.length === 0 ? 'Sala de espera vacia' : 'Sin resultados para esa busqueda'}
              description={
                citas.length === 0
                  ? 'Las citas programadas y los ingresos directos apareceran aqui.'
                  : 'Prueba con otro nombre de paciente, tutor o veterinario.'
              }
              bordered
            />
          </div>
        ) : null}

        {!isLoading && grupos.map((grupo) => (
          <div key={grupo.estado}>
            <div className="flex items-center gap-2.5 border-b border-border bg-background px-5 py-2">
              <span className={`h-1.5 w-1.5 rounded-full ${grupo.dot}`} aria-hidden="true" />
              <p className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${grupo.text}`}>
                {grupo.label}
              </p>
              <span className="text-[11px] tabular-nums text-muted-foreground">{grupo.citas.length}</span>
            </div>
            {grupo.citas.map((cita) => (
              <FilaCita
                key={cita.id}
                cita={cita}
                ahoraMinutos={ahoraMinutos}
                cruce={cruces.get(cita.id)}
                puedeGestionarEstado={puedeGestionarEstado}
                isPending={actualizarEstadoMutation.isPending}
                onAccion={handleAction}
                onSeleccionar={(seleccionada) => setCitaSeleccionadaId(seleccionada.id)}
                seleccionada={cita.id === citaSeleccionadaId}
              />
            ))}
          </div>
        ))}

        <div className="flex flex-wrap items-center justify-between gap-3 bg-muted/40 px-5 py-3">
          <p className="text-xs text-muted-foreground">
            Resueltas hoy: {resumen.completadas ?? 0} completadas · {resueltasOcultas} en total
          </p>
          <button
            type="button"
            onClick={() => setMostrarResueltas((current) => !current)}
            className="border border-border bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            {mostrarResueltas ? 'Ocultar resueltas' : `Ver resueltas (${resueltasOcultas})`}
          </button>
        </div>
      </div>

      <DetalleCitaDrawer
        cita={citaSeleccionada}
        onClose={() => setCitaSeleccionadaId(null)}
        puedeGestionarEstado={puedeGestionarEstado}
        onAccion={handleAction}
        isPending={actualizarEstadoMutation.isPending}
      />

      <ConfirmDialog
        open={Boolean(cancelTarget)}
        onOpenChange={(open) => !open && setCancelTarget(null)}
        title="Cancelar cita"
        description={`Indica el motivo de cancelacion para ${cancelTarget?.mascota?.nombre || 'este paciente'}.`}
        confirmLabel="Cancelar cita"
        variant="destructive"
        loading={actualizarEstadoMutation.isPending}
        onConfirm={confirmCancelacion}
      >
        <textarea
          value={motivoCancelacion}
          onChange={(event) => setMotivoCancelacion(event.target.value)}
          placeholder="Motivo de cancelacion"
          className="min-h-[90px] w-full border border-border bg-card px-3 py-3 text-sm text-foreground outline-none transition focus:border-primary"
        />
      </ConfirmDialog>
    </DashboardPanel>
  )
}
