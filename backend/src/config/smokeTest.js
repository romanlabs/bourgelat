const assert = require('node:assert/strict')

const { parseBoolean, parseNumber } = require('./app')
const { parseCookies } = require('./cookies')
const { sanitizeErrorPayload } = require('../middlewares/sanitizeErrorResponseMiddleware')
const { validateRuntimeConfig } = require('./validateRuntimeConfig')

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

  assert.deepEqual(
    sanitizeErrorPayload(
      {
        message: 'Error en el servidor',
        error: 'detalle interno',
        stack: 'trace',
      },
      500,
      false
    ),
    {
      message: 'Error en el servidor',
    }
  )

  assert.deepEqual(
    sanitizeErrorPayload(
      {
        message: 'Credenciales incorrectas',
        error: 'detalle interno',
      },
      401,
      false
    ),
    {
      message: 'Credenciales incorrectas',
      error: 'detalle interno',
    }
  )

  const configValida = validateRuntimeConfig(
    {
      isProduction: true,
      trustProxy: 1,
      frontendOrigins: ['https://app.bourgelat.co'],
      enableDbSync: false,
      enableDbAlter: false,
      enableXssClean: true,
      security: {
        requireOriginForCookieAuth: true,
        exposeInternalErrors: false,
      },
      cookies: {
        secure: true,
        sameSite: 'lax',
        domain: undefined,
        allowRefreshTokenInBody: false,
      },
    },
    {
      DB_SSL: 'true',
      DB_HOST: 'db.render.internal',
      DB_NAME: 'bourgelat_prod',
      DB_USER: 'bourgelat_service',
      DB_PASSWORD: 'clave-super-segura-para-postgres-123',
      JWT_SECRET: 'jwt-super-secreto-largo-y-aleatorio-1234567890',
      JWT_REFRESH_SECRET: 'refresh-super-secreto-largo-y-aleatorio-0987654321',
      INTEGRACIONES_SECRET: 'integraciones-super-secreto-largo-y-aleatorio-24680',
      PUBLIC_UPLOADS_BASE_URL: 'https://api.bourgelat.co/uploads',
      FACTUS_ACTIVA: 'false',
      FACTUS_AMBIENTE: 'sandbox',
    }
  )

  assert.equal(configValida.errors.length, 0)

  const configInvalida = validateRuntimeConfig(
    {
      isProduction: true,
      trustProxy: false,
      frontendOrigins: ['http://localhost:5173'],
      enableDbSync: true,
      enableDbAlter: false,
      enableXssClean: true,
      security: {
        requireOriginForCookieAuth: false,
        exposeInternalErrors: true,
      },
      cookies: {
        secure: false,
        sameSite: 'none',
        domain: 'https://bourgelat.co',
        allowRefreshTokenInBody: true,
      },
    },
    {
      DB_SSL: 'false',
      DB_HOST: 'tu-host-postgres',
      DB_NAME: 'bourgelat_prod',
      DB_USER: 'bourgelat_service',
      DB_PASSWORD: 'cambia-esta-clave',
      JWT_SECRET: 'cambia-esto',
      JWT_REFRESH_SECRET: 'cambia-esto',
      INTEGRACIONES_SECRET: 'cambia-esto',
      PUBLIC_UPLOADS_BASE_URL: 'http://api.bourgelat.co/uploads',
    }
  )

  assert.ok(configInvalida.errors.length > 0)

  console.log('Smoke tests OK')
}

run()
