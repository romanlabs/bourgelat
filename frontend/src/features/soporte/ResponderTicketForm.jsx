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
  accionSecundaria = null,
  // Estilo app de mensajería (celular): una línea que crece y botón redondo de enviar.
  chat = false,
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

  if (chat) {
    const { onChange, ref, ...resto } = register('mensaje')
    return (
      <form onSubmit={enviar} className="grid gap-2">
        {accionSecundaria}
        <div className="flex items-end gap-2">
          <label htmlFor="respuesta-ticket" className="sr-only">
            Respuesta
          </label>
          <textarea
            id="respuesta-ticket"
            rows={1}
            placeholder={placeholder}
            ref={ref}
            onChange={(event) => {
              onChange(event)
              event.target.style.height = 'auto'
              event.target.style.height = `${Math.min(event.target.scrollHeight, 128)}px`
            }}
            className={cn(
              'max-h-32 min-h-11 w-full min-w-0 flex-1 resize-none rounded-3xl border-0 bg-muted px-4 py-[11px] text-base leading-snug text-foreground outline-none transition placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring',
              errors.mensaje && 'ring-2 ring-danger'
            )}
            {...resto}
          />
          <LoadingButton type="submit" loading={isPending} aria-label={submitLabel} className="h-11 w-11 shrink-0 rounded-full p-0">
            <SendHorizontal />
          </LoadingButton>
        </div>
        <FieldError message={errors.mensaje?.message} className="mt-0" />
      </form>
    )
  }

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
          'w-full resize-y rounded-[10px] border-0 bg-muted px-3.5 py-3 text-base text-foreground lg:text-[15px] outline-none transition placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring',
          errors.mensaje && 'border-danger'
        )}
        {...register('mensaje')}
      />
      <FieldError message={errors.mensaje?.message} className="mt-0" />
      <div className="flex items-center justify-between gap-3">
        <p className="hidden text-[13px] text-muted-foreground sm:block">Ctrl + Enter para enviar</p>
        <div className="flex w-full flex-col gap-2 sm:ml-auto sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
          {accionSecundaria}
          <LoadingButton type="submit" loading={isPending} className="h-12 lg:h-10">
            <SendHorizontal />
            {submitLabel}
          </LoadingButton>
        </div>
      </div>
    </form>
  )
}
