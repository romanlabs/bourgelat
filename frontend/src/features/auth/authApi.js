import api from '@/lib/api'

export const authApi = {
  login: async ({ email, password }) => {
    const { data } = await api.post('/auth/login', { email, password })
    return data
  },

  registro: async ({ nombre, email, password, telefono, direccion }) => {
    const { data } = await api.post('/auth/registro', {
      nombre,
      email,
      password,
      telefono,
      direccion,
    })
    return data
  },
}