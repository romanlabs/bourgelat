import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { pacientesApi } from './pacientesApi'
import { objectToChartData } from '@/features/dashboard/dashboardUtils'
import { ESPECIE_LABELS_PLURAL } from '@/lib/especies'


export function usePacientesResumen({ enabled }) {
  const propietariosResumenQuery = useQuery({
    queryKey: ['pacientes-propietarios-resumen'],
    queryFn: () => pacientesApi.obtenerPropietarios({ pagina: 1, limite: 1 }),
    enabled,
    placeholderData: (prev) => prev,
  })

  const mascotasResumenQuery = useQuery({
    queryKey: ['pacientes-mascotas-resumen'],
    queryFn: () => pacientesApi.obtenerMascotas({ pagina: 1, limite: 50 }),
    enabled,
    placeholderData: (prev) => prev,
  })

  const mascotas = mascotasResumenQuery.data?.mascotas || []

  const speciesData = useMemo(() => {
    const record = mascotas.reduce((acc, pet) => {
      acc[pet.especie] = (acc[pet.especie] || 0) + 1
      return acc
    }, {})
    return objectToChartData(record, ESPECIE_LABELS_PLURAL)
  }, [mascotas])

  return {
    propietariosResumenQuery,
    mascotasResumenQuery,
    totalMascotas: mascotasResumenQuery.data?.total || 0,
    totalPropietarios: propietariosResumenQuery.data?.total || 0,
    speciesData,
    mascotasResumen: mascotas,
  }
}
