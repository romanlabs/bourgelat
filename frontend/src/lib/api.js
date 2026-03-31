import axios from 'axios'
import { useAuthStore } from '@/store/authStore'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  timeout: 15000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

let refrescando = false
let cola = []

const procesarCola = (error, value = true) => {
  cola.forEach(({ resolve, reject }) => {
    if (error) reject(error)
    else resolve(value)
  })
  cola = []
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const solicitudOriginal = error.config

    if (
      error.response?.status === 401 &&
      error.response?.data?.code === 'TOKEN_EXPIRED' &&
      !solicitudOriginal?._retry
    ) {
      if (refrescando) {
        return new Promise((resolve, reject) => {
          cola.push({ resolve, reject })
        })
          .then(() => api(solicitudOriginal))
          .catch((err) => Promise.reject(err))
      }

      solicitudOriginal._retry = true
      refrescando = true

      try {
        await axios.post(
          `${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/auth/refresh`,
          {},
          { withCredentials: true }
        )

        procesarCola(null)
        return api(solicitudOriginal)
      } catch (refreshError) {
        procesarCola(refreshError)
        useAuthStore.getState().clearAuth()
        window.location.replace('/login')
        return Promise.reject(refreshError)
      } finally {
        refrescando = false
      }
    }

    if (error.response?.status === 401) {
      useAuthStore.getState().clearAuth()
      window.location.replace('/login')
    }

    return Promise.reject(error)
  }
)

export default api
