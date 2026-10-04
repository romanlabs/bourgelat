// Tests de "responder un ticket desde el correo". Se ejecutan con
// `node src/services/soporteCorreoReglas.test.js` (integrados en `npm test`).
// No requieren red ni base de datos.

const assert = require('assert')
const r = require('./soporteCorreoReglas')

const SECRETO = 'secreto-de-prueba-con-mas-de-32-caracteres'
const BUZON = 'respuestas@bourgelat.co'

// ── Direccion de respuesta y token ────────────────────────────────────────
const direccion = r.direccionRespuesta(BUZON, SECRETO, 42)
assert.match(direccion, /^respuestas\+t42\.[0-9a-f]{16}@bourgelat\.co$/)
assert.strictEqual(r.ticketDesdeDestinatario(direccion, BUZON, SECRETO), 42)
assert.strictEqual(r.ticketDesdeDestinatario(direccion.toUpperCase(), BUZON, SECRETO), 42)

// El token de un ticket no sirve para otro.
const token42 = r.tokenTicket(SECRETO, 42)
assert.strictEqual(r.ticketDesdeDestinatario(`respuestas+t43.${token42}@bourgelat.co`, BUZON, SECRETO), null)
// Ni con otro secreto, otro buzon u otro dominio.
assert.strictEqual(r.ticketDesdeDestinatario(direccion, BUZON, 'otro-secreto'), null)
assert.strictEqual(r.ticketDesdeDestinatario(direccion.replace('respuestas', 'soporte'), BUZON, SECRETO), null)
assert.strictEqual(r.ticketDesdeDestinatario(direccion.replace('bourgelat.co', 'evil.co'), BUZON, SECRETO), null)
assert.strictEqual(r.ticketDesdeDestinatario('respuestas@bourgelat.co', BUZON, SECRETO), null)
assert.strictEqual(r.ticketDesdeDestinatario(`respuestas+t42.${token42.slice(0, 8)}@bourgelat.co`, BUZON, SECRETO), null)

// ── Firma del Worker ──────────────────────────────────────────────────────
const crudo = Buffer.from('From: a@b.c\r\n\r\nhola')
const ahora = 1_800_000_000_000
const envio = { marcaTiempo: String(ahora), destinatario: direccion, crudo }
const firma = r.firmarEnvio(SECRETO, envio)

assert.strictEqual(r.verificarFirmaEnvio(SECRETO, { ...envio, firma }, ahora), true)
assert.strictEqual(r.verificarFirmaEnvio(SECRETO, { ...envio, firma }, ahora + r.VENTANA_FIRMA_MS - 1), true)
// Vencida, alterada o sin firma: se rechaza.
assert.strictEqual(r.verificarFirmaEnvio(SECRETO, { ...envio, firma }, ahora + r.VENTANA_FIRMA_MS + 1), false)
assert.strictEqual(r.verificarFirmaEnvio(SECRETO, { ...envio, firma, crudo: Buffer.from('From: a@b.c\r\n\r\nchao') }, ahora), false)
assert.strictEqual(r.verificarFirmaEnvio(SECRETO, { ...envio, firma, destinatario: 'otro@bourgelat.co' }, ahora), false)
assert.strictEqual(r.verificarFirmaEnvio('otro-secreto', { ...envio, firma }, ahora), false)
assert.strictEqual(r.verificarFirmaEnvio(SECRETO, { ...envio, firma: '' }, ahora), false)
assert.strictEqual(r.verificarFirmaEnvio(SECRETO, { ...envio, firma, marcaTiempo: 'x' }, ahora), false)

// ── Respondedores ─────────────────────────────────────────────────────────
const respondedores = r.parsearRespondedores(' Roman@Gmail.com=Roman , mal, sinfirma@x.co=, s@y.co=Sergio ')
assert.deepStrictEqual([...respondedores], [['roman@gmail.com', 'Roman'], ['s@y.co', 'Sergio']])
assert.strictEqual(r.parsearRespondedores('').size, 0)

// ── Configuracion desde env: apagada si falta algo ────────────────────────
const ENV_OK = {
  SOPORTE_CORREO_RESPUESTAS: 'Respuestas@Bourgelat.co',
  SOPORTE_CORREO_SECRETO: SECRETO,
  SOPORTE_RESPONDEDORES: 'roman@gmail.com=Roman',
}
assert.strictEqual(r.configuracionCorreo(ENV_OK).activo, true)
assert.strictEqual(r.configuracionCorreo(ENV_OK).buzon, 'respuestas@bourgelat.co')
assert.strictEqual(r.configuracionCorreo({ ...ENV_OK, SOPORTE_CORREO_SECRETO: 'corto' }).activo, false)
assert.strictEqual(r.configuracionCorreo({ ...ENV_OK, SOPORTE_RESPONDEDORES: '' }).activo, false)
assert.strictEqual(r.configuracionCorreo({ ...ENV_OK, SOPORTE_CORREO_RESPUESTAS: 'a+b@x.co' }).activo, false)
assert.strictEqual(r.configuracionCorreo({}).activo, false)
assert.strictEqual(r.direccionRespuestaTicket(ENV_OK, 42), direccion)
assert.strictEqual(r.direccionRespuestaTicket({}, 42), null)

// ── DKIM alineado con el remitente ────────────────────────────────────────
const pasa = (dominio) => ({ status: { result: 'pass' }, signingDomain: dominio })
assert.strictEqual(r.dkimAlineado([pasa('gmail.com')], 'roman@gmail.com'), true)
assert.strictEqual(r.dkimAlineado([pasa('evil.com'), pasa('GMAIL.com')], 'roman@gmail.com'), true)
assert.strictEqual(r.dkimAlineado([pasa('evil.com')], 'roman@gmail.com'), false)
assert.strictEqual(r.dkimAlineado([{ status: { result: 'fail' }, signingDomain: 'gmail.com' }], 'roman@gmail.com'), false)
assert.strictEqual(r.dkimAlineado([], 'roman@gmail.com'), false)
assert.strictEqual(r.dkimAlineado([pasa('gmail.com')], ''), false)

// ── Limpieza del texto citado (formato de Gmail) ──────────────────────────
assert.strictEqual(
  r.limpiarRespuesta(
    'Hola, ya quedó.\r\nRevisa de nuevo.\r\n\r\nEl jue, 2 oct 2026 a las 10:00, Bourgelat <no-reply@bourgelat.co>\r\nescribió:\r\n\r\n> Nuevo ticket\r\n> texto'
  ),
  'Hola, ya quedó.\nRevisa de nuevo.'
)
assert.strictEqual(
  r.limpiarRespuesta('Listo\n\nOn Thu, Oct 2, 2026 at 10:00 AM Bourgelat <x@y.co> wrote:\n> algo'),
  'Listo'
)
assert.strictEqual(r.limpiarRespuesta('Hecho\n\n--\nRoman Bolaños\nBourgelat'), 'Hecho')
assert.strictEqual(r.limpiarRespuesta('Solo texto\nsin hilo'), 'Solo texto\nsin hilo')
// "El" al inicio de una frase normal no corta el mensaje.
assert.strictEqual(r.limpiarRespuesta('El cierre de caja\nya funciona.'), 'El cierre de caja\nya funciona.')

// ── Palabras clave ────────────────────────────────────────────────────────
assert.deepStrictEqual(r.interpretarRespuesta('Hola, ya quedó'), { estado: null, mensaje: 'Hola, ya quedó' })
assert.deepStrictEqual(r.interpretarRespuesta('#resuelto\nYa quedó'), { estado: 'resuelto', mensaje: 'Ya quedó' })
assert.deepStrictEqual(r.interpretarRespuesta('#En-Progreso'), { estado: 'en_progreso', mensaje: '' })
assert.deepStrictEqual(r.interpretarRespuesta('#en_progreso\n\nLo reviso hoy'), { estado: 'en_progreso', mensaje: 'Lo reviso hoy' })
assert.deepStrictEqual(r.interpretarRespuesta('  #cerrado  '), { estado: 'cerrado', mensaje: '' })
assert.match(r.interpretarRespuesta('#reslto\nYa quedó').error, /desconocida: #reslto/)
// Un numeral dentro del texto no es palabra clave.
assert.deepStrictEqual(r.interpretarRespuesta('Ticket #42 resuelto'), { estado: null, mensaje: 'Ticket #42 resuelto' })

console.log('soporteCorreoReglas: OK')
