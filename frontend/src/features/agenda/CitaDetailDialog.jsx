import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { FileWarning, Loader2, TriangleAlert } from 'lucide-react'
import { cn } from '@/lib/utils'
import { NavCta } from '@/components/shared/NavCta'
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
import { buildStateTone, STATUS_OPTIONS, evaluarIntervalo } from './calendarConstants'
import { Select } from '@/components/ui/select'
import { HoraPicker } from '@/components/shared/HoraPicker'
import { formatHora12, formatFranja12 } from '@/lib/hora'
import { agendaApi } from './agendaApi'
import { useAuthStore } from '@/store/authStore'
import { hasAnyRole } from '@/lib/permissions'

export function CitaDetailDialog({
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
  const [forzar, setForzar] = useState(false)
  const usuario = useAuthStore((state) => state.usuario)

  useEffect(() => {
    if (cita) {
      setStatusForm({ estado: cita.estado, motivoCancelacion: cita.motivoCancelacion || '' })
      setRescheduleForm({
        fecha: cita.fecha || '',
        horaInicio: cita.horaInicio?.slice(0, 5) || '',
        horaFin: cita.horaFin?.slice(0, 5) || '',
      })
      setActiveSection('estado')
      setForzar(false)
    }
  }, [cita])

  // Horario de atencion y bloqueos de la fecha destino, para avisar antes de
  // que el backend rechace la reprogramacion.
  const disponibilidadQuery = useQuery({
    queryKey: ['agenda-disponibilidad', rescheduleForm.fecha, rescheduleForm.fecha],
    queryFn: () =>
      agendaApi.obtenerDisponibilidadAgenda({
        desde: rescheduleForm.fecha,
        hasta: rescheduleForm.fecha,
      }),
    enabled: open && Boolean(rescheduleForm.fecha) && activeSection === 'reprogramar',
  })

  const ventana =
    rescheduleForm.fecha && rescheduleForm.horaFin > rescheduleForm.horaInicio
      ? evaluarIntervalo(rescheduleForm.fecha, rescheduleForm.horaInicio, rescheduleForm.horaFin, {
          horarioAtencion: disponibilidadQuery.data?.horarioAtencion || null,
          bloqueos: disponibilidadQuery.data?.bloqueos || [],
        })
      : { valido: true }

  // Solo la administracion puede forzar fuera de horario; el backend valida igual.
  const puedeForzar = hasAnyRole(usuario, ['admin', 'superadmin'])

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
      forzarFueraDeHorario: forzar || undefined,
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
                  {formatHora12(cita.horaInicio)} – {formatHora12(cita.horaFin)}
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
            <NavCta
              to={`/pacientes/${cita.mascota?.id}/historial?citaId=${cita.id}`}
              icon={FileWarning}
              tone="destructive"
              size="sm"
              className="shrink-0 whitespace-nowrap"
            >
              Completar historia
            </NavCta>
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
            <Select
              variant="field"
              aria-label="Estado de la cita"
              value={statusForm.estado}
              onValueChange={(value) => setStatusForm((prev) => ({ ...prev, estado: value }))}
              options={STATUS_OPTIONS}
            />

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
              className="flex h-10 items-center justify-center gap-2 border border-border bg-foreground px-4 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
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
            <div className="grid gap-2">
              <HoraPicker
                aria-label="Nueva hora de inicio"
                value={rescheduleForm.horaInicio}
                onChange={(valor) => setRescheduleForm((prev) => ({ ...prev, horaInicio: valor }))}
              />
              <HoraPicker
                aria-label="Nueva hora de fin"
                value={rescheduleForm.horaFin}
                onChange={(valor) => setRescheduleForm((prev) => ({ ...prev, horaFin: valor }))}
              />
            </div>

            {!ventana.valido ? (
              <div className="border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs leading-6 text-amber-800 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-200">
                <p className="flex items-start gap-2 font-semibold">
                  <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  {ventana.codigo === 'bloqueado'
                    ? `Agenda bloqueada: ${ventana.motivo}`
                    : ventana.codigo === 'dia_cerrado'
                      ? 'La clínica no atiende ese día.'
                      : 'Fuera del horario de atención.'}
                </p>
                {ventana.franjas?.length ? (
                  <p className="mt-1 pl-6">
                    Horario de ese día:{' '}
                    {ventana.franjas
                      .map((franja) => formatFranja12(franja.inicio, franja.fin))
                      .join(' · ')}
                  </p>
                ) : null}
                {puedeForzar ? (
                  <label className="mt-2 flex items-center gap-2 font-semibold">
                    <input
                      type="checkbox"
                      checked={forzar}
                      onChange={(event) => setForzar(event.target.checked)}
                      className="h-4 w-4 border-border text-primary focus:ring-primary"
                    />
                    Reprogramar de todos modos (urgencia)
                  </label>
                ) : null}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isRescheduling || (!ventana.valido && !forzar)}
              className="flex h-10 items-center justify-center gap-2 border border-border bg-foreground px-4 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
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
