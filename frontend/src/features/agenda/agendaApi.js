import api from '@/lib/api'

const cleanParams = (params) =>
  Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '')
  )

export const agendaApi = {
  /** Horario de atencion + bloqueos del rango; los devuelve el mismo endpoint. */
  async obtenerDisponibilidadAgenda({ desde, hasta } = {}) {
    const { data } = await api.get('/bloqueos-agenda', { params: cleanParams({ desde, hasta }) })
    return data
  },

  async obtenerCitas({
    fecha,
    fechaDesde,
    fechaHasta,
    veterinarioId,
    mascotaId,
    propietarioId,
    estado,
    pagina = 1,
    limite = 20,
  } = {}) {
    const { data } = await api.get('/citas', {
      params: cleanParams({ fecha, fechaDesde, fechaHasta, veterinarioId, mascotaId, propietarioId, estado, pagina, limite }),
    })
    return data
  },

  async crearCita(payload) {
    const { data } = await api.post('/citas', payload)
    return data
  },

  async actualizarEstadoCita(citaId, payload) {
    const { data } = await api.patch(`/citas/${citaId}/estado`, payload)
    return data
  },

  async reprogramarCita(citaId, payload) {
    const { data } = await api.patch(`/citas/${citaId}/reprogramar`, payload)
    return data
  },

  async obtenerEquipoAgenda() {
    const { data } = await api.get('/usuarios/equipo-agenda')
    return data
  },

  async obtenerCita(citaId) {
    const { data } = await api.get(`/citas/${citaId}`)
    return data
  },
}
