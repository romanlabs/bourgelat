import api from '@/lib/api'

export const notificacionesApi = {
  // { notificaciones: [{ id, categoria, tipo, titulo, texto, enlace, leidaEn, createdAt }], sinLeer }
  async listar() {
    const { data } = await api.get('/notificaciones')
    return data
  },

  // Sin `ids` marca todas las del usuario.
  async marcarLeidas(ids) {
    const { data } = await api.patch('/notificaciones/leidas', ids ? { ids } : {})
    return data
  },
}
