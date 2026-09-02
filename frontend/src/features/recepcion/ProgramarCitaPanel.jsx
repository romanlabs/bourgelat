import { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery } from '@tanstack/react-query'
import { Plus, TriangleAlert } from 'lucide-react'
import { toast } from 'sonner'
import { DashboardPanel } from '@/features/dashboard/dashboardComponents'
import { TutorPetSelector } from './TutorPetSelector'
import { TYPE_OPTIONS } from './recepcionConstants'
import { Select } from '@/components/ui/select'
import { HoraPicker } from '@/components/shared/HoraPicker'
import { formatFranja12 } from '@/lib/hora'
import { agendaApi } from '@/features/agenda/agendaApi'
import { evaluarIntervalo } from '@/features/agenda/calendarConstants'
import { hasAnyRole } from '@/lib/permissions'

// Hora local, no UTC: con toISOString() despues de las 19:00 en Colombia el
// formulario abriria en el dia siguiente.
const getToday = () => {
  const ahora = new Date()
  return `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}-${String(
    ahora.getDate()
  ).padStart(2, '0')}`
}

const citaSchema = z.object({
  fecha: z.string().min(1, 'La fecha es obligatoria'),
  horaInicio: z.string().min(1, 'La hora de inicio es obligatoria'),
  horaFin: z.string().min(1, 'La hora de fin es obligatoria'),
  tipoCita: z.string(),
  consultorioId: z.string().optional(),
  veterinarioId: z.string().min(1, 'Selecciona el profesional'),
  motivo: z.string().min(1, 'El motivo es obligatorio'),
  observaciones: z.string().optional(),
}).refine((data) => data.horaFin > data.horaInicio, {
  message: 'La hora de fin debe ser mayor a la hora de inicio',
  path: ['horaFin'],
})

const DEFAULT_VALUES = {
  fecha: getToday(),
  horaInicio: '09:00',
  horaFin: '09:30',
  tipoCita: 'consulta_general',
  consultorioId: '',
  veterinarioId: '',
  motivo: '',
  observaciones: '',
}

const fieldClass =
  'h-11 border border-border bg-card px-3 text-sm text-foreground outline-none transition focus:border-primary'

/**
 * Panel izquierdo de Recepción: programa una cita nueva. Evolución del
 * formulario que antes vivia inline en el tab "Gestión de citas" de
 * AgendaPage — ahora en React Hook Form + Zod.
 */
export function ProgramarCitaPanel({
  prefill,
  veterinarios,
  consultorios,
  mascotas,
  usuario,
  puedeProgramar,
  crearCitaMutation,
  bare = false,
  onSuccess,
}) {
  const [ownerSearch, setOwnerSearch] = useState('')
  const [selectedOwner, setSelectedOwner] = useState(null)
  const [mascotaId, setMascotaId] = useState('')

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm({ resolver: zodResolver(citaSchema), defaultValues: DEFAULT_VALUES })

  useEffect(() => {
    if (prefill?.fecha || prefill?.horaInicio || prefill?.horaFin) {
      if (prefill.fecha) setValue('fecha', prefill.fecha)
      if (prefill.horaInicio) setValue('horaInicio', prefill.horaInicio)
      if (prefill.horaFin) setValue('horaFin', prefill.horaFin)
    }
  }, [prefill, setValue])

  const fechaWatch = watch('fecha')
  const horaInicioWatch = watch('horaInicio')
  const horaFinWatch = watch('horaFin')

  // Horario de atencion y bloqueos del dia elegido: sirven para avisar antes de
  // que el backend rechace la cita.
  const disponibilidadQuery = useQuery({
    queryKey: ['agenda-disponibilidad', fechaWatch, fechaWatch],
    queryFn: () => agendaApi.obtenerDisponibilidadAgenda({ desde: fechaWatch, hasta: fechaWatch }),
    enabled: Boolean(fechaWatch) && puedeProgramar,
  })

  const ventana =
    fechaWatch && horaInicioWatch && horaFinWatch && horaFinWatch > horaInicioWatch
      ? evaluarIntervalo(fechaWatch, horaInicioWatch, horaFinWatch, {
          horarioAtencion: disponibilidadQuery.data?.horarioAtencion || null,
          bloqueos: disponibilidadQuery.data?.bloqueos || [],
        })
      : { valido: true }

  // Solo la administracion puede forzar una cita fuera de horario (urgencias);
  // el backend aplica la misma regla.
  const puedeForzar = hasAnyRole(usuario, ['admin', 'superadmin'])
  const [forzar, setForzar] = useState(false)

  useEffect(() => {
    if (ventana.valido) setForzar(false)
  }, [ventana.valido])

  const preferredVeterinarioId =
    veterinarios.find((item) => item.id === usuario?.id)?.id || veterinarios[0]?.id || ''
  const veterinarioIdWatch = watch('veterinarioId')

  useEffect(() => {
    if (!veterinarioIdWatch && preferredVeterinarioId) {
      setValue('veterinarioId', preferredVeterinarioId)
    }
  }, [preferredVeterinarioId, veterinarioIdWatch, setValue])

  const onSubmit = (values) => {
    if (!selectedOwner || !mascotaId) {
      toast.error('Selecciona un tutor y una mascota antes de guardar.')
      return
    }

    crearCitaMutation.mutate({
      fecha: values.fecha,
      horaInicio: values.horaInicio,
      horaFin: values.horaFin,
      motivo: values.motivo.trim(),
      tipoCita: values.tipoCita,
      observaciones: values.observaciones?.trim() || undefined,
      propietarioId: selectedOwner?.id,
      mascotaId,
      veterinarioId: values.veterinarioId || preferredVeterinarioId,
      consultorioId: values.consultorioId || undefined,
      forzarFueraDeHorario: forzar || undefined,
    }, {
      onSuccess: () => {
        reset({ ...DEFAULT_VALUES, fecha: values.fecha, veterinarioId: values.veterinarioId })
        setSelectedOwner(null)
        setMascotaId('')
        setForzar(false)
        onSuccess?.()
      },
    })
  }

  const contenido = (
    <>
      {!puedeProgramar ? (
        <div className="border border-border bg-muted px-4 py-5 text-sm leading-7 text-muted-foreground">
          Tu rol actual puede consultar la agenda, pero no crear nuevas citas.
        </div>
      ) : (
        <form className="grid gap-4" onSubmit={handleSubmit(onSubmit)}>
          <TutorPetSelector
            ownerSearch={ownerSearch}
            onOwnerSearchChange={setOwnerSearch}
            selectedOwner={selectedOwner}
            onSelectOwner={(owner) => {
              setSelectedOwner(owner)
              setMascotaId('')
            }}
            mascotas={mascotas}
            mascotaId={mascotaId}
            onSelectMascota={setMascotaId}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <input type="date" {...register('fecha')} className={`${fieldClass} w-full`} />
              {errors.fecha ? <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.fecha.message}</p> : null}
            </div>
            <Controller
              name="tipoCita"
              control={control}
              render={({ field }) => (
                <Select
                  variant="field"
                  aria-label="Tipo de cita"
                  value={field.value}
                  onValueChange={field.onChange}
                  options={TYPE_OPTIONS}
                />
              )}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Desde
              </p>
              <Controller
                name="horaInicio"
                control={control}
                render={({ field }) => (
                  <HoraPicker
                    aria-label="Hora de inicio"
                    value={field.value}
                    onChange={field.onChange}
                  />
                )}
              />
              {errors.horaInicio ? <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.horaInicio.message}</p> : null}
            </div>
            <div>
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Hasta
              </p>
              <Controller
                name="horaFin"
                control={control}
                render={({ field }) => (
                  <HoraPicker aria-label="Hora de fin" value={field.value} onChange={field.onChange} />
                )}
              />
              {errors.horaFin ? <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.horaFin.message}</p> : null}
            </div>
          </div>

          {!ventana.valido ? (
            <div className="border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-200">
              <p className="flex items-start gap-2 font-semibold">
                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                {ventana.codigo === 'bloqueado'
                  ? `La agenda está bloqueada ese día: ${ventana.motivo}`
                  : ventana.codigo === 'dia_cerrado'
                    ? 'La clínica no atiende ese día.'
                    : 'Ese horario está fuera del horario de atención.'}
              </p>
              {ventana.franjas?.length ? (
                <p className="mt-1 pl-6 text-xs">
                  Horario de ese día:{' '}
                  {ventana.franjas
                    .map((franja) => formatFranja12(franja.inicio, franja.fin))
                    .join(' · ')}
                </p>
              ) : null}
              {puedeForzar ? (
                <label className="mt-2 flex items-center gap-2 pl-6 text-xs font-semibold">
                  <input
                    type="checkbox"
                    checked={forzar}
                    onChange={(event) => setForzar(event.target.checked)}
                    className="h-4 w-4 border-border text-primary focus:ring-primary"
                  />
                  Agendar de todos modos (urgencia)
                </label>
              ) : null}
            </div>
          ) : null}

          <Controller
            name="consultorioId"
            control={control}
            render={({ field }) => (
              <Select
                variant="field"
                aria-label="Consultorio"
                placeholder="Sin consultorio asignado"
                value={field.value}
                onValueChange={field.onChange}
                options={consultorios.map((item) => ({ value: item.id, label: item.nombre }))}
              />
            )}
          />

          <div>
            <Controller
              name="veterinarioId"
              control={control}
              render={({ field }) => (
                <Select
                  variant="field"
                  aria-label="Profesional"
                  placeholder="Selecciona el profesional"
                  value={field.value}
                  onValueChange={field.onChange}
                  options={veterinarios.map((item) => ({ value: item.id, label: item.nombre }))}
                />
              )}
            />
            {errors.veterinarioId ? <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.veterinarioId.message}</p> : null}
          </div>

          <div>
            <input
              type="text"
              {...register('motivo')}
              placeholder="Motivo principal de la cita"
              className={`${fieldClass} w-full`}
            />
            {errors.motivo ? <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.motivo.message}</p> : null}
          </div>

          <textarea
            {...register('observaciones')}
            placeholder="Observaciones operativas para recepcion o consulta"
            className="min-h-[100px] border border-border bg-card px-3 py-3 text-sm text-foreground outline-none transition focus:border-primary"
          />

          <button
            type="submit"
            disabled={
              crearCitaMutation.isPending ||
              !selectedOwner ||
              !mascotaId ||
              veterinarios.length === 0 ||
              (!ventana.valido && !forzar)
            }
            className="border border-border bg-foreground px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {crearCitaMutation.isPending ? 'Guardando...' : 'Guardar cita'}
          </button>
        </form>
      )}
    </>
  )

  if (bare) return contenido

  return (
    <DashboardPanel
      title="Programar nueva cita"
      subtitle="Selecciona tutor, mascota, horario y profesional. Al confirmar, entra a la sala de espera como pendiente de llegada."
      action={<Plus className="h-4 w-4 text-primary" />}
    >
      {contenido}
    </DashboardPanel>
  )
}
