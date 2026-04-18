require('dotenv').config()

const parseBoolean = (value, defaultValue = false) => {
  if (value === undefined || value === null || value === '') {
    return defaultValue
  }

  return ['1', 'true', 'yes', 'si', 'on'].includes(String(value).trim().toLowerCase())
}

const parseNumber = (value, defaultValue) => {
  const parsed = Number.parseInt(value, 10)
  return Number.isNaN(parsed) ? defaultValue : parsed
}

const parseTrustProxy = (value, defaultValue = false, isProduction = false) => {
  if (value === undefined || value === null || value === '') {
    return defaultValue
  }

  const normalized = String(value).trim().toLowerCase()

  if (/^\d+$/.test(normalized)) {
    return Number.parseInt(normalized, 10)
  }

  if (['true', 'yes', 'si', 'on'].includes(normalized)) {
    return isProduction ? 1 : true
  }

  if (['false', 'no', 'off'].includes(normalized)) {
    return false
  }

  return value
}

const splitCsv = (value, fallback = []) => {
  if (!value) return fallback

  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

const normalizeSameSite = (value, fallback = 'lax') => {
  const normalized = String(value || fallback).trim().toLowerCase()

  if (['strict', 'lax', 'none'].includes(normalized)) {
    return normalized
  }

  return fallback
}

const nodeEnv = process.env.NODE_ENV || 'development'
const isProduction = nodeEnv === 'production'

const frontendOrigins = splitCsv(
  process.env.FRONTEND_URLS,
  process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : ['http://localhost:5173']
)

const appConfig = {
  nodeEnv,
  isProduction,
  port: parseNumber(process.env.PORT, 3000),
  trustProxy: parseTrustProxy(process.env.TRUST_PROXY, isProduction ? 1 : false, isProduction),
  frontendOrigins,
  enableDbMigrations: parseBoolean(process.env.DB_RUN_MIGRATIONS, true),
  enableDbSync: parseBoolean(process.env.DB_SYNC, !isProduction),
  enableDbAlter: parseBoolean(process.env.DB_ALTER, !isProduction),
  allowDbSyncBootstrap: parseBoolean(process.env.ALLOW_DB_SYNC_BOOTSTRAP, false),
  enableXssClean: parseBoolean(process.env.ENABLE_XSS_CLEAN, false),
  auth: {
    maxIntentosFallidos: parseNumber(process.env.AUTH_MAX_FAILED_ATTEMPTS, 5),
    minutosBloqueo: parseNumber(process.env.AUTH_LOCK_MINUTES, 15),
  },
  rateLimit: {
    windowMs: parseNumber(process.env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
    maxRequests: parseNumber(process.env.RATE_LIMIT_MAX, 100),
    authWindowMs: parseNumber(process.env.AUTH_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
    authMaxRequests: parseNumber(process.env.AUTH_RATE_LIMIT_MAX, 10),
  },
  security: {
    requireOriginForCookieAuth: parseBoolean(
      process.env.REQUIRE_ORIGIN_FOR_COOKIE_AUTH,
      isProduction
    ),
    exposeInternalErrors: parseBoolean(process.env.EXPOSE_INTERNAL_ERRORS, !isProduction),
  },
  cookies: {
    enabled: parseBoolean(process.env.AUTH_COOKIE_ENABLED, true),
    accessTokenName: process.env.ACCESS_COOKIE_NAME || 'bourgelat_access_token',
    refreshTokenName: process.env.REFRESH_COOKIE_NAME || 'bourgelat_refresh_token',
    domain: process.env.COOKIE_DOMAIN || undefined,
    sameSite: normalizeSameSite(process.env.COOKIE_SAME_SITE, 'lax'),
    secure: parseBoolean(process.env.COOKIE_SECURE, isProduction),
    accessMaxAgeMs: parseNumber(process.env.ACCESS_COOKIE_MAX_AGE_MS, 15 * 60 * 1000),
    refreshMaxAgeMs: parseNumber(process.env.REFRESH_COOKIE_MAX_AGE_MS, 7 * 24 * 60 * 60 * 1000),
    allowRefreshTokenInBody: parseBoolean(process.env.ALLOW_REFRESH_TOKEN_IN_BODY, false),
  },
}

module.exports = {
  appConfig,
  parseBoolean,
  parseNumber,
  parseTrustProxy,
  normalizeSameSite,
}
