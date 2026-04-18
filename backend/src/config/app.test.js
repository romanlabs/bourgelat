const test = require('node:test')
const assert = require('node:assert/strict')

const { parseBoolean, parseNumber, normalizeSameSite } = require('./app')

test('parseBoolean maneja valores truthy y falsy comunes', () => {
  assert.equal(parseBoolean('true', false), true)
  assert.equal(parseBoolean('1', false), true)
  assert.equal(parseBoolean('si', false), true)
  assert.equal(parseBoolean('false', true), false)
  assert.equal(parseBoolean(undefined, true), true)
})

test('parseNumber retorna fallback cuando el valor no es numerico', () => {
  assert.equal(parseNumber('42', 10), 42)
  assert.equal(parseNumber(undefined, 10), 10)
  assert.equal(parseNumber('abc', 10), 10)
})

test('normalizeSameSite conserva solo valores permitidos', () => {
  assert.equal(normalizeSameSite('Strict', 'lax'), 'strict')
  assert.equal(normalizeSameSite('none', 'lax'), 'none')
  assert.equal(normalizeSameSite('invalido', 'lax'), 'lax')
})
