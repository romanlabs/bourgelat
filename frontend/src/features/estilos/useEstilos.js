import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { estilosApi } from './estilosApi'

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.errores?.[0]?.mensaje ||
  error?.response?.data?.message ||
  fallback

export function useEstilosMascota({ mascotaId, enabled = true }) {
  const queryClient = useQueryClient()

  const registrosQuery = useQuery({
    queryKey: ['paciente-estilos', mascotaId],
    queryFn: () => estilosApi.obtenerRegistrosMascota(mascotaId),
    enabled: Boolean(mascotaId) && enabled,
  })

  const invalidar = () => {
    queryClient.invalidateQueries({ queryKey: ['paciente-estilos', mascotaId] })
    // Crear un registro desde una cita la marca completada: la agenda debe
    // reflejarlo sin que el usuario recargue.
    queryClient.invalidateQueries({ queryKey: ['agenda-citas'] })
  }

  const crearRegistroMutation = useMutation({
    mutationFn: estilosApi.crearRegistro,
    onSuccess: (data) => {
      toast.success(data?.message || 'Registro de estilos creado')
      invalidar()
    },
    onError: (error) =>
      toast.error(getErrorMessage(error, 'No fue posible crear el registro de estilos.')),
  })

  const editarRegistroMutation = useMutation({
    mutationFn: ({ registroId, payload }) => estilosApi.editarRegistro(registroId, payload),
    onSuccess: (data) => {
      toast.success(data?.message || 'Registro de estilos actualizado')
      invalidar()
    },
    onError: (error) =>
      toast.error(getErrorMessage(error, 'No fue posible actualizar el registro.')),
  })

  return {
    registrosQuery,
    registros: registrosQuery.data?.registros || [],
    crearRegistro: crearRegistroMutation.mutate,
    editarRegistro: editarRegistroMutation.mutate,
    isPending: crearRegistroMutation.isPending || editarRegistroMutation.isPending,
  }
}
