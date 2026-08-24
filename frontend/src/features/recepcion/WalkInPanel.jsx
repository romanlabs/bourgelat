import { useState } from 'react'
import { toast } from 'sonner'
import { UserPlus } from 'lucide-react'
import { DashboardPanel } from '@/features/dashboard/dashboardComponents'
import { TutorPetSelector } from './TutorPetSelector'
import { TYPE_OPTIONS } from './recepcionConstants'
import { Select, SelectItem, SelectGroup, SelectLabel } from '@/components/ui/select'

const fieldClass =
  'h-11 border border-border bg-card px-3 text-sm text-foreground outline-none transition focus:border-primary'

const DEFAULT_FORM = {
  veterinarioId: '',
  consultorioId: '',
  tipoCita: 'consulta_general',
  motivo: '',
  observaciones: '',
}

/**
 * Panel derecho de Recepción: ingreso directo (walk-in). Sin fecha ni hora —
 * el walk-in siempre es "ahora". Solo ofrece veterinarios libres en este
 * momento, cruzando contra la sala de espera.
 */
export function WalkInPanel({
  veterinariosDisponibilidad,
  consultorios,
  mascotas,
  puedeProgramar,
  crearWalkInMutation,
  bare = false,
  onSuccess,
}) {
  const [ownerSearch, setOwnerSearch] = useState('')
  const [selectedOwner, setSelectedOwner] = useState(null)
  const [mascotaId, setMascotaId] = useState('')
  const [form, setForm] = useState(DEFAULT_FORM)

  const libres = veterinariosDisponibilidad.filter((vet) => vet.estado === 'libre')
  const ocupados = veterinariosDisponibilidad.filter((vet) => vet.estado === 'ocupado')

  const handleSubmit = (event) => {
    event.preventDefault()

    if (!selectedOwner || !mascotaId || !form.veterinarioId || !form.motivo.trim()) {
      toast.error('Completa tutor, paciente, profesional y motivo de consulta.')
      return
    }

    crearWalkInMutation.mutate({
      mascotaId,
      propietarioId: selectedOwner.id,
      veterinarioId: form.veterinarioId,
      consultorioId: form.consultorioId || undefined,
      tipoCita: form.tipoCita,
      motivo: form.motivo.trim(),
      observaciones: form.observaciones.trim() || undefined,
    }, {
      onSuccess: () => {
        setForm(DEFAULT_FORM)
        setSelectedOwner(null)
        setMascotaId('')
        onSuccess?.()
      },
    })
  }

  const contenido = (
    <>
      {!puedeProgramar ? (
        <div className="border border-border bg-muted px-4 py-5 text-sm leading-7 text-muted-foreground">
          Tu rol actual no puede registrar ingresos directos.
        </div>
      ) : (
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <TutorPetSelector
            ownerSearch={ownerSearch}
            onOwnerSearchChange={setOwnerSearch}
            selectedOwner={selectedOwner}
            onSelectOwner={(owner) => {
              setSelectedOwner(owner)
              setMascotaId('')
            }}
            mascotas={mascotas}
            mascotaId={mascotaId}
            onSelectMascota={setMascotaId}
          />

          <div>
            <Select
              variant="field"
              aria-label="Veterinario"
              placeholder="Selecciona un veterinario libre"
              value={form.veterinarioId}
              onValueChange={(value) => setForm((current) => ({ ...current, veterinarioId: value }))}
            >
              {libres.map((vet) => (
                <SelectItem key={vet.id} value={vet.id}>{vet.nombre}</SelectItem>
              ))}
              {ocupados.length > 0 ? (
                <SelectGroup>
                  <SelectLabel>Ocupados ahora</SelectLabel>
                  {ocupados.map((vet) => (
                    <SelectItem key={vet.id} value={vet.id} disabled>
                      {vet.nombre} — atendiendo {vet.citaActual?.paciente || 'paciente'}
                    </SelectItem>
                  ))}
                </SelectGroup>
              ) : null}
            </Select>
          </div>

          <Select
            variant="field"
            aria-label="Consultorio"
            placeholder="Sin consultorio asignado"
            value={form.consultorioId}
            onValueChange={(value) => setForm((current) => ({ ...current, consultorioId: value }))}
            options={consultorios.map((item) => ({ value: item.id, label: item.nombre }))}
          />

          <Select
            variant="field"
            aria-label="Tipo de cita"
            value={form.tipoCita}
            onValueChange={(value) => setForm((current) => ({ ...current, tipoCita: value }))}
            options={TYPE_OPTIONS}
          />

          <input
            type="text"
            value={form.motivo}
            onChange={(event) => setForm((current) => ({ ...current, motivo: event.target.value }))}
            placeholder="Motivo de consulta"
            className={`${fieldClass} w-full`}
          />

          <textarea
            value={form.observaciones}
            onChange={(event) => setForm((current) => ({ ...current, observaciones: event.target.value }))}
            placeholder="Observaciones"
            className="min-h-[90px] border border-border bg-card px-3 py-3 text-sm text-foreground outline-none transition focus:border-primary"
          />

          <button
            type="submit"
            disabled={crearWalkInMutation.isPending}
            className="border border-red-500 bg-red-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {crearWalkInMutation.isPending ? 'Registrando...' : 'Registrar en sala de espera'}
          </button>
        </form>
      )}
    </>
  )

  if (bare) return contenido

  return (
    <DashboardPanel
      title="Ingreso directo"
      subtitle="Registra un paciente que llega sin cita. Entra a la sala de espera de inmediato."
      action={<UserPlus className="h-4 w-4 text-primary" />}
    >
      {contenido}
    </DashboardPanel>
  )
}
