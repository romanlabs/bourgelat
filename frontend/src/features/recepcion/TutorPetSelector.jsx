import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { invalidarDominios } from '@/lib/queryKeys'
import { toast } from 'sonner'
import { PawPrint, Search, UserPlus } from 'lucide-react'
import { NavCtaLink } from '@/components/shared/NavCta'
import TutorDrawer from '@/features/pacientes/TutorDrawer'
import { pacientesApi } from '@/features/pacientes/pacientesApi'
import { useBuscarPropietarios } from './useRecepcion'
import { Select } from '@/components/ui/select'
import { ESPECIE_OPCIONES_FORM } from '@/lib/especies'
import { formatearCelular } from '@/lib/celular'

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
 * ProgramarCitaPanel y WalkInPanel.
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
  // Mascotas creadas aqui mismo: el tutor seleccionado no las trae hasta recargar.
  const [mascotasNuevas, setMascotasNuevas] = useState([])
  const [nuevaMascota, setNuevaMascota] = useState(null)
  const mascotasDelTutor = [
    ...getOwnerPets(selectedOwner, mascotas),
    ...mascotasNuevas.filter((pet) => pet.propietarioId === selectedOwner?.id),
  ]

  const crearMascotaMutation = useMutation({
    mutationFn: pacientesApi.crearMascota,
    onSuccess: (data) => {
      toast.success(data?.message || 'Paciente registrado exitosamente')
      invalidarDominios(queryClient, 'pacientes')
      const creada = data?.mascota
      if (creada?.id) {
        setMascotasNuevas((prev) => [...prev, { ...creada, propietarioId: selectedOwner.id }])
        onSelectMascota(creada.id)
      }
      setNuevaMascota(null)
    },
    onError: (error) => toast.error(getErrorMessage(error, 'No fue posible registrar el paciente.')),
  })

  // Va dentro del formulario de la cita: botones type="button", sin <form> anidado.
  const handleCreateMascota = () => {
    const nombre = nuevaMascota?.nombre?.trim()
    if (!nombre || !nuevaMascota?.especie) {
      toast.error('Escribe el nombre y elige la especie del paciente.')
      return
    }
    crearMascotaMutation.mutate({ nombre, especie: nuevaMascota.especie, propietarioId: selectedOwner.id })
  }

  const crearPropietarioMutation = useMutation({
    mutationFn: pacientesApi.crearPropietario,
    onSuccess: (data) => {
      toast.success(data?.message || 'Tutor registrado exitosamente')
      invalidarDominios(queryClient, 'pacientes')
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
      telefono: formData.telefono,
      email: formData.email?.trim().toLowerCase() || undefined,
      ciudad: formData.ciudad?.trim() || undefined,
    })
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-muted px-4 py-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-[13px] font-semibold text-muted-foreground">
            <Search className="h-3.5 w-3.5" />
            Buscar tutor
          </div>
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="inline-flex items-center gap-1.5 rounded text-[13px] font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <UserPlus className="h-3.5 w-3.5" />
            Crear tutor
          </button>
        </div>
        <input
          type="text"
          value={ownerSearch}
          onChange={(event) => onOwnerSearchChange(event.target.value)}
          placeholder="Nombre, documento o teléfono"
          aria-label="Buscar tutor"
          className="mt-3 h-11 w-full rounded-lg border border-input bg-card px-3 text-[15px] text-foreground outline-none transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />

        <div className="mt-4 space-y-2">
          {selectedOwner ? (
            <div className="rounded-xl bg-success-soft px-4 py-3 text-sm text-foreground">
              <p className="font-semibold text-foreground">{selectedOwner.nombre}</p>
              <p className="mt-1">{formatearCelular(selectedOwner.telefono) || 'Sin teléfono principal'}</p>
              <button
                type="button"
                onClick={() => onSelectOwner(null)}
                className="mt-2 rounded text-sm font-semibold text-success hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                  className="flex w-full items-start justify-between rounded-xl bg-card px-3 py-3 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div>
                    <p className="text-sm font-semibold text-foreground">{owner.nombre}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {formatearCelular(owner.telefono) || 'Sin teléfono principal'}
                    </p>
                  </div>
                  <span className="text-[13px] font-semibold text-muted-foreground">
                    Seleccionar
                  </span>
                </button>
              ))
            : null}

          {!selectedOwner && ownerSearch.trim() && propietarios.length === 0 ? (
            <div className="rounded-xl bg-card px-3 py-3 text-sm leading-7 text-muted-foreground">
              No encontramos un tutor con esa búsqueda.
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                className="ml-1 rounded font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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

      <Select
        variant="field"
        aria-label="Paciente"
        className="h-11 disabled:bg-muted"
        placeholder={selectedOwner ? 'Selecciona el paciente' : 'Selecciona primero un tutor'}
        value={mascotaId}
        onValueChange={onSelectMascota}
        disabled={!selectedOwner}
        options={mascotasDelTutor.map((pet) => ({ value: pet.id, label: pet.nombre }))}
      />

      {selectedOwner && mascotasDelTutor.length === 0 && !nuevaMascota ? (
        <div className="rounded-xl bg-warning-soft px-4 py-3 text-sm font-medium leading-6 text-warning">
          Este tutor aún no tiene pacientes activos. Regístralo aquí mismo.
        </div>
      ) : null}

      {selectedOwner && !nuevaMascota ? (
        <button
          type="button"
          onClick={() => setNuevaMascota({ nombre: '', especie: '' })}
          className="inline-flex items-center gap-1.5 rounded text-[13px] font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <PawPrint className="h-3.5 w-3.5" />
          Registrar paciente nuevo
        </button>
      ) : null}

      {selectedOwner && nuevaMascota ? (
        <div className="space-y-3 rounded-xl bg-muted px-4 py-4">
          <p className="text-[13px] font-semibold text-muted-foreground">
            Paciente nuevo de {selectedOwner.nombre}
          </p>
          <input
            type="text"
            value={nuevaMascota.nombre}
            onChange={(event) => setNuevaMascota((prev) => ({ ...prev, nombre: event.target.value }))}
            placeholder="Nombre del paciente"
            aria-label="Nombre del paciente"
            className="h-11 w-full rounded-lg border border-input bg-card px-3 text-[15px] text-foreground outline-none transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <Select
            variant="field"
            aria-label="Especie"
            className="h-11"
            placeholder="Especie"
            value={nuevaMascota.especie}
            onValueChange={(value) => setNuevaMascota((prev) => ({ ...prev, especie: value }))}
            options={ESPECIE_OPCIONES_FORM}
          />
          <p className="text-[13px] text-muted-foreground">
            Los demás datos (raza, sexo, peso, foto) se completan después en Pacientes.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleCreateMascota}
              disabled={crearMascotaMutation.isPending}
              className="h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:brightness-110 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
            >
              {crearMascotaMutation.isPending ? 'Registrando…' : 'Registrar paciente'}
            </button>
            <button
              type="button"
              onClick={() => setNuevaMascota(null)}
              className="h-10 rounded-lg bg-card px-4 text-sm font-semibold text-foreground transition hover:bg-accent active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Cancelar
            </button>
          </div>
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
