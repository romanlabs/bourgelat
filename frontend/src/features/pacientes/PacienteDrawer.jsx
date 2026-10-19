import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { toast } from 'sonner'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { PawPrint, Search, Upload, X } from 'lucide-react'
import { StatusPill } from '@/features/dashboard/dashboardComponents'
import { Select } from '@/components/ui/select'
import { ESPECIE_OPCIONES_FORM, ESPECIE_VALORES, etiquetaEspecie } from '@/lib/especies'
import { hoyLocal } from '@/lib/fecha'

const SEX_OPTIONS = [
  { value: 'desconocido', label: 'Sin especificar' },
  { value: 'macho', label: 'Macho' },
  { value: 'hembra', label: 'Hembra' },
]

const MAX_PHOTO_BYTES = 4 * 1024 * 1024
const ALLOWED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp']


const pacienteSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
  especie: z.enum(ESPECIE_VALORES),
  raza: z.string().optional(),
  sexo: z.enum(['desconocido', 'macho', 'hembra']),
  fechaNacimiento: z
    .string()
    .optional()
    .refine((v) => !v || v <= hoyLocal(), 'La fecha de nacimiento no puede ser futura'),
  peso: z.coerce.number().positive('El peso debe ser positivo').optional().or(z.literal('')),
  color: z.string().optional(),
  observaciones: z.string().optional(),
  esterilizado: z.boolean().default(false),
})

const DEFAULT_VALUES = {
  nombre: '',
  especie: 'perro',
  raza: '',
  sexo: 'desconocido',
  fechaNacimiento: '',
  peso: '',
  color: '',
  observaciones: '',
  esterilizado: false,
}

const fieldClass =
  'h-11 rounded-lg border border-input bg-card px-3 text-sm text-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-ring'

export default function PacienteDrawer({
  open,
  propietarios,
  isSearchingOwners,
  ownerSearch,
  onOwnerSearch,
  onClose,
  onSubmit,
  isPending,
  editingPaciente = null,
}) {
  const modoEdicion = Boolean(editingPaciente)
  const [selectedOwner, setSelectedOwner] = useState(null)
  const [photoFile, setPhotoFile] = useState(null)
  const [photoInputKey, setPhotoInputKey] = useState(0)

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm({ resolver: zodResolver(pacienteSchema), defaultValues: DEFAULT_VALUES })

  const nombreWatch = watch('nombre')
  const especieWatch = watch('especie')
  const razaWatch = watch('raza')

  const photoObjectUrl = useMemo(() => {
    if (!photoFile) return ''
    return URL.createObjectURL(photoFile)
  }, [photoFile])

  useEffect(() => {
    return () => { if (photoObjectUrl) URL.revokeObjectURL(photoObjectUrl) }
  }, [photoObjectUrl])

  // Sin foto nueva, en edicion se muestra la que ya tiene el paciente.
  const photoPreview = photoObjectUrl || (modoEdicion ? editingPaciente.fotoPerfil || '' : '')

  useEffect(() => {
    if (!open) return
    reset(
      editingPaciente
        ? {
            nombre: editingPaciente.nombre || '',
            especie: editingPaciente.especie || 'perro',
            raza: editingPaciente.raza || '',
            sexo: editingPaciente.sexo || 'desconocido',
            fechaNacimiento: editingPaciente.fechaNacimiento
              ? String(editingPaciente.fechaNacimiento).slice(0, 10)
              : '',
            peso: editingPaciente.peso ?? '',
            color: editingPaciente.color || '',
            observaciones: editingPaciente.observaciones || '',
            esterilizado: Boolean(editingPaciente.esterilizado),
          }
        : DEFAULT_VALUES
    )
    setSelectedOwner(editingPaciente?.Propietario || null)
    setPhotoFile(null)
    setPhotoInputKey((k) => k + 1)
    onOwnerSearch('')
  }, [open, editingPaciente, reset, onOwnerSearch])

  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  function handlePhotoChange(e) {
    const file = e.target.files?.[0]
    if (!file) { setPhotoFile(null); setPhotoInputKey((k) => k + 1); return }
    if (!ALLOWED_PHOTO_TYPES.includes(file.type)) {
      toast.error('La foto debe estar en formato JPG, PNG o WEBP.')
      e.target.value = ''
      return
    }
    if (file.size > MAX_PHOTO_BYTES) {
      toast.error('La foto supera el máximo permitido de 4 MB.')
      e.target.value = ''
      return
    }
    setPhotoFile(file)
  }

  function handleFormSubmit(formData) {
    if (!modoEdicion && !selectedOwner) {
      toast.error('Selecciona un tutor antes de registrar el paciente.')
      return
    }
    // Al editar, un campo vaciado se manda como null para que se borre; con
    // undefined el backend lo ignoraba y volvía el valor viejo.
    const vacio = modoEdicion ? null : undefined
    const payload = {
      propietarioId: selectedOwner?.id,
      nombre: formData.nombre.trim(),
      especie: formData.especie,
      raza: formData.raza?.trim() || vacio,
      sexo: formData.sexo,
      fechaNacimiento: formData.fechaNacimiento || vacio,
      peso: formData.peso ? Number(formData.peso) : vacio,
      color: formData.color?.trim() || vacio,
      observaciones: formData.observaciones?.trim() || vacio,
      esterilizado: formData.esterilizado,
    }
    onSubmit({
      payload,
      photoFile,
      onDone: () => {
        setSelectedOwner(null)
        setPhotoFile(null)
        setPhotoInputKey((k) => k + 1)
        reset(DEFAULT_VALUES)
        onOwnerSearch('')
      },
    })
  }

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
        aria-label={modoEdicion ? 'Editar paciente' : 'Nuevo paciente'}
        className={`fixed right-0 top-0 z-50 flex h-[100dvh] w-full flex-col bg-card shadow-2xl transition-transform duration-300 sm:w-[520px] ${open ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-6 pb-3 pt-6">
          <div>
            <p className="text-[22px] font-semibold leading-tight tracking-[-0.02em] text-foreground">{modoEdicion ? 'Editar paciente' : 'Nuevo paciente'}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {modoEdicion
                ? 'Corrige la ficha del paciente.'
                : 'Selecciona el tutor y completa la ficha del paciente.'}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-secondary-foreground transition hover:brightness-95 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <form id="paciente-drawer-form" className="grid gap-5" onSubmit={handleSubmit(handleFormSubmit)}>

            {/* Seccion: Tutor */}
            <div className="grid gap-3 rounded-2xl bg-muted p-4">
              <div className="flex items-center gap-2">
                <Search className="h-3.5 w-3.5 text-muted-foreground" />
                <p className="text-[15px] font-semibold text-foreground">Tutor responsable *</p>
              </div>

              {modoEdicion ? (
                <div className="rounded-xl bg-card px-4 py-3 text-sm text-foreground">
                  <p className="font-semibold">{selectedOwner?.nombre || 'Sin tutor'}</p>
                  <p className="mt-1 text-[13px] text-muted-foreground">
                    {selectedOwner?.telefono || 'Sin teléfono'}
                    {selectedOwner?.numeroDocumento ? ` · ${selectedOwner.numeroDocumento}` : ''}
                  </p>
                  <p className="mt-2 text-[13px] leading-5 text-muted-foreground">
                    El tutor no se puede reasignar desde aqui: cambiarlo afectaria historias, citas y
                    facturas ya emitidas.
                  </p>
                </div>
              ) : selectedOwner ? (
                <div className="rounded-xl bg-success-soft px-4 py-3 text-sm text-success">
                  <p className="font-semibold">{selectedOwner.nombre}</p>
                  <p className="mt-1 text-[13px]">
                    {selectedOwner.telefono || 'Sin teléfono'}
                    {selectedOwner.numeroDocumento ? ` · ${selectedOwner.numeroDocumento}` : ''}
                  </p>
                  <button
                    type="button"
                    onClick={() => { setSelectedOwner(null); onOwnerSearch('') }}
                    className="mt-2 rounded text-[13px] font-semibold text-success hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    Cambiar tutor
                  </button>
                </div>
              ) : (
                <div className="grid gap-2">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="text"
                      value={ownerSearch}
                      onChange={(e) => onOwnerSearch(e.target.value)}
                      placeholder="Nombre, teléfono o documento"
                      className="h-11 w-full rounded-lg border border-input bg-card pl-10 pr-3 text-sm text-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  </div>

                  {!ownerSearch.trim() && (
                    <p className="text-[13px] leading-5 text-muted-foreground">Escribe para buscar un tutor ya registrado.</p>
                  )}

                  {ownerSearch.trim() && isSearchingOwners && (
                    <p className="text-[13px] text-muted-foreground">Buscando tutores...</p>
                  )}

                  {ownerSearch.trim() && !isSearchingOwners && propietarios.length === 0 && (
                    <p className="text-[13px] text-muted-foreground">Sin resultados. Crea el tutor primero en la vista Tutores.</p>
                  )}

                  {ownerSearch.trim() && propietarios.map((owner) => (
                    <button
                      key={owner.id}
                      type="button"
                      onClick={() => { setSelectedOwner(owner); onOwnerSearch(owner.nombre) }}
                      className="flex w-full items-start justify-between gap-3 rounded-xl bg-card px-4 py-3 text-left transition hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground">{owner.nombre}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{owner.telefono || 'Sin teléfono'}</p>
                      </div>
                      <span className="shrink-0 text-[13px] font-semibold text-primary">Seleccionar</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Seccion: Foto */}
            <div className="grid gap-3">
              <p className="text-[15px] font-semibold text-foreground">Foto del paciente</p>
              <div className="flex items-start gap-4">
                <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-brand-muted">
                  {photoPreview
                    ? <img src={photoPreview} alt="Preview" className="h-full w-full object-cover" />
                    : <PawPrint className="h-9 w-9 text-brand-foreground" />
                  }
                </div>
                <div className="grid gap-2">
                  <label htmlFor={`photo-${photoInputKey}`} className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg bg-secondary px-4 text-sm font-semibold text-secondary-foreground transition hover:brightness-95 active:translate-y-px focus-within:ring-2 focus-within:ring-ring">
                    <Upload className="h-3.5 w-3.5" />
                    {photoFile ? 'Cambiar foto' : 'Seleccionar foto'}
                  </label>
                  <input id={`photo-${photoInputKey}`} key={photoInputKey} type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhotoChange} className="sr-only" />
                  {photoFile
                    ? <div className="flex items-center gap-2">
                        <p className="max-w-[160px] truncate text-[13px] text-muted-foreground" title={photoFile.name}>{photoFile.name}</p>
                        <button type="button" onClick={() => { setPhotoFile(null); setPhotoInputKey((k) => k + 1) }} aria-label="Quitar foto" className="rounded text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><X className="h-4 w-4" /></button>
                      </div>
                    : <p className="text-[13px] text-muted-foreground">JPG, PNG o WEBP · máx. 4 MB</p>
                  }
                </div>
              </div>
            </div>

            {/* Seccion: Datos del paciente */}
            <div className="grid gap-4">
              <p className="text-[15px] font-semibold text-foreground">Datos del paciente</p>

              {/* Preview card */}
              {nombreWatch && (
                <div className="flex items-center gap-3 rounded-xl bg-muted px-4 py-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent text-base font-bold uppercase text-primary">
                    {String(nombreWatch).slice(0, 1)}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground">{nombreWatch}</p>
                    <p className="text-[13px] text-muted-foreground">
                      {etiquetaEspecie(especieWatch)}{razaWatch ? ` / ${razaWatch}` : ''}
                      {selectedOwner ? ` · ${selectedOwner.nombre}` : ''}
                    </p>
                  </div>
                  <StatusPill tone={selectedOwner ? 'bg-success-soft text-success' : 'bg-warning-soft text-warning'}>
                    {selectedOwner ? 'Tutor listo' : 'Falta tutor'}
                  </StatusPill>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <label htmlFor="p-nombre" className="text-[13px] font-medium text-muted-foreground">Nombre *</label>
                  <input id="p-nombre" type="text" placeholder="Nombre del paciente" className={`${fieldClass} ${errors.nombre ? 'border-danger' : ''}`} {...register('nombre')} />
                  {errors.nombre && <p className="text-[13px] text-danger">{errors.nombre.message}</p>}
                </div>
                <div className="grid gap-1.5">
                  <label htmlFor="p-especie" className="text-[13px] font-medium text-muted-foreground">Especie *</label>
                  <Controller
                    name="especie"
                    control={control}
                    render={({ field }) => (
                      <Select
                        variant="field"
                        id="p-especie"
                        aria-label="Especie"
                        className="h-11"
                        value={field.value}
                        onValueChange={field.onChange}
                        options={ESPECIE_OPCIONES_FORM}
                        disabled={modoEdicion}
                      />
                    )}
                  />
                  {modoEdicion && (
                    <p className="text-[13px] text-muted-foreground">
                      La especie no se puede cambiar después del registro.
                    </p>
                  )}
                </div>
                <div className="grid gap-1.5">
                  <label htmlFor="p-raza" className="text-[13px] font-medium text-muted-foreground">Raza o cruce</label>
                  <input id="p-raza" type="text" placeholder="Raza o cruce" className={fieldClass} {...register('raza')} />
                </div>
                <div className="grid gap-1.5">
                  <label htmlFor="p-sexo" className="text-[13px] font-medium text-muted-foreground">Sexo</label>
                  <Controller
                    name="sexo"
                    control={control}
                    render={({ field }) => (
                      <Select
                        variant="field"
                        id="p-sexo"
                        aria-label="Sexo"
                        className="h-11"
                        value={field.value}
                        onValueChange={field.onChange}
                        options={SEX_OPTIONS}
                      />
                    )}
                  />
                </div>
                <div className="grid gap-1.5">
                  <label htmlFor="p-nacimiento" className="text-[13px] font-medium text-muted-foreground">Fecha de nacimiento</label>
                  <input id="p-nacimiento" type="date" max={hoyLocal()} className={`${fieldClass} ${errors.fechaNacimiento ? 'border-danger' : ''}`} {...register('fechaNacimiento')} />
                  {errors.fechaNacimiento && <p className="text-[13px] text-danger">{errors.fechaNacimiento.message}</p>}
                </div>
                <div className="grid gap-1.5">
                  <label htmlFor="p-peso" className="text-[13px] font-medium text-muted-foreground">Peso actual (kg)</label>
                  <input id="p-peso" type="number" min="0" step="0.1" placeholder="0.0" className={`${fieldClass} ${errors.peso ? 'border-danger' : ''}`} {...register('peso')} />
                  {errors.peso && <p className="text-[13px] text-danger">{errors.peso.message}</p>}
                </div>
                <div className="grid gap-1.5">
                  <label htmlFor="p-color" className="text-[13px] font-medium text-muted-foreground">Color principal</label>
                  <input id="p-color" type="text" placeholder="Color principal" className={fieldClass} {...register('color')} />
                </div>
              </div>

              <label className="flex h-11 cursor-pointer items-center gap-3 rounded-lg bg-muted px-3 text-sm text-foreground transition hover:bg-accent">
                <input type="checkbox" className="h-4 w-4 accent-primary" {...register('esterilizado')} />
                Paciente esterilizado
              </label>

              <div className="grid gap-1.5">
                <label htmlFor="p-obs" className="text-[13px] font-medium text-muted-foreground">Observaciones</label>
                <textarea id="p-obs" rows={3} placeholder="Notas utiles para recepción y consulta" className="rounded-lg border border-input bg-card px-3 py-3 text-sm text-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-ring" {...register('observaciones')} />
              </div>
            </div>
          </form>
        </div>

        <div className="flex gap-2.5 bg-card px-6 pb-6 pt-3">
          <button
            type="submit"
            form="paciente-drawer-form"
            disabled={isPending}
            className="flex-1 inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:brightness-110 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? 'Guardando...' : modoEdicion ? 'Actualizar paciente' : 'Guardar paciente'}
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
