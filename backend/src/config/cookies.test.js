const test = require('node:test')
const assert = require('node:assert/strict')

const { parseCookies } = require('./cookies')

test('parseCookies convierte el header Cookie a objeto', () => {
  const cookies = parseCookies('foo=bar; hello=world; token=a%20b')

  assert.deepEqual(cookies, {
    foo: 'bar',
    hello: 'world',
    token: 'a b',
  })
})

test('parseCookies ignora fragmentos vacios o invalidos', () => {
  const cookies = parseCookies('foo=bar; invalido; ; baz=qux')

  assert.deepEqual(cookies, {
    foo: 'bar',
    baz: 'qux',
  })
})
