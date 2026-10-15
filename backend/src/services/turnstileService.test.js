// Tests del servicio Turnstile con fetch simulado.
const assert = require('assert')
const {
  verificarTurnstile,
  hostnamesPermitidos,
  hostnameValido,
  _reiniciarAvisoParaPruebas,
} = require('./turnstileService')

const respuesta = (cuerpo) => async () => ({ json: async () => cuerpo })

;(async () => {
  // Sin clave: pasa
  delete process.env.TURNSTILE_SECRET_KEY
  _reiniciarAvisoParaPruebas()
  let r = await verificarTurnstile({ token: 'x', fetchFn: async () => { throw new Error('no debe llamarse') } })
  assert.deepStrictEqual(r, { ok: true, motivo: 'sin_clave' })

  process.env.TURNSTILE_SECRET_KEY = 'clave-de-prueba'

  // Éxito
  let llamada
  r = await verificarTurnstile({
    token: 'tok',
    ip: '1.2.3.4',
    fetchFn: async (url, opts) => {
      llamada = { url, opts }
      return { json: async () => ({ success: true }) }
    },
  })
  assert.strictEqual(r.ok, true)
  assert.ok(llamada.url.includes('siteverify'))
  assert.strictEqual(llamada.opts.body.get('response'), 'tok')
  assert.strictEqual(llamada.opts.body.get('secret'), 'clave-de-prueba')
  assert.strictEqual(llamada.opts.body.get('remoteip'), '1.2.3.4')

  // Rechazo
  r = await verificarTurnstile({ token: 'tok', fetchFn: respuesta({ success: false }) })
  assert.strictEqual(r.ok, false)

  // Sin token con clave configurada
  r = await verificarTurnstile({ token: '', fetchFn: respuesta({ success: true }) })
  assert.strictEqual(r.ok, false)

  // Error de red: pasa
  r = await verificarTurnstile({ token: 'tok', fetchFn: async () => { throw new Error('red caida') } })
  assert.deepStrictEqual(r, { ok: true, motivo: 'error_red' })

  // Timeout: el AbortController corta y pasa
  r = await verificarTurnstile({
    token: 'tok',
    timeoutMs: 20,
    fetchFn: (url, opts) =>
      new Promise((_, reject) => {
        opts.signal.addEventListener('abort', () => reject(new Error('abortado')))
      }),
  })
  assert.deepStrictEqual(r, { ok: true, motivo: 'error_red' })

  // Hostname: sin TURNSTILE_HOSTNAMES no se valida
  delete process.env.TURNSTILE_HOSTNAMES
  r = await verificarTurnstile({ token: 'tok', fetchFn: respuesta({ success: true, hostname: 'example.com' }) })
  assert.deepStrictEqual(r, { ok: true })

  // Con la lista: exige que el hostname esté en ella
  process.env.TURNSTILE_HOSTNAMES = ' bourgelat.co , App.Bourgelat.co '
  assert.deepStrictEqual(hostnamesPermitidos(), ['bourgelat.co', 'app.bourgelat.co'])
  r = await verificarTurnstile({ token: 'tok', fetchFn: respuesta({ success: true, hostname: 'app.bourgelat.co' }) })
  assert.deepStrictEqual(r, { ok: true })
  r = await verificarTurnstile({ token: 'tok', fetchFn: respuesta({ success: true, hostname: 'evil.example' }) })
  assert.deepStrictEqual(r, { ok: false, motivo: 'hostname' })
  r = await verificarTurnstile({ token: 'tok', fetchFn: respuesta({ success: true }) })
  assert.deepStrictEqual(r, { ok: false, motivo: 'hostname' })
  assert.strictEqual(hostnameValido('x.com', []), true)
  assert.strictEqual(hostnameValido(undefined, ['bourgelat.co']), false)
  delete process.env.TURNSTILE_HOSTNAMES

  delete process.env.TURNSTILE_SECRET_KEY
  console.log('turnstileService.test.js OK')
})().catch((e) => {
  console.error(e)
  process.exit(1)
})
