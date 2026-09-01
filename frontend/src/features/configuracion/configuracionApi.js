import api from '@/lib/api'

const cleanParams = (params) =>
  Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '')
  )

export const configuracionApi = {
  async obtenerClinica() {
    const { data } = await api.get('/clinica')
    return data
  },

  async actualizarClinica(payload) {
    const { data } = await api.put('/clinica', payload)
    return data
  },

  async actualizarHorarioAtencion(horarioAtencion) {
    const { data } = await api.put('/clinica/horario-atencion', { horarioAtencion })
    return data
  },

  async obtenerBloqueos({ desde, hasta } = {}) {
    const { data } = await api.get('/bloqueos-agenda', { params: cleanParams({ desde, hasta }) })
    return data
  },

  async calcularImpactoBloqueo({ fechaInicio, fechaFin, horaInicio, horaFin }) {
    const { data } = await api.get('/bloqueos-agenda/impacto', {
      params: cleanParams({ fechaInicio, fechaFin, horaInicio, horaFin }),
    })
    return data
  },

  async crearBloqueo(payload) {
    const { data } = await api.post('/bloqueos-agenda', payload)
    return data
  },

  async eliminarBloqueo(id) {
    const { data } = await api.delete(`/bloqueos-agenda/${id}`)
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
