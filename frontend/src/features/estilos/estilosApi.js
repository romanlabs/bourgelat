import api from '@/lib/api'

export const estilosApi = {
  // Equipo completo de la clinica para el select de estilista: a diferencia
  // de agendaApi.obtenerEquipoAgenda, no se limita a veterinarios (el
  // estilista suele estar registrado como auxiliar).
  async obtenerEquipoClinica() {
    const { data } = await api.get('/usuarios/equipo-clinica')
    return data
  },

  async obtenerRegistrosMascota(mascotaId) {
    const { data } = await api.get(`/registros-estilo/mascota/${mascotaId}`)
    return data
  },

  async obtenerRegistro(registroId) {
    const { data } = await api.get(`/registros-estilo/${registroId}`)
    return data
  },

  async crearRegistro(payload) {
    const { data } = await api.post('/registros-estilo', payload)
    return data
  },

  async editarRegistro(registroId, payload) {
    const { data } = await api.put(`/registros-estilo/${registroId}`, payload)
    return data
  },

  // Borrador de cobro de un servicio de estilos aun no facturado.
  async obtenerPreliquidacion(registroId) {
    const { data } = await api.get(`/registros-estilo/${registroId}/preliquidacion`)
    return data
  },
}
