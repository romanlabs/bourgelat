import { useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { BellRing } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { DashboardPanel } from '@/features/dashboard/dashboardComponents'
import { configuracionApi } from './configuracionApi'
import { aMinutos, desdeMinutos, esquemaRecordatorioCita, MINUTOS_POR_DEFECTO } from './recordatorioCita'
import { invalidarDominios } from '@/lib/queryKeys'

// Anticipaciones típicas; una guardada que no esté aquí se agrega a la lista.
const ANTICIPACIONES = [15, 30, 60, 120, 180, 360, 720, 1440, 2880]

const etiquetaAnticipacion = (minutos) => {
  if (minutos < 60) return `${minutos} minutos`
  if (minutos % 1440 === 0) return minutos === 1440 ? '1 día' : `${minutos / 1440} días`
  if (minutos % 60 === 0) return minutos === 60 ? '1 hora' : `${minutos / 60} horas`
  return `${Math.floor(minutos / 60)} h ${minutos % 60} min`
}

const valoresIniciales = (clinica) => ({
  activo: clinica?.recordatorioCitaActivo ?? true,
  ...desdeMinutos(clinica?.recordatorioCitaMinutos),
})

export default function RecordatoriosCitaSection({ clinica }) {
  const queryClient = useQueryClient()
  const { handleSubmit, reset, control, setValue, trigger, formState: { errors, isDirty } } = useForm({
    resolver: zodResolver(esquemaRecordatorioCita),
    defaultValues: valoresIniciales(clinica),
  })
  const activo = useWatch({ control, name: 'activo' })
  const unidad = useWatch({ control, name: 'unidad' })
  const cantidad = useWatch({ control, name: 'cantidad' })
  const minutosActuales = aMinutos({ cantidad, unidad }) || MINUTOS_POR_DEFECTO
  const opciones = [...new Set([...ANTICIPACIONES, minutosActuales])]
    .sort((x, y) => x - y)
    .map((minutos) => ({ value: String(minutos), label: etiquetaAnticipacion(minutos) }))

  useEffect(() => {
    reset(valoresIniciales(clinica))
  }, [clinica, reset])

  const guardar = useMutation({
    mutationFn: configuracionApi.actualizarRecordatoriosCita,
    onSuccess: (data) => {
      toast.success(data?.message || 'Recordatorios de citas actualizados')
      invalidarDominios(queryClient, 'configuracion')
    },
    onError: (error) => {
      toast.error(
        error?.response?.data?.errores?.[0]?.mensaje ||
          error?.response?.data?.message ||
          'No fue posible guardar los recordatorios.'
      )
    },
  })

  const onSubmit = (valores) =>
    guardar.mutate({
      activo: valores.activo,
      // Apagado se conserva la anticipación guardada.
      minutos: valores.activo ? aMinutos(valores) : clinica?.recordatorioCitaMinutos ?? MINUTOS_POR_DEFECTO,
    })

  return (
    <DashboardPanel
      title="Recordatorios de citas"
      subtitle="Bourgelat le envía un correo a quien atiende cada cita, con la anticipación que elijas."
      action={<BellRing className="h-4 w-4 text-primary" />}
    >
      <form className="grid gap-5" onSubmit={handleSubmit(onSubmit)}>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-foreground">
          <button
            type="button"
            role="switch"
            aria-checked={activo}
            aria-label="Enviar recordatorio por correo"
            onClick={() => setValue('activo', !activo, { shouldDirty: true, shouldValidate: true })}
            className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full outline-none transition focus-visible:ring-2 focus-visible:ring-ring ${
              activo ? 'bg-primary' : 'bg-muted-foreground/25'
            }`}
          >
            <span className={`inline-block h-5 w-5 rounded-full bg-card transition-transform ${activo ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
          {activo ? (
            <>
              <span>Avisar</span>
              <Select
                variant="field"
                className="h-10 w-[150px]"
                value={String(minutosActuales)}
                onValueChange={(valor) => {
                  const nuevos = desdeMinutos(Number(valor))
                  // Cantidad y unidad cambian juntas; validar a medias da un error falso.
                  setValue('unidad', nuevos.unidad, { shouldDirty: true })
                  setValue('cantidad', nuevos.cantidad, { shouldDirty: true })
                  trigger('cantidad')
                }}
                options={opciones}
                aria-label="Anticipación del recordatorio"
              />
              <span>antes de la cita</span>
            </>
          ) : (
            <span className="text-muted-foreground">Sin recordatorios por correo</span>
          )}
        </div>
        {errors.cantidad ? <p className="text-sm text-danger">{errors.cantidad.message}</p> : null}
        <p className="-mt-2 text-[13px] leading-6 text-muted-foreground">
          Si la cita se agenda con menos tiempo, el aviso sale enseguida.
        </p>

        <div>
          <Button type="submit" disabled={guardar.isPending || !isDirty}>
            {guardar.isPending ? 'Guardando...' : 'Guardar recordatorios'}
          </Button>
        </div>
      </form>
    </DashboardPanel>
  )
}
