// Se ejecuta con `node src/services/alertaErroresService.test.js` (en `npm test`).
const assert = require('assert')
const { crearAlertas, limpiarTexto, TOPE_CORREOS_POR_DIA } = require('./alertaErroresService')
const { armarEmailAlertaErrores } = require('./emailService')

const MINUTO = 60 * 1000

const preparar = () => {
  const estado = { reloj: 1_000_000_000_000, envios: [], programado: [] }
  const alertas = crearAlertas({
    enviar: async (filas) => estado.envios.push(filas),
    ahora: () => estado.reloj,
    programar: (fn, espera) => {
      estado.programado.push(espera)
      estado.pendiente = fn
      return {}
    },
  })
  return { estado, alertas }
}

const main = async () => {
  // Agrupa los errores iguales en una sola fila de un solo correo.
  {
    const { estado, alertas } = preparar()
    alertas.registrar({ ruta: '/api/citas', metodo: 'GET', mensaje: 'fallo', clinicaId: 'c1' })
    alertas.registrar({ ruta: '/api/citas', metodo: 'GET', mensaje: 'fallo', clinicaId: 'c2' })
    alertas.registrar({ ruta: '/api/caja', metodo: 'POST', mensaje: 'otro' })
    assert.strictEqual(estado.programado.length, 1, 'un solo temporizador')
    await estado.pendiente()
    assert.strictEqual(estado.envios.length, 1)
    assert.strictEqual(estado.envios[0].length, 2)
    assert.strictEqual(estado.envios[0][0].veces, 2)
    assert.strictEqual(estado.envios[0][0].clinicas.size, 2)
  }

  // Tras un correo, el siguiente espera al menos 15 minutos.
  {
    const { estado, alertas } = preparar()
    alertas.registrar({ mensaje: 'a' })
    await estado.pendiente()
    alertas.registrar({ mensaje: 'b' })
    assert.strictEqual(estado.programado.at(-1), 15 * MINUTO)
  }

  // Respeta el tope diario y se reinicia al día siguiente.
  {
    const { estado, alertas } = preparar()
    for (let i = 0; i < TOPE_CORREOS_POR_DIA + 3; i += 1) {
      alertas.registrar({ mensaje: `e${i}` })
      await estado.pendiente()
    }
    assert.strictEqual(estado.envios.length, TOPE_CORREOS_POR_DIA)
    estado.reloj += 24 * 60 * MINUTO
    alertas.registrar({ mensaje: 'nuevo día' })
    await estado.pendiente()
    assert.strictEqual(estado.envios.length, TOPE_CORREOS_POR_DIA + 1)
  }

  // Un correo que falla no rompe nada.
  {
    const alertas = crearAlertas({
      enviar: async () => { throw new Error('smtp caído') },
      programar: () => ({}),
    })
    alertas.registrar({ mensaje: 'x' })
    await alertas.enviarPendientes()
  }

  // Muchos errores distintos no crecen sin límite.
  {
    const { estado, alertas } = preparar()
    for (let i = 0; i < 50; i += 1) alertas.registrar({ mensaje: `distinto ${i}` })
    await estado.pendiente()
    assert.strictEqual(estado.envios[0].length, 21)
    assert.strictEqual(estado.envios[0].at(-1).veces, 30)
  }

  // No salen datos personales ni identificadores en el correo.
  assert.strictEqual(
    limpiarTexto('falló ana@correo.com doc 1110449828 id 7ccee852-eb45-4a57-8d5b-9e3be556dc9d'),
    'falló [correo] doc [número] id :id'
  )

  // El correo se entiende y no permite inyectar HTML desde un mensaje de error.
  const correo = armarEmailAlertaErrores({
    filas: [
      { origen: 'servidor', metodo: 'GET', ruta: '/api/citas', mensaje: '<b>fallo</b>', veces: 2, clinicas: new Set(['a']) },
      { origen: 'pantalla', metodo: '', ruta: '/agenda', mensaje: 'x is not a function', veces: 1, clinicas: new Set() },
    ],
  })
  assert.strictEqual(correo.asunto, '[Bourgelat] 3 error(es) en producción')
  assert.ok(correo.texto.includes('GET /api/citas (2 veces, 1 clínica(s))\n<b>fallo</b>'))
  assert.ok(correo.texto.includes('Pantalla /agenda'))
  assert.ok(correo.html.includes('&lt;b&gt;fallo&lt;/b&gt;') && !correo.html.includes('<b>fallo</b>'))

  console.log('alertaErroresService.test.js: OK')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
