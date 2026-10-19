import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery } from '@tanstack/react-query'
import { Lock, Receipt, Scissors, X } from 'lucide-react'
import { Select } from '@/components/ui/select'
import { estilosApi } from './estilosApi'
import { useEstilosMascota } from './useEstilos'
import { etiquetaEspecie } from '@/lib/especies'
import { hoyLocal } from '@/lib/fecha'

const registroEstiloSchema = z.object({
  tipoCorte: z.string().trim().min(1, 'El tipo de corte es obligatorio').max(240),
  estilistaId: z.string().uuid('Selecciona un estilista'),
  fechaServicio: z.string().min(1, 'La fecha del servicio es obligatoria'),
  proximaCitaSugerida: z.string().optional().or(z.literal('')),
  observaciones: z.string().max(4000).optional().or(z.literal('')),
})


const DEFAULT_VALUES = {
  tipoCorte: '',
  estilistaId: '',
  fechaServicio: hoyLocal(),
  proximaCitaSugerida: '',
  observaciones: '',
}

const fieldClass =
  'h-11 w-full rounded-lg border border-input bg-card px-3 text-sm text-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60'

const mapRegistroToForm = (registro) => ({
  tipoCorte: registro?.tipoCorte || '',
  estilistaId: registro?.estilistaId || registro?.estilista?.id || '',
  fechaServicio: registro?.fechaServicio ? String(registro.fechaServicio).slice(0, 10) : hoyLocal(),
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
  const navigate = useNavigate()

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
      // En edicion se envia '' explicitamente (no undefined) para que el
      // backend pueda limpiar un valor previamente guardado: JSON.stringify
      // descarta las claves con valor undefined, asi que omitirlas deja el
      // valor anterior intacto en vez de borrarlo.
      const payload = {
        tipoCorte: formData.tipoCorte.trim(),
        estilistaId: formData.estilistaId,
        proximaCitaSugerida: formData.proximaCitaSugerida || '',
        observaciones: formData.observaciones?.trim() || '',
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
        className={`fixed right-0 top-0 z-50 flex h-[100dvh] w-full flex-col bg-card shadow-2xl transition-transform duration-300 sm:w-[520px] ${open ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-6 pb-3 pt-6">
          <div>
            <p className="text-[22px] font-semibold leading-tight tracking-[-0.02em] text-foreground">
              {registroToEdit ? 'Registro de estilos' : 'Nuevo servicio de estilos'}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {mascota ? `${mascota.nombre} · ${etiquetaEspecie(mascota.especie)}` : '—'}
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

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {bloqueado && (
            <div className="mb-4 flex items-start gap-2 rounded-xl bg-warning-soft px-4 py-3 text-sm leading-6 text-warning">
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
              <label htmlFor="re-tipoCorte" className="text-[13px] font-medium text-muted-foreground">
                Tipo de corte *
              </label>
              <input
                id="re-tipoCorte"
                type="text"
                placeholder="Ej. Baño y corte de raza"
                disabled={bloqueado}
                className={`${fieldClass} ${errors.tipoCorte ? 'border-danger' : ''}`}
                {...register('tipoCorte')}
              />
              {errors.tipoCorte && <p className="text-[13px] text-danger">{errors.tipoCorte.message}</p>}
            </div>

            <div className="grid gap-1.5">
              <label htmlFor="re-estilista" className="text-[13px] font-medium text-muted-foreground">
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
              {errors.estilistaId && <p className="text-[13px] text-danger">{errors.estilistaId.message}</p>}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <label htmlFor="re-fechaServicio" className="text-[13px] font-medium text-muted-foreground">
                  Fecha del servicio *
                </label>
                <input
                  id="re-fechaServicio"
                  type="date"
                  disabled={bloqueado || Boolean(registroToEdit)}
                  className={`${fieldClass} ${errors.fechaServicio ? 'border-danger' : ''}`}
                  {...register('fechaServicio')}
                />
                {errors.fechaServicio && <p className="text-[13px] text-danger">{errors.fechaServicio.message}</p>}
              </div>

              <div className="grid gap-1.5">
                <label htmlFor="re-proximaCita" className="text-[13px] font-medium text-muted-foreground">
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
              <label htmlFor="re-observaciones" className="text-[13px] font-medium text-muted-foreground">
                Observaciones
              </label>
              <textarea
                id="re-observaciones"
                rows={4}
                disabled={bloqueado}
                placeholder="Notas sobre el servicio, comportamiento del paciente, recomendaciones..."
                className="rounded-lg border border-input bg-card px-3 py-3 text-sm text-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
                {...register('observaciones')}
              />
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="flex flex-wrap gap-2.5 bg-card px-6 pb-6 pt-3">
          {!bloqueado && (
            <button
              type="submit"
              form="registro-estilo-drawer-form"
              disabled={isPending}
              className="flex-1 inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:brightness-110 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Scissors className="h-3.5 w-3.5" />
              {isPending ? 'Guardando...' : registroToEdit ? 'Guardar cambios' : 'Registrar servicio'}
            </button>
          )}
          {registroToEdit?.id && !bloqueado && !registroToEdit?.facturaId && (
            <button
              type="button"
              onClick={() =>
                navigate('/finanzas', { state: { facturarEstiloId: registroToEdit.id } })
              }
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-secondary px-5 text-sm font-semibold text-secondary-foreground transition hover:brightness-95 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Receipt className="h-3.5 w-3.5" />
              Facturar servicio
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-secondary px-5 text-sm font-semibold text-secondary-foreground transition hover:brightness-95 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {bloqueado ? 'Cerrar' : 'Cancelar'}
          </button>
        </div>
      </div>
    </>,
    document.body
  )
}
