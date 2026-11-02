import api from '@/lib/api'
import { useAuthStore } from '@/store/authStore'

const yaReportados = new Set()

// Cargar un módulo viejo tras una publicación se arregla solo al recargar.
const esCargaDeModulo = (mensaje) =>
  /dynamically imported module|importing a module script failed|chunkloaderror/i.test(mensaje)

// Avisa al equipo de una pantalla que se rompió. Nunca debe causar otro error, ni
// sacar a nadie al login, ni repetirse en cada render.
export function reportarErrorDePantalla(error) {
  try {
    const mensaje = String(error?.message || error?.statusText || error || '').slice(0, 500)
    if (!mensaje || error?.status === 404 || esCargaDeModulo(mensaje)) return
    if (!useAuthStore.getState().isAuthenticated) return

    const ruta = window.location.pathname.slice(0, 200)
    const clave = `${ruta}|${mensaje}`
    if (yaReportados.has(clave)) return
    yaReportados.add(clave)

    api.post('/errores-pantalla', { mensaje, ruta }, { skipAuthRedirect: true }).catch(() => {})
  } catch {
    // Reportar es lo de menos si ya se rompió la pantalla.
  }
}
