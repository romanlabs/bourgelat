// Tests de la cookie de verificación pendiente (sin BD).
const assert = require('assert')
const jwt = require('jsonwebtoken')

process.env.JWT_SECRET = 'secreto-de-prueba-cookie-pendiente'

const {
  NOMBRE_COOKIE,
  firmarTokenPendiente,
  verificarTokenPendiente,
  setCookiePendiente,
  clearCookiePendiente,
  obtenerUsuarioPendienteRequest,
} = require('./verificacionPendienteService')

const usuarioId = '11111111-2222-3333-4444-555555555555'

// Firmar y verificar
const token = firmarTokenPendiente(usuarioId)
assert.strictEqual(verificarTokenPendiente(token), usuarioId)
const payload = jwt.decode(token)
assert.strictEqual(payload.sub, usuarioId)
assert.strictEqual(payload.proposito, 'verificacion_email')
assert.strictEqual(payload.exp - payload.iat, 30 * 60)

// Vacío o basura
assert.strictEqual(verificarTokenPendiente(undefined), null)
assert.strictEqual(verificarTokenPendiente(''), null)
assert.strictEqual(verificarTokenPendiente('no-es-un-jwt'), null)

// Firmado con otro secreto
assert.strictEqual(verificarTokenPendiente(firmarTokenPendiente(usuarioId, { secreto: 'otro' })), null)

// Propósito incorrecto (p. ej. un access token o un token de onboarding OAuth)
const accessToken = jwt.sign({ id: usuarioId, clinicaId: 'c' }, process.env.JWT_SECRET)
assert.strictEqual(verificarTokenPendiente(accessToken), null)
const onboarding = jwt.sign({ sub: usuarioId, proposito: 'oauth_onboarding' }, process.env.JWT_SECRET)
assert.strictEqual(verificarTokenPendiente(onboarding), null)

// Algoritmo none rechazado
const sinFirma = jwt.sign({ sub: usuarioId, proposito: 'verificacion_email' }, null, { algorithm: 'none' })
assert.strictEqual(verificarTokenPendiente(sinFirma), null)

// Expirada
const vencido = firmarTokenPendiente(usuarioId, { expiresIn: -10 })
assert.strictEqual(verificarTokenPendiente(vencido), null)

// Lectura desde la petición
assert.strictEqual(
  obtenerUsuarioPendienteRequest({ headers: { cookie: `otra=1; ${NOMBRE_COOKIE}=${token}` } }),
  usuarioId
)
assert.strictEqual(obtenerUsuarioPendienteRequest({ headers: {} }), null)

// Cookie httpOnly de 30 min y limpieza con las mismas opciones (sin maxAge)
const llamadas = []
const res = {
  cookie: (...args) => llamadas.push(['cookie', ...args]),
  clearCookie: (...args) => llamadas.push(['clear', ...args]),
}
setCookiePendiente(res, usuarioId)
const [, nombre, valor, opciones] = llamadas[0]
assert.strictEqual(nombre, NOMBRE_COOKIE)
assert.strictEqual(verificarTokenPendiente(valor), usuarioId)
assert.strictEqual(opciones.httpOnly, true)
assert.strictEqual(opciones.path, '/')
assert.strictEqual(opciones.maxAge, 30 * 60 * 1000)
clearCookiePendiente(res)
assert.strictEqual(llamadas[1][1], NOMBRE_COOKIE)
assert.strictEqual(llamadas[1][2].maxAge, undefined)
assert.strictEqual(llamadas[1][2].httpOnly, true)

console.log('verificacionPendienteService.test.js OK')
