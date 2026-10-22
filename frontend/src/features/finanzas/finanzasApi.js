import api from '@/lib/api'
import { dashboardApi } from '@/features/dashboard/dashboardApi'

const cleanParams = (params) =>
  Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '')
  )

export const finanzasApi = {
  obtenerReporteIngresos: dashboardApi.obtenerReporteIngresos,

  async crearFactura(payload) {
    const { data } = await api.post('/facturas', payload)
    return data
  },

  async obtenerFacturas({ fechaInicio, fechaFin, estado, buscar, pagina = 1, limite = 20 } = {}) {
    const { data } = await api.get('/facturas', {
      params: cleanParams({ fechaInicio, fechaFin, estado, buscar, pagina, limite }),
    })
    return data
  },

  async obtenerFactura(facturaId) {
    const { data } = await api.get(`/facturas/${facturaId}`)
    return data
  },

  async emitirFacturaElectronica(facturaId, payload = {}) {
    const { data } = await api.post(`/facturas/${facturaId}/emitir-electronica`, payload)
    return data
  },

  async anularFactura(facturaId, motivoAnulacion) {
    const { data } = await api.patch(`/facturas/${facturaId}/anular`, { motivoAnulacion })
    return data
  },
}
