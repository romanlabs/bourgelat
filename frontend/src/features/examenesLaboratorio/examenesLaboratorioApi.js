import api from '@/lib/api'

const buildFormData = (payload = {}, archivo = null) => {
  const formData = new FormData()
  Object.entries(payload).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      formData.append(key, value)
    }
  })
  if (archivo) {
    formData.append('archivo', archivo)
  }
  return formData
}

export const examenesLaboratorioApi = {
  async obtenerExamenes(mascotaId) {
    const { data } = await api.get(`/examenes-laboratorio/${mascotaId}`)
    return data
  },

  async crearExamen(mascotaId, payload, archivo = null) {
    const { data } = await api.post(
      `/examenes-laboratorio/${mascotaId}`,
      buildFormData(payload, archivo),
      { headers: { 'Content-Type': 'multipart/form-data' } }
    )
    return data
  },

  async editarExamen(examenId, payload, archivo = null) {
    const { data } = await api.put(
      `/examenes-laboratorio/${examenId}`,
      buildFormData(payload, archivo),
      { headers: { 'Content-Type': 'multipart/form-data' } }
    )
    return data
  },

  async eliminarExamen(examenId) {
    const { data } = await api.delete(`/examenes-laboratorio/${examenId}`)
    return data
  },
}
