// Tests del guard de escritura. Se ejecutan con
// `node src/middlewares/suscripcionMiddleware.test.js` (integrados en `npm test`).
// No requieren base de datos: se le pasa la suscripcion ya cargada en req.

const assert = require('assert')
const { requerirEscritura } = require('./suscripcionMiddleware')

const construirRes = () => {
  const res = { statusCode: null, body: null }
  res.status = (codigo) => {
    res.statusCode = codigo
    return res
  }
  res.json = (payload) => {
    res.body = payload
    return res
  }
  return res
}

const main = async () => {
  // ── Solo lectura: se bloquea con codigo identificable ───────────────────
  const resBloqueado = construirRes()
  let siguienteLlamado = false

  await requerirEscritura(
    { suscripcion: { estado: 'solo_lectura', plan: 'activo' }, suscripcionInfo: { nombrePlan: 'Bourgelat' } },
    resBloqueado,
    () => {
      siguienteLlamado = true
    }
  )

  assert.strictEqual(siguienteLlamado, false, 'no debe continuar en solo lectura')
  assert.strictEqual(resBloqueado.statusCode, 403)
  assert.strictEqual(resBloqueado.body.code, 'SUBSCRIPTION_READ_ONLY')
  // El mensaje debe decirle a la clinica que sus datos siguen ahi: es la
  // diferencia entre "vencio" y "me secuestraron la historia clinica".
  assert.ok(
    /exportar/i.test(resBloqueado.body.message),
    'el mensaje debe mencionar que puede exportar'
  )

  // ── Estados que si pueden escribir ──────────────────────────────────────
  for (const estado of ['activa', 'prueba']) {
    const res = construirRes()
    let continuo = false

    await requerirEscritura(
      { suscripcion: { estado, plan: 'activo' }, suscripcionInfo: { nombrePlan: 'Bourgelat' } },
      res,
      () => {
        continuo = true
      }
    )

    assert.strictEqual(continuo, true, `estado '${estado}' debe poder escribir`)
    assert.strictEqual(res.statusCode, null, `estado '${estado}' no debe responder`)
  }

  // ── Sin clinica en la sesion ────────────────────────────────────────────
  const resSinClinica = construirRes()
  await requerirEscritura({ auth: {} }, resSinClinica, () => {
    throw new Error('no debia continuar sin clinica')
  })
  assert.strictEqual(resSinClinica.statusCode, 403)

  console.log('suscripcionMiddleware.test.js: todos los tests pasaron ✔')
}

main().catch((error) => {
  console.error('suscripcionMiddleware.test.js FALLÓ:', error.message)
  process.exit(1)
})
