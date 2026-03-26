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

const splitCsv = (value, fallback = []) => {
  if (!value) return fallback

  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
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
  trustProxy: parseBoolean(process.env.TRUST_PROXY, isProduction),
  frontendOrigins,
  enableDbMigrations: parseBoolean(process.env.DB_RUN_MIGRATIONS, true),
  enableDbSync: parseBoolean(process.env.DB_SYNC, !isProduction),
  enableDbAlter: parseBoolean(process.env.DB_ALTER, !isProduction),
  enableXssClean: parseBoolean(process.env.ENABLE_XSS_CLEAN, false),
  auth: {
    maxIntentosFallidos: parseNumber(process.env.AUTH_MAX_FAILED_ATTEMPTS, 5),
    minutosBloqueo: parseNumber(process.env.AUTH_LOCK_MINUTES, 15),
  },
  cookies: {
    enabled: parseBoolean(process.env.AUTH_COOKIE_ENABLED, true),
    accessTokenName: process.env.ACCESS_COOKIE_NAME || 'bourgelat_access_token',
    refreshTokenName: process.env.REFRESH_COOKIE_NAME || 'bourgelat_refresh_token',
    domain: process.env.COOKIE_DOMAIN || undefined,
    sameSite: process.env.COOKIE_SAME_SITE || (isProduction ? 'strict' : 'lax'),
    secure: parseBoolean(process.env.COOKIE_SECURE, isProduction),
    accessMaxAgeMs: parseNumber(process.env.ACCESS_COOKIE_MAX_AGE_MS, 15 * 60 * 1000),
    refreshMaxAgeMs: parseNumber(process.env.REFRESH_COOKIE_MAX_AGE_MS, 7 * 24 * 60 * 60 * 1000),
  },
}

module.exports = {
  appConfig,
  parseBoolean,
  parseNumber,
}
