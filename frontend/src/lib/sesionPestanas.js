// Detecta que otra pestaña cambió de usuario o de clínica. Las cookies de sesión
// se comparten entre pestañas, pero el store de esta pestaña no: sin esto la UI
// de la clínica A seguiría abierta mientras las peticiones ya actúan como B.
import { useAuthStore } from '@/store/authStore'

export const CLAVE_STORE = 'bourgelat-auth'
const CLAVE_AVISO = 'bourgelat-aviso-sesion'

const identidad = (sesion) =>
  sesion?.usuario?.id ? `${sesion.usuario.id}|${sesion.clinica?.id ?? sesion.usuario.clinicaId ?? ''}` : null

/**
 * 'sin_cambio' | 'cambio' (otro usuario/clínica) | 'cierre' (la sesión se cerró).
 * Solo cuenta si esta pestaña tenía sesión: una pestaña pública no se toca.
 */
export function evaluarCambioSesion(actual, nueva) {
  const a = identidad(actual)
  if (!a) return 'sin_cambio'
  const n = identidad(nueva)
  if (!n) return 'cierre'
  return n === a ? 'sin_cambio' : 'cambio'
}

export function recargarPorCambio(resultado) {
  try {
    sessionStorage.setItem(
      CLAVE_AVISO,
      resultado === 'cierre'
        ? 'Tu sesión se cerró en otra pestaña.'
        : 'Se inició sesión con otra cuenta en otra pestaña. Cargamos la cuenta activa.'
    )
  } catch { /* sin sessionStorage: se recarga sin aviso */ }
  window.location.replace(resultado === 'cierre' ? '/login' : '/dashboard')
}

export function leerAvisoSesion() {
  try {
    const aviso = sessionStorage.getItem(CLAVE_AVISO)
    if (aviso) sessionStorage.removeItem(CLAVE_AVISO)
    return aviso
  } catch {
    return null
  }
}

// Escucha el `storage` del store persistido: solo se dispara en las OTRAS pestañas.
export function iniciarVigilanciaSesion() {
  const alCambiar = (e) => {
    if (e.key !== CLAVE_STORE) return
    let nueva = null
    try {
      nueva = e.newValue ? JSON.parse(e.newValue).state : null
    } catch { return }
    const resultado = evaluarCambioSesion(useAuthStore.getState(), nueva)
    if (resultado !== 'sin_cambio') recargarPorCambio(resultado)
  }
  window.addEventListener('storage', alCambiar)
  return () => window.removeEventListener('storage', alCambiar)
}
