import { useEffect, useState } from 'react'
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

// ─── Colores por estado (reutiliza la lógica de AgendaPage) ──────────────────

function buildStateTone(estado) {
  switch (estado) {
    case 'confirmada':
      return 'border-primary/40 bg-primary/15 text-primary dark:bg-primary/20'
    case 'en_curso':
      return 'border-violet-300 bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-700'
    case 'completada':
      return 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700'
    case 'cancelada':
      return 'border-red-300 bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700'
    case 'no_asistio':
      return 'border-amber-300 bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700'
    default: // programada
      return 'border-border bg-muted text-foreground'
  }
}

const STATUS_OPTIONS = [
  { value: 'programada', label: 'Programada' },
  { value: 'confirmada', label: 'Confirmada' },
  { value: 'en_curso', label: 'En curso' },
  { value: 'completada', label: 'Completada' },
  { value: 'cancelada', label: 'Cancelada' },
  { value: 'no_asistio', label: 'No asistió' },
]

// ─── Chip de cita ────────────────────────────────────────────────────────────

function CitaChip({ cita, onClick }) {
  const top = timeToTop(cita.horaInicio)
  const height = calcCitaHeight(cita.horaInicio, cita.horaFin)
  const horaLabel = cita.horaInicio?.slice(0, 5) || ''

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onClick(cita)
      }}
      title={`${cita.mascota?.nombre || 'Cita'} — ${horaLabel}`}
      className={cn(
        'absolute left-0.5 right-0.5 z-10 overflow-hidden rounded-sm border px-1.5 py-0.5 text-left transition-opacity hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1',
        buildStateTone(cita.estado)
      )}
      style={{ top: `${top}px`, height: `${height}px`, minHeight: '22px' }}
    >
      <p className="truncate text-[11px] font-semibold leading-tight">
        {cita.mascota?.nombre || 'Paciente'}
      </p>
      {height >= 38 && (
        <p className="truncate text-[10px] leading-tight opacity-80">
          {horaLabel} · {cita.veterinario?.nombre?.split(' ')[0] || ''}
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
              <div className="pt-1">
                <span
                  className={cn(
                    'inline-flex items-center rounded-sm border px-2 py-0.5 text-xs font-semibold',
                    buildStateTone(cita.estado)
                  )}
                >
                  {CITA_ESTADO_LABELS[cita.estado] || cita.estado}
                </span>
              </div>
            </div>
          </DialogDescription>
        </DialogHeader>

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
                      'text-sm font-semibold leading-none mt-0.5',
                      esHoy
                        ? 'flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white mx-auto'
                        : 'text-foreground'
                    )}
                  >
                    {format(day, 'd')}
                  </p>
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

                  {/* Chips de citas */}
                  {!isLoading &&
                    citasDelDia.map((cita) => (
                      <CitaChip
                        key={cita.id}
                        cita={cita}
                        onClick={setSelectedCita}
                      />
                    ))}
                </div>
              )
            })}
          </div>
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
