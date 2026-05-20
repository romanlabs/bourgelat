import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { PawPrint, Search, Upload, X } from 'lucide-react'
import { StatusPill } from '@/features/dashboard/dashboardComponents'
import { formatNumber } from '@/features/dashboard/dashboardUtils'

export const SPECIES_FORM_OPTIONS = [
  { value: 'perro', label: 'Perro' },
  { value: 'gato', label: 'Gato' },
  { value: 'ave', label: 'Ave' },
  { value: 'conejo', label: 'Conejo' },
  { value: 'reptil', label: 'Reptil' },
  { value: 'otro', label: 'Otro' },
]

const SEX_OPTIONS = [
  { value: 'desconocido', label: 'Sin especificar' },
  { value: 'macho', label: 'Macho' },
  { value: 'hembra', label: 'Hembra' },
]

const MAX_PHOTO_BYTES = 4 * 1024 * 1024
const ALLOWED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp']

const pacienteSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
  especie: z.enum(['perro', 'gato', 'ave', 'conejo', 'reptil', 'otro']),
  raza: z.string().optional(),
  sexo: z.enum(['desconocido', 'macho', 'hembra']),
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
  peso: '',
  color: '',
  observaciones: '',
  esterilizado: false,
}

const fieldClass =
  'h-11 border border-border bg-card px-3 text-sm text-foreground outline-none transition focus:border-primary'

export default function PacienteDrawer({
  open,
  propietarios,
  isSearchingOwners,
  ownerSearch,
  onOwnerSearch,
  onClose,
  onSubmit,
  isPending,
}) {
  const [selectedOwner, setSelectedOwner] = useState(null)
  const [photoFile, setPhotoFile] = useState(null)
  const [photoInputKey, setPhotoInputKey] = useState(0)

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm({ resolver: zodResolver(pacienteSchema), defaultValues: DEFAULT_VALUES })

  const nombreWatch = watch('nombre')
  const especieWatch = watch('especie')
  const razaWatch = watch('raza')

  const photoPreview = useMemo(() => {
    if (!photoFile) return ''
    return URL.createObjectURL(photoFile)
  }, [photoFile])

  useEffect(() => {
    return () => { if (photoPreview) URL.revokeObjectURL(photoPreview) }
  }, [photoPreview])

  useEffect(() => {
    if (open) {
      reset(DEFAULT_VALUES)
      setSelectedOwner(null)
      setPhotoFile(null)
      setPhotoInputKey((k) => k + 1)
      onOwnerSearch('')
    }
  }, [open, reset, onOwnerSearch])

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
      alert('La foto debe estar en formato JPG, PNG o WEBP.')
      e.target.value = ''
      return
    }
    if (file.size > MAX_PHOTO_BYTES) {
      alert('La foto supera el maximo permitido de 4 MB.')
      e.target.value = ''
      return
    }
    setPhotoFile(file)
  }

  function handleFormSubmit(formData) {
    if (!selectedOwner) {
      alert('Selecciona un tutor antes de registrar el paciente.')
      return
    }
    const payload = {
      propietarioId: selectedOwner.id,
      nombre: formData.nombre.trim(),
      especie: formData.especie,
      raza: formData.raza?.trim() || undefined,
      sexo: formData.sexo,
      peso: formData.peso ? Number(formData.peso) : undefined,
      color: formData.color?.trim() || undefined,
      observaciones: formData.observaciones?.trim() || undefined,
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

  const SPECIES_LABELS = { perro: 'Perro', gato: 'Gato', ave: 'Ave', conejo: 'Conejo', reptil: 'Reptil', otro: 'Otro' }

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/30 transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Nuevo paciente"
        className={`fixed right-0 top-0 z-50 flex h-full w-full flex-col bg-card shadow-2xl transition-transform duration-300 sm:w-[520px] sm:border-l sm:border-border ${open ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <p className="text-sm font-semibold text-foreground">Nuevo paciente</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Selecciona el tutor y completa la ficha del paciente.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="flex h-8 w-8 items-center justify-center border border-border bg-muted text-muted-foreground transition hover:bg-muted/80 hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          <form id="paciente-drawer-form" className="grid gap-5" onSubmit={handleSubmit(handleFormSubmit)}>

            {/* Seccion: Tutor */}
            <div className="grid gap-3 border border-border bg-muted/40 p-4">
              <div className="flex items-center gap-2">
                <Search className="h-3.5 w-3.5 text-muted-foreground" />
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Tutor responsable *</p>
              </div>

              {selectedOwner ? (
                <div className="border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                  <p className="font-semibold">{selectedOwner.nombre}</p>
                  <p className="mt-1 text-xs">
                    {selectedOwner.telefono || 'Sin telefono'}
                    {selectedOwner.numeroDocumento ? ` · ${selectedOwner.numeroDocumento}` : ''}
                  </p>
                  <button
                    type="button"
                    onClick={() => { setSelectedOwner(null); onOwnerSearch('') }}
                    className="mt-2 text-xs font-semibold text-emerald-700 hover:text-emerald-900"
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
                      placeholder="Nombre, telefono o documento"
                      className="h-11 w-full border border-border bg-card pl-10 pr-3 text-sm text-foreground outline-none transition focus:border-primary"
                    />
                  </div>

                  {!ownerSearch.trim() && (
                    <p className="text-xs leading-5 text-muted-foreground">Escribe para buscar un tutor ya registrado.</p>
                  )}

                  {ownerSearch.trim() && isSearchingOwners && (
                    <p className="text-xs text-muted-foreground">Buscando tutores...</p>
                  )}

                  {ownerSearch.trim() && !isSearchingOwners && propietarios.length === 0 && (
                    <p className="text-xs text-muted-foreground">Sin resultados. Crea el tutor primero desde la tab Tutores.</p>
                  )}

                  {ownerSearch.trim() && propietarios.map((owner) => (
                    <button
                      key={owner.id}
                      type="button"
                      onClick={() => { setSelectedOwner(owner); onOwnerSearch(owner.nombre) }}
                      className="flex w-full items-start justify-between gap-3 border border-border bg-card px-4 py-3 text-left transition hover:border-primary hover:bg-muted"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground">{owner.nombre}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{owner.telefono || 'Sin telefono'}</p>
                      </div>
                      <span className="shrink-0 text-xs font-semibold text-primary">Seleccionar</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Seccion: Foto */}
            <div className="grid gap-3 border-t border-border pt-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Foto del paciente</p>
              <div className="flex items-start gap-4">
                <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden border border-border bg-muted">
                  {photoPreview
                    ? <img src={photoPreview} alt="Preview" className="h-full w-full object-cover" />
                    : <PawPrint className="h-8 w-8 text-muted-foreground/50" />
                  }
                </div>
                <div className="grid gap-2">
                  <label htmlFor={`photo-${photoInputKey}`} className="inline-flex h-9 cursor-pointer items-center gap-2 border border-border bg-foreground px-3 text-xs font-semibold text-white transition hover:bg-slate-800">
                    <Upload className="h-3.5 w-3.5" />
                    {photoFile ? 'Cambiar foto' : 'Seleccionar foto'}
                  </label>
                  <input id={`photo-${photoInputKey}`} key={photoInputKey} type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhotoChange} className="sr-only" />
                  {photoFile
                    ? <div className="flex items-center gap-2">
                        <p className="max-w-[160px] truncate text-xs text-muted-foreground" title={photoFile.name}>{photoFile.name}</p>
                        <button type="button" onClick={() => { setPhotoFile(null); setPhotoInputKey((k) => k + 1) }} className="text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" /></button>
                      </div>
                    : <p className="text-[11px] text-muted-foreground">JPG, PNG o WEBP · max 4 MB</p>
                  }
                </div>
              </div>
            </div>

            {/* Seccion: Datos del paciente */}
            <div className="grid gap-4 border-t border-border pt-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Datos del paciente</p>

              {/* Preview card */}
              {nombreWatch && (
                <div className="flex items-center gap-3 border border-border bg-muted/40 px-4 py-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-border bg-muted text-sm font-bold uppercase text-muted-foreground">
                    {String(nombreWatch).slice(0, 1)}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground">{nombreWatch}</p>
                    <p className="text-xs text-muted-foreground">
                      {SPECIES_LABELS[especieWatch] || especieWatch}{razaWatch ? ` / ${razaWatch}` : ''}
                      {selectedOwner ? ` · ${selectedOwner.nombre}` : ''}
                    </p>
                  </div>
                  <StatusPill tone={selectedOwner ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700'}>
                    {selectedOwner ? 'Tutor listo' : 'Falta tutor'}
                  </StatusPill>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <label htmlFor="p-nombre" className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Nombre *</label>
                  <input id="p-nombre" type="text" placeholder="Nombre del paciente" className={`${fieldClass} ${errors.nombre ? 'border-red-400' : ''}`} {...register('nombre')} />
                  {errors.nombre && <p className="text-xs text-red-600">{errors.nombre.message}</p>}
                </div>
                <div className="grid gap-1.5">
                  <label htmlFor="p-especie" className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Especie *</label>
                  <select id="p-especie" className={fieldClass} {...register('especie')}>
                    {SPECIES_FORM_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div className="grid gap-1.5">
                  <label htmlFor="p-raza" className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Raza o cruce</label>
                  <input id="p-raza" type="text" placeholder="Raza o cruce" className={fieldClass} {...register('raza')} />
                </div>
                <div className="grid gap-1.5">
                  <label htmlFor="p-sexo" className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Sexo</label>
                  <select id="p-sexo" className={fieldClass} {...register('sexo')}>
                    {SEX_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div className="grid gap-1.5">
                  <label htmlFor="p-peso" className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Peso actual (kg)</label>
                  <input id="p-peso" type="number" min="0" step="0.1" placeholder="0.0" className={`${fieldClass} ${errors.peso ? 'border-red-400' : ''}`} {...register('peso')} />
                  {errors.peso && <p className="text-xs text-red-600">{errors.peso.message}</p>}
                </div>
                <div className="grid gap-1.5">
                  <label htmlFor="p-color" className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Color principal</label>
                  <input id="p-color" type="text" placeholder="Color principal" className={fieldClass} {...register('color')} />
                </div>
              </div>

              <label className="flex cursor-pointer items-center gap-3 border border-border bg-muted px-3 py-3 text-sm text-foreground transition hover:bg-muted/80">
                <input type="checkbox" {...register('esterilizado')} />
                Paciente esterilizado
              </label>

              <div className="grid gap-1.5">
                <label htmlFor="p-obs" className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Observaciones</label>
                <textarea id="p-obs" rows={3} placeholder="Notas utiles para recepcion y consulta" className="border border-border bg-card px-3 py-3 text-sm text-foreground outline-none transition focus:border-primary" {...register('observaciones')} />
              </div>
            </div>
          </form>
        </div>

        <div className="flex gap-3 border-t border-border px-5 py-4">
          <button
            type="submit"
            form="paciente-drawer-form"
            disabled={isPending}
            className="flex-1 border border-border bg-foreground px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? 'Guardando...' : 'Guardar paciente'}
          </button>
          <button type="button" onClick={onClose} className="border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-muted">
            Cancelar
          </button>
        </div>
      </div>
    </>
  )
}
