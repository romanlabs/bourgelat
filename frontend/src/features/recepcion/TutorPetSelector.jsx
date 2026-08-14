import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Search, UserPlus } from 'lucide-react'
import { NavCtaLink } from '@/components/shared/NavCta'
import TutorDrawer from '@/features/pacientes/TutorDrawer'
import { pacientesApi } from '@/features/pacientes/pacientesApi'
import { useBuscarPropietarios } from './useRecepcion'

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.errores?.[0]?.mensaje || error?.response?.data?.message || fallback

const getOwnerPets = (owner, fallbackPets) => {
  if (!owner) return []

  const directPets = owner.Mascotas || owner.Mascota || owner.mascotas || []
  if (Array.isArray(directPets) && directPets.length > 0) {
    return directPets
  }

  return (fallbackPets || []).filter((pet) => pet.Propietario?.id === owner.id)
}

/**
 * Buscador de tutor + selector de mascota asociada. Reutilizado por
 * ProgramarCitaPanel, WalkInPanel y UrgenciaRetroactivaDialog — antes estaba
 * duplicado entre el formulario de cita y el modal de urgencia en AgendaPage.
 */
export function TutorPetSelector({
  ownerSearch,
  onOwnerSearchChange,
  selectedOwner,
  onSelectOwner,
  mascotas,
  mascotaId,
  onSelectMascota,
}) {
  const queryClient = useQueryClient()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const propietariosQuery = useBuscarPropietarios(ownerSearch)
  const propietarios = propietariosQuery.data?.propietarios || []
  const mascotasDelTutor = getOwnerPets(selectedOwner, mascotas)

  const crearPropietarioMutation = useMutation({
    mutationFn: pacientesApi.crearPropietario,
    onSuccess: (data) => {
      toast.success(data?.message || 'Tutor registrado exitosamente')
      queryClient.invalidateQueries({ queryKey: ['agenda-propietarios'] })
      setDrawerOpen(false)
      if (data?.propietario) {
        onSelectOwner(data.propietario)
      }
    },
    onError: (error) => toast.error(getErrorMessage(error, 'No fue posible registrar el tutor.')),
  })

  const handleCreateTutor = (formData) => {
    crearPropietarioMutation.mutate({
      nombre: formData.nombre.trim(),
      tipoDocumento: formData.tipoDocumento,
      numeroDocumento: formData.numeroDocumento.trim(),
      telefono: formData.telefono.replace(/\D/g, ''),
      email: formData.email?.trim().toLowerCase() || undefined,
      ciudad: formData.ciudad?.trim() || undefined,
    })
  }

  return (
    <div className="space-y-4">
      <div className="border border-border bg-muted px-4 py-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            <Search className="h-3.5 w-3.5" />
            Buscar tutor
          </div>
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
          >
            <UserPlus className="h-3.5 w-3.5" />
            Crear tutor
          </button>
        </div>
        <input
          type="text"
          value={ownerSearch}
          onChange={(event) => onOwnerSearchChange(event.target.value)}
          placeholder="Nombre, documento o telefono"
          className="mt-3 h-11 w-full border border-border bg-card px-3 text-sm text-foreground outline-none transition focus:border-primary"
        />

        <div className="mt-4 space-y-2">
          {selectedOwner ? (
            <div className="border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-foreground">
              <p className="font-semibold text-slate-950">{selectedOwner.nombre}</p>
              <p className="mt-1">{selectedOwner.telefono || 'Sin telefono principal'}</p>
              <button
                type="button"
                onClick={() => onSelectOwner(null)}
                className="mt-3 text-sm font-semibold text-emerald-700 hover:text-emerald-800"
              >
                Cambiar tutor
              </button>
            </div>
          ) : null}

          {!selectedOwner && propietarios.length > 0
            ? propietarios.map((owner) => (
                <button
                  key={owner.id}
                  type="button"
                  onClick={() => onSelectOwner(owner)}
                  className="flex w-full items-start justify-between border border-border bg-card px-3 py-3 text-left transition hover:bg-muted"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-950">{owner.nombre}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {owner.telefono || 'Sin telefono principal'}
                    </p>
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Seleccionar
                  </span>
                </button>
              ))
            : null}

          {!selectedOwner && ownerSearch.trim() && propietarios.length === 0 ? (
            <div className="border border-dashed border-border bg-white px-3 py-3 text-sm leading-7 text-muted-foreground">
              No encontramos un tutor con esa búsqueda.
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                className="ml-1 font-semibold text-primary hover:underline"
              >
                Crearlo ahora
              </button>
              {' '}o desde la
              <NavCtaLink to="/pacientes" size="sm" className="ml-1">
                sección de pacientes
              </NavCtaLink>
              .
            </div>
          ) : null}
        </div>
      </div>

      <select
        value={mascotaId}
        onChange={(event) => onSelectMascota(event.target.value)}
        disabled={!selectedOwner}
        className="h-11 w-full border border-border bg-card px-3 text-sm text-foreground outline-none transition focus:border-primary disabled:cursor-not-allowed disabled:bg-muted"
      >
        <option value="">
          {selectedOwner ? 'Selecciona el paciente' : 'Selecciona primero un tutor'}
        </option>
        {mascotasDelTutor.map((pet) => (
          <option key={pet.id} value={pet.id}>
            {pet.nombre}
          </option>
        ))}
      </select>

      {selectedOwner && mascotasDelTutor.length === 0 ? (
        <div className="border border-amber-200 bg-amber-50 px-3 py-3 text-sm leading-7 text-amber-800">
          Este tutor aún no tiene pacientes activos. Primero registra la mascota en la sección de pacientes.
        </div>
      ) : null}

      <TutorDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSubmit={handleCreateTutor}
        isPending={crearPropietarioMutation.isPending}
      />
    </div>
  )
}
