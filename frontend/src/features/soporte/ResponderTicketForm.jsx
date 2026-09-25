import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { SendHorizontal } from 'lucide-react'
import { FieldError, LoadingButton } from '@/components/shared'
import { cn } from '@/lib/utils'

const respuestaSchema = z.object({
  mensaje: z
    .string()
    .trim()
    .min(2, 'Escribe al menos 2 caracteres')
    .max(5000, 'Máximo 5000 caracteres'),
})

// `onSubmit` debe devolver una promesa (mutateAsync): el campo se limpia solo
// si el envio salio bien. Reutilizable por el panel del equipo de soporte.
export default function ResponderTicketForm({
  onSubmit,
  isPending = false,
  placeholder = 'Escribe tu respuesta…',
  submitLabel = 'Enviar',
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({ resolver: zodResolver(respuestaSchema), defaultValues: { mensaje: '' } })

  const enviar = handleSubmit(async ({ mensaje }) => {
    try {
      await onSubmit(mensaje)
      reset({ mensaje: '' })
    } catch {
      // El hook ya mostro el error; el texto se conserva para reintentar.
    }
  })

  return (
    <form onSubmit={enviar} className="grid gap-2">
      <label htmlFor="respuesta-ticket" className="sr-only">
        Respuesta
      </label>
      <textarea
        id="respuesta-ticket"
        rows={3}
        placeholder={placeholder}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
            event.preventDefault()
            enviar()
          }
        }}
        className={cn(
          'w-full resize-y rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary',
          errors.mensaje && 'border-red-400 dark:border-red-500'
        )}
        {...register('mensaje')}
      />
      <FieldError message={errors.mensaje?.message} className="mt-0" />
      <div className="flex items-center justify-between gap-3">
        <p className="hidden text-xs text-muted-foreground sm:block">Ctrl + Enter para enviar</p>
        <LoadingButton type="submit" size="sm" loading={isPending} className="ml-auto">
          <SendHorizontal />
          {submitLabel}
        </LoadingButton>
      </div>
    </form>
  )
}
