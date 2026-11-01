import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
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
import { formatFranja12, formatHora12, moverFin } from '@/lib/hora'
import { agendaApi } from '@/features/agenda/agendaApi'
import { evaluarIntervalo, esSlotHabil, generarSlots } from '@/features/agenda/calendarConstants'
import { useEsCelular } from '@/lib/useEsCelular'
import { hasAnyRole } from '@/lib/permissions'
import { hoyLocal } from '@/lib/fecha'

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
  fecha: hoyLocal(),
  horaInicio: '09:00',
  horaFin: '09:30',
  tipoCita: 'consulta_general',
  consultorioId: '',
  veterinarioId: '',
  motivo: '',
  observaciones: '',
}

const fieldClass =
  'h-12 rounded-lg border border-input bg-card px-3 text-base text-foreground outline-none transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:h-11 lg:text-[15px]'

const DURACIONES = [15, 30, 45, 60, 90]

// Pegada al borde inferior del panel a pantalla completa (celular); inline desde sm.
const BARRA_ENVIO =
  'sticky bottom-0 z-10 -mx-4 -mb-4 border-t border-border bg-card px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 sm:static sm:z-auto sm:m-0 sm:border-0 sm:bg-transparent sm:p-0'

/**
 * Panel izquierdo de Recepción: programa una cita nueva. Evolución del
 * formulario que antes vivia inline en el tab "Gestión de citas" de
 * AgendaPage — ahora en React Hook Form + Zod.
 */
export function ProgramarCitaPanel({
  prefill,
  veterinarios,
  veterinariosCargando = false,
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
    getValues,
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

  // Grilla de horarios (celular): solo con el horario de atención de la clínica.
  const esCelular = useEsCelular()
  const [horaExacta, setHoraExacta] = useState(false)
  const horarioAtencion = disponibilidadQuery.data?.horarioAtencion || null
  const hayGrilla = esCelular && Boolean(horarioAtencion)
  const slotsDia = hayGrilla
    ? generarSlots().filter((slot) =>
        esSlotHabil(fechaWatch, slot, { horarioAtencion, bloqueos: disponibilidadQuery.data?.bloqueos || [] })
      )
    : []
  const aMin = (hhmm) => {
    const [h, m] = (hhmm || '00:00').split(':').map(Number)
    return h * 60 + m
  }
  const duracionActual = aMin(horaFinWatch) - aMin(horaInicioWatch)
  const aHora = (total) => {
    const t = Math.min(total, 23 * 60 + 45)
    return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`
  }
  const elegirInicio = (slot) => {
    setValue('horaFin', moverFin(horaInicioWatch, horaFinWatch, slot), { shouldValidate: true })
    setValue('horaInicio', slot, { shouldValidate: true })
  }
  const elegirDuracion = (minutos) => {
    setValue('horaFin', aHora(aMin(horaInicioWatch) + minutos), { shouldValidate: true })
  }
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
        <div className="rounded-xl bg-muted px-4 py-5 text-[15px] leading-7 text-muted-foreground">
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
              {errors.fecha ? <p className="mt-1.5 text-[13px] font-medium text-danger">{errors.fecha.message}</p> : null}
            </div>
            <Controller
              name="tipoCita"
              control={control}
              render={({ field }) => (
                <Select
                  variant="field"
                  className="h-12 lg:h-11"
                  aria-label="Tipo de cita"
                  value={field.value}
                  onValueChange={field.onChange}
                  options={TYPE_OPTIONS}
                />
              )}
            />
          </div>

          {/* Celular: horarios disponibles del día como botones tocables + duración.
              Solo si la clínica tiene horario de atención cargado; si no, queda el selector. */}
          {hayGrilla ? (
            <div className="grid gap-3 lg:hidden">
              <div>
                <p className="mb-2 text-[13px] font-semibold text-muted-foreground">
                  Hora de inicio
                </p>
                {slotsDia.length > 0 ? (
                  <div role="radiogroup" aria-label="Horarios disponibles" className="grid max-h-56 grid-cols-3 gap-2 overflow-y-auto overscroll-contain">
                    {slotsDia.map((slot) => {
                      const activo = slot === horaInicioWatch
                      return (
                        <button
                          key={slot}
                          type="button"
                          role="radio"
                          aria-checked={activo}
                          onClick={() => elegirInicio(slot)}
                          className={`h-11 rounded-lg border text-[13px] font-semibold tabular-nums transition active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                            activo
                              ? 'border-primary bg-primary text-primary-foreground'
                              : 'border-input bg-card text-foreground'
                          }`}
                        >
                          {formatHora12(slot)}
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  <p className="rounded-xl bg-muted px-4 py-3 text-sm text-muted-foreground">
                    No hay horarios de atención ese día.
                  </p>
                )}
              </div>
              <div>
                <p className="mb-2 text-[13px] font-semibold text-muted-foreground">Duración</p>
                <div role="radiogroup" aria-label="Duración de la cita" className="grid grid-cols-5 gap-2">
                  {DURACIONES.map((minutos) => {
                    const activo = duracionActual === minutos
                    return (
                      <button
                        key={minutos}
                        type="button"
                        role="radio"
                        aria-checked={activo}
                        onClick={() => elegirDuracion(minutos)}
                        className={`h-11 rounded-lg border text-[13px] font-semibold tabular-nums transition active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                          activo
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-input bg-card text-foreground'
                        }`}
                      >
                        {minutos} min
                      </button>
                    )
                  })}
                </div>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-xl bg-muted px-4 py-2.5 text-sm">
                <span className="font-semibold tabular-nums text-foreground">
                  {formatFranja12(horaInicioWatch, horaFinWatch)}
                </span>
                <button
                  type="button"
                  onClick={() => setHoraExacta((valor) => !valor)}
                  className="inline-flex min-h-11 items-center rounded px-1 text-[13px] font-semibold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {horaExacta ? 'Ocultar' : 'Hora exacta'}
                </button>
              </div>
            </div>
          ) : null}

          {/* Una hora por fila: el drawer tiene ancho fijo y en dos columnas el
              selector a. m./p. m. se salia del borde. */}
          <div className={`grid gap-4 ${hayGrilla && !horaExacta ? 'max-lg:hidden' : ''}`}>
            <div>
              <p className="mb-1 text-[13px] font-semibold text-muted-foreground">
                Desde
              </p>
              <Controller
                name="horaInicio"
                control={control}
                render={({ field }) => (
                  <HoraPicker
                    aria-label="Hora de inicio"
                    value={field.value}
                    onChange={(valor) => {
                      setValue('horaFin', moverFin(field.value, getValues('horaFin'), valor))
                      field.onChange(valor)
                    }}
                  />
                )}
              />
              {errors.horaInicio ? <p className="mt-1.5 text-[13px] font-medium text-danger">{errors.horaInicio.message}</p> : null}
            </div>
            <div>
              <p className="mb-1 text-[13px] font-semibold text-muted-foreground">
                Hasta
              </p>
              <Controller
                name="horaFin"
                control={control}
                render={({ field }) => (
                  <HoraPicker aria-label="Hora de fin" value={field.value} onChange={field.onChange} />
                )}
              />
              {errors.horaFin ? <p className="mt-1.5 text-[13px] font-medium text-danger">{errors.horaFin.message}</p> : null}
            </div>
          </div>

          {!ventana.valido ? (
            <div className="rounded-xl bg-warning-soft px-4 py-3 text-sm leading-6 text-warning">
              <p className="flex items-start gap-2 font-semibold">
                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                {ventana.codigo === 'bloqueado'
                  ? `La agenda está bloqueada ese día: ${ventana.motivo}`
                  : ventana.codigo === 'dia_cerrado'
                    ? 'La clínica no atiende ese día.'
                    : 'Ese horario está fuera del horario de atención.'}
              </p>
              {ventana.franjas?.length ? (
                <p className="mt-1 pl-6 text-[13px]">
                  Horario de ese día:{' '}
                  {ventana.franjas
                    .map((franja) => formatFranja12(franja.inicio, franja.fin))
                    .join(' · ')}
                </p>
              ) : null}
              {puedeForzar ? (
                <label className="mt-2 flex items-center gap-2 pl-6 text-[13px] font-semibold">
                  <input
                    type="checkbox"
                    checked={forzar}
                    onChange={(event) => setForzar(event.target.checked)}
                    className="h-5 w-5 rounded border-input accent-primary lg:h-4 lg:w-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                className="h-12 lg:h-11"
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
                  className="h-12 lg:h-11"
                  aria-label="Profesional"
                  placeholder="Selecciona el profesional"
                  value={field.value}
                  onValueChange={field.onChange}
                  options={veterinarios.map((item) => ({ value: item.id, label: item.nombre }))}
                />
              )}
            />
            {errors.veterinarioId ? <p className="mt-1.5 text-[13px] font-medium text-danger">{errors.veterinarioId.message}</p> : null}
            {/* Una clinica recien creada solo tiene al administrador, que no es
                profesional hasta que se le asigna el rol: sin este aviso el
                desplegable sale vacio y no hay forma de agendar. */}
            {!veterinariosCargando && veterinarios.length === 0 ? (
              <div className="mt-2 rounded-xl bg-warning-soft px-4 py-3 text-sm leading-6 text-warning">
                <p className="font-semibold">Aún no hay profesionales para atender citas.</p>
                <p>
                  Si tú atiendes pacientes, en Usuarios edita tu cuenta y marca el rol adicional Veterinario. También puedes
                  invitar a otro profesional.
                </p>
                <Link to="/usuarios" className="mt-1 inline-block font-semibold underline underline-offset-2">
                  Ir a Usuarios
                </Link>
              </div>
            ) : null}
          </div>

          <div>
            <input
              type="text"
              {...register('motivo')}
              placeholder="Motivo principal de la cita"
              className={`${fieldClass} w-full`}
            />
            {errors.motivo ? <p className="mt-1.5 text-[13px] font-medium text-danger">{errors.motivo.message}</p> : null}
          </div>

          <textarea
            {...register('observaciones')}
            placeholder="Observaciones operativas para recepción o consulta"
            rows={2}
            className="min-h-[72px] rounded-lg border border-input bg-card px-3 py-3 text-base text-foreground lg:min-h-[100px] lg:text-[15px] outline-none transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />

          {/* Celular: botón fijo abajo, siempre a la vista del pulgar. */}
          <div className={bare ? BARRA_ENVIO : ''}>
            <button
              type="submit"
              disabled={
                crearCitaMutation.isPending ||
                !selectedOwner ||
                !mascotaId ||
                veterinarios.length === 0 ||
                (!ventana.valido && !forzar)
              }
              className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:brightness-110 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 lg:h-11 lg:rounded-lg"
            >
              {crearCitaMutation.isPending ? 'Guardando...' : 'Guardar cita'}
            </button>
          </div>
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
