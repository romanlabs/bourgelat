import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { format, isToday } from 'date-fns'
import { es } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  CITA_ESTADO_LABELS,
  CITA_TIPO_LABELS,
} from '@/features/dashboard/dashboardUtils'
import {
  DialogRoot,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  useAgendaCalendar,
  HORA_INICIO,
  HORA_FIN,
  SLOT_HEIGHT,
  timeToTop,
  calcCitaHeight,
} from './useAgendaCalendar'

// ─── Colores y utilidades visuales ───────────────────────────────────────────

function buildStateTone(estado) {
  switch (estado) {
    case 'programada':
      return 'border-blue-300 bg-blue-50 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200 dark:border-blue-700'
    case 'en_espera':
      return 'border-violet-400 bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-200 dark:border-violet-600'
    case 'completada':
      return 'border-emerald-400 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200 dark:border-emerald-600'
    case 'cancelada':
      return 'border-red-400 bg-red-100 text-red-700 opacity-75 dark:bg-red-900/40 dark:text-red-200 dark:border-red-600'
    case 'no_asistio':
      return 'border-amber-400 bg-amber-100 text-amber-700 opacity-75 dark:bg-amber-900/40 dark:text-amber-200 dark:border-amber-600'
    default:
      return 'border-blue-300 bg-blue-50 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200 dark:border-blue-700'
  }
}

function getAccentColor(estado) {
  switch (estado) {
    case 'programada':  return '#93c5fd'
    case 'en_espera':   return '#a78bfa'
    case 'completada':  return '#34d399'
    case 'cancelada':   return '#f87171'
    case 'no_asistio':  return '#fbbf24'
    default:            return '#93c5fd'
  }
}

const TIPO_SHORT = {
  consulta_general: 'Consulta',
  vacunacion:       'Vacuna',
  cirugia:          'Cirugía',
  desparasitacion:  'Desparasit.',
  control:          'Control',
  urgencia:         'Urgencia',
  peluqueria:       'Peluquería',
  laboratorio:      'Lab.',
  radiografia:      'Radiografía',
  otro:             'Otro',
}

const ESPECIE_EMOJI = {
  perro:    '🐶',
  gato:     '🐱',
  conejo:   '🐰',
  ave:      '🦜',
  pajaro:   '🦜',
  hamster:  '🐹',
  reptil:   '🦎',
}

function especieToEmoji(especie) {
  if (!especie) return '🐾'
  const key = especie.toLowerCase()
  for (const [k, v] of Object.entries(ESPECIE_EMOJI)) {
    if (key.includes(k)) return v
  }
  return '🐾'
}

const STATUS_OPTIONS = [
  { value: 'programada', label: 'Programada' },
  { value: 'en_espera', label: 'En espera' },
  { value: 'completada', label: 'Completada' },
  { value: 'cancelada', label: 'Cancelada' },
  { value: 'no_asistio', label: 'No asistió' },
]

// ─── Indicador de hora actual ─────────────────────────────────────────────────

function NowLine() {
  const getNowTop = () => {
    const now = new Date()
    const str = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    return timeToTop(str)
  }

  const [top, setTop] = useState(getNowTop)

  useEffect(() => {
    const id = setInterval(() => setTop(getNowTop()), 60_000)
    return () => clearInterval(id)
  }, [])

  return (
    <div
      className="pointer-events-none absolute left-0 right-0 z-30"
      style={{ top: `${top}px` }}
    >
      <div className="flex items-center">
        <div className="h-2 w-2 flex-shrink-0 -translate-x-1 rounded-full bg-red-500" />
        <div className="h-[1.5px] flex-1 bg-red-400/70" />
      </div>
    </div>
  )
}

// ─── Chip de cita ────────────────────────────────────────────────────────────

function CitaChip({ cita, onClick, esProxima }) {
  const top = timeToTop(cita.horaInicio)
  const height = calcCitaHeight(cita.horaInicio, cita.horaFin)
  const horaLabel = cita.horaInicio?.slice(0, 5) || ''
  const emoji = especieToEmoji(cita.mascota?.especie)
  const tipoCorto = TIPO_SHORT[cita.tipoCita] || cita.tipoCita
  const esUrgencia = cita.tipoCita === 'urgencia'
  const sinHistoria = esUrgencia && cita.estado === 'completada' && !cita.historia?.id

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onClick(cita)
      }}
      title={`${cita.mascota?.nombre || 'Cita'} — ${horaLabel}${sinHistoria ? ' — Pendiente de historia' : ''}`}
      className={cn(
        'absolute left-0.5 right-0.5 z-10 overflow-hidden rounded-sm border-y border-r px-1.5 py-1 text-left shadow-sm transition-all hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1',
        buildStateTone(cita.estado),
        esUrgencia && 'border-dashed !border-red-500',
        esProxima && 'ring-2 ring-primary ring-offset-1'
      )}
      style={{
        top: `${top}px`,
        height: `${height}px`,
        minHeight: '24px',
        borderLeftWidth: '3px',
        borderLeftColor: esUrgencia ? '#ef4444' : getAccentColor(cita.estado),
      }}
    >
      {sinHistoria && (
        <span
          className="absolute right-0.5 top-0.5 h-2 w-2 rounded-full bg-red-600 ring-1 ring-white dark:ring-slate-900"
          title="Pendiente de historia clínica"
        />
      )}
      <p className="truncate text-[11px] font-bold leading-tight">
        <span className="mr-0.5 not-italic">{esUrgencia ? '⚡' : emoji}</span>
        {cita.mascota?.nombre || 'Paciente'}
      </p>
      {height >= 44 && (
        <p className="mt-0.5 truncate text-[10px] leading-tight opacity-75">
          {horaLabel} · {tipoCorto}
        </p>
      )}
      {height >= 64 && (
        <p className="mt-0.5 truncate text-[10px] leading-tight opacity-60">
          {cita.propietario?.nombre?.split(' ')[0] || ''}
        </p>
      )}
      {height >= 84 && (
        <p className="mt-0.5 truncate text-[10px] leading-tight opacity-55">
          Dr. {cita.veterinario?.nombre?.split(' ')[0] || ''}
        </p>
      )}
    </button>
  )
}

// ─── Dialog de detalle de cita ───────────────────────────────────────────────

function CitaDetailDialog({
  cita,
  open,
  onClose,
  puedeGestionarEstado,
  puedeReprogramar,
  onUpdateStatus,
  onReschedule,
  isUpdating,
  isRescheduling,
}) {
  const [statusForm, setStatusForm] = useState({ estado: '', motivoCancelacion: '' })
  const [rescheduleForm, setRescheduleForm] = useState({ fecha: '', horaInicio: '', horaFin: '' })
  const [activeSection, setActiveSection] = useState('estado')

  useEffect(() => {
    if (cita) {
      setStatusForm({ estado: cita.estado, motivoCancelacion: cita.motivoCancelacion || '' })
      setRescheduleForm({
        fecha: cita.fecha || '',
        horaInicio: cita.horaInicio?.slice(0, 5) || '',
        horaFin: cita.horaFin?.slice(0, 5) || '',
      })
      setActiveSection('estado')
    }
  }, [cita])

  if (!cita) return null

  const handleStatusSubmit = (event) => {
    event.preventDefault()
    if (statusForm.estado === 'cancelada' && !statusForm.motivoCancelacion.trim()) return
    onUpdateStatus(
      cita.id,
      {
        estado: statusForm.estado,
        motivoCancelacion:
          statusForm.estado === 'cancelada' ? statusForm.motivoCancelacion.trim() : undefined,
      },
      cita,
    )
  }

  const handleRescheduleSubmit = (event) => {
    event.preventDefault()
    if (!rescheduleForm.fecha || !rescheduleForm.horaInicio || !rescheduleForm.horaFin) return
    if (rescheduleForm.horaFin <= rescheduleForm.horaInicio) return
    onReschedule(cita.id, {
      fecha: rescheduleForm.fecha,
      horaInicio: rescheduleForm.horaInicio,
      horaFin: rescheduleForm.horaFin,
    })
  }

  const cannotReschedule =
    cita.estado === 'completada' || cita.estado === 'cancelada'

  return (
    <DialogRoot open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm sm:max-w-md dark:bg-slate-900 dark:border-slate-700">
        <DialogHeader className="mb-4">
          <DialogTitle className="dark:text-slate-100">
            {cita.mascota?.nombre || 'Cita'}
          </DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-0.5 text-sm">
              <p className="text-muted-foreground">
                Tutor: <span className="font-medium text-foreground">{cita.propietario?.nombre || '—'}</span>
              </p>
              <p className="text-muted-foreground">
                Profesional: <span className="font-medium text-foreground">{cita.veterinario?.nombre || '—'}</span>
              </p>
              <p className="text-muted-foreground">
                Horario:{' '}
                <span className="font-medium text-foreground">
                  {cita.horaInicio?.slice(0, 5)} – {cita.horaFin?.slice(0, 5)}
                </span>
              </p>
              <p className="text-muted-foreground">
                Tipo:{' '}
                <span className="font-medium text-foreground">
                  {CITA_TIPO_LABELS[cita.tipoCita] || cita.tipoCita}
                </span>
              </p>
              {cita.motivo && (
                <p className="text-muted-foreground">
                  Motivo: <span className="font-medium text-foreground">{cita.motivo}</span>
                </p>
              )}
              <div className="flex items-center gap-2 pt-1">
                <span
                  className={cn(
                    'inline-flex items-center rounded-sm border px-2 py-0.5 text-xs font-semibold',
                    buildStateTone(cita.estado)
                  )}
                >
                  {CITA_ESTADO_LABELS[cita.estado] || cita.estado}
                </span>
                {puedeGestionarEstado && cita.estado === 'programada' && (
                  <button
                    type="button"
                    disabled={isUpdating}
                    onClick={() => onUpdateStatus(cita.id, { estado: 'en_espera' }, cita)}
                    className="text-xs font-semibold text-primary hover:underline disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Marcar en espera
                  </button>
                )}
              </div>
            </div>
          </DialogDescription>
        </DialogHeader>

        {cita.tipoCita === 'urgencia' && cita.estado === 'completada' && !cita.historia?.id && (
          <div className="mb-4 flex items-center justify-between gap-3 border border-red-300 bg-red-50 px-3 py-2.5 text-sm dark:border-red-700 dark:bg-red-900/30">
            <p className="leading-tight text-red-800 dark:text-red-200">
              Esta urgencia aún no tiene historia clínica. El proceso no queda cerrado hasta documentarla.
            </p>
            <Link
              to={`/pacientes/${cita.mascota?.id}/historial?citaId=${cita.id}`}
              className="shrink-0 whitespace-nowrap border border-red-600 bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-700"
            >
              Completar historia
            </Link>
          </div>
        )}

        {/* Tabs de sección */}
        {(puedeGestionarEstado || puedeReprogramar) && (
          <div className="flex gap-1 border-b border-border pb-3 mb-4">
            {puedeGestionarEstado && (
              <button
                type="button"
                onClick={() => setActiveSection('estado')}
                className={cn(
                  'px-3 py-1.5 text-xs font-semibold transition',
                  activeSection === 'estado'
                    ? 'bg-primary text-white'
                    : 'border border-border bg-muted text-muted-foreground hover:text-foreground'
                )}
              >
                Cambiar estado
              </button>
            )}
            {puedeReprogramar && !cannotReschedule && (
              <button
                type="button"
                onClick={() => setActiveSection('reprogramar')}
                className={cn(
                  'px-3 py-1.5 text-xs font-semibold transition',
                  activeSection === 'reprogramar'
                    ? 'bg-primary text-white'
                    : 'border border-border bg-muted text-muted-foreground hover:text-foreground'
                )}
              >
                Reprogramar
              </button>
            )}
          </div>
        )}

        {/* Sección estado */}
        {activeSection === 'estado' && puedeGestionarEstado && (
          <form className="grid gap-3" onSubmit={handleStatusSubmit}>
            <select
              value={statusForm.estado}
              onChange={(e) =>
                setStatusForm((prev) => ({ ...prev, estado: e.target.value }))
              }
              className="h-10 border border-border bg-card px-3 text-sm text-foreground outline-none transition focus:border-primary dark:bg-slate-800 dark:text-slate-100"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            {statusForm.estado === 'cancelada' && (
              <textarea
                value={statusForm.motivoCancelacion}
                onChange={(e) =>
                  setStatusForm((prev) => ({ ...prev, motivoCancelacion: e.target.value }))
                }
                placeholder="Motivo de cancelación (obligatorio)"
                className="min-h-[80px] border border-border bg-card px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary dark:bg-slate-800 dark:text-slate-100"
                required
              />
            )}

            <button
              type="submit"
              disabled={isUpdating || (statusForm.estado === 'cancelada' && !statusForm.motivoCancelacion.trim())}
              className="flex h-10 items-center justify-center gap-2 border border-border bg-foreground px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isUpdating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {isUpdating ? 'Guardando...' : 'Actualizar estado'}
            </button>
          </form>
        )}

        {/* Sección reprogramar */}
        {activeSection === 'reprogramar' && puedeReprogramar && !cannotReschedule && (
          <form className="grid gap-3" onSubmit={handleRescheduleSubmit}>
            <input
              type="date"
              value={rescheduleForm.fecha}
              onChange={(e) =>
                setRescheduleForm((prev) => ({ ...prev, fecha: e.target.value }))
              }
              className="h-10 border border-border bg-card px-3 text-sm text-foreground outline-none transition focus:border-primary dark:bg-slate-800 dark:text-slate-100"
              required
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                type="time"
                value={rescheduleForm.horaInicio}
                onChange={(e) =>
                  setRescheduleForm((prev) => ({ ...prev, horaInicio: e.target.value }))
                }
                className="h-10 border border-border bg-card px-3 text-sm text-foreground outline-none transition focus:border-primary dark:bg-slate-800 dark:text-slate-100"
                required
              />
              <input
                type="time"
                value={rescheduleForm.horaFin}
                onChange={(e) =>
                  setRescheduleForm((prev) => ({ ...prev, horaFin: e.target.value }))
                }
                className="h-10 border border-border bg-card px-3 text-sm text-foreground outline-none transition focus:border-primary dark:bg-slate-800 dark:text-slate-100"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isRescheduling}
              className="flex h-10 items-center justify-center gap-2 border border-border bg-foreground px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isRescheduling && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {isRescheduling ? 'Guardando...' : 'Reprogramar cita'}
            </button>
          </form>
        )}

        {cannotReschedule && activeSection === 'reprogramar' && (
          <p className="text-sm text-muted-foreground">
            Esta cita ya fue {cita.estado === 'completada' ? 'completada' : 'cancelada'} y no se puede reprogramar.
          </p>
        )}
      </DialogContent>
    </DialogRoot>
  )
}

// ─── Componente principal ────────────────────────────────────────────────────

const TOTAL_SLOTS = (HORA_FIN - HORA_INICIO) * 2
const GRID_HEIGHT = TOTAL_SLOTS * SLOT_HEIGHT

export default function AgendaCalendar({
  veterinarioId,
  estado,
  enabled = true,
  puedeProgramar = false,
  puedeGestionarEstado = false,
  puedeReprogramar = false,
  onSlotClick,
  onUpdateStatus,
  onReschedule,
  isUpdating = false,
  isRescheduling = false,
}) {
  const {
    semanaActual,
    irSemanaAnterior,
    irSemanaSiguiente,
    irHoy,
    getCitasDelDia,
    proximaCitaId,
    isLoading,
    isFetching,
    slots,
  } = useAgendaCalendar({ veterinarioId, estado, enabled })

  const [selectedCita, setSelectedCita] = useState(null)

  // Cierra el dialog cuando la mutación de estado/reprogramar termina exitosamente
  useEffect(() => {
    if (!isUpdating && !isRescheduling && selectedCita) {
      // No cerrar automáticamente — el usuario puede querer hacer otra acción
    }
  }, [isUpdating, isRescheduling, selectedCita])

  const handleCitaUpdate = (citaId, payload, cita) => {
    onUpdateStatus(citaId, payload, cita)
  }
  const handleCitaReschedule = (citaId, payload) => {
    onReschedule(citaId, payload)
  }

  // Semana legible: "26 mayo – 1 jun 2026"
  const semanaLabel = (() => {
    const ini = semanaActual[0]
    const fin = semanaActual[6]
    const mismoMes = ini.getMonth() === fin.getMonth()
    const mismoAnio = ini.getFullYear() === fin.getFullYear()
    if (mismoMes) {
      return `${format(ini, 'd')} – ${format(fin, 'd')} de ${format(ini, 'MMMM yyyy', { locale: es })}`
    }
    if (mismoAnio) {
      return `${format(ini, "d 'de' MMMM", { locale: es })} – ${format(fin, "d 'de' MMMM yyyy", { locale: es })}`
    }
    return `${format(ini, "d MMM yyyy", { locale: es })} – ${format(fin, "d MMM yyyy", { locale: es })}`
  })()

  return (
    <div className="flex flex-col gap-0">
      {/* Barra de navegación */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={irSemanaAnterior}
            className="flex h-8 w-8 items-center justify-center border border-border bg-card text-muted-foreground transition hover:bg-muted hover:text-foreground"
            aria-label="Semana anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={irHoy}
            className="h-8 border border-border bg-card px-3 text-xs font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            Hoy
          </button>
          <button
            type="button"
            onClick={irSemanaSiguiente}
            className="flex h-8 w-8 items-center justify-center border border-border bg-card text-muted-foreground transition hover:bg-muted hover:text-foreground"
            aria-label="Semana siguiente"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <p className="text-sm font-semibold capitalize text-foreground">{semanaLabel}</p>

        {isFetching && !isLoading && (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {/* Grilla del calendario */}
      <div
        className="overflow-auto rounded-sm border border-border"
        style={{ maxHeight: '68vh' }}
      >
        <div style={{ minWidth: '640px' }}>
          {/* Cabecera: nombres de día */}
          <div
            className="sticky top-0 z-20 grid border-b border-border bg-card"
            style={{ gridTemplateColumns: '52px repeat(7, minmax(0, 1fr))' }}
          >
            {/* Celda vacía sobre la columna de horas */}
            <div className="border-r border-border" />

            {semanaActual.map((day) => {
              const esHoy = isToday(day)
              const count = getCitasDelDia(day).length
              return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    'border-r border-border py-2 text-center last:border-r-0',
                    esHoy && 'bg-primary/5'
                  )}
                >
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    {format(day, 'EEE', { locale: es })}
                  </p>
                  <p
                    className={cn(
                      'mt-0.5 text-sm font-semibold leading-none',
                      esHoy
                        ? 'mx-auto flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white'
                        : 'text-foreground'
                    )}
                  >
                    {format(day, 'd')}
                  </p>
                  {!isLoading && count > 0 && (
                    <span
                      className={cn(
                        'mt-1 inline-flex h-4 items-center justify-center rounded-full px-1.5 text-[9px] font-bold',
                        count >= 4
                          ? 'bg-primary text-white'
                          : 'bg-muted text-muted-foreground'
                      )}
                    >
                      {count}
                    </span>
                  )}
                </div>
              )
            })}
          </div>

          {/* Cuerpo: columna de horas + columnas de días */}
          <div
            className="grid"
            style={{ gridTemplateColumns: '52px repeat(7, minmax(0, 1fr))' }}
          >
            {/* Columna de horas */}
            <div className="border-r border-border">
              {isLoading
                ? Array.from({ length: TOTAL_SLOTS }).map((_, i) => (
                    <div
                      key={i}
                      className="border-b border-border"
                      style={{ height: `${SLOT_HEIGHT}px` }}
                    />
                  ))
                : slots.map((slot) => (
                    <div
                      key={slot}
                      className="flex items-start justify-end border-b border-border pr-1.5 pt-0.5"
                      style={{ height: `${SLOT_HEIGHT}px` }}
                    >
                      {slot.endsWith(':00') && (
                        <span className="text-[10px] tabular-nums text-muted-foreground">
                          {slot}
                        </span>
                      )}
                    </div>
                  ))}
            </div>

            {/* Columnas de cada día */}
            {semanaActual.map((day) => {
              const esHoy = isToday(day)
              const citasDelDia = getCitasDelDia(day)

              return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    'relative border-r border-border last:border-r-0',
                    esHoy && 'bg-primary/[0.025]'
                  )}
                  style={{ height: isLoading ? `${GRID_HEIGHT}px` : `${GRID_HEIGHT}px` }}
                >
                  {/* Fondos de slot (clickeables para nueva cita) */}
                  {slots.map((slot, idx) => (
                    <div
                      key={slot}
                      role={puedeProgramar ? 'button' : undefined}
                      tabIndex={puedeProgramar ? 0 : undefined}
                      aria-label={
                        puedeProgramar
                          ? `Nueva cita el ${format(day, "d 'de' MMMM", { locale: es })} a las ${slot}`
                          : undefined
                      }
                      className={cn(
                        'absolute w-full border-b border-border/60',
                        slot.endsWith(':00') && 'border-border',
                        puedeProgramar && 'hover:bg-accent/30 cursor-pointer transition-colors'
                      )}
                      style={{
                        top: `${idx * SLOT_HEIGHT}px`,
                        height: `${SLOT_HEIGHT}px`,
                      }}
                      onClick={() => {
                        if (puedeProgramar && onSlotClick) {
                          onSlotClick(format(day, 'yyyy-MM-dd'), slot)
                        }
                      }}
                      onKeyDown={(e) => {
                        if (puedeProgramar && onSlotClick && (e.key === 'Enter' || e.key === ' ')) {
                          onSlotClick(format(day, 'yyyy-MM-dd'), slot)
                        }
                      }}
                    />
                  ))}

                  {/* Skeleton de carga */}
                  {isLoading &&
                    [40, 60, 80].map((top) => (
                      <div
                        key={top}
                        className="absolute left-0.5 right-0.5 animate-pulse rounded-sm bg-muted"
                        style={{ top: `${top}%`, height: '28px', opacity: 0.5 }}
                      />
                    ))}

                  {/* Indicador de hora actual */}
                  {!isLoading && esHoy && <NowLine />}

                  {/* Chips de citas */}
                  {!isLoading &&
                    citasDelDia.map((cita) => (
                      <CitaChip
                        key={cita.id}
                        cita={cita}
                        onClick={setSelectedCita}
                        esProxima={esHoy && cita.id === proximaCitaId}
                      />
                    ))}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Leyenda de estados */}
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 px-1">
        {[
          { estado: 'programada',  label: 'Programada' },
          { estado: 'en_espera',   label: 'En espera' },
          { estado: 'completada',  label: 'Completada' },
          { estado: 'cancelada',   label: 'Cancelada' },
          { estado: 'no_asistio',  label: 'No asistió' },
        ].map(({ estado, label }) => (
          <div key={estado} className="flex items-center gap-1.5">
            <div
              className={cn('h-3 w-3 rounded-sm border-y border-r', buildStateTone(estado))}
              style={{ borderLeftWidth: '3px', borderLeftColor: getAccentColor(estado) }}
            />
            <span className="text-[11px] text-muted-foreground">{label}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-sm border-y border-r border-dashed border-red-500 bg-red-50 dark:bg-red-900/20" />
          <span className="text-[11px] text-muted-foreground">Urgencia</span>
        </div>
      </div>

      {/* Dialog de detalle */}
      <CitaDetailDialog
        cita={selectedCita}
        open={!!selectedCita}
        onClose={() => setSelectedCita(null)}
        puedeGestionarEstado={puedeGestionarEstado}
        puedeReprogramar={puedeReprogramar}
        onUpdateStatus={(citaId, payload, cita) => {
          handleCitaUpdate(citaId, payload, cita)
          setSelectedCita(null)
        }}
        onReschedule={(citaId, payload) => {
          handleCitaReschedule(citaId, payload)
          setSelectedCita(null)
        }}
        isUpdating={isUpdating}
        isRescheduling={isRescheduling}
      />
    </div>
  )
}
