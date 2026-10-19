import { useQuery } from '@tanstack/react-query'
import { pacientesApi } from './pacientesApi'

// Totales del encabezado y conteo por especie para los filtros de la lista.
export function usePacientesResumen({ enabled }) {
  const propietariosResumenQuery = useQuery({
    queryKey: ['pacientes-propietarios-resumen'],
    queryFn: () => pacientesApi.obtenerPropietarios({ pagina: 1, limite: 1 }),
    enabled,
    placeholderData: (prev) => prev,
  })

  const mascotasResumenQuery = useQuery({
    queryKey: ['pacientes-mascotas-resumen'],
    queryFn: () => pacientesApi.obtenerMascotas({ pagina: 1, limite: 1, conteo: 'especies' }),
    enabled,
    placeholderData: (prev) => prev,
  })

  return {
    propietariosResumenQuery,
    mascotasResumenQuery,
    totalMascotas: mascotasResumenQuery.data?.total || 0,
    totalPropietarios: propietariosResumenQuery.data?.total || 0,
    porEspecie: mascotasResumenQuery.data?.porEspecie || {},
  }
}
