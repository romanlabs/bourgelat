import api from '@/lib/api'

export const perfilApi = {
  actualizarPerfil: async (cambios) => {
    const { data } = await api.patch('/usuarios/me', cambios)
    return data
  },

  subirFoto: async (file) => {
    const formData = new FormData()
    formData.append('foto', file)
    const { data } = await api.post('/usuarios/me/foto', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data
  },

  cambiarPassword: async ({ passwordActual, passwordNueva }) => {
    const { data } = await api.post('/auth/cambiar-password', {
      passwordActual,
      passwordNueva,
    })
    return data
  },

  cerrarTodasLasSesiones: async () => {
    const { data } = await api.post('/auth/logout-all')
    return data
  },
}
