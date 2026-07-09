import api from '@/lib/api'

const cleanParams = (params) =>
  Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '')
  )

export const serviciosApi = {
  async obtenerServicios({ buscar, categoria, pagina = 1, limite = 20 } = {}) {
    const { data } = await api.get('/servicios-clinicos', {
      params: cleanParams({ buscar, categoria, pagina, limite }),
    })
    return data
  },

  async obtenerServicio(servicioId) {
    const { data } = await api.get(`/servicios-clinicos/${servicioId}`)
    return data
  },

  async crearServicio(payload) {
    const { data } = await api.post('/servicios-clinicos', payload)
    return data
  },

  async editarServicio(servicioId, payload) {
    const { data } = await api.put(`/servicios-clinicos/${servicioId}`, payload)
    return data
  },

  async eliminarServicio(servicioId) {
    const { data } = await api.delete(`/servicios-clinicos/${servicioId}`)
    return data
  },
}
