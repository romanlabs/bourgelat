const logger = require('../utils/logger')

const URL_VERIFICACION = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'
const TIMEOUT_MS = 5000

let avisoSinClave = false

// Devuelve { ok, motivo }. Solo `ok: false` bloquea la petición: sin clave
// configurada o con Cloudflare caído se deja pasar (y se registra).
const verificarTurnstile = async ({ token, ip, fetchFn = globalThis.fetch, timeoutMs = TIMEOUT_MS } = {}) => {
  const secret = process.env.TURNSTILE_SECRET_KEY
  if (!secret) {
    if (!avisoSinClave) {
      avisoSinClave = true
      logger.warn({
        contexto: 'turnstile',
        mensaje: 'TURNSTILE_SECRET_KEY no configurada: se omite la verificacion anti-bots.',
      })
    }
    return { ok: true, motivo: 'sin_clave' }
  }

  if (!token || typeof token !== 'string') return { ok: false, motivo: 'sin_token' }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const cuerpo = new URLSearchParams({ secret, response: token })
    if (ip) cuerpo.set('remoteip', ip)
    const respuesta = await fetchFn(URL_VERIFICACION, {
      method: 'POST',
      body: cuerpo,
      signal: controller.signal,
    })
    const datos = await respuesta.json()
    return datos?.success === true ? { ok: true } : { ok: false, motivo: 'rechazado' }
  } catch (error) {
    logger.error({
      contexto: 'turnstile',
      mensaje: `No se pudo verificar Turnstile (se deja pasar): ${error.message}`,
    })
    return { ok: true, motivo: 'error_red' }
  } finally {
    clearTimeout(timer)
  }
}

const _reiniciarAvisoParaPruebas = () => {
  avisoSinClave = false
}

module.exports = { verificarTurnstile, TIMEOUT_MS, _reiniciarAvisoParaPruebas }
