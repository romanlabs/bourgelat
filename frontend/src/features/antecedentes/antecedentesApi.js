import api from '@/lib/api'

export const antecedentesApi = {
  async obtenerAntecedentes(mascotaId) {
    const { data } = await api.get(`/antecedentes/${mascotaId}`)
    return data
  },

  async actualizarGenerales(mascotaId, payload) {
    const { data } = await api.put(`/antecedentes/${mascotaId}/generales`, payload)
    return data
  },

  async agregarAlergia(mascotaId, payload) {
    const { data } = await api.post(`/antecedentes/${mascotaId}/alergia`, payload)
    return data
  },

  async agregarCirugia(mascotaId, payload) {
    const { data } = await api.post(`/antecedentes/${mascotaId}/cirugia`, payload)
    return data
  },

  async agregarVacuna(mascotaId, payload) {
    const { data } = await api.post(`/antecedentes/${mascotaId}/vacuna`, payload)
    return data
  },

  async agregarCondicion(mascotaId, payload) {
    const { data } = await api.post(`/antecedentes/${mascotaId}/condicion`, payload)
    return data
  },
}
