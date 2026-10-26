import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { X } from 'lucide-react'
import { DOCUMENT_OPTIONS } from './useTutores'
import { Select } from '@/components/ui/select'
import CampoCelular from '@/components/shared/CampoCelular'
import { celularE164, esCelularValido } from '@/lib/celular'

const tutorSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
  tipoDocumento: z.enum(['CC', 'CE', 'PP', 'NIT']),
  numeroDocumento: z.string().min(1, 'El documento es requerido'),
  telefono: z
    .string()
    .min(1, 'El teléfono es requerido')
    .refine(esCelularValido, 'Ese número no es válido para el país elegido'),
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
  'h-11 w-full min-w-0 rounded-lg border border-input bg-card px-3 text-sm text-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-ring'

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
            telefono: celularE164(editingTutor.telefono),
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
        className={`fixed inset-0 z-[55] bg-black/30 transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={modoEdicion ? 'Editar tutor' : 'Nuevo tutor'}
        className={`fixed right-0 top-0 z-[60] flex h-[100dvh] w-full flex-col bg-card shadow-2xl transition-transform duration-300 sm:w-[460px] ${open ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex items-start justify-between gap-4 px-6 pb-3 pt-6">
          <div>
            <p className="text-[22px] font-semibold leading-tight tracking-[-0.02em] text-foreground">{modoEdicion ? 'Editar tutor' : 'Nuevo tutor'}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {modoEdicion
                ? 'Corrige los datos del responsable del paciente.'
                : 'Alta rápida del responsable del paciente.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-secondary-foreground transition hover:brightness-95 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* El drawer va en un portal, pero React propaga el submit por el arbol
              de componentes: abierto desde "Programar cita" o "Ingreso directo",
              tambien enviaria ese formulario y mostraria sus errores. */}
          <form
            id="tutor-drawer-form"
            className="grid gap-4"
            onSubmit={(event) => {
              event.stopPropagation()
              handleSubmit(onSubmit)(event)
            }}
          >
            <div className="grid gap-1.5">
              <label htmlFor="t-nombre" className="text-[13px] font-medium text-muted-foreground">
                Nombre completo *
              </label>
              <input id="t-nombre" type="text" placeholder="Nombre del tutor" className={`${fieldClass} ${errors.nombre ? 'border-danger' : ''}`} {...register('nombre')} />
              {errors.nombre && <p className="text-[13px] text-danger">{errors.nombre.message}</p>}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <label htmlFor="t-tipo-doc" className="text-[13px] font-medium text-muted-foreground">
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
                <label htmlFor="t-num-doc" className="text-[13px] font-medium text-muted-foreground">
                  Numero de documento *
                </label>
                <input id="t-num-doc" type="text" placeholder="Documento principal" className={`${fieldClass} ${errors.numeroDocumento ? 'border-danger' : ''}`} {...register('numeroDocumento')} />
                {errors.numeroDocumento && <p className="text-[13px] text-danger">{errors.numeroDocumento.message}</p>}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex min-w-0 flex-col gap-1.5">
                <label htmlFor="t-tel" className="text-[13px] font-medium text-muted-foreground">
                  Teléfono o celular *
                </label>
                <Controller
                  name="telefono"
                  control={control}
                  render={({ field }) => (
                    <CampoCelular
                      id="t-tel"
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      invalido={Boolean(errors.telefono)}
                      className="min-w-0 text-sm"
                    />
                  )}
                />
                {errors.telefono && <p className="text-[13px] text-danger">{errors.telefono.message}</p>}
              </div>
              <div className="grid gap-1.5">
                <label htmlFor="t-email" className="text-[13px] font-medium text-muted-foreground">
                  Correo <span className="font-normal text-muted-foreground">(opcional)</span>
                </label>
                <input id="t-email" type="email" placeholder="correo@ejemplo.com" className={`${fieldClass} ${errors.email ? 'border-danger' : ''}`} {...register('email')} />
                {errors.email && <p className="text-[13px] text-danger">{errors.email.message}</p>}
              </div>
            </div>

            <div className="grid gap-1.5">
              <label htmlFor="t-ciudad" className="text-[13px] font-medium text-muted-foreground">
                Ciudad o municipio <span className="font-normal text-muted-foreground">(opcional)</span>
              </label>
              <input id="t-ciudad" type="text" placeholder="Ciudad principal" className={fieldClass} {...register('ciudad')} />
            </div>
          </form>
        </div>

        <div className="flex gap-2.5 bg-card px-6 pb-6 pt-3">
          <button
            type="submit"
            form="tutor-drawer-form"
            disabled={isPending}
            className="flex-1 inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:brightness-110 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? 'Guardando...' : modoEdicion ? 'Actualizar tutor' : 'Guardar tutor'}
          </button>
          <button type="button" onClick={onClose} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-secondary px-5 text-sm font-semibold text-secondary-foreground transition hover:brightness-95 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            Cancelar
          </button>
        </div>
      </div>
    </>,
    document.body
  )
}
