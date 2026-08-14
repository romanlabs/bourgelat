import api from '@/lib/api'

const cleanParams = (params) =>
  Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '')
  )

export const recepcionApi = {
  async obtenerSalaEspera({ fecha } = {}) {
    const { data } = await api.get('/citas/sala-espera', { params: cleanParams({ fecha }) })
    return data
  },

  async obtenerDisponibilidad({ fecha } = {}) {
    const { data } = await api.get('/citas/disponibilidad-veterinarios', { params: cleanParams({ fecha }) })
    return data
  },

  async crearWalkIn(payload) {
    const { data } = await api.post('/citas/walk-in', payload)
    return data
  },

  async obtenerConsultorios({ activo } = {}) {
    const { data } = await api.get('/consultorios', { params: cleanParams({ activo }) })
    return data
  },

  async crearConsultorio(payload) {
    const { data } = await api.post('/consultorios', payload)
    return data
  },

  async actualizarConsultorio(id, payload) {
    const { data } = await api.patch(`/consultorios/${id}`, payload)
    return data
  },
}
