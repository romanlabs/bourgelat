import api from '@/lib/api'

export const notificacionesApi = {
  // { notificaciones: [{ id, categoria, tipo, titulo, texto, enlace, leidaEn, createdAt }], sinLeer,
  //   ajustes: { categoriasApagadas, correoUrgente }, leidasDerivadas: [id] }
  async listar() {
    const { data } = await api.get('/notificaciones')
    return data
  },

  // Sin `ids` marca todas las del usuario.
  async marcarLeidas(ids) {
    const { data } = await api.patch('/notificaciones/leidas', ids ? { ids } : {})
    return data
  },

  // { categoriasApagadas?, correoUrgente? } → { ajustes }
  async guardarAjustes(ajustes) {
    const { data } = await api.put('/notificaciones/ajustes', ajustes)
    return data
  },

  // Lista completa de los avisos derivados leídos que siguen vigentes.
  async guardarLeidasDerivadas(ids) {
    const { data } = await api.put('/notificaciones/derivadas-leidas', { ids })
    return data
  },

  // { seguimientos: [{ mascotaId, mascotaNombre, propietarioNombre, propietarioTelefono, pendientes }] }
  async listarSeguimientos() {
    const { data } = await api.get('/antecedentes/seguimientos')
    return data
  },
}
