import axios from 'axios'
import { useAuthStore } from '@/store/authStore'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Inyecta el token en cada request
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().getToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Variable para evitar múltiples refresh simultáneos
let refrescando = false
let cola = []

const procesarCola = (error, token = null) => {
  cola.forEach(({ resolve, reject }) => {
    if (error) reject(error)
    else resolve(token)
  })
  cola = []
}

// Manejo de errores y refresh automático
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const solicitudOriginal = error.config

    // Si el token expiró y no es un retry
    if (
      error.response?.status === 401 &&
      error.response?.data?.code === 'TOKEN_EXPIRED' &&
      !solicitudOriginal._retry
    ) {
      if (refrescando) {
        // Encolar la solicitud mientras se refresca
        return new Promise((resolve, reject) => {
          cola.push({ resolve, reject })
        }).then((token) => {
          solicitudOriginal.headers.Authorization = `Bearer ${token}`
          return api(solicitudOriginal)
        }).catch((err) => Promise.reject(err))
      }

      solicitudOriginal._retry = true
      refrescando = true

      try {
        const refreshToken = useAuthStore.getState().getRefreshToken()

        if (!refreshToken) {
          useAuthStore.getState().clearAuth()
          window.location.href = '/login'
          return Promise.reject(error)
        }

        const { data } = await axios.post(
          `${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/auth/refresh`,
          { refreshToken }
        )

        useAuthStore.getState().setAccessToken(data.accessToken)

        // Guardar también el nuevo refreshToken
        useAuthStore.setState({
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
        })

        procesarCola(null, data.accessToken)
        solicitudOriginal.headers.Authorization = `Bearer ${data.accessToken}`
        return api(solicitudOriginal)

      } catch (refreshError) {
        procesarCola(refreshError, null)
        useAuthStore.getState().clearAuth()
        window.location.href = '/login'
        return Promise.reject(refreshError)
      } finally {
        refrescando = false
      }
    }

    // Otros errores 401 — sesión inválida
    if (error.response?.status === 401) {
      useAuthStore.getState().clearAuth()
      window.location.href = '/login'
    }

    return Promise.reject(error)
  }
)

export default api
