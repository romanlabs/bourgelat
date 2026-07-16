const jwt = require('jsonwebtoken')

const { appConfig } = require('../config/app')
const RefreshToken = require('../models/RefreshToken')

const generarAccessToken = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  })

const generarRefreshToken = (payload) =>
  jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  })

const calcularFechaExpiracionRefresh = () => {
  const expiracion = new Date()
  expiracion.setMilliseconds(
    expiracion.getMilliseconds() + appConfig.cookies.refreshMaxAgeMs
  )
  return expiracion
}

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
      token,
      expiracion: calcularFechaExpiracionRefresh(),
      clinicaId: clinicaId || null,
      usuarioId: usuarioId || null,
      ip,
      userAgent,
    },
    { transaction }
  )
}

module.exports = { generarAccessToken, generarRefreshToken, guardarRefreshToken }
