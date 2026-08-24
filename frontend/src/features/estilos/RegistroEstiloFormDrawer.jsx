import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery } from '@tanstack/react-query'
import { Lock, Scissors, X } from 'lucide-react'
import { Select } from '@/components/ui/select'
import { estilosApi } from './estilosApi'
import { useEstilosMascota } from './useEstilos'

const registroEstiloSchema = z.object({
  tipoCorte: z.string().trim().min(1, 'El tipo de corte es obligatorio').max(240),
  estilistaId: z.string().uuid('Selecciona un estilista'),
  fechaServicio: z.string().min(1, 'La fecha del servicio es obligatoria'),
  proximaCitaSugerida: z.string().optional().or(z.literal('')),
  observaciones: z.string().max(4000).optional().or(z.literal('')),
})

const hoyISO = () => new Date().toISOString().slice(0, 10)

const DEFAULT_VALUES = {
  tipoCorte: '',
  estilistaId: '',
  fechaServicio: hoyISO(),
  proximaCitaSugerida: '',
  observaciones: '',
}

const fieldClass =
  'h-11 w-full border border-border bg-card px-3 text-sm text-foreground outline-none transition focus:border-primary disabled:cursor-not-allowed disabled:opacity-60'

const mapRegistroToForm = (registro) => ({
  tipoCorte: registro?.tipoCorte || '',
  estilistaId: registro?.estilistaId || registro?.estilista?.id || '',
  fechaServicio: registro?.fechaServicio ? String(registro.fechaServicio).slice(0, 10) : hoyISO(),
  proximaCitaSugerida: registro?.proximaCitaSugerida
    ? String(registro.proximaCitaSugerida).slice(0, 10)
    : '',
  observaciones: registro?.observaciones || '',
})

export default function RegistroEstiloFormDrawer({
  open,
  onClose,
  mascota,
  registroToEdit,
  citaId,
  onSuccess,
}) {
  const bloqueado = Boolean(registroToEdit?.bloqueado)

  const { crearRegistro, editarRegistro, isPending } = useEstilosMascota({
    mascotaId: mascota?.id,
    enabled: false,
  })

  const equipoQuery = useQuery({
    queryKey: ['equipo-clinica'],
    queryFn: estilosApi.obtenerEquipoClinica,
    enabled: open,
    placeholderData: (prev) => prev,
  })

  const equipo = equipoQuery.data?.usuarios || []

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({ resolver: zodResolver(registroEstiloSchema), defaultValues: DEFAULT_VALUES })

  useEffect(() => {
    if (!open) return
    reset(registroToEdit ? mapRegistroToForm(registroToEdit) : DEFAULT_VALUES)
  }, [open, registroToEdit, reset])

  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  const handleFormSubmit = (formData) => {
    if (registroToEdit?.id) {
      const payload = {
        tipoCorte: formData.tipoCorte.trim(),
        estilistaId: formData.estilistaId,
        proximaCitaSugerida: formData.proximaCitaSugerida || undefined,
        observaciones: formData.observaciones?.trim() || undefined,
      }
      editarRegistro(
        { registroId: registroToEdit.id, payload },
        { onSuccess: () => onSuccess?.() }
      )
      return
    }

    const payload = {
      tipoCorte: formData.tipoCorte.trim(),
      estilistaId: formData.estilistaId,
      fechaServicio: formData.fechaServicio,
      proximaCitaSugerida: formData.proximaCitaSugerida || undefined,
      observaciones: formData.observaciones?.trim() || undefined,
      mascotaId: mascota?.id,
      propietarioId: mascota?.Propietario?.id,
      ...(citaId ? { citaId } : {}),
    }
    crearRegistro(payload, { onSuccess: () => onSuccess?.() })
  }

  if (typeof document === 'undefined') return null

  return createPortal(
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 z-40 bg-black/30 transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={registroToEdit ? 'Editar registro de estilos' : 'Nuevo registro de estilos'}
        className={`fixed right-0 top-0 z-50 flex h-[100dvh] w-full flex-col bg-card shadow-2xl transition-transform duration-300 sm:w-[520px] sm:border-l sm:border-border ${open ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <p className="text-sm font-semibold text-foreground">
              {registroToEdit ? 'Registro de estilos' : 'Nuevo servicio de estilos'}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {mascota ? `${mascota.nombre} · ${mascota.especie}` : '—'}
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

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5">
          {bloqueado && (
            <div className="mb-4 flex items-start gap-2 border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
              <Lock className="mt-0.5 h-4 w-4 shrink-0" />
              <p>Este registro ya fue facturado y no se puede modificar.</p>
            </div>
          )}

          <form
            id="registro-estilo-drawer-form"
            className="grid gap-4"
            onSubmit={handleSubmit(handleFormSubmit)}
          >
            <div className="grid gap-1.5">
              <label htmlFor="re-tipoCorte" className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Tipo de corte *
              </label>
              <input
                id="re-tipoCorte"
                type="text"
                placeholder="Ej. Baño y corte de raza"
                disabled={bloqueado}
                className={`${fieldClass} ${errors.tipoCorte ? 'border-red-400' : ''}`}
                {...register('tipoCorte')}
              />
              {errors.tipoCorte && <p className="text-xs text-red-600">{errors.tipoCorte.message}</p>}
            </div>

            <div className="grid gap-1.5">
              <label htmlFor="re-estilista" className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Estilista *
              </label>
              <Controller
                name="estilistaId"
                control={control}
                render={({ field }) => (
                  <Select
                    variant="field"
                    id="re-estilista"
                    aria-label="Estilista"
                    className="h-11"
                    placeholder={equipoQuery.isPending ? 'Cargando equipo…' : 'Selecciona un estilista'}
                    disabled={bloqueado}
                    value={field.value}
                    onValueChange={field.onChange}
                    options={equipo.map((u) => ({ value: u.id, label: u.nombre }))}
                  />
                )}
              />
              {errors.estilistaId && <p className="text-xs text-red-600">{errors.estilistaId.message}</p>}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <label htmlFor="re-fechaServicio" className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Fecha del servicio *
                </label>
                <input
                  id="re-fechaServicio"
                  type="date"
                  disabled={bloqueado || Boolean(registroToEdit)}
                  className={`${fieldClass} ${errors.fechaServicio ? 'border-red-400' : ''}`}
                  {...register('fechaServicio')}
                />
                {errors.fechaServicio && <p className="text-xs text-red-600">{errors.fechaServicio.message}</p>}
              </div>

              <div className="grid gap-1.5">
                <label htmlFor="re-proximaCita" className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Próxima cita sugerida
                </label>
                <input
                  id="re-proximaCita"
                  type="date"
                  disabled={bloqueado}
                  className={fieldClass}
                  {...register('proximaCitaSugerida')}
                />
              </div>
            </div>

            <div className="grid gap-1.5">
              <label htmlFor="re-observaciones" className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Observaciones
              </label>
              <textarea
                id="re-observaciones"
                rows={4}
                disabled={bloqueado}
                placeholder="Notas sobre el servicio, comportamiento del paciente, recomendaciones..."
                className="border border-border bg-card px-3 py-3 text-sm text-foreground outline-none transition focus:border-primary disabled:cursor-not-allowed disabled:opacity-60"
                {...register('observaciones')}
              />
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="flex gap-3 border-t border-border px-5 py-4">
          {!bloqueado && (
            <button
              type="submit"
              form="registro-estilo-drawer-form"
              disabled={isPending}
              className="flex-1 inline-flex items-center justify-center gap-2 border border-border bg-foreground px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Scissors className="h-3.5 w-3.5" />
              {isPending ? 'Guardando...' : registroToEdit ? 'Guardar cambios' : 'Registrar servicio'}
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-muted"
          >
            {bloqueado ? 'Cerrar' : 'Cancelar'}
          </button>
        </div>
      </div>
    </>,
    document.body
  )
}
