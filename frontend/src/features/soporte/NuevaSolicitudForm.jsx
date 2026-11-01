import { useEffect, useMemo, useRef, useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ImagePlus, Loader2, X } from 'lucide-react'
import { FieldError } from '@/components/shared'
import { useAuthStore } from '@/store/authStore'
import { cn } from '@/lib/utils'
import { CATEGORIAS_TICKET, PRIORIDADES_TICKET, normalizarModulo } from './soporteConstants'

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

const MAX_CAPTURA_BYTES = 5 * 1024 * 1024
const TIPOS_CAPTURA = ['image/jpeg', 'image/png', 'image/webp']

const FOCO = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-primary'
const campo =
  'w-full rounded-lg border-0 bg-card px-3.5 text-base text-foreground lg:text-[15px] outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-brand'

// Cada tipo pide cosas distintas: la urgencia solo se pregunta cuando algo no funciona.
const TEXTOS_POR_TIPO = {
  error: {
    prioridad: null,
    asunto: 'Por ejemplo: no me deja cerrar el turno',
    detalle: 'Cuéntanos qué pasó',
    ayuda: 'Qué hacías, qué esperabas y qué salió',
    adjuntar: 'Adjuntar captura de pantalla',
  },
  duda: {
    prioridad: 'media',
    asunto: 'Por ejemplo: ¿cómo registro una vacuna?',
    detalle: 'Tu pregunta',
    ayuda: 'Qué quieres hacer; te explicamos paso a paso',
    adjuntar: 'Adjuntar captura (opcional)',
  },
  facturacion: {
    prioridad: 'media',
    asunto: 'Por ejemplo: quiero pasar a pago anual',
    detalle: 'Detalles',
    ayuda: 'Qué necesitas con tu plan o tu pago. Si ya pagaste, adjunta el comprobante',
    adjuntar: 'Adjuntar comprobante o captura',
  },
  sugerencia: {
    prioridad: 'baja',
    asunto: 'Por ejemplo: enviar la fórmula por WhatsApp',
    detalle: 'Cuéntanos tu idea',
    ayuda: 'Qué te gustaría poder hacer y para qué te serviría',
    adjuntar: 'Adjuntar imagen (opcional)',
  },
  otro: {
    prioridad: 'media',
    asunto: 'En pocas palabras, qué necesitas',
    detalle: 'Cuéntanos',
    ayuda: 'Escribe lo que necesites',
    adjuntar: 'Adjuntar captura (opcional)',
  },
}

const validarCaptura = (archivo) => {
  if (!TIPOS_CAPTURA.includes(archivo.type)) return 'La captura debe ser JPG, PNG o WEBP.'
  if (archivo.size > MAX_CAPTURA_BYTES) return 'La captura supera 5 MB.'
  return ''
}

// `moduloInicial` es la ruta desde la que la persona pidió ayuda: viaja en el
// contexto del ticket. El padre lo remonta con una `key` nueva para limpiarlo.
export default function NuevaSolicitudForm({
  moduloInicial = '',
  asuntoInicial = '',
  categoriaInicial = 'error',
  enfocar = false,
  onSubmit,
  isPending,
}) {
  const usuario = useAuthStore((state) => state.usuario)
  const [captura, setCaptura] = useState(null)
  const [errorCaptura, setErrorCaptura] = useState('')
  const asuntoRef = useRef(null)

  const categoriaDefecto = TEXTOS_POR_TIPO[categoriaInicial] ? categoriaInicial : 'error'

  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(ticketSchema),
    defaultValues: {
      asunto: asuntoInicial.slice(0, 150),
      categoria: categoriaDefecto,
      prioridad: TEXTOS_POR_TIPO[categoriaDefecto].prioridad || 'media',
      modulo: normalizarModulo(moduloInicial),
      descripcion: '',
    },
  })

  const { ref: asuntoRegisterRef, ...asuntoProps } = register('asunto')
  const categoria = useWatch({ control, name: 'categoria' })
  const textos = TEXTOS_POR_TIPO[categoria] || TEXTOS_POR_TIPO.error

  const cambiarTipo = (valor, onChange) => {
    onChange(valor)
    setValue('prioridad', TEXTOS_POR_TIPO[valor].prioridad || 'media')
  }

  useEffect(() => {
    if (!enfocar) return
    // Con el asunto ya escrito, lo que falta es contar el detalle.
    if (asuntoInicial) document.getElementById('ticket-descripcion')?.focus()
    else asuntoRef.current?.focus()
  }, [enfocar, asuntoInicial])

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

  // Pegar con Ctrl+V una captura recién tomada es lo más rápido.
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
      // El hook ya mostró el error; el formulario conserva lo escrito.
    }
  })

  return (
    <form
      aria-labelledby="s-nuevo"
      onSubmit={enviar}
      onPaste={onPaste}
      className="flex flex-col gap-4 rounded-2xl bg-primary p-4 text-primary-foreground sm:p-6 lg:sticky lg:top-6"
    >
      <h2 id="s-nuevo" className="text-xl font-semibold tracking-[-0.02em]">Nueva solicitud</h2>

      <Controller
        name="categoria"
        control={control}
        render={({ field }) => (
          <div className="flex flex-col gap-2">
            <span className="text-sm font-semibold">Qué pasa</span>
            <div role="group" aria-label="Tipo de solicitud" className="flex flex-wrap gap-1.5">
              {CATEGORIAS_TICKET.map((opcion) => {
                const activo = field.value === opcion.value
                return (
                  <button
                    key={opcion.value}
                    type="button"
                    aria-pressed={activo}
                    onClick={() => cambiarTipo(opcion.value, field.onChange)}
                    className={cn(
                      'h-11 rounded-lg px-3 text-[13px] transition lg:h-[38px]',
                      activo ? 'bg-primary-foreground font-semibold text-primary' : 'bg-primary-foreground/15 hover:bg-primary-foreground/25',
                      FOCO
                    )}
                  >
                    {opcion.label}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      />

      {categoria === 'error' ? (
      <Controller
        name="prioridad"
        control={control}
        render={({ field }) => (
          <div className="flex flex-col gap-2">
            <span className="text-sm font-semibold">Qué tan urgente</span>
            <div role="group" aria-label="Urgencia" className="grid grid-cols-3 gap-1 rounded-[10px] bg-primary-foreground/10 p-1">
              {PRIORIDADES_TICKET.map((opcion) => {
                const activo = field.value === opcion.value
                return (
                  <button
                    key={opcion.value}
                    type="button"
                    aria-pressed={activo}
                    onClick={() => field.onChange(opcion.value)}
                    className={cn(
                      'h-11 rounded-[7px] px-1 text-[13px] leading-tight transition lg:h-[38px]',
                      activo ? 'bg-primary-foreground font-semibold text-primary' : 'hover:bg-primary-foreground/10',
                      FOCO
                    )}
                  >
                    {opcion.label}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      />
      ) : null}

      <div className="flex flex-col gap-2">
        <label htmlFor="ticket-asunto" className="text-sm font-semibold">Asunto</label>
        <input
          id="ticket-asunto"
          type="text"
          autoComplete="off"
          placeholder={textos.asunto}
          className={cn(campo, 'h-12 lg:h-[46px]')}
          ref={(el) => {
            asuntoRegisterRef(el)
            asuntoRef.current = el
          }}
          {...asuntoProps}
        />
        <FieldError message={errors.asunto?.message} className="mt-0 text-primary-foreground" />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="ticket-descripcion" className="text-sm font-semibold">{textos.detalle}</label>
        <textarea
          id="ticket-descripcion"
          rows={5}
          placeholder={textos.ayuda}
          className={cn(campo, 'resize-y py-3')}
          {...register('descripcion')}
        />
        <FieldError message={errors.descripcion?.message} className="mt-0 text-primary-foreground" />
      </div>

      {captura && previewUrl ? (
        <div className="relative w-fit overflow-hidden rounded-xl bg-primary-foreground/10">
          <img src={previewUrl} alt="Vista previa de la captura" className="max-h-32 w-auto object-contain" />
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
          className="flex h-12 cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary-foreground/15 text-sm font-semibold transition hover:bg-primary-foreground/25 focus-within:ring-2 focus-within:ring-brand"
        >
          <ImagePlus className="h-[18px] w-[18px]" />
          {textos.adjuntar}
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
      <FieldError message={errorCaptura} className="mt-0 text-primary-foreground" />

      <button
        type="submit"
        disabled={isPending}
        className={cn(
          'inline-flex h-[52px] items-center justify-center gap-2 rounded-[10px] bg-brand text-[15px] font-bold text-tinta-800 transition hover:brightness-105 active:translate-y-px disabled:opacity-70',
          FOCO
        )}
      >
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {isPending ? 'Enviando…' : 'Enviar solicitud'}
      </button>
    </form>
  )
}
