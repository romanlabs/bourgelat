const crypto = require('crypto')
const jwt = require('jsonwebtoken')

const { appConfig } = require('../config/app')
const RefreshToken = require('../models/RefreshToken')

const generarAccessToken = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  })

// jwtid único: sin él, dos tokens del mismo usuario emitidos en el mismo
// segundo salían idénticos y el segundo chocaba con el índice único de
// refresh_tokens (401 «Refresh token invalido» y vuelta al login).
const generarRefreshToken = (payload) =>
  jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    jwtid: crypto.randomUUID(),
  })

const calcularFechaExpiracionRefresh = () => {
  const expiracion = new Date()
  expiracion.setMilliseconds(
    expiracion.getMilliseconds() + appConfig.cookies.refreshMaxAgeMs
  )
  return expiracion
}

// En la BD solo va la huella SHA-256 del refresh token: si alguien lee la
// tabla (backup, consulta), no obtiene sesiones utilizables. Toda búsqueda
// por token usa esta misma huella.
const huellaRefreshToken = (token) =>
  crypto.createHash('sha256').update(String(token)).digest('hex')

const guardarRefreshToken = async ({
  token,
  clinicaId,
  usuarioId,
  ip,
  userAgent,
  transaction,
}) => {
  await RefreshToken.create(
    {
      token: huellaRefreshToken(token),
      expiracion: calcularFechaExpiracionRefresh(),
      clinicaId: clinicaId || null,
      usuarioId: usuarioId || null,
      ip,
      userAgent,
    },
    { transaction }
  )
}

module.exports = { generarAccessToken, generarRefreshToken, guardarRefreshToken, huellaRefreshToken }
