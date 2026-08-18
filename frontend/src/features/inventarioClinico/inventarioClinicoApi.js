import api from '@/lib/api'

const cleanParams = (params) =>
  Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '')
  )

export const inventarioClinicoApi = {
  async obtenerInsumos({ buscar, categoria, bajoStock, pagina = 1, limite = 20 } = {}) {
    const { data } = await api.get('/inventario-clinico', {
      params: cleanParams({ buscar, categoria, bajoStock, pagina, limite }),
    })
    return data
  },

  async obtenerMovimientos({ insumoClinicoId, tipo, pagina = 1, limite = 20 } = {}) {
    const { data } = await api.get('/inventario-clinico/movimientos', {
      params: cleanParams({ insumoClinicoId, tipo, pagina, limite }),
    })
    return data
  },

  // Insumos con existencia que pueden aplicarse a un paciente desde la historia.
  async obtenerCatalogoConsumo({ buscar, pagina = 1, limite = 6 } = {}) {
    const { data } = await api.get('/inventario-clinico/catalogo-consumo', {
      params: cleanParams({ buscar, pagina, limite }),
    })
    return data
  },

  async obtenerAlertas() {
    const { data } = await api.get('/inventario-clinico/alertas')
    return data
  },

  async obtenerInsumo(insumoId) {
    const { data } = await api.get(`/inventario-clinico/${insumoId}`)
    return data
  },

  async crearInsumo(payload) {
    const { data } = await api.post('/inventario-clinico', payload)
    return data
  },

  async editarInsumo(insumoId, payload) {
    const { data } = await api.put(`/inventario-clinico/${insumoId}`, payload)
    return data
  },

  async eliminarInsumo(insumoId) {
    const { data } = await api.delete(`/inventario-clinico/${insumoId}`)
    return data
  },

  async registrarMovimiento(insumoId, payload) {
    const { data } = await api.post(`/inventario-clinico/${insumoId}/movimiento`, payload)
    return data
  },
}
