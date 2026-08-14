import { useEffect, useMemo, useState } from 'react'
import { Search, TriangleAlert, Users } from 'lucide-react'
import { DashboardPanel, StatusPill } from '@/features/dashboard/dashboardComponents'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { EmptyState } from '@/components/shared/EmptyState'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { ACCION_LABELS, ORIGEN_LABELS, TRANSICIONES } from './recepcionConstants'

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
const ESTADOS_RESUELTOS = ['completada', 'cancelada', 'no_asistio']

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

const ACTION_TONE = {
  en_espera: 'border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100',
  en_atencion: 'border-violet-300 bg-violet-50 text-violet-700 hover:bg-violet-100',
  completada: 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
  cancelada: 'border-red-300 bg-red-50 text-red-700 hover:bg-red-100',
  no_asistio: 'border-orange-300 bg-orange-50 text-orange-700 hover:bg-orange-100',
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
}) {
  const [search, setSearch] = useState('')
  const [cancelTarget, setCancelTarget] = useState(null)
  const [motivoCancelacion, setMotivoCancelacion] = useState('')
  const [mostrarResueltas, setMostrarResueltas] = useState(false)
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
      subtitle="Citas programadas y walk-in unificadas, ordenadas por hora de llegada."
      action={
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill tone="border-warm-300 bg-warm-50 text-warm-700">
            {resumen.programadas} programadas
          </StatusPill>
          <StatusPill tone="border-blue-300 bg-blue-50 text-blue-700">
            {resumen.enEspera} en espera
          </StatusPill>
          <StatusPill tone="border-violet-300 bg-violet-50 text-violet-700">
            {resumen.enAtencion} en atencion
          </StatusPill>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar paciente, tutor o veterinario"
              className="h-10 w-full border border-border bg-card pl-9 pr-3 text-sm text-foreground outline-none transition focus:border-primary"
            />
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={mostrarResueltas}
                onChange={(event) => setMostrarResueltas(event.target.checked)}
                className="h-4 w-4 border-border text-primary focus:ring-primary"
              />
              Mostrar resueltas del dia ({resueltasOcultas})
            </label>
            {lastUpdatedAt ? (
              <p className="text-xs text-muted-foreground">
                Actualizado {lastUpdatedAt.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
              </p>
            ) : null}
          </div>
        </div>

        {isError ? (
          <div className="border border-red-200 bg-red-50 px-4 py-4 text-sm leading-7 text-red-700">
            {errorMessage}
          </div>
        ) : null}

        {!isLoading && citasFiltradas.length === 0 ? (
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
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border text-sm">
              <thead className="bg-muted">
                <tr>
                  {['Hora', 'Paciente', 'Tipo', 'Veterinario', 'Consultorio', 'Estado', 'Acciones'].map((label) => (
                    <th
                      key={label}
                      className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground"
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {citasFiltradas.map((cita) => {
                  const transiciones = TRANSICIONES[cita.estado] || []
                  return (
                    <tr key={cita.id} className="transition hover:bg-muted/50">
                      <td className="px-4 py-2 align-top font-medium tabular-nums text-foreground">
                        {formatTime(cita.horaLlegada || cita.horaInicio)}
                      </td>
                      <td className="px-4 py-2 align-top text-foreground">
                        <p className="font-semibold">{cita.mascota?.nombre || 'Paciente'}</p>
                        <p className="text-xs text-muted-foreground">{cita.propietario?.nombre || 'Sin tutor'}</p>
                      </td>
                      <td className="px-4 py-2 align-top text-muted-foreground">
                        {ORIGEN_LABELS[cita.origen] || cita.origen}
                      </td>
                      <td className="px-4 py-2 align-top text-foreground">{cita.veterinario?.nombre || 'Sin profesional'}</td>
                      <td className="px-4 py-2 align-top text-muted-foreground">{cita.consultorio?.nombre || '—'}</td>
                      <td className="px-4 py-2 align-top">
                        <div className="flex items-center gap-1.5">
                          <StatusBadge variant={cita.estado} showDot size="sm" />
                          {esCitaAtrasada(cita, ahoraMinutos) ? (
                            <StatusBadge variant="atrasada" size="sm" />
                          ) : null}
                          {cruces.has(cita.id) ? (
                            <TriangleAlert
                              className="h-4 w-4 shrink-0 text-amber-500"
                              aria-label={cruces.get(cita.id)}
                              title={cruces.get(cita.id)}
                            />
                          ) : null}
                        </div>
                      </td>
                      <td className="px-4 py-2 align-top">
                        {puedeGestionarEstado && transiciones.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {transiciones.map((estado) => (
                              <button
                                key={estado}
                                type="button"
                                disabled={actualizarEstadoMutation.isPending}
                                onClick={() => handleAction(cita, estado)}
                                className={`border px-2.5 py-1 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${ACTION_TONE[estado] || 'border-border bg-muted text-foreground'}`}
                              >
                                {ACCION_LABELS[estado]}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

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
