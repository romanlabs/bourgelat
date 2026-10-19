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

const INPUT_CLASS =
  'h-11 w-24 border border-border bg-card px-3 text-sm text-foreground outline-none transition focus:border-primary disabled:opacity-50'

const valoresIniciales = (clinica) => ({
  activo: clinica?.recordatorioCitaActivo ?? true,
  ...desdeMinutos(clinica?.recordatorioCitaMinutos),
})

export default function RecordatoriosCitaSection({ clinica }) {
  const queryClient = useQueryClient()
  const { register, handleSubmit, reset, control, setValue, formState: { errors, isDirty } } = useForm({
    resolver: zodResolver(esquemaRecordatorioCita),
    defaultValues: valoresIniciales(clinica),
  })
  const activo = useWatch({ control, name: 'activo' })
  const unidad = useWatch({ control, name: 'unidad' })

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
        <label className="flex items-center gap-3 text-sm text-foreground">
          <input type="checkbox" className="h-4 w-4 accent-primary" {...register('activo')} />
          Enviar recordatorio por correo a quien atiende la cita
        </label>

        <div className="grid gap-2">
          <span className="text-[13px] font-semibold text-muted-foreground">
            Anticipación
          </span>
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="number"
              step="any"
              min="1"
              disabled={!activo}
              className={INPUT_CLASS}
              aria-label="Cantidad"
              {...register('cantidad')}
            />
            <Select
              value={unidad}
              onValueChange={(valor) => setValue('unidad', valor, { shouldDirty: true, shouldValidate: true })}
              options={[{ value: 'minutos', label: 'minutos' }, { value: 'horas', label: 'horas' }]}
              disabled={!activo}
              aria-label="Unidad de tiempo"
            />
            <span className="text-sm text-muted-foreground">antes de la cita</span>
          </div>
          {errors.cantidad ? <p className="text-sm text-danger">{errors.cantidad.message}</p> : null}
          <p className="text-xs leading-6 text-muted-foreground">
            Entre 15 minutos y 48 horas. Si la cita se agenda con menos tiempo, el aviso sale enseguida.
          </p>
        </div>

        <div>
          <Button type="submit" disabled={guardar.isPending || !isDirty}>
            {guardar.isPending ? 'Guardando...' : 'Guardar recordatorios'}
          </Button>
        </div>
      </form>
    </DashboardPanel>
  )
}
