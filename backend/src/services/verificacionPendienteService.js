const jwt = require('jsonwebtoken')

const { parseCookies, buildCookieOptions } = require('../config/cookies')

// Cookie httpOnly de vida corta que liga verificar/reenviar el código a quien
// se acaba de registrar o ya demostró la contraseña: el código de 6 dígitos
// deja de ser credencial por sí solo.
const NOMBRE_COOKIE = 'bourgelat_verificacion_pendiente'
const PROPOSITO = 'verificacion_email'
const VIDA_MINUTOS = 30

const firmarTokenPendiente = (usuarioId, { secreto = process.env.JWT_SECRET, expiresIn = `${VIDA_MINUTOS}m` } = {}) =>
  jwt.sign({ sub: String(usuarioId), proposito: PROPOSITO }, secreto, {
    algorithm: 'HS256',
    expiresIn,
  })

// Devuelve el usuarioId o null (firma inválida, vencido, otro propósito...).
const verificarTokenPendiente = (token, { secreto = process.env.JWT_SECRET } = {}) => {
  if (!token || typeof token !== 'string' || !secreto) return null
  try {
    const payload = jwt.verify(token, secreto, { algorithms: ['HS256'] })
    if (payload?.proposito !== PROPOSITO || typeof payload.sub !== 'string' || !payload.sub) {
      return null
    }
    return payload.sub
  } catch {
    return null
  }
}

const opcionesCookie = () => buildCookieOptions(VIDA_MINUTOS * 60 * 1000)

const setCookiePendiente = (res, usuarioId) => {
  res.cookie(NOMBRE_COOKIE, firmarTokenPendiente(usuarioId), opcionesCookie())
}

const clearCookiePendiente = (res) => {
  const { maxAge, ...opciones } = opcionesCookie()
  res.clearCookie(NOMBRE_COOKIE, opciones)
}

const obtenerUsuarioPendienteRequest = (req) => {
  const cookies = parseCookies(req.headers?.cookie || '')
  return verificarTokenPendiente(cookies[NOMBRE_COOKIE])
}

module.exports = {
  NOMBRE_COOKIE,
  PROPOSITO,
  VIDA_MINUTOS,
  firmarTokenPendiente,
  verificarTokenPendiente,
  setCookiePendiente,
  clearCookiePendiente,
  obtenerUsuarioPendienteRequest,
}
