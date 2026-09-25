import { useEffect, useMemo, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ImagePlus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogRoot,
  DialogTitle,
} from '@/components/ui/dialog'
import { FieldError, LoadingButton } from '@/components/shared'
import { useAuthStore } from '@/store/authStore'
import { cn } from '@/lib/utils'
import {
  CATEGORIAS_TICKET,
  MODULOS_APP,
  PRIORIDADES_TICKET,
  normalizarModulo,
} from './soporteConstants'

const ticketSchema = z.object({
  asunto: z
    .string()
    .trim()
    .min(5, 'El asunto debe tener al menos 5 caracteres')
    .max(150, 'Máximo 150 caracteres'),
  categoria: z.enum(CATEGORIAS_TICKET.map((c) => c.value)),
  prioridad: z.enum(PRIORIDADES_TICKET.map((p) => p.value)),
  modulo: z.string().optional(),
  descripcion: z
    .string()
    .trim()
    .min(10, 'Cuéntanos un poco más (mínimo 10 caracteres)')
    .max(5000, 'Máximo 5000 caracteres'),
})

const DEFAULT_VALUES = {
  asunto: '',
  categoria: 'error',
  prioridad: 'media',
  modulo: '',
  descripcion: '',
}

const MAX_CAPTURA_BYTES = 5 * 1024 * 1024
const TIPOS_CAPTURA = ['image/jpeg', 'image/png', 'image/webp']

const labelClass = 'text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground'
const fieldClass =
  'w-full rounded-md border border-border bg-card px-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary'

const validarCaptura = (archivo) => {
  if (!TIPOS_CAPTURA.includes(archivo.type)) return 'La captura debe ser JPG, PNG o WEBP.'
  if (archivo.size > MAX_CAPTURA_BYTES) return 'La captura supera 5 MB.'
  return ''
}

/**
 * Formulario para abrir un ticket. `moduloInicial` es la ruta desde la que el
 * usuario pidio ayuda (menu "Ayuda y soporte"): preselecciona el modulo y
 * viaja en el contexto tecnico del ticket. Montarlo con una `key` nueva en
 * cada apertura para que arranque limpio.
 */
export default function NuevoTicketDialog({ open, onOpenChange, moduloInicial = '', onSubmit, isPending }) {
  const usuario = useAuthStore((state) => state.usuario)
  const [captura, setCaptura] = useState(null)
  const [errorCaptura, setErrorCaptura] = useState('')

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(ticketSchema),
    // El padre remonta el dialogo (key) cada vez que lo abre: el formulario y
    // la captura arrancan limpios sin sincronizar estado en un efecto.
    defaultValues: { ...DEFAULT_VALUES, modulo: normalizarModulo(moduloInicial) },
  })

  const previewUrl = useMemo(() => (captura ? URL.createObjectURL(captura) : null), [captura])

  useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    },
    [previewUrl]
  )

  const tomarCaptura = (archivo) => {
    if (!archivo) return
    const error = validarCaptura(archivo)
    setErrorCaptura(error)
    if (!error) setCaptura(archivo)
  }

  // Pegar con Ctrl+V una captura recien tomada es lo mas rapido para el usuario.
  const onPaste = (event) => {
    const item = Array.from(event.clipboardData?.items || []).find((i) => i.type.startsWith('image/'))
    if (!item) return
    event.preventDefault()
    tomarCaptura(item.getAsFile())
  }

  const enviar = handleSubmit(async (valores) => {
    const contexto = {
      ruta: moduloInicial || valores.modulo || window.location.pathname,
      userAgent: navigator.userAgent,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      rol: usuario?.rol,
      idioma: navigator.language,
      zonaHoraria: Intl.DateTimeFormat().resolvedOptions().timeZone,
    }

    try {
      await onSubmit({ payload: { ...valores, contexto: JSON.stringify(contexto) }, captura })
    } catch {
      // El hook ya mostro el error; el formulario conserva lo escrito.
    }
  })

  return (
    <DialogRoot open={open} onOpenChange={(abierto) => (!isPending ? onOpenChange(abierto) : null)}>
      <DialogContent className="max-h-[92dvh] w-[calc(100%-2rem)] overflow-y-auto rounded-xl sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nuevo ticket de soporte</DialogTitle>
          <DialogDescription>
            Cuéntanos qué pasó. El equipo de Bourgelat te responde aquí y te avisa por correo.
          </DialogDescription>
        </DialogHeader>

        <form id="nuevo-ticket-form" onSubmit={enviar} onPaste={onPaste} className="mt-5 grid gap-4">
          <div className="grid gap-1.5">
            <label htmlFor="ticket-asunto" className={labelClass}>
              Asunto *
            </label>
            <input
              id="ticket-asunto"
              type="text"
              autoComplete="off"
              placeholder="Ej: No me deja cerrar la caja"
              className={cn(fieldClass, 'h-10', errors.asunto && 'border-red-400 dark:border-red-500')}
              {...register('asunto')}
            />
            <FieldError message={errors.asunto?.message} className="mt-0" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <label htmlFor="ticket-categoria" className={labelClass}>
                Tipo
              </label>
              <Controller
                name="categoria"
                control={control}
                render={({ field }) => (
                  <Select
                    variant="field"
                    id="ticket-categoria"
                    aria-label="Tipo de ticket"
                    value={field.value}
                    onValueChange={field.onChange}
                    options={CATEGORIAS_TICKET}
                  />
                )}
              />
            </div>
            <div className="grid gap-1.5">
              <label htmlFor="ticket-prioridad" className={labelClass}>
                ¿Cuánto te afecta?
              </label>
              <Controller
                name="prioridad"
                control={control}
                render={({ field }) => (
                  <Select
                    variant="field"
                    id="ticket-prioridad"
                    aria-label="Prioridad"
                    value={field.value}
                    onValueChange={field.onChange}
                    options={PRIORIDADES_TICKET}
                  />
                )}
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <label htmlFor="ticket-modulo" className={labelClass}>
              ¿Dónde pasó?
            </label>
            <Controller
              name="modulo"
              control={control}
              render={({ field }) => (
                <Select
                  variant="field"
                  id="ticket-modulo"
                  aria-label="Módulo donde ocurrió"
                  value={field.value}
                  onValueChange={field.onChange}
                  options={MODULOS_APP}
                />
              )}
            />
          </div>

          <div className="grid gap-1.5">
            <label htmlFor="ticket-descripcion" className={labelClass}>
              Qué pasó *
            </label>
            <textarea
              id="ticket-descripcion"
              rows={5}
              placeholder="Qué intentabas hacer, qué esperabas y qué pasó. Si apareció un mensaje de error, cópialo aquí."
              className={cn(fieldClass, 'resize-y py-2.5', errors.descripcion && 'border-red-400 dark:border-red-500')}
              {...register('descripcion')}
            />
            <FieldError message={errors.descripcion?.message} className="mt-0" />
          </div>

          <div className="grid gap-1.5">
            <span className={labelClass}>
              Captura de pantalla{' '}
              <span className="font-normal normal-case tracking-normal text-muted-foreground/70">(opcional)</span>
            </span>

            {captura && previewUrl ? (
              <div className="relative w-fit overflow-hidden rounded-lg border border-border">
                <img src={previewUrl} alt="Vista previa de la captura" className="max-h-40 w-auto object-contain" />
                <button
                  type="button"
                  onClick={() => setCaptura(null)}
                  aria-label="Quitar captura"
                  className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white transition hover:bg-black/80"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <label
                htmlFor="ticket-captura"
                className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground transition hover:border-primary/50 hover:bg-muted"
              >
                <ImagePlus className="h-5 w-5 shrink-0 text-primary" />
                <span>
                  Elige una imagen o pégala con <kbd className="rounded border border-border bg-card px-1 text-xs">Ctrl</kbd>+
                  <kbd className="rounded border border-border bg-card px-1 text-xs">V</kbd>. JPG, PNG o WEBP, hasta 5 MB.
                </span>
              </label>
            )}
            <input
              id="ticket-captura"
              type="file"
              accept={TIPOS_CAPTURA.join(',')}
              className="sr-only"
              onChange={(event) => {
                tomarCaptura(event.target.files?.[0])
                event.target.value = ''
              }}
            />
            <FieldError message={errorCaptura} className="mt-0" />
          </div>
        </form>

        <DialogFooter className="mt-6">
          <DialogClose asChild>
            <Button variant="outline" size="sm" disabled={isPending}>
              Cancelar
            </Button>
          </DialogClose>
          <LoadingButton type="submit" form="nuevo-ticket-form" size="sm" loading={isPending} loadingLabel="Enviando…">
            Enviar ticket
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </DialogRoot>
  )
}
