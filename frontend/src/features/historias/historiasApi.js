import api from '@/lib/api'

const cleanParams = (params) =>
  Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '')
  )

export const historiasApi = {
  async obtenerHistorias({
    mascotaId,
    veterinarioId,
    bloqueada,
    fechaInicio,
    fechaFin,
    pagina = 1,
    limite = 20,
  } = {}) {
    const { data } = await api.get('/historias', {
      params: cleanParams({
        mascotaId,
        veterinarioId,
        bloqueada,
        fechaInicio,
        fechaFin,
        pagina,
        limite,
      }),
    })
    return data
  },

  async obtenerHistoria(historiaId) {
    const { data } = await api.get(`/historias/${historiaId}`)
    return data
  },

  async crearHistoria(payload) {
    const { data } = await api.post('/historias', payload)
    return data
  },

  async editarHistoria(historiaId, payload) {
    const { data } = await api.put(`/historias/${historiaId}`, payload)
    return data
  },

  async bloquearHistoria(historiaId) {
    const { data } = await api.patch(`/historias/${historiaId}/bloquear`)
    return data
  },

  async obtenerHistoriasMascota(mascotaId) {
    const { data } = await api.get(`/historias/mascota/${mascotaId}`)
    return data
  },
}
