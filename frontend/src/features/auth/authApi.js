import api from '@/lib/api'

export const authApi = {
  login: async ({ email, password }) => {
    const { data } = await api.post('/auth/login', { email, password })
    return data
  },

  registro: async ({
    nombre,
    nombreAdministrador,
    email,
    emailClinica,
    password,
    telefono,
    direccion,
    ciudad,
    departamento,
    nit,
  }) => {
    const { data } = await api.post('/auth/registro', {
      nombre,
      nombreAdministrador,
      email,
      emailClinica,
      password,
      telefono,
      direccion,
      ciudad,
      departamento,
      nit,
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
}
