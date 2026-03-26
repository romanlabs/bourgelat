const assert = require('node:assert/strict')

const { parseBoolean, parseNumber } = require('./app')
const { parseCookies } = require('./cookies')

const run = () => {
  assert.equal(parseBoolean('true', false), true)
  assert.equal(parseBoolean('1', false), true)
  assert.equal(parseBoolean('si', false), true)
  assert.equal(parseBoolean('false', true), false)
  assert.equal(parseBoolean(undefined, true), true)

  assert.equal(parseNumber('42', 10), 42)
  assert.equal(parseNumber(undefined, 10), 10)
  assert.equal(parseNumber('abc', 10), 10)

  assert.deepEqual(parseCookies('foo=bar; hello=world; token=a%20b'), {
    foo: 'bar',
    hello: 'world',
    token: 'a b',
  })

  assert.deepEqual(parseCookies('foo=bar; invalido; ; baz=qux'), {
    foo: 'bar',
    baz: 'qux',
  })

  console.log('Smoke tests OK')
}

run()
