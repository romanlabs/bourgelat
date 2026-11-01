import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Landmark, Trash2 } from 'lucide-react'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { EmptyState } from '@/components/shared/EmptyState'
import { DashboardPanel } from '@/features/dashboard/dashboardComponents'
import { cuentasRecaudoApi } from '@/features/finanzas/cuentasRecaudoApi'
import { useCuentasRecaudo } from '@/features/finanzas/useCuentasRecaudo'
import { mensajeDeError } from '@/lib/errores'
import { invalidarDominios } from '@/lib/queryKeys'

const esquema = z.object({
  nombre: z.string().trim().min(1, 'Escribe el nombre de la cuenta').max(60, 'Máximo 60 caracteres'),
})

// Las cuentas donde la clínica recibe transferencias. Al cobrar por
// transferencia se elige a cuál entró, y Finanzas › Medios de pago lo reparte.
export default function CuentasRecaudoSection() {
  const queryClient = useQueryClient()
  const cuentasQuery = useCuentasRecaudo()
  const cuentas = cuentasQuery.data || []

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({ resolver: zodResolver(esquema), defaultValues: { nombre: '' } })

  const crearMutation = useMutation({
    mutationFn: cuentasRecaudoApi.crear,
    onSuccess: () => {
      toast.success('Cuenta agregada')
      reset()
      invalidarDominios(queryClient, 'configuracion')
    },
    onError: (error) => toast.error(mensajeDeError(error, 'No fue posible agregar la cuenta.')),
  })

  const actualizarMutation = useMutation({
    mutationFn: ({ id, payload }) => cuentasRecaudoApi.actualizar(id, payload),
    onSuccess: () => invalidarDominios(queryClient, 'configuracion'),
    onError: (error) => toast.error(mensajeDeError(error, 'No fue posible actualizar la cuenta.')),
  })

  // Cuenta que se va a borrar (pide confirmación).
  const [porBorrar, setPorBorrar] = useState(null)
  const borrarMutation = useMutation({
    mutationFn: (id) => cuentasRecaudoApi.borrar(id),
    onSuccess: () => {
      toast.success('Cuenta borrada')
      setPorBorrar(null)
      invalidarDominios(queryClient, 'configuracion')
    },
    onError: (error) => toast.error(mensajeDeError(error, 'No fue posible borrar la cuenta.')),
  })

  return (
    <div className="grid gap-5 2xl:grid-cols-[minmax(0,1.2fr)_360px]">
      <DashboardPanel
        title="Cuentas para recibir pagos"
        subtitle="Al cobrar por transferencia se elige a cuál entró la plata, y Finanzas muestra cuánto llegó a cada una."
        action={<Landmark className="h-4 w-4 text-primary" />}
      >
        {cuentasQuery.isLoading ? (
          <div className="grid gap-3">
            {[0, 1].map((item) => (
              <div key={item} className="h-14 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        ) : cuentas.length === 0 ? (
          <EmptyState
            icon={<Landmark />}
            title="Sin cuentas"
            description="Agrega las cuentas o billeteras donde te pagan, por ejemplo «Nequi» o «Bancolombia ahorros»."
            bordered
          />
        ) : (
          <div className="divide-y divide-border overflow-hidden rounded-xl bg-muted">
            {cuentas.map((cuenta) => (
              <div key={cuenta.id} className="flex items-center justify-between gap-4 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{cuenta.nombre}</p>
                  <p className="text-[13px] text-muted-foreground">{cuenta.activo ? 'Sale al cobrar' : 'No sale al cobrar'}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {/* Activa o pausada: el mismo interruptor de Recordatorios. */}
                  <button
                    type="button"
                    role="switch"
                    aria-checked={cuenta.activo}
                    aria-label={`Usar ${cuenta.nombre} al cobrar`}
                    disabled={actualizarMutation.isPending}
                    onClick={() => actualizarMutation.mutate({ id: cuenta.id, payload: { activo: !cuenta.activo } })}
                    className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full outline-none transition before:absolute before:-inset-x-1 before:-inset-y-2.5 focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60 ${
                      cuenta.activo ? 'bg-primary' : 'bg-muted-foreground/25'
                    }`}
                  >
                    <span className={`inline-block h-5 w-5 rounded-full bg-card transition-transform ${cuenta.activo ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPorBorrar(cuenta)}
                    aria-label={`Borrar ${cuenta.nombre}`}
                    title="Borrar"
                    className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-danger-soft lg:h-9 lg:w-9 text-danger outline-none transition hover:brightness-95 active:translate-y-px focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </DashboardPanel>

      <DashboardPanel
        title="Nueva cuenta"
        subtitle="Usa el nombre con que la reconoces. Apaga una cuenta para que no salga al cobrar; sus cobros se conservan."
      >
        <form className="grid gap-4" onSubmit={handleSubmit((valores) => crearMutation.mutate(valores))} noValidate>
          <div className="grid gap-1.5">
            <input
              type="text"
              {...register('nombre')}
              placeholder="Ej. Nequi, Bancolombia ahorros"
              aria-label="Nombre de la cuenta"
              aria-invalid={errors.nombre ? 'true' : 'false'}
              maxLength={60}
              className="h-12 rounded-lg border border-input bg-card px-3 text-base text-foreground lg:h-11 lg:text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
            />
            {errors.nombre ? <p className="text-[13px] text-danger">{errors.nombre.message}</p> : null}
          </div>
          <button
            type="submit"
            disabled={crearMutation.isPending}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-primary lg:h-11 px-4 text-sm font-semibold text-primary-foreground outline-none transition hover:brightness-110 active:translate-y-px focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
          >
            {crearMutation.isPending ? 'Guardando...' : 'Agregar cuenta'}
          </button>
        </form>
      </DashboardPanel>

      <ConfirmDialog
        open={Boolean(porBorrar)}
        onOpenChange={(abierto) => !abierto && setPorBorrar(null)}
        title={`¿Borrar «${porBorrar?.nombre ?? ''}»?`}
        description="Deja de salir en esta lista y al cobrar. Las ventas que ya entraron a esta cuenta la siguen mostrando, y si vuelves a crearla con el mismo nombre recupera sus cobros."
        confirmLabel="Borrar cuenta"
        loading={borrarMutation.isPending}
        onConfirm={() => porBorrar && borrarMutation.mutate(porBorrar.id)}
      />
    </div>
  )
}
