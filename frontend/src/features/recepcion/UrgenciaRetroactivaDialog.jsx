import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  DialogRoot,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { TutorPetSelector } from './TutorPetSelector'

const getToday = () => new Date().toISOString().slice(0, 10)
const nowHHMM = () => new Date().toTimeString().slice(0, 5)

const DEFAULT_FORM = {
  modo: 'ahora',
  horaInicio: nowHHMM(),
  motivo: '',
  observaciones: '',
  veterinarioId: '',
}

/**
 * Registro retroactivo de una urgencia ya atendida (no pasó por la sala de
 * espera). Queda directamente como completada, sin choque de horario.
 * Movido desde el modal inline que vivia en AgendaPage.
 */
export function UrgenciaRetroactivaDialog({
  open,
  onOpenChange,
  veterinarios,
  mascotas,
  usuario,
  crearCitaUrgenciaMutation,
}) {
  const [ownerSearch, setOwnerSearch] = useState('')
  const [selectedOwner, setSelectedOwner] = useState(null)
  const [mascotaId, setMascotaId] = useState('')
  const [form, setForm] = useState(DEFAULT_FORM)

  useEffect(() => {
    if (open) {
      setForm(DEFAULT_FORM)
      setSelectedOwner(null)
      setMascotaId('')
      setOwnerSearch('')
    }
  }, [open])

  const preferredVeterinarioId =
    veterinarios.find((item) => item.id === usuario?.id)?.id || veterinarios[0]?.id || ''

  const handleSubmit = (event) => {
    event.preventDefault()

    if (!form.motivo.trim() || !selectedOwner || !mascotaId || !(form.veterinarioId || preferredVeterinarioId)) {
      toast.error('Completa tutor, paciente, profesional y motivo de la urgencia.')
      return
    }

    const horaInicio = form.modo === 'ahora' ? nowHHMM() : form.horaInicio
    if (form.modo === 'pasado' && !horaInicio) {
      toast.error('Indica la hora en la que se atendió la urgencia.')
      return
    }

    crearCitaUrgenciaMutation.mutate({
      fecha: getToday(),
      horaInicio,
      motivo: form.motivo.trim(),
      observaciones: form.observaciones.trim() || undefined,
      propietarioId: selectedOwner.id,
      mascotaId,
      veterinarioId: form.veterinarioId || preferredVeterinarioId,
    }, {
      onSuccess: () => onOpenChange(false),
    })
  }

  return (
    <DialogRoot open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader className="mb-2">
          <DialogTitle>⚡ Atender urgencia</DialogTitle>
          <DialogDescription>
            Registra una atención de urgencia que no fue agendada previamente. Queda directamente
            como completada, sin bloquear por choques de horario.
          </DialogDescription>
        </DialogHeader>

        <form className="grid gap-3" onSubmit={handleSubmit}>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setForm((current) => ({ ...current, modo: 'ahora' }))}
              className={`flex-1 border px-3 py-2 text-sm font-semibold transition ${
                form.modo === 'ahora'
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-muted text-muted-foreground'
              }`}
            >
              Ahora mismo
            </button>
            <button
              type="button"
              onClick={() => setForm((current) => ({ ...current, modo: 'pasado' }))}
              className={`flex-1 border px-3 py-2 text-sm font-semibold transition ${
                form.modo === 'pasado'
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-muted text-muted-foreground'
              }`}
            >
              Ya fue atendida
            </button>
          </div>

          {form.modo === 'pasado' && (
            <input
              type="time"
              value={form.horaInicio}
              max={nowHHMM()}
              onChange={(event) => setForm((current) => ({ ...current, horaInicio: event.target.value }))}
              className="h-10 border border-border bg-card px-3 text-sm text-foreground outline-none transition focus:border-primary"
            />
          )}

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

          <select
            value={form.veterinarioId || preferredVeterinarioId}
            onChange={(event) => setForm((current) => ({ ...current, veterinarioId: event.target.value }))}
            className="h-10 border border-border bg-card px-3 text-sm text-foreground outline-none transition focus:border-primary"
          >
            <option value="">Selecciona el profesional</option>
            {veterinarios.map((item) => (
              <option key={item.id} value={item.id}>{item.nombre}</option>
            ))}
          </select>

          <input
            type="text"
            value={form.motivo}
            onChange={(event) => setForm((current) => ({ ...current, motivo: event.target.value }))}
            placeholder="Motivo de la urgencia"
            className="h-10 border border-border bg-card px-3 text-sm text-foreground outline-none transition focus:border-primary"
          />

          <textarea
            value={form.observaciones}
            onChange={(event) => setForm((current) => ({ ...current, observaciones: event.target.value }))}
            placeholder="Observaciones de la atencion (opcional)"
            className="min-h-[80px] border border-border bg-card px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary"
          />

          <button
            type="submit"
            disabled={crearCitaUrgenciaMutation.isPending}
            className="flex h-10 items-center justify-center gap-2 border border-red-600 bg-red-600 px-4 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {crearCitaUrgenciaMutation.isPending ? 'Guardando...' : 'Registrar urgencia atendida'}
          </button>
        </form>
      </DialogContent>
    </DialogRoot>
  )
}
