import api from '@/lib/api'

const buildFormData = (payload = {}, captura = null) => {
  const formData = new FormData()
  Object.entries(payload).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      formData.append(key, value)
    }
  })
  if (captura) {
    formData.append('captura', captura)
  }
  return formData
}

export const soporteApi = {
  async listarTickets(params = {}) {
    const { data } = await api.get('/soporte/tickets', { params })
    return data
  },

  async obtenerTicket(ticketId) {
    const { data } = await api.get(`/soporte/tickets/${ticketId}`)
    return data
  },

  async crearTicket(payload, captura = null) {
    const { data } = await api.post('/soporte/tickets', buildFormData(payload, captura), {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data
  },

  async responder(ticketId, mensaje) {
    const { data } = await api.post(`/soporte/tickets/${ticketId}/mensajes`, { mensaje })
    return data
  },

  async cerrar(ticketId) {
    const { data } = await api.patch(`/soporte/tickets/${ticketId}/cerrar`)
    return data
  },
}
