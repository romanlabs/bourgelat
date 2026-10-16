import api from '@/lib/api'

export const authApi = {
  login: async ({ email, password, turnstileToken }) => {
    const { data } = await api.post('/auth/login', { email, password, turnstileToken })
    return data
  },

  registro: async ({ nombre, nombreAdministrador, email, password, aceptaTerminos, aceptaComunicaciones, turnstileToken }) => {
    const { data } = await api.post('/auth/registro', {
      nombre,
      nombreAdministrador,
      email,
      password,
      aceptaTerminos,
      aceptaComunicaciones,
      turnstileToken,
    })
    return data
  },

  verificarCodigo: async ({ email, codigo }) => {
    const { data } = await api.post('/auth/verificar-codigo', { email, codigo })
    return data
  },

  reenviarCodigo: async ({ email, turnstileToken }) => {
    const { data } = await api.post('/auth/reenviar-codigo', { email, turnstileToken })
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

  completarRegistroOauth: async ({ token, nombreClinica, aceptaTerminos, aceptaComunicaciones }) => {
    const { data } = await api.post('/auth/oauth/completar-registro', {
      token,
      nombreClinica,
      aceptaTerminos,
      aceptaComunicaciones,
    })
    return data
  },

  forgotPassword: async ({ email, turnstileToken }) => {
    const { data } = await api.post('/auth/forgot-password', { email, turnstileToken })
    return data
  },

  resetPassword: async ({ token, password }) => {
    const { data } = await api.post('/auth/reset-password', { token, password })
    return data
  },

  verificarEmail: async ({ token }) => {
    const { data } = await api.post('/auth/verify-email', { token })
    return data
  },

  reenviarVerificacion: async ({ email }) => {
    const { data } = await api.post('/auth/resend-verification', { email })
    return data
  },
}
