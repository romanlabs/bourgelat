import api from '@/lib/api'

export const superadminApi = {
  obtenerResumen: async () => {
    const { data } = await api.get('/superadmin/resumen')
    return data
  },
}
