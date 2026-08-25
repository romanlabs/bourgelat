import api from '@/lib/api'

export const agendaAnaliticaApi = {
  // GET /reportes/agenda — agregados del periodo calculados en SQL.
  // Distinto de dashboardApi.obtenerReporteCitas, que solo trae los conteos por
  // estado y tipo del mes y se sigue usando en el dashboard general.
  obtenerAnaliticaAgenda: async ({ fechaInicio, fechaFin }) => {
    const { data } = await api.get('/reportes/agenda', {
      params: { fechaInicio, fechaFin },
    })
    return data
  },
}
