import api from '@/lib/api'

// Cuentas donde la clínica recibe transferencias (Nequi, Bancolombia…).
export const cuentasRecaudoApi = {
  async listar({ activo } = {}) {
    const { data } = await api.get('/cuentas-recaudo', {
      params: activo === undefined ? {} : { activo: String(activo) },
    })
    return data
  },

  async crear(payload) {
    const { data } = await api.post('/cuentas-recaudo', payload)
    return data
  },

  async actualizar(id, payload) {
    const { data } = await api.patch(`/cuentas-recaudo/${id}`, payload)
    return data
  },
}
