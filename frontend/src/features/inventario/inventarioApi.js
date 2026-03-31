import api from '@/lib/api'

const cleanParams = (params) =>
  Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '')
  )

export const inventarioApi = {
  async obtenerCatalogoMedicamentos({ buscar, pagina = 1, limite = 8 } = {}) {
    const { data } = await api.get('/inventario/catalogo-medicamentos', {
      params: cleanParams({ buscar, pagina, limite }),
    })
    return data
  },

  async obtenerProductos({ buscar, categoria, bajoStock, pagina = 1, limite = 20 } = {}) {
    const { data } = await api.get('/inventario', {
      params: cleanParams({ buscar, categoria, bajoStock, pagina, limite }),
    })
    return data
  },

  async obtenerMovimientos({ productoId, tipo, pagina = 1, limite = 20 } = {}) {
    const { data } = await api.get('/inventario/movimientos', {
      params: cleanParams({ productoId, tipo, pagina, limite }),
    })
    return data
  },

  async obtenerAlertas() {
    const { data } = await api.get('/inventario/alertas')
    return data
  },

  async obtenerProductoPorBarcode(codigo) {
    const { data } = await api.get(`/inventario/barcode/${encodeURIComponent(codigo)}`)
    return data
  },

  async crearProducto(payload) {
    const { data } = await api.post('/inventario', payload)
    return data
  },

  async registrarMovimiento(productoId, payload) {
    const { data } = await api.post(`/inventario/${productoId}/movimiento`, payload)
    return data
  },
}
