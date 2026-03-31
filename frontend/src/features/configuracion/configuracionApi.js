import api from '@/lib/api'

export const configuracionApi = {
  async obtenerClinica() {
    const { data } = await api.get('/clinica')
    return data
  },

  async actualizarClinica(payload) {
    const { data } = await api.put('/clinica', payload)
    return data
  },

  async obtenerConfiguracionFacturacion() {
    const { data } = await api.get('/integraciones/facturacion')
    return data
  },

  async guardarConfiguracionFactus(payload) {
    const { data } = await api.put('/integraciones/facturacion/factus', payload)
    return data
  },

  async sincronizarFactus() {
    const { data } = await api.post('/integraciones/facturacion/factus/sincronizar')
    return data
  },

  async probarFactus() {
    const { data } = await api.post('/integraciones/facturacion/factus/probar')
    return data
  },
}
