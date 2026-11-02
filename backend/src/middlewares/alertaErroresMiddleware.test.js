// Se ejecuta con `node src/middlewares/alertaErroresMiddleware.test.js` (en `npm test`).
const assert = require('assert')
const express = require('express')
const servicio = require('../services/alertaErroresService')

const registrados = []
servicio.registrarErrorInterno = (datos) => registrados.push(datos)
const { capturarErroresInternos } = require('./alertaErroresMiddleware')
const { sanitizarRespuestasErrorInterno } = require('./sanitizeErrorResponseMiddleware')

const main = async () => {
  const app = express()
  app.use(sanitizarRespuestasErrorInterno)
  app.use(capturarErroresInternos)
  app.use((req, res, next) => {
    req.usuario = { clinicaId: 'clinica-1' }
    next()
  })
  app.get('/citas/:id', (req, res) => res.status(500).json({ message: 'Error en el servidor', error: 'columna no existe' }))
  app.get('/bien', (req, res) => res.json({ ok: true }))
  app.get('/mal-dato', (req, res) => res.status(400).json({ message: 'Dato inválido' }))

  const servidor = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s))
  })
  const base = `http://127.0.0.1:${servidor.address().port}`

  try {
    const respuesta = await fetch(`${base}/citas/abc`)
    assert.strictEqual(respuesta.status, 500)

    assert.strictEqual(registrados.length, 1)
    assert.strictEqual(registrados[0].mensaje, 'columna no existe')
    assert.strictEqual(registrados[0].ruta, '/citas/:id')
    assert.strictEqual(registrados[0].metodo, 'GET')
    assert.strictEqual(registrados[0].clinicaId, 'clinica-1')

    await fetch(`${base}/bien`)
    await fetch(`${base}/mal-dato`)
    assert.strictEqual(registrados.length, 1, 'solo los 5xx generan alerta')
  } finally {
    servidor.close()
  }
  console.log('alertaErroresMiddleware.test.js: OK')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
