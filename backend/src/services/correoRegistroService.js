// Validación del correo en el registro: rechaza dominios desechables y dominios
// sin registro MX (no pueden recibir el código de verificación). No se aplica al
// registro con Google/OAuth: ese correo ya lo garantiza el proveedor.
const dns = require('dns').promises
const logger = require('../utils/logger')

const TIEMPO_DNS_MS = 3000

const MENSAJE_SIN_MX = 'Ese correo no puede recibir mensajes. Revisa que esté bien escrito.'
const MENSAJE_TEMPORAL = 'No aceptamos correos temporales. Usa un correo permanente.'

// Lista corta curada; cubre el grueso de los servicios de correo desechable.
const DOMINIOS_DESECHABLES = new Set([
  'mailinator.com',
  'guerrillamail.com',
  'guerrillamail.net',
  'guerrillamail.org',
  'guerrillamailblock.com',
  'sharklasers.com',
  '10minutemail.com',
  '10minutemail.net',
  'tempmail.com',
  'tempmail.net',
  'temp-mail.org',
  'temp-mail.io',
  'tempail.com',
  'yopmail.com',
  'yopmail.net',
  'trashmail.com',
  'trashmail.net',
  'trashmail.de',
  'getnada.com',
  'dispostable.com',
  'maildrop.cc',
  'throwawaymail.com',
  'mohmal.com',
  'emailondeck.com',
  'fakeinbox.com',
  'mintemail.com',
  'mytemp.email',
])

// Errores de DNS que significan «el dominio no existe / no tiene correo».
const CODIGOS_SIN_MX = new Set(['ENOTFOUND', 'ENODATA'])

/** Dominio (minúsculas, sin punto final) de un correo, o '' si no tiene forma válida. */
const dominioDeCorreo = (email) => {
  const texto = String(email || '').trim().toLowerCase()
  const arroba = texto.lastIndexOf('@')
  if (arroba < 1 || arroba === texto.length - 1) return ''
  return texto.slice(arroba + 1).replace(/\.$/, '')
}

/** true si el dominio (o un subdominio suyo) está en la lista de desechables. */
const esDominioDesechable = (dominio) => {
  const partes = String(dominio || '').toLowerCase().split('.').filter(Boolean)
  for (let i = 0; i < partes.length - 1; i += 1) {
    if (DOMINIOS_DESECHABLES.has(partes.slice(i).join('.'))) return true
  }
  return false
}

const conLimite = (promesa, ms) => {
  let temporizador
  const limite = new Promise((_, reject) => {
    temporizador = setTimeout(() => {
      const error = new Error('Tiempo de espera DNS agotado')
      error.code = 'ETIMEOUT'
      reject(error)
    }, ms)
  })
  return Promise.race([promesa, limite]).finally(() => clearTimeout(temporizador))
}

/**
 * @param {string} email
 * @param {{ resolverMx?: (dominio: string) => Promise<Array>, tiempoMs?: number }} [opciones]
 * @returns {Promise<{ ok: boolean, motivo?: 'formato'|'desechable'|'sin_mx', mensaje?: string, dnsFallo?: boolean }>}
 */
const validarCorreoRegistro = async (
  email,
  { resolverMx = (dominio) => dns.resolveMx(dominio), tiempoMs = TIEMPO_DNS_MS } = {}
) => {
  const dominio = dominioDeCorreo(email)
  if (!dominio) return { ok: false, motivo: 'formato', mensaje: MENSAJE_SIN_MX }

  if (esDominioDesechable(dominio)) {
    return { ok: false, motivo: 'desechable', mensaje: MENSAJE_TEMPORAL }
  }

  try {
    const registros = await conLimite(Promise.resolve(resolverMx(dominio)), tiempoMs)
    if (!Array.isArray(registros) || registros.length === 0) {
      return { ok: false, motivo: 'sin_mx', mensaje: MENSAJE_SIN_MX }
    }
    return { ok: true }
  } catch (error) {
    if (CODIGOS_SIN_MX.has(error?.code)) {
      return { ok: false, motivo: 'sin_mx', mensaje: MENSAJE_SIN_MX }
    }
    // Fallo de nuestro DNS (timeout, red, SERVFAIL): no bloquear al usuario.
    logger.warn({
      contexto: 'registro',
      mensaje: `No se pudo comprobar el MX de ${dominio}; se deja pasar`,
      codigo: error?.code || null,
    })
    return { ok: true, dnsFallo: true }
  }
}

module.exports = {
  validarCorreoRegistro,
  dominioDeCorreo,
  esDominioDesechable,
  DOMINIOS_DESECHABLES,
  MENSAJE_SIN_MX,
  MENSAJE_TEMPORAL,
}
