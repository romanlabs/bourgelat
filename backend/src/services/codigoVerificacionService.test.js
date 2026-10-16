// Tests de las funciones puras del código de verificación (sin BD).
const assert = require('assert')

process.env.JWT_SECRET = 'secreto-de-prueba-para-codigos'

const {
  generarCodigo,
  hashCodigo,
  compararCodigo,
  calcularExpiracion,
  estaVencido,
  intentosAgotados,
  segundosParaReenviar,
  MAX_INTENTOS,
  MAX_CODIGOS_POR_DIA,
  topeCodigosAlcanzado,
  inicioVentanaTope,
} = require('./codigoVerificacionService')

// Formato: siempre 6 dígitos (con ceros a la izquierda)
for (let i = 0; i < 500; i += 1) {
  assert.match(generarCodigo(), /^\d{6}$/)
}

// Hash determinista, hex de 64 y distinto del código
const hash = hashCodigo('012345')
assert.strictEqual(hash, hashCodigo('012345'))
assert.match(hash, /^[0-9a-f]{64}$/)
assert.notStrictEqual(hash, hashCodigo('012346'))

// Comparación
assert.strictEqual(compararCodigo('012345', hash), true)
assert.strictEqual(compararCodigo('012346', hash), false)
assert.strictEqual(compararCodigo('12345', hash), false)
assert.strictEqual(compararCodigo('abcdef', hash), false)
assert.strictEqual(compararCodigo(undefined, hash), false)
assert.strictEqual(compararCodigo('012345', null), false)
assert.strictEqual(compararCodigo('012345', 'zz'), false)

// Vencimiento: 10 minutos
const ahora = Date.now()
const exp = calcularExpiracion(ahora)
assert.strictEqual(exp.getTime() - ahora, 10 * 60 * 1000)
assert.strictEqual(estaVencido(exp, ahora + 9 * 60 * 1000), false)
assert.strictEqual(estaVencido(exp, ahora + 10 * 60 * 1000), true)

// Intentos: máximo 5
assert.strictEqual(MAX_INTENTOS, 5)
assert.strictEqual(intentosAgotados(4), false)
assert.strictEqual(intentosAgotados(5), true)

// Espera de reenvío: 60 s
assert.strictEqual(segundosParaReenviar(null, ahora), 0)
assert.strictEqual(segundosParaReenviar(new Date(ahora), ahora), 60)
assert.strictEqual(segundosParaReenviar(new Date(ahora - 30000), ahora), 30)
assert.strictEqual(segundosParaReenviar(new Date(ahora - 61000), ahora), 0)

// Tope por cuenta: 5 códigos en 24 h
assert.strictEqual(MAX_CODIGOS_POR_DIA, 5)
assert.strictEqual(topeCodigosAlcanzado(0), false)
assert.strictEqual(topeCodigosAlcanzado(4), false)
assert.strictEqual(topeCodigosAlcanzado(5), true)
assert.strictEqual(topeCodigosAlcanzado(9), true)
assert.strictEqual(ahora - inicioVentanaTope(ahora).getTime(), 24 * 60 * 60 * 1000)

console.log('codigoVerificacionService.test.js OK')
