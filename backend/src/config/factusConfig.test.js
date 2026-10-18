// Tests de la resolución de credenciales de facturación electrónica. Se
// ejecutan con `node src/config/factusConfig.test.js` (integrado en `npm test`).
// No requieren base de datos: solo se arma la configuración en memoria.

const assert = require('assert')

Object.assign(process.env, {
  FACTUS_ACTIVA: 'true',
  FACTUS_AMBIENTE: 'sandbox',
  FACTUS_CLIENT_ID: 'id-servidor',
  FACTUS_CLIENT_SECRET: 'secreto-servidor',
  FACTUS_USERNAME: 'usuario@servidor.test',
  FACTUS_PASSWORD: 'clave-servidor',
  FACTUS_RANGO_NUMERACION_ID: '8',
})
delete process.env.FACTUS_CREDENCIALES_COMPARTIDAS

const { resolverConfiguracionFactus, permiteCredencialesEntorno } = require('./factusConfig')

const produccion = { NODE_ENV: 'production' }
const produccionCompartida = { NODE_ENV: 'production', FACTUS_CREDENCIALES_COMPARTIDAS: 'true' }
const desarrollo = { NODE_ENV: 'development' }

assert.strictEqual(permiteCredencialesEntorno(produccion), false)
assert.strictEqual(permiteCredencialesEntorno(produccionCompartida), true)
assert.strictEqual(permiteCredencialesEntorno(desarrollo), true)

// Producción, clínica sin integración: no hereda las del servidor.
let { configuracionEfectiva: c } = resolverConfiguracionFactus(null, produccion)
assert.strictEqual(c.fuenteCredenciales, 'ninguna')
assert.strictEqual(c.credencialesCompletas, false)
assert.strictEqual(c.activa, false, 'sin integración propia queda inactiva')
assert.strictEqual(c.rangoNumeracionId, null, 'no hereda el rango del servidor')
assert.strictEqual(c.clientId, '')

// Producción con credenciales compartidas habilitadas a propósito.
;({ configuracionEfectiva: c } = resolverConfiguracionFactus(null, produccionCompartida))
assert.strictEqual(c.fuenteCredenciales, 'env')
assert.strictEqual(c.clientId, 'id-servidor')

// Desarrollo: usa las del entorno.
;({ configuracionEfectiva: c } = resolverConfiguracionFactus(null, desarrollo))
assert.strictEqual(c.fuenteCredenciales, 'env')
assert.strictEqual(c.credencialesCompletas, true)

// Integración con credenciales parciales: nunca se completan con las del
// servidor (antes quedaba «mixta»).
const parcial = { activa: true, clientIdCifrado: null, clientSecretCifrado: null, usernameCifrado: null, passwordCifrado: null }
;({ configuracionEfectiva: c } = resolverConfiguracionFactus(parcial, produccion))
assert.strictEqual(c.fuenteCredenciales, 'ninguna')
assert.strictEqual(c.clientSecret, '')

console.log('factusConfig.test.js: todos los tests pasaron ✔')
