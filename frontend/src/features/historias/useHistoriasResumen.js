import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { historiasApi } from './historiasApi'
import { agendaApi } from '@/features/agenda/agendaApi'
import { getCurrentMonthRange } from '@/features/dashboard/dashboardUtils'

export function useHistoriasResumen({ enabled }) {
  const rangoMes = useMemo(() => getCurrentMonthRange(), [])

  const historiasResumenQuery = useQuery({
    queryKey: ['historias-resumen-mes', rangoMes.fechaInicio, rangoMes.fechaFin],
    queryFn: () =>
      historiasApi.obtenerHistorias({
        fechaInicio: rangoMes.fechaInicio,
        fechaFin: rangoMes.fechaFin,
        pagina: 1,
        limite: 200,
      }),
    enabled,
    placeholderData: (prev) => prev,
  })

  const veterinariosQuery = useQuery({
    queryKey: ['historias-equipo'],
    queryFn: agendaApi.obtenerEquipoAgenda,
    enabled,
    placeholderData: (prev) => prev,
  })

  const historias = historiasResumenQuery.data?.historias || []
  const historiasBloqueadas = historias.filter((h) => h.bloqueada).length
  const conControl = historias.filter((h) => h.proximaConsulta).length
  const profesionalesActivos = new Set(
    historias.map((h) => h.veterinario?.id).filter(Boolean)
  ).size

  const statusData = [
    {
      key: 'editables',
      name: 'Editables',
      value: historias.length - historiasBloqueadas,
      color: '#0f766e',
    },
    { key: 'bloqueadas', name: 'Bloqueadas', value: historiasBloqueadas, color: '#f59e0b' },
  ]

  return {
    historiasResumenQuery,
    veterinariosQuery,
    totalHistorias: historiasResumenQuery.data?.total || historias.length,
    historiasBloqueadas,
    conControl,
    profesionalesActivos,
    statusData,
  }
}
