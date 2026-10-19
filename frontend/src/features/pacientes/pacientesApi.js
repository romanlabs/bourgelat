import api from '@/lib/api'

const cleanParams = (params) =>
  Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '')
  )

export const pacientesApi = {
  async obtenerMascota(mascotaId) {
    const { data } = await api.get(`/mascotas/${mascotaId}`)
    return data
  },

  async obtenerMascotas({ buscar, especie, estado, conteo, pagina = 1, limite = 8 } = {}) {
    const { data } = await api.get('/mascotas', {
      params: cleanParams({ buscar, especie, estado, conteo, pagina, limite }),
    })
    return data
  },

  async obtenerPropietarios({ buscar, estado, pagina = 1, limite = 8 } = {}) {
    const { data } = await api.get('/propietarios', {
      params: cleanParams({ buscar, estado, pagina, limite }),
    })
    return data
  },

  async desactivarPropietario(propietarioId) {
    const { data } = await api.patch(`/propietarios/${propietarioId}/desactivar`)
    return data
  },

  async activarPropietario(propietarioId) {
    const { data } = await api.patch(`/propietarios/${propietarioId}/activar`)
    return data
  },

  async crearPropietario(payload) {
    const { data } = await api.post('/propietarios', payload)
    return data
  },

  async editarPropietario(propietarioId, payload) {
    const { data } = await api.put(`/propietarios/${propietarioId}`, payload)
    return data
  },

  async crearMascota(payload) {
    const { data } = await api.post('/mascotas', payload)
    return data
  },

  async desactivarMascota(mascotaId) {
    const { data } = await api.patch(`/mascotas/${mascotaId}/desactivar`)
    return data
  },

  async activarMascota(mascotaId) {
    const { data } = await api.patch(`/mascotas/${mascotaId}/activar`)
    return data
  },

  async editarMascota(mascotaId, payload) {
    const { data } = await api.put(`/mascotas/${mascotaId}`, payload)
    return data
  },

  async subirFotoMascota(file) {
    const formData = new FormData()
    formData.append('foto', file)

    const { data } = await api.post('/mascotas/subir-foto', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })

    return data
  },
}
