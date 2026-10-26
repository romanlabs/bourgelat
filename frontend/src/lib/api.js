import axios from 'axios'
import { useAuthStore } from '@/store/authStore'
import { evaluarCambioSesion, recargarPorCambio } from '@/lib/sesionPestanas'
import { debeIntentarRefresh, esRutaDeCredenciales } from '@/lib/authFlow'

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
    const omitirRedireccionAuth = solicitudOriginal?.skipAuthRedirect

    if (debeIntentarRefresh(error)) {
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
        // Con timeout propio: estas llamadas no pasan por la instancia `api`, y
        // sin él un refresh colgado dejaba `refrescando` en true y toda petición
        // posterior esperando en la cola hasta recargar la página.
        await axios.post(
          `${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/auth/refresh`,
          {},
          { withCredentials: true, timeout: 15000 }
        )

        // Respaldo: si otra pestaña inició sesión con otra cuenta, la cookie ya es de
        // esa cuenta. Se recarga en vez de seguir actuando como ella con la UI vieja.
        // Un fallo de /auth/me aquí no debe tumbar el flujo normal de refresh.
        const sesionActual = await axios
          .get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/auth/me`, {
            withCredentials: true,
            timeout: 15000,
          })
          .then((r) => r.data)
          .catch(() => null)
        if (sesionActual && evaluarCambioSesion(useAuthStore.getState(), sesionActual) === 'cambio') {
          recargarPorCambio('cambio')
          procesarCola(new Error('Sesión cambiada'))
          return new Promise(() => {})
        }

        procesarCola(null)
        return api(solicitudOriginal)
      } catch (refreshError) {
        procesarCola(refreshError)
        useAuthStore.getState().clearAuth()
        if (!omitirRedireccionAuth) {
          window.location.replace('/login')
        }
        return Promise.reject(refreshError)
      } finally {
        refrescando = false
      }
    }

    if (error.response?.status === 401 && !esRutaDeCredenciales(error)) {
      useAuthStore.getState().clearAuth()
      if (!omitirRedireccionAuth) {
        window.location.replace('/login')
      }
    }

    // La suscripción venció mientras la sesión estaba abierta: se sincroniza el
    // store para que el banner aparezca sin esperar a recargar. El componente
    // sigue recibiendo su propio error.
    if (
      error.response?.status === 403 &&
      error.response?.data?.code === 'SUBSCRIPTION_READ_ONLY'
    ) {
      const { setSuscripcion, suscripcion } = useAuthStore.getState()

      if (suscripcion && suscripcion.estado !== 'solo_lectura') {
        setSuscripcion({ ...suscripcion, estado: 'solo_lectura' })
      }
    }

    return Promise.reject(error)
  }
)

export default api
