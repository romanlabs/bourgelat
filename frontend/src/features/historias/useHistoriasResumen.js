import { useQuery } from '@tanstack/react-query'
import { historiasApi } from './historiasApi'

/**
 * Contadores de la bandeja clinica. Vienen del servidor: contarlos aqui sobre
 * una pagina de resultados daba cifras que mienten en cuanto la clinica supera
 * el tamano de esa pagina.
 */
export function useHistoriasResumen({ enabled }) {
  const resumenQuery = useQuery({
    queryKey: ['historias-resumen'],
    queryFn: historiasApi.obtenerResumen,
    enabled,
    placeholderData: (prev) => prev,
  })

  const resumen = resumenQuery.data || {}

  return {
    resumenQuery,
    pendientesPorCerrar: resumen.pendientesPorCerrar || 0,
    controlesPendientes: resumen.controlesPendientes || 0,
    totalMes: resumen.totalMes || 0,
    profesionalesActivos: resumen.profesionalesActivos || 0,
  }
}
