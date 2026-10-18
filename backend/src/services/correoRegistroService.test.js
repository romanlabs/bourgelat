// Tests del servicio de validación de correo del registro, con DNS simulado.
const assert = require('assert')
const {
  validarCorreoRegistro,
  dominioDeCorreo,
  esDominioDesechable,
  MENSAJE_SIN_MX,
  MENSAJE_TEMPORAL,
} = require('./correoRegistroService')

const conCodigo = (code) => Object.assign(new Error(code), { code })

;(async () => {
  assert.strictEqual(dominioDeCorreo('Ana@Clinica.CO'), 'clinica.co')
  assert.strictEqual(dominioDeCorreo('sin-arroba'), '')
  assert.strictEqual(dominioDeCorreo('a@'), '')

  assert.strictEqual(esDominioDesechable('mailinator.com'), true)
  assert.strictEqual(esDominioDesechable('sub.yopmail.com'), true)
  assert.strictEqual(esDominioDesechable('gmail.com'), false)
  assert.strictEqual(esDominioDesechable('notmailinator.com'), false)

  const noDebeLlamarse = async () => { throw new Error('no debe consultar DNS') }

  // Desechable: ni siquiera consulta DNS
  let r = await validarCorreoRegistro('x@Mailinator.com', { resolverMx: noDebeLlamarse })
  assert.deepStrictEqual(r, { ok: false, motivo: 'desechable', mensaje: MENSAJE_TEMPORAL })

  // Formato sin dominio
  r = await validarCorreoRegistro('x', { resolverMx: noDebeLlamarse })
  assert.strictEqual(r.ok, false)
  assert.strictEqual(r.mensaje, MENSAJE_SIN_MX)

  // Con MX
  let consultado
  r = await validarCorreoRegistro('a@clinica.co', {
    resolverMx: async (d) => { consultado = d; return [{ exchange: 'mx.clinica.co', priority: 10 }] },
  })
  assert.deepStrictEqual(r, { ok: true })
  assert.strictEqual(consultado, 'clinica.co')

  // Sin MX: lista vacía, ENOTFOUND, ENODATA
  r = await validarCorreoRegistro('a@clinica.co', { resolverMx: async () => [] })
  assert.strictEqual(r.motivo, 'sin_mx')
  for (const code of ['ENOTFOUND', 'ENODATA']) {
    r = await validarCorreoRegistro('a@nada.co', { resolverMx: async () => { throw conCodigo(code) } })
    assert.deepStrictEqual(r, { ok: false, motivo: 'sin_mx', mensaje: MENSAJE_SIN_MX })
  }

  // Fallo de red/SERVFAIL: deja pasar
  for (const code of ['ECONNREFUSED', 'ESERVFAIL', 'ETIMEOUT']) {
    r = await validarCorreoRegistro('a@clinica.co', { resolverMx: async () => { throw conCodigo(code) } })
    assert.deepStrictEqual(r, { ok: true, dnsFallo: true })
  }

  // DNS colgado: el límite de tiempo lo corta y deja pasar
  r = await validarCorreoRegistro('a@clinica.co', { resolverMx: () => new Promise(() => {}), tiempoMs: 20 })
  assert.deepStrictEqual(r, { ok: true, dnsFallo: true })

  console.log('correoRegistroService.test.js: todos los tests pasaron ✔')
})().catch((e) => { console.error(e); process.exit(1) })
