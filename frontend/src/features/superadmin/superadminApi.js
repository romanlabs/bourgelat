import api from '@/lib/api'

export const superadminApi = {
  obtenerResumen: async () => {
    const { data } = await api.get('/superadmin/resumen')
    return data
  },
  listarClinicas: async () => {
    const { data } = await api.get('/superadmin/clinicas')
    return data
  },
  asignarPlan: async (payload) => {
    const { data } = await api.post('/suscripciones', payload)
    return data
  },
}
