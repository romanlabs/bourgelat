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
    return texto ? { texto: `${texto} en consulta`, tone: 'text-primary' } : null
  }

  if (cita.estado === 'en_espera') {
    const texto = formatDuracion(minutosDesde(cita.horaLlegada || cita.horaInicio, ahoraMinutos))
    return texto ? { texto: `${texto} esperando`, tone: 'text-brand-foreground' } : null
  }

  if (cita.estado === 'programada') {
    const diferencia = minutosDesde(cita.horaInicio, ahoraMinutos)
    if (diferencia === null) return null
    if (diferencia >= MINUTOS_ATRASO) {
      return { texto: `${formatDuracion(diferencia)} de atraso`, tone: 'text-danger' }
    }
    if (diferencia >= 0) return { texto: 'A esta hora', tone: 'text-muted-foreground' }
    return { texto: `En ${formatDuracion(Math.abs(diferencia))}`, tone: 'text-muted-foreground' }
  }

  return null
}

// Mismos tonos por estado que la pantalla Hoy y el calendario.
const AVATAR_TONE = {
  programada: 'bg-secondary text-secondary-foreground',
  en_espera: 'bg-brand-muted text-brand-foreground',
  en_atencion: 'bg-primary text-primary-foreground',
  completada: 'bg-success-soft text-success',
  cancelada: 'bg-danger-soft text-danger',
  no_asistio: 'bg-muted text-muted-foreground',
}

// «Iniciar atención» es la acción fuerte de la sala; el resto, botones suaves.
const ACTION_TONE = {
  en_espera: 'bg-secondary text-secondary-foreground hover:brightness-95',
  en_atencion: 'bg-primary text-primary-foreground hover:brightness-110',
  completada: 'bg-success-soft text-success hover:brightness-95',
  cancelada: 'bg-danger-soft text-danger hover:brightness-95',
  no_asistio: 'bg-muted text-muted-foreground hover:brightness-95',
}

function AccionesMenu({ acciones, disabled, onSelect }) {
  const [open, setOpen] = useState(false)

  if (acciones.length === 0) return null

  return (
    <div className="relative">
      <button
        type="button"
        disabled={disabled}
        aria-label="Más acciones"
        aria-expanded={open}
        onClick={(event) => {
          event.stopPropagation()
          setOpen((current) => !current)
        }}
        className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-secondary-foreground transition hover:brightness-95 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>

      {open ? (
        <>
          <div className="fixed inset-0 z-30" onClick={(event) => { event.stopPropagation(); setOpen(false) }} aria-hidden="true" />
          <div className="absolute right-0 top-11 z-40 w-52 rounded-xl bg-popover p-1.5 shadow-dropdown">
            {acciones.map((estado) => (
              <button
                key={estado}
                type="button"
                onClick={(event) => {
                  event.stopPropagation()
                  setOpen(false)
                  onSelect(estado)
                }}
                className="block w-full rounded-lg px-3 py-2.5 text-left text-sm text-foreground transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
      className={`flex w-full items-center gap-4 rounded-xl px-3 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        seleccionada ? 'bg-accent' : 'hover:bg-muted'
      } ${resuelta ? 'opacity-60' : ''} ${atrasada ? 'shadow-[inset_3px_0_0_hsl(var(--danger))]' : ''}`}
    >
      <span className="w-12 shrink-0 text-[15px] font-semibold tabular-nums text-muted-foreground">
        {formatTime(cita.horaLlegada || cita.horaInicio)}
      </span>

      <span
        className={`hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[15px] font-bold sm:flex ${
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
            <span className="shrink-0 rounded-md bg-brand-muted px-2.5 py-1 text-[13px] font-semibold text-brand-foreground">
              {ORIGEN_LABELS.walk_in}
            </span>
          ) : null}
          {atrasada ? <StatusBadge variant="atrasada" size="sm" /> : null}
          {resuelta ? <StatusBadge variant={cita.estado} size="sm" /> : null}
          {cruce ? (
            <TriangleAlert className="h-4 w-4 shrink-0 text-warning" aria-label={cruce} title={cruce} />
          ) : null}
        </div>
        <p className="truncate text-sm text-muted-foreground">{cita.propietario?.nombre || 'Sin tutor'}</p>
      </div>

      <p className="hidden w-52 shrink-0 text-[13px] leading-5 text-muted-foreground lg:block">
        {cita.veterinario?.nombre || 'Sin profesional'}
        <br />
        {cita.consultorio?.nombre || 'Sin consultorio'}
      </p>

      <p className={`hidden w-32 shrink-0 text-[13px] font-semibold sm:block ${tiempo?.tone || 'text-muted-foreground'}`}>
        {tiempo?.texto || '—'}
      </p>

      <div className="flex shrink-0 items-center gap-2" onClick={(event) => event.stopPropagation()}>
        {primaria ? (
          <button
            type="button"
            disabled={isPending}
            onClick={() => onAccion(cita, primaria)}
            className={`inline-flex h-10 items-center rounded-lg px-3.5 text-[13px] font-semibold transition active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 ${ACTION_TONE[primaria]}`}
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
      activos.push({ estado: 'resueltas', label: 'Resueltas del día', dot: 'bg-muted-foreground', text: 'text-muted-foreground', citas: resueltas })
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
      title="Sala de espera del día"
      action={
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar paciente o tutor"
              aria-label="Buscar paciente o tutor"
              className="h-11 w-full rounded-lg border border-input bg-card pl-9 pr-3 text-[15px] text-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          {headerActions}
        </div>
      }
    >
      <div className="-mx-3">
        <div className="mx-3 mb-3 flex flex-wrap items-center gap-x-8 gap-y-3 rounded-xl bg-muted px-5 py-4">
          <div className="flex items-baseline gap-2">
            <span className="text-[28px] font-semibold leading-none tracking-[-0.03em] tabular-nums text-primary">{resumen.enAtencion}</span>
            <span className="text-[13px] text-muted-foreground">en atención</span>
          </div>
                    <div className="flex items-baseline gap-2">
            <span className="text-[28px] font-semibold leading-none tracking-[-0.03em] tabular-nums text-brand-foreground">{resumen.enEspera}</span>
            <span className="text-[13px] text-muted-foreground">en espera</span>
          </div>
                    <div className="flex items-baseline gap-2">
            <span className="text-[28px] font-semibold leading-none tracking-[-0.03em] tabular-nums text-foreground">{resumen.programadas}</span>
            <span className="text-[13px] text-muted-foreground">por llegar</span>
          </div>
          {lastUpdatedAt ? (
            <p className="ml-auto text-[13px] text-muted-foreground">
              Actualizado {lastUpdatedAt.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
            </p>
          ) : null}
        </div>

        {isError ? (
          <div className="mx-3 mb-3 rounded-xl bg-danger-soft px-4 py-3.5 text-sm font-medium leading-6 text-danger">
            {errorMessage}
          </div>
        ) : null}

        {isLoading ? (
          <div className="flex flex-col gap-1">
            {[0, 1, 2].map((row) => (
              <div key={row} className="flex items-center gap-4 px-3 py-3">
                <div className="h-4 w-12 animate-pulse rounded bg-muted" />
                <div className="h-10 w-10 shrink-0 animate-pulse rounded-xl bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-40 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-28 animate-pulse rounded bg-muted" />
                </div>
                <div className="h-10 w-32 animate-pulse rounded-lg bg-muted" />
              </div>
            ))}
          </div>
        ) : null}

        {!isLoading && citasFiltradas.length === 0 ? (
          <div className="px-3 pb-3">
            <EmptyState
              icon={<Users />}
              title={citas.length === 0 ? 'Sala de espera vacía' : 'Sin resultados para esa búsqueda'}
              description={
                citas.length === 0
                  ? 'Las citas programadas y los ingresos directos aparecerán aquí.'
                  : 'Prueba con otro nombre de paciente, tutor o veterinario.'
              }
              bordered
            />
          </div>
        ) : null}

        {!isLoading && grupos.map((grupo) => (
          <div key={grupo.estado}>
            <div className="flex items-center gap-2.5 px-3 pb-1 pt-4">
              <span className={`h-2.5 w-2.5 rounded-[3px] ${grupo.dot}`} aria-hidden="true" />
              <p className={`text-[13px] font-semibold ${grupo.text}`}>
                {grupo.label}
              </p>
              <span className="text-[13px] tabular-nums text-muted-foreground">{grupo.citas.length}</span>
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

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 px-3 pt-1">
          <p className="text-[13px] text-muted-foreground">
            Resueltas hoy: {resumen.completadas ?? 0} completadas · {resueltasOcultas} en total
          </p>
          <button
            type="button"
            onClick={() => setMostrarResueltas((current) => !current)}
            className="inline-flex h-10 items-center rounded-lg bg-secondary px-3.5 text-[13px] font-semibold text-secondary-foreground transition hover:brightness-95 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
        description={`Indica el motivo de cancelación para ${cancelTarget?.mascota?.nombre || 'este paciente'}.`}
        confirmLabel="Cancelar cita"
        variant="destructive"
        loading={actualizarEstadoMutation.isPending}
        onConfirm={confirmCancelacion}
      >
        <textarea
          value={motivoCancelacion}
          onChange={(event) => setMotivoCancelacion(event.target.value)}
          placeholder="Motivo de cancelación"
          aria-label="Motivo de cancelación"
          className="min-h-[90px] w-full rounded-lg border border-input bg-card px-3 py-3 text-[15px] text-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
        />
      </ConfirmDialog>
    </DashboardPanel>
  )
}
