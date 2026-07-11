const assert = require('node:assert/strict')

const { parseBoolean, parseNumber } = require('./app')
const { parseCookies } = require('./cookies')
const { sanitizeErrorPayload } = require('../middlewares/sanitizeErrorResponseMiddleware')
const { validateRuntimeConfig } = require('./validateRuntimeConfig')
const { cifrarTexto, descifrarTexto, hmacTexto, obtenerVersionActiva } = require('./crypto')
const { estaCifrado, descifrarCampo } = require('./modelEncryption')

const CLAVE_V1 = 'clave-de-prueba-v1-para-smoke-test-larga'
const CLAVE_V2 = 'clave-de-prueba-v2-para-smoke-test-larga'

const conEnv = (vars, fn) => {
  const previos = {}
  for (const [key, value] of Object.entries(vars)) {
    previos[key] = process.env[key]
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
  try {
    fn()
  } finally {
    for (const [key, value] of Object.entries(previos)) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  }
}

const testCifrado = () => {
  let cifradoLegacy

  // Modo legacy (sin ENCRYPTION_KEYS): formato de 3 segmentos, roundtrip OK.
  conEnv({ ENCRYPTION_KEYS: undefined, BLIND_INDEX_KEY: undefined }, () => {
    assert.equal(obtenerVersionActiva(), null)

    cifradoLegacy = cifrarTexto('dato sensible')
    assert.equal(cifradoLegacy.split(':').length, 3)
    assert.ok(estaCifrado(cifradoLegacy))
    assert.equal(descifrarTexto(cifradoLegacy), 'dato sensible')
  })

  // Keyring con v1: cifra versionado y sigue descifrando el legacy.
  conEnv({ ENCRYPTION_KEYS: `v1:${CLAVE_V1}` }, () => {
    assert.equal(obtenerVersionActiva(), 'v1')

    const cifradoV1 = cifrarTexto('dato sensible')
    assert.ok(cifradoV1.startsWith('v1:'))
    assert.equal(cifradoV1.split(':').length, 4)
    assert.ok(estaCifrado(cifradoV1))
    assert.equal(descifrarTexto(cifradoV1), 'dato sensible')
    assert.equal(descifrarTexto(cifradoLegacy), 'dato sensible')

    // Rotacion: v2 al frente cifra con v2 y sigue descifrando v1.
    conEnv({ ENCRYPTION_KEYS: `v2:${CLAVE_V2},v1:${CLAVE_V1}` }, () => {
      assert.equal(obtenerVersionActiva(), 'v2')

      const cifradoV2 = cifrarTexto('dato sensible')
      assert.ok(cifradoV2.startsWith('v2:'))
      assert.equal(descifrarTexto(cifradoV2), 'dato sensible')
      assert.equal(descifrarTexto(cifradoV1), 'dato sensible')
    })

    // Version retirada del keyring: falla ruidosamente, nunca devuelve basura.
    conEnv({ ENCRYPTION_KEYS: `v2:${CLAVE_V2}` }, () => {
      assert.throws(() => descifrarTexto(cifradoV1), /'v1' no disponible/)

      // descifrarCampo convierte ese fallo en null (no expone ciphertext crudo)...
      assert.equal(descifrarCampo(cifradoV1), null)
      // ...pero el texto plano pre-migracion pasa intacto.
      assert.equal(descifrarCampo('texto plano normal'), 'texto plano normal')
    })
  })

  // Indice ciego: deterministico, y BLIND_INDEX_KEY dedicada cambia el hash.
  conEnv({ ENCRYPTION_KEYS: undefined, BLIND_INDEX_KEY: undefined }, () => {
    const hashLegacy = hmacTexto('123456789')
    assert.equal(hmacTexto('123456789'), hashLegacy)

    conEnv({ BLIND_INDEX_KEY: CLAVE_V1 }, () => {
      const hashDedicado = hmacTexto('123456789')
      assert.equal(hmacTexto('123456789'), hashDedicado)
      assert.notEqual(hashDedicado, hashLegacy)
    })
  })
}

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
      message: 'Error interno del servidor',
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

  // ENCRYPTION_KEYS ausente en produccion: advertencia (modo legacy), no error.
  assert.ok(
    configValida.warnings.some((w) => w.includes('ENCRYPTION_KEYS')),
    'debe advertir cuando ENCRYPTION_KEYS no esta definido en produccion'
  )

  // ENCRYPTION_KEYS malformado en produccion: error que aborta el arranque.
  const configKeyringInvalido = validateRuntimeConfig(
    {
      isProduction: true,
      trustProxy: 1,
      frontendOrigins: ['https://app.bourgelat.co'],
      enableDbSync: false,
      enableDbAlter: false,
      enableXssClean: true,
      security: { requireOriginForCookieAuth: true, exposeInternalErrors: false },
      cookies: { secure: true, sameSite: 'lax', domain: undefined, allowRefreshTokenInBody: false },
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
      ENCRYPTION_KEYS: 'sin-version-ni-formato',
      BLIND_INDEX_KEY: 'corta',
      FACTUS_ACTIVA: 'false',
      FACTUS_AMBIENTE: 'sandbox',
    }
  )

  assert.ok(configKeyringInvalido.errors.some((e) => e.includes('ENCRYPTION_KEYS')))
  assert.ok(configKeyringInvalido.errors.some((e) => e.includes('BLIND_INDEX_KEY')))

  testCifrado()

  console.log('Smoke tests OK')
}

run()
