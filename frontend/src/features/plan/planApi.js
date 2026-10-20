import api from '@/lib/api'

export const planApi = {
  async obtenerSuscripcionActiva() {
    const { data } = await api.get('/suscripciones/activa')
    return data
  },

  async obtenerPlanes() {
    const { data } = await api.get('/suscripciones/planes')
    return data
  },
}
