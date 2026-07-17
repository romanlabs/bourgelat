import api from '@/lib/api'

export const authApi = {
  login: async ({ email, password }) => {
    const { data } = await api.post('/auth/login', { email, password })
    return data
  },

  registro: async ({ nombre, nombreAdministrador, email, password }) => {
    const { data } = await api.post('/auth/registro', {
      nombre,
      nombreAdministrador,
      email,
      password,
    })
    return data
  },

  logout: async () => {
    const { data } = await api.post('/auth/logout')
    return data
  },

  refresh: async () => {
    const { data } = await api.post('/auth/refresh')
    return data
  },

  me: async () => {
    const { data } = await api.get('/auth/me', {
      skipAuthRedirect: true,
    })
    return data
  },

  completarRegistroOauth: async ({ token, nombreClinica }) => {
    const { data } = await api.post('/auth/oauth/completar-registro', { token, nombreClinica })
    return data
  },
}
