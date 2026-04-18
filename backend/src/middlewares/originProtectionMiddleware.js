const { appConfig } = require('../config/app')
const { parseCookies } = require('../config/cookies')

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

const shouldProtectRequest = (req) => {
  if (SAFE_METHODS.has(req.method)) {
    return false
  }

  const cookies = parseCookies(req.headers?.cookie || '')

  return Boolean(
    cookies[appConfig.cookies.accessTokenName] ||
      cookies[appConfig.cookies.refreshTokenName]
  )
}

const protegerOrigenCookieAuth = (req, res, next) => {
  if (!appConfig.security.requireOriginForCookieAuth) {
    return next()
  }

  if (!shouldProtectRequest(req)) {
    return next()
  }

  const origin = req.headers.origin || ''

  if (!origin || !appConfig.frontendOrigins.includes(origin)) {
    return res.status(403).json({
      message: 'Origen no autorizado para esta operacion',
      code: 'ORIGIN_NOT_ALLOWED',
    })
  }

  return next()
}

module.exports = {
  protegerOrigenCookieAuth,
}
