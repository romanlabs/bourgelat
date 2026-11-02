import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { invalidarDominios } from '@/lib/queryKeys'
import { pacientesApi } from './pacientesApi'

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.errores?.[0]?.mensaje || error?.response?.data?.message || fallback

/**
 * Crea un tutor desde un TutorDrawer abierto encima de otro formulario (cita,
 * ingreso directo, nuevo paciente), sin salir de él. Si falla, el panel sigue
 * abierto con lo escrito.
 */
export function useAltaRapidaTutor({ onCreado }) {
  const queryClient = useQueryClient()
  const [abierto, setAbierto] = useState(false)

  const mutation = useMutation({
    mutationFn: pacientesApi.crearPropietario,
    onSuccess: (data) => {
      toast.success(data?.message || 'Tutor registrado exitosamente')
      invalidarDominios(queryClient, 'pacientes')
      setAbierto(false)
      if (data?.propietario) onCreado(data.propietario)
    },
    onError: (error) => toast.error(getErrorMessage(error, 'No fue posible registrar el tutor.')),
  })

  const guardar = (formData) => {
    mutation.mutate({
      nombre: formData.nombre.trim(),
      tipoDocumento: formData.tipoDocumento,
      numeroDocumento: formData.numeroDocumento.trim(),
      telefono: formData.telefono,
      email: formData.email?.trim().toLowerCase() || undefined,
      ciudad: formData.ciudad?.trim() || undefined,
      barrio: formData.barrio?.trim() || undefined,
    })
  }

  return {
    abierto,
    abrir: () => setAbierto(true),
    cerrar: () => setAbierto(false),
    guardar,
    isPending: mutation.isPending,
  }
}
