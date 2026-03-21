import api from '@/lib/api'

export const authApi = {
  login: async ({ email, password }) => {
    const { data } = await api.post('/auth/login', { email, password })
    return data
  },

  registro: async ({ nombre, email, password, telefono, direccion, ciudad, departamento, nit }) => {
    const { data } = await api.post('/auth/registro', {
      nombre, email, password,
      telefono, direccion, ciudad, departamento, nit,
    })
    return data
  },

  logout: async (refreshToken) => {
    const { data } = await api.post('/auth/logout', { refreshToken })
    return data
  },

  refresh: async (refreshToken) => {
    const { data } = await api.post('/auth/refresh', { refreshToken })
    return data
  },
}