// Verifica que scripts/rotarCifrado.js recorra todo lo que los modelos cifran.
// Se ejecuta con `node src/config/tablasCifradas.test.js` (integrado en
// `npm test`). Carga los modelos pero no se conecta a la base de datos.

const assert = require('assert')
const fs = require('fs')
const path = require('path')

const dirModelos = path.join(__dirname, '..', 'models')
for (const archivo of fs.readdirSync(dirModelos)) {
  if (archivo.endsWith('.js') && !archivo.endsWith('.test.js')) require(path.join(dirModelos, archivo))
}

const { modelosCifrados } = require('./modelEncryption')
const { TABLAS } = require('./tablasCifradas')

assert.ok(modelosCifrados.size > 0, 'ningun modelo registro hooks de cifrado')

for (const [tabla, opciones] of modelosCifrados) {
  const config = TABLAS.find((t) => t.tabla === tabla)
  assert.ok(config, `la tabla ${tabla} cifra campos pero no esta en tablasCifradas.js`)

  for (const campo of [...(opciones.campos || []), ...(opciones.camposJson || [])]) {
    assert.ok(config.campos.includes(campo), `${tabla}.${campo} se cifra pero rotarCifrado no lo recorre`)
  }

  if (opciones.hashConfig) {
    assert.deepStrictEqual(config.hashConfig, opciones.hashConfig, `${tabla}: hashConfig desalineado`)
  }
}

console.log(`tablasCifradas: ${modelosCifrados.size} modelos cifrados cubiertos por la rotacion`)
