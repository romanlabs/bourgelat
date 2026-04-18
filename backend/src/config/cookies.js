const { appConfig } = require('./app')

const parseCookies = (cookieHeader = '') => {
  return cookieHeader
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((acc, part) => {
      const separatorIndex = part.indexOf('=')

      if (separatorIndex === -1) {
        return acc
      }

      const key = part.slice(0, separatorIndex).trim()
      const value = part.slice(separatorIndex + 1).trim()

      if (key) {
        acc[key] = decodeURIComponent(value)
      }

      return acc
    }, {})
}

const buildCookieOptions = (maxAge) => ({
  httpOnly: true,
  secure: appConfig.cookies.secure,
  sameSite: appConfig.cookies.sameSite,
  path: '/',
  maxAge,
  domain: appConfig.cookies.domain,
})

const setAuthCookies = (res, { accessToken, refreshToken }) => {
  if (!appConfig.cookies.enabled) {
    return
  }

  if (accessToken) {
    res.cookie(
      appConfig.cookies.accessTokenName,
      accessToken,
      buildCookieOptions(appConfig.cookies.accessMaxAgeMs)
    )
  }

  if (refreshToken) {
    res.cookie(
      appConfig.cookies.refreshTokenName,
      refreshToken,
      buildCookieOptions(appConfig.cookies.refreshMaxAgeMs)
    )
  }
}

const clearAuthCookies = (res) => {
  const baseOptions = {
    httpOnly: true,
    secure: appConfig.cookies.secure,
    sameSite: appConfig.cookies.sameSite,
    path: '/',
    domain: appConfig.cookies.domain,
  }

  res.clearCookie(appConfig.cookies.accessTokenName, baseOptions)
  res.clearCookie(appConfig.cookies.refreshTokenName, baseOptions)
}

const obtenerRefreshTokenRequest = (req) => {
  const cookies = parseCookies(req.headers?.cookie || '')
  const refreshTokenCookie = cookies[appConfig.cookies.refreshTokenName] || null

  if (refreshTokenCookie) {
    return refreshTokenCookie
  }

  if (
    appConfig.cookies.allowRefreshTokenInBody &&
    typeof req.body?.refreshToken === 'string' &&
    req.body.refreshToken.trim()
  ) {
    return req.body.refreshToken
  }

  return null
}

const obtenerAccessTokenRequest = (req) => {
  const authHeader = req.headers?.authorization
  const tokenHeader = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null

  if (tokenHeader) {
    return tokenHeader
  }

  const cookies = parseCookies(req.headers?.cookie || '')
  return cookies[appConfig.cookies.accessTokenName] || null
}

module.exports = {
  parseCookies,
  setAuthCookies,
  clearAuthCookies,
  obtenerRefreshTokenRequest,
  obtenerAccessTokenRequest,
}
