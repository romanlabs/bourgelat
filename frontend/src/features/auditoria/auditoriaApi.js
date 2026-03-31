import api from '@/lib/api'

const cleanParams = (params) =>
  Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '')
  )

export const auditoriaApi = {
  async obtenerLogs({ pagina = 1, limite = 20, accion, entidad, resultado, buscar, desde, hasta } = {}) {
    const { data } = await api.get('/auditoria', {
      params: cleanParams({ pagina, limite, accion, entidad, resultado, buscar, desde, hasta }),
    })
    return data
  },
}
