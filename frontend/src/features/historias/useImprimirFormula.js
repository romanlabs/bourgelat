import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuthStore } from '@/store/authStore'
import { historiasApi } from './historiasApi'
import { descargarFormulaPdf } from './formulaPdf'
import { descargarHistoriaPdf } from './historiaPdf'

/**
 * Los PDFs se arman siempre desde la version guardada de la historia: el
 * detalle trae paciente, tutor y veterinario completos, cosa que no tienen ni
 * el formulario en edicion ni las filas del timeline.
 */
function useImprimirDocumento(descargar, mensajeError) {
  const clinica = useAuthStore((state) => state.clinica)

  const mutation = useMutation({
    mutationFn: async (historiaId) => {
      const { historia } = await historiasApi.obtenerHistoria(historiaId)
      await descargar({ historia, clinica })
    },
    onError: () => toast.error(mensajeError),
  })

  return {
    imprimir: (historiaId) => {
      if (historiaId && !mutation.isPending) mutation.mutate(historiaId)
    },
    isPending: mutation.isPending,
    // Para mostrar "Generando..." solo en la tarjeta que se esta imprimiendo.
    historiaEnCurso: mutation.isPending ? mutation.variables : null,
  }
}

export const useImprimirFormula = () =>
  useImprimirDocumento(descargarFormulaPdf, 'No se pudo cargar la historia para imprimir la fórmula.')

export const useImprimirHistoria = () =>
  useImprimirDocumento(descargarHistoriaPdf, 'No se pudo cargar la historia para imprimirla.')
