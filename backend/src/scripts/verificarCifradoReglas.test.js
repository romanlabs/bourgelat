// Tests de las reglas de `npm run cifrado:verificar`. Se ejecutan con
// `node src/scripts/verificarCifradoReglas.test.js` (integrados en `npm test`).

const assert = require('assert')

process.env.ENCRYPTION_KEYS = `v2:${'b'.repeat(32)},v1:${'a'.repeat(32)}`
const { cifrarTexto, descifrarTexto } = require('../config/crypto')
const { revisarValor, acumular, columnaVacia } = require('./verificarCifradoReglas')

// Cifrado con la clave activa → descifra y reporta su versión.
let resultado = revisarValor(cifrarTexto('Lucía Pérez'), descifrarTexto)
assert.deepStrictEqual(resultado, { tipo: 'v2', ok: true, plano: 'Lucía Pérez' })

// Texto plano anterior al cifrado → no es un fallo.
resultado = revisarValor('Efectivo', descifrarTexto)
assert.deepStrictEqual(resultado, { tipo: 'plano', ok: true })

// Cifrado con una versión que ya no está en el keyring → fallo con su versión.
const conV2 = cifrarTexto('dato viejo')
process.env.ENCRYPTION_KEYS = `v3:${'d'.repeat(32)}`
resultado = revisarValor(conV2, descifrarTexto)
assert.strictEqual(resultado.tipo, 'v2')
assert.strictEqual(resultado.ok, false)
assert.match(resultado.error, /'v2' no disponible/)

// Clave equivocada para esa versión (respaldo de claves desactualizado) → fallo.
process.env.ENCRYPTION_KEYS = `v2:${'c'.repeat(32)}`
resultado = revisarValor(conV2, descifrarTexto)
assert.deepStrictEqual([resultado.tipo, resultado.ok], ['v2', false])

// Formato legacy (3 segmentos) se clasifica aparte.
resultado = revisarValor('aaaa:bbbb:cccc', () => 'x')
assert.deepStrictEqual(resultado, { tipo: 'legacy', ok: true, plano: 'x' })

// El resumen suma por versión y cuenta los fallos.
const columna = columnaVacia()
acumular(columna, { tipo: 'v2', ok: true })
acumular(columna, { tipo: 'v2', ok: false })
acumular(columna, { tipo: 'plano', ok: true })
assert.deepStrictEqual(columna, { total: 3, fallos: 1, tipos: { v2: 2, plano: 1 } })

console.log('verificarCifradoReglas: OK')
