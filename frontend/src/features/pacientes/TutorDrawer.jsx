import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { X } from 'lucide-react'
import { DOCUMENT_OPTIONS } from './useTutores'
import { Select } from '@/components/ui/select'

const tutorSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
  tipoDocumento: z.enum(['CC', 'CE', 'PP', 'NIT']),
  numeroDocumento: z.string().min(1, 'El documento es requerido'),
  telefono: z
    .string()
    .min(1, 'El telefono es requerido')
    .transform((v) => v.replace(/\D/g, ''))
    .refine((v) => v.length >= 7 && v.length <= 10, 'Usa un telefono valido entre 7 y 10 digitos'),
  email: z.string().email('Correo inválido').optional().or(z.literal('')),
  ciudad: z.string().optional(),
})

const DEFAULT_VALUES = {
  nombre: '',
  tipoDocumento: 'CC',
  numeroDocumento: '',
  telefono: '',
  email: '',
  ciudad: '',
}

const fieldClass =
  'h-11 border border-border bg-card px-3 text-sm text-foreground outline-none transition focus:border-primary'

// editingTutor es opcional: el drawer tambien se usa en alta rapida desde recepcion.
export default function TutorDrawer({ open, onClose, onSubmit, isPending, editingTutor = null }) {
  const modoEdicion = Boolean(editingTutor)

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({ resolver: zodResolver(tutorSchema), defaultValues: DEFAULT_VALUES })

  useEffect(() => {
    if (!open) return
    reset(
      editingTutor
        ? {
            nombre: editingTutor.nombre || '',
            tipoDocumento: editingTutor.tipoDocumento || 'CC',
            numeroDocumento: editingTutor.numeroDocumento || '',
            telefono: editingTutor.telefono || '',
            email: editingTutor.email || '',
            ciudad: editingTutor.ciudad || '',
          }
        : DEFAULT_VALUES
    )
  }, [open, editingTutor, reset])

  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (typeof document === 'undefined') return null

  return createPortal(
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/30 transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={modoEdicion ? 'Editar tutor' : 'Nuevo tutor'}
        className={`fixed right-0 top-0 z-50 flex h-[100dvh] w-full flex-col bg-card shadow-2xl transition-transform duration-300 sm:w-[460px] sm:border-l sm:border-border ${open ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <p className="text-sm font-semibold text-foreground">{modoEdicion ? 'Editar tutor' : 'Nuevo tutor'}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {modoEdicion
                ? 'Corrige los datos del responsable del paciente.'
                : 'Alta rapida del responsable del paciente.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="flex h-8 w-8 items-center justify-center border border-border bg-muted text-muted-foreground transition hover:bg-muted/80 hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          <form id="tutor-drawer-form" className="grid gap-4" onSubmit={handleSubmit(onSubmit)}>
            <div className="grid gap-1.5">
              <label htmlFor="t-nombre" className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Nombre completo *
              </label>
              <input id="t-nombre" type="text" placeholder="Nombre del tutor" className={`${fieldClass} ${errors.nombre ? 'border-red-400 dark:border-red-500' : ''}`} {...register('nombre')} />
              {errors.nombre && <p className="text-xs text-red-600 dark:text-red-400">{errors.nombre.message}</p>}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <label htmlFor="t-tipo-doc" className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Tipo de documento *
                </label>
                <Controller
                  name="tipoDocumento"
                  control={control}
                  render={({ field }) => (
                    <Select
                      variant="field"
                      id="t-tipo-doc"
                      aria-label="Tipo de documento"
                      className="h-11"
                      value={field.value}
                      onValueChange={field.onChange}
                      options={DOCUMENT_OPTIONS}
                    />
                  )}
                />
              </div>
              <div className="grid gap-1.5">
                <label htmlFor="t-num-doc" className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Numero de documento *
                </label>
                <input id="t-num-doc" type="text" placeholder="Documento principal" className={`${fieldClass} ${errors.numeroDocumento ? 'border-red-400 dark:border-red-500' : ''}`} {...register('numeroDocumento')} />
                {errors.numeroDocumento && <p className="text-xs text-red-600 dark:text-red-400">{errors.numeroDocumento.message}</p>}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <label htmlFor="t-tel" className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Telefono o celular *
                </label>
                <input id="t-tel" type="text" inputMode="numeric" placeholder="Numero principal" className={`${fieldClass} ${errors.telefono ? 'border-red-400 dark:border-red-500' : ''}`} {...register('telefono')} />
                {errors.telefono && <p className="text-xs text-red-600 dark:text-red-400">{errors.telefono.message}</p>}
              </div>
              <div className="grid gap-1.5">
                <label htmlFor="t-email" className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Correo <span className="font-normal normal-case tracking-normal text-muted-foreground/70">(opcional)</span>
                </label>
                <input id="t-email" type="email" placeholder="correo@ejemplo.com" className={`${fieldClass} ${errors.email ? 'border-red-400 dark:border-red-500' : ''}`} {...register('email')} />
                {errors.email && <p className="text-xs text-red-600 dark:text-red-400">{errors.email.message}</p>}
              </div>
            </div>

            <div className="grid gap-1.5">
              <label htmlFor="t-ciudad" className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Ciudad o municipio <span className="font-normal normal-case tracking-normal text-muted-foreground/70">(opcional)</span>
              </label>
              <input id="t-ciudad" type="text" placeholder="Ciudad principal" className={fieldClass} {...register('ciudad')} />
            </div>
          </form>
        </div>

        <div className="flex gap-3 border-t border-border px-5 py-4">
          <button
            type="submit"
            form="tutor-drawer-form"
            disabled={isPending}
            className="flex-1 border border-border bg-foreground px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? 'Guardando...' : modoEdicion ? 'Actualizar tutor' : 'Guardar tutor'}
          </button>
          <button type="button" onClick={onClose} className="border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-muted">
            Cancelar
          </button>
        </div>
      </div>
    </>,
    document.body
  )
}
