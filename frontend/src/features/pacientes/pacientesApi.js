import api from '@/lib/api'

const cleanParams = (params) =>
  Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '')
  )

export const pacientesApi = {
  async obtenerMascotas({ buscar, especie, pagina = 1, limite = 8 } = {}) {
    const { data } = await api.get('/mascotas', {
      params: cleanParams({ buscar, especie, pagina, limite }),
    })
    return data
  },

  async obtenerPropietarios({ buscar, pagina = 1, limite = 8 } = {}) {
    const { data } = await api.get('/propietarios', {
      params: cleanParams({ buscar, pagina, limite }),
    })
    return data
  },

  async crearPropietario(payload) {
    const { data } = await api.post('/propietarios', payload)
    return data
  },

  async crearMascota(payload) {
    const { data } = await api.post('/mascotas', payload)
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
