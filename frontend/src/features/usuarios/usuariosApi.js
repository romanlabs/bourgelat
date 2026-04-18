import api from '@/lib/api'

export const usuariosApi = {
  async obtenerUsuarios() {
    const { data } = await api.get('/usuarios')
    return data
  },

  async crearUsuario(payload) {
    const { data } = await api.post('/usuarios', payload)
    return data
  },

  async editarUsuario(id, payload) {
    const { data } = await api.put(`/usuarios/${id}`, payload)
    return data
  },

  async toggleUsuario(id) {
    const { data } = await api.patch(`/usuarios/${id}/toggle`)
    return data
  },
}
