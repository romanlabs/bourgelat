const { appConfig } = require('./app')

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0'])
const PLACEHOLDER_MARKERS = [
  'cambia-esto',
  'changeme',
  'placeholder',
  'example',
  'tu-host',
  'tu-api',
  'tu-clave',
]

const isTruthy = (value) =>
  ['1', 'true', 'yes', 'si', 'on'].includes(String(value || '').trim().toLowerCase())

const isPlaceholderValue = (value) => {
  const normalized = String(value || '').trim().toLowerCase()

  if (!normalized) {
    return true
  }

  return PLACEHOLDER_MARKERS.some((marker) => normalized.includes(marker))
}

const isStrongSecret = (value) =>
  typeof value === 'string' && value.trim().length >= 32 && !isPlaceholderValue(value)

const parseUrl = (value) => {
  try {
    return new URL(value)
  } catch (error) {
    return null
  }
}

const isHttpsUrl = (value) => {
  const parsed = parseUrl(value)
  return parsed?.protocol === 'https:'
}

// Valida el formato del keyring ENCRYPTION_KEYS ("v2:clave,v1:clave").
// Devuelve un mensaje de error o null si es valido.
const validarEncryptionKeys = (value) => {
  const versiones = new Set()

  for (const entrada of String(value).split(',')) {
    const idx = entrada.indexOf(':')
    if (idx === -1) {
      return 'cada entrada debe tener formato "version:clave" (ej. v1:...).'
    }

    const version = entrada.slice(0, idx).trim()
    const clave = entrada.slice(idx + 1).trim()

    if (!/^v\d+$/.test(version)) {
      return `la version '${version}' es invalida (usar v1, v2, ...).`
    }
    if (versiones.has(version)) {
      return `la version '${version}' esta duplicada.`
    }
    versiones.add(version)

    if (!isStrongSecret(clave)) {
      return `la clave de '${version}' debe ser aleatoria y de al menos 32 caracteres.`
    }
  }

  return null
}

const isLocalOrigin = (value) => {
  const parsed = parseUrl(value)

  if (!parsed) {
    return false
  }

  return LOCAL_HOSTS.has(parsed.hostname) || parsed.hostname.endsWith('.local')
}

const validateRuntimeConfig = (config = appConfig, env = process.env) => {
  const errors = []
  const warnings = []

  if (!Array.isArray(config.frontendOrigins) || config.frontendOrigins.length === 0) {
    errors.push('FRONTEND_URLS debe definir al menos un origen permitido para CORS.')
  }

  if (config.cookies.sameSite === 'none' && !config.cookies.secure) {
    errors.push('COOKIE_SECURE debe ser true cuando COOKIE_SAME_SITE=none.')
  }

  if (config.cookies.domain && /^https?:\/\//i.test(config.cookies.domain)) {
    errors.push('COOKIE_DOMAIN no debe incluir protocolo.')
  }

  if (config.cookies.domain && config.cookies.domain.includes('/')) {
    errors.push('COOKIE_DOMAIN no debe incluir rutas.')
  }

  if (!config.isProduction) {
    if (!env.JWT_SECRET || !env.JWT_REFRESH_SECRET) {
      warnings.push('JWT_SECRET y JWT_REFRESH_SECRET deberian estar definidos tambien en desarrollo.')
    }

    return { errors, warnings }
  }

  if (!config.trustProxy) {
    errors.push('TRUST_PROXY debe estar habilitado en produccion detras de Cloudflare/Render.')
  }

  if (!config.cookies.secure) {
    errors.push('COOKIE_SECURE debe ser true en produccion.')
  }

  if (config.security.exposeInternalErrors) {
    errors.push('EXPOSE_INTERNAL_ERRORS debe ser false en produccion.')
  }

  if (config.cookies.allowRefreshTokenInBody) {
    errors.push('ALLOW_REFRESH_TOKEN_IN_BODY debe ser false en produccion.')
  }

  if (!config.security.requireOriginForCookieAuth) {
    errors.push('REQUIRE_ORIGIN_FOR_COOKIE_AUTH debe ser true en produccion.')
  }

  if (config.enableDbAlter) {
    errors.push('DB_ALTER debe permanecer desactivado en produccion.')
  }

  if (config.enableDbSync && !config.allowDbSyncBootstrap) {
    errors.push(
      'DB_SYNC debe permanecer desactivado en produccion, excepto durante un bootstrap inicial con ALLOW_DB_SYNC_BOOTSTRAP=true.'
    )
  }

  if (config.enableDbSync && config.allowDbSyncBootstrap) {
    warnings.push(
      'DB_SYNC esta habilitado en produccion bajo modo bootstrap. Desactivalo despues de sembrar la base inicial.'
    )
  }

  if (!config.enableXssClean) {
    warnings.push('ENABLE_XSS_CLEAN esta desactivado en produccion; revisa si fue intencional.')
  }

  if (String(env.DB_SSL || '').trim().toLowerCase() !== 'true') {
    errors.push('DB_SSL debe ser true en produccion.')
  }

  ;[
    ['DB_HOST', env.DB_HOST],
    ['DB_NAME', env.DB_NAME],
    ['DB_USER', env.DB_USER],
    ['DB_PASSWORD', env.DB_PASSWORD],
  ].forEach(([key, value]) => {
    if (isPlaceholderValue(value)) {
      errors.push(`${key} debe tener un valor real antes de desplegar.`)
    }
  })

  ;[
    ['JWT_SECRET', env.JWT_SECRET],
    ['JWT_REFRESH_SECRET', env.JWT_REFRESH_SECRET],
    ['INTEGRACIONES_SECRET', env.INTEGRACIONES_SECRET],
  ].forEach(([key, value]) => {
    if (!isStrongSecret(value)) {
      errors.push(`${key} debe ser un secreto distinto, aleatorio y de al menos 32 caracteres.`)
    }
  })

  if (env.JWT_SECRET && env.JWT_SECRET === env.JWT_REFRESH_SECRET) {
    errors.push('JWT_SECRET y JWT_REFRESH_SECRET deben ser distintos.')
  }

  if (env.INTEGRACIONES_SECRET && env.INTEGRACIONES_SECRET === env.JWT_SECRET) {
    errors.push('INTEGRACIONES_SECRET no debe reutilizar JWT_SECRET.')
  }

  if (env.ENCRYPTION_KEYS) {
    const errorKeyring = validarEncryptionKeys(env.ENCRYPTION_KEYS)
    if (errorKeyring) {
      errors.push(`ENCRYPTION_KEYS invalido: ${errorKeyring}`)
    }
  } else {
    warnings.push(
      'ENCRYPTION_KEYS no esta definido: el cifrado de PII usa la clave derivada de INTEGRACIONES_SECRET/JWT_SECRET (modo legacy). Rotar esos secretos en este modo hace indescifrables los datos; configura claves dedicadas segun docs/secrets-rotation.md.'
    )
  }

  if (env.BLIND_INDEX_KEY) {
    if (!isStrongSecret(env.BLIND_INDEX_KEY)) {
      errors.push('BLIND_INDEX_KEY debe ser un secreto aleatorio de al menos 32 caracteres.')
    }
  } else {
    warnings.push(
      'BLIND_INDEX_KEY no esta definido: los indices ciegos usan la clave legacy. Configura una clave dedicada y corre `npm run cifrado:rotar` para re-indexar; ver docs/secrets-rotation.md.'
    )
  }

  config.frontendOrigins.forEach((origin) => {
    if (!isHttpsUrl(origin)) {
      errors.push(`El origen ${origin} debe usar https en produccion.`)
    }

    if (isLocalOrigin(origin)) {
      errors.push(`El origen ${origin} no puede ser local en produccion.`)
    }
  })

  if (env.PUBLIC_UPLOADS_BASE_URL && !isHttpsUrl(env.PUBLIC_UPLOADS_BASE_URL)) {
    errors.push('PUBLIC_UPLOADS_BASE_URL debe usar https en produccion.')
  }

  const factusProduccionActiva =
    isTruthy(env.FACTUS_ACTIVA) && String(env.FACTUS_AMBIENTE || '').trim() === 'production'

  if (factusProduccionActiva) {
    ;[
      ['FACTUS_CLIENT_ID', env.FACTUS_CLIENT_ID],
      ['FACTUS_CLIENT_SECRET', env.FACTUS_CLIENT_SECRET],
      ['FACTUS_USERNAME/FACTUS_EMAIL', env.FACTUS_USERNAME || env.FACTUS_EMAIL],
      ['FACTUS_PASSWORD', env.FACTUS_PASSWORD],
      ['FACTUS_RANGO_NUMERACION_ID', env.FACTUS_RANGO_NUMERACION_ID],
    ].forEach(([key, value]) => {
      if (isPlaceholderValue(value)) {
        warnings.push(`${key} sigue sin configurarse para Factus en produccion.`)
      }
    })
  }

  return { errors, warnings }
}

module.exports = {
  validateRuntimeConfig,
  isPlaceholderValue,
  isStrongSecret,
}
