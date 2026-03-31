import api from '@/lib/api'

export const dashboardApi = {
  obtenerDashboardGeneral: async () => {
    const { data } = await api.get('/reportes/dashboard')
    return data
  },

  obtenerSuscripcionActiva: async () => {
    const { data } = await api.get('/suscripciones/activa')
    return data
  },

  obtenerReporteIngresos: async ({ fechaInicio, fechaFin }) => {
    const { data } = await api.get('/reportes/ingresos', {
      params: { fechaInicio, fechaFin },
    })
    return data
  },

  obtenerReporteCitas: async ({ fechaInicio, fechaFin }) => {
    const { data } = await api.get('/reportes/citas', {
      params: { fechaInicio, fechaFin },
    })
    return data
  },

  obtenerReporteInventario: async () => {
    const { data } = await api.get('/reportes/inventario')
    return data
  },
}
