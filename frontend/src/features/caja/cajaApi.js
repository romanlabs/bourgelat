import api from '@/lib/api'

const cleanParams = (params) =>
  Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '')
  )

export const cajaApi = {
  async abrirTurno(payload) {
    const { data } = await api.post('/caja/turnos/abrir', payload)
    return data
  },

  async obtenerTurnoActivo() {
    const { data } = await api.get('/caja/turnos/activo')
    return data
  },

  async listarMovimientos(turnoId) {
    const { data } = await api.get(`/caja/turnos/${turnoId}/movimientos`)
    return data
  },

  async registrarMovimiento(payload) {
    const { data } = await api.post('/caja/turnos/movimientos', payload)
    return data
  },

  async cerrarTurno(payload) {
    const { data } = await api.patch('/caja/turnos/cerrar', payload)
    return data
  },

  async listarHistorial({ fechaInicio, fechaFin, usuarioId, pagina = 1, limite = 20 } = {}) {
    const { data } = await api.get('/caja/turnos/historial', {
      params: cleanParams({ fechaInicio, fechaFin, usuarioId, pagina, limite }),
    })
    return data
  },

  async obtenerDetalleTurno(turnoId) {
    const { data } = await api.get(`/caja/turnos/${turnoId}`)
    return data
  },

  async obtenerReporteDescuadres({ fechaInicio, fechaFin, usuarioId } = {}) {
    const { data } = await api.get('/caja/turnos/reporte-descuadres', {
      params: cleanParams({ fechaInicio, fechaFin, usuarioId }),
    })
    return data
  },
}
