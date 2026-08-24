import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { DashboardPanel } from '@/features/dashboard/dashboardComponents'
import { TutorPetSelector } from './TutorPetSelector'
import { TYPE_OPTIONS } from './recepcionConstants'

const getToday = () => new Date().toISOString().slice(0, 10)

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
    }, {
      onSuccess: () => {
        reset({ ...DEFAULT_VALUES, fecha: values.fecha, veterinarioId: values.veterinarioId })
        setSelectedOwner(null)
        setMascotaId('')
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
              {errors.fecha ? <p className="mt-1 text-xs text-red-600">{errors.fecha.message}</p> : null}
            </div>
            <select {...register('tipoCita')} className={fieldClass}>
              {TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <input type="time" {...register('horaInicio')} className={`${fieldClass} w-full`} />
              {errors.horaInicio ? <p className="mt-1 text-xs text-red-600">{errors.horaInicio.message}</p> : null}
            </div>
            <div>
              <input type="time" {...register('horaFin')} className={`${fieldClass} w-full`} />
              {errors.horaFin ? <p className="mt-1 text-xs text-red-600">{errors.horaFin.message}</p> : null}
            </div>
          </div>

          <select {...register('consultorioId')} className={fieldClass}>
            <option value="">Sin consultorio asignado</option>
            {consultorios.map((item) => (
              <option key={item.id} value={item.id}>{item.nombre}</option>
            ))}
          </select>

          <div>
            <select
              {...register('veterinarioId')}
              className={`${fieldClass} w-full`}
            >
              <option value="">Selecciona el profesional</option>
              {veterinarios.map((item) => (
                <option key={item.id} value={item.id}>{item.nombre}</option>
              ))}
            </select>
            {errors.veterinarioId ? <p className="mt-1 text-xs text-red-600">{errors.veterinarioId.message}</p> : null}
          </div>

          <div>
            <input
              type="text"
              {...register('motivo')}
              placeholder="Motivo principal de la cita"
              className={`${fieldClass} w-full`}
            />
            {errors.motivo ? <p className="mt-1 text-xs text-red-600">{errors.motivo.message}</p> : null}
          </div>

          <textarea
            {...register('observaciones')}
            placeholder="Observaciones operativas para recepcion o consulta"
            className="min-h-[100px] border border-border bg-card px-3 py-3 text-sm text-foreground outline-none transition focus:border-primary"
          />

          <button
            type="submit"
            disabled={crearCitaMutation.isPending || !selectedOwner || !mascotaId || veterinarios.length === 0}
            className="border border-border bg-foreground px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
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
