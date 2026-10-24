// Tests de las reglas de invitación (sin BD) y de la plantilla del correo.
const assert = require('assert')

process.env.FRONTEND_URL = 'https://app.bourgelat.co/'

const {
  VIGENCIA_HORAS,
  MAX_REENVIOS_POR_USUARIO,
  MAX_POR_CLINICA,
  MAX_GLOBAL,
  estaPendiente,
  calcularExpiracion,
  inicioVentanaTope,
  evaluarTopes,
  urlInvitacion,
} = require('./invitacionService')
const { armarEmailInvitacion } = require('./emailService')
const { generarTokenEnlace, hashToken } = require('../utils/enlaceSeguro')

// Pendiente: local, sin contraseña y sin correo probado
assert.strictEqual(estaPendiente({ proveedorAuth: 'local', password: null, emailVerificado: false }), true)
assert.strictEqual(estaPendiente({ proveedorAuth: 'local', password: 'hash', emailVerificado: false }), false)
// Google/Microsoft no tienen contraseña, pero no son invitaciones
assert.strictEqual(estaPendiente({ proveedorAuth: 'google', password: null, emailVerificado: true }), false)
assert.strictEqual(estaPendiente({ proveedorAuth: 'microsoft', password: null, emailVerificado: false }), false)
// Cuenta local cuya clave anuló el login social: correo probado, no es invitación
assert.strictEqual(estaPendiente({ proveedorAuth: 'local', password: null, emailVerificado: true }), false)
assert.strictEqual(estaPendiente(null), false)

// Vigencia
const ahora = Date.UTC(2026, 9, 23, 12, 0, 0)
assert.strictEqual(calcularExpiracion(ahora).getTime() - ahora, VIGENCIA_HORAS * 60 * 60 * 1000)
assert.strictEqual(ahora - inicioVentanaTope(ahora).getTime(), 24 * 60 * 60 * 1000)

// Topes
assert.deepStrictEqual(evaluarTopes({ porClinica: 0, global: 0 }), { permitido: true })
assert.strictEqual(evaluarTopes({ porUsuario: MAX_REENVIOS_POR_USUARIO - 1, porClinica: 0, global: 0 }).permitido, true)
assert.strictEqual(evaluarTopes({ porUsuario: MAX_REENVIOS_POR_USUARIO, porClinica: 0, global: 0 }).permitido, false)
assert.strictEqual(evaluarTopes({ porClinica: MAX_POR_CLINICA, global: 0 }).permitido, false)
assert.strictEqual(evaluarTopes({ porClinica: 0, global: MAX_GLOBAL }).permitido, false)
// Invitación nueva: sin usuario que contar
assert.strictEqual(evaluarTopes({ porUsuario: null, porClinica: 1, global: 1 }).permitido, true)

// Token: 256 bits en base64url, distinto en cada llamada; solo se guarda la huella
const token = generarTokenEnlace()
assert.match(token, /^[A-Za-z0-9_-]{43}$/)
assert.notStrictEqual(token, generarTokenEnlace())
assert.match(hashToken(token), /^[0-9a-f]{64}$/)
assert.notStrictEqual(hashToken(token), token)

// El token va en el fragment (#), que el navegador no envía al servidor
assert.strictEqual(urlInvitacion('abc'), 'https://app.bourgelat.co/aceptar-invitacion#token=abc')

// Correo: datos del cliente escapados, recortados y fuera del asunto
const correo = armarEmailInvitacion({
  nombre: '<b>Ana</b>',
  nombreClinica: '<a href="https://evil.example">Gana un premio</a>',
  nombreAdmin: 'Admin "Malo"',
  urlAceptar: 'https://app.bourgelat.co/aceptar-invitacion#token=abc',
})
assert.ok(!correo.html.includes('<b>Ana</b>'))
assert.ok(correo.html.includes('&lt;b&gt;Ana&lt;/b&gt;'))
assert.ok(!correo.html.includes('href="https://evil.example"'))
assert.ok(!correo.asunto.includes('Gana'))
assert.ok(correo.html.includes('#token=abc&amp;rechazar=1'))
assert.ok(correo.texto.includes('#token=abc&rechazar=1'))

const largo = armarEmailInvitacion({
  nombre: 'Ana',
  nombreClinica: 'x'.repeat(500),
  nombreAdmin: '',
  urlAceptar: 'https://app.bourgelat.co/aceptar-invitacion#token=abc',
})
assert.ok(!largo.html.includes('x'.repeat(81)))

console.log('invitacionService.test.js: OK')
