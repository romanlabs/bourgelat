// Códigos de 401 que representan una sesión terminada de forma definitiva:
// no tiene sentido intentar refrescar porque el problema no es el access token.
const CODES_SIN_REFRESH = new Set(['USER_INACTIVE', 'CLINIC_INACTIVE'])

// Rutas donde un 401 NO debe disparar un refresh:
//  - /auth/refresh: evita un bucle de refresco sobre sí mismo.
//  - /auth/login y /auth/registro: un 401 ahí es credencial inválida, debe
//    propagarse al formulario, no provocar logout+redirect.
const RUTAS_SIN_REFRESH = /\/auth\/(refresh|login|registro)\b/

/**
 * Decide si un error 401 debe intentar un refresh silencioso del token.
 *
 * Antes el interceptor solo refrescaba cuando `code === 'TOKEN_EXPIRED'`. Pero
 * cuando la cookie de access expira (15 min) el navegador la borra y la siguiente
 * petición llega SIN token: el backend responde 401 'token requerido' sin code,
 * y la sesión se cerraba aunque el refresh token (7 días) siguiera vivo.
 *
 * Ahora cualquier 401 de una petición autenticada intenta refrescar primero; el
 * logout solo ocurre si el refresh falla (refresh token expirado/revocado), que
 * es la verdadera señal de inactividad o sesión inválida.
 */
export function debeIntentarRefresh(error) {
  if (error?.response?.status !== 401) return false

  const config = error.config || {}
  if (config._retry) return false

  if (RUTAS_SIN_REFRESH.test(config.url || '')) return false

  const code = error.response?.data?.code
  if (code && CODES_SIN_REFRESH.has(code)) return false

  return true
}
