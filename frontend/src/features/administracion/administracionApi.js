import api from '@/lib/api'

const cleanParams = (params) =>
  Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '')
  )

export const administracionApi = {
  // Gastos del negocio
  async crearGasto(payload) {
    const { data } = await api.post('/gastos', payload)
    return data
  },

  async obtenerGastos({ fechaInicio, fechaFin, categoria, metodoPago, pagina = 1, limite = 30 } = {}) {
    const { data } = await api.get('/gastos', {
      params: cleanParams({ fechaInicio, fechaFin, categoria, metodoPago, pagina, limite }),
    })
    return data
  },

  async anularGasto(gastoId, motivoAnulacion) {
    const { data } = await api.patch(`/gastos/${gastoId}/anular`, { motivoAnulacion })
    return data
  },

  // Fiado / cuentas por cobrar
  async obtenerCuentasPorCobrar() {
    const { data } = await api.get('/facturas/cuentas-por-cobrar')
    return data
  },

  async registrarAbono(facturaId, payload) {
    const { data } = await api.post(`/facturas/${facturaId}/abonos`, payload)
    return data
  },

  // Rentabilidad del periodo
  async obtenerRentabilidad({ fechaInicio, fechaFin }) {
    const { data } = await api.get('/reportes/rentabilidad', {
      params: { fechaInicio, fechaFin },
    })
    return data
  },
}
