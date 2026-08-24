const rateLimit = require('express-rate-limit')
const { appConfig } = require('../config/app')
const logger = require('../utils/logger')

const crearHandlerBloqueo = (mensaje) => (req, res) => {
  logger.warn('Rate limit alcanzado', {
    ip: req.ip,
    ruta: req.originalUrl,
    metodo: req.method,
  })
  res.status(429).json({ message: mensaje })
}

const limitadorGeneral = rateLimit({
  windowMs: appConfig.rateLimit.windowMs,
  max: appConfig.rateLimit.maxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  handler: crearHandlerBloqueo('Demasiadas peticiones, intenta de nuevo en 15 minutos'),
})

const limitadorAuth = rateLimit({
  windowMs: appConfig.rateLimit.authWindowMs,
  max: appConfig.rateLimit.authMaxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  handler: crearHandlerBloqueo('Demasiados intentos de acceso, intenta de nuevo en 15 minutos'),
})

module.exports = { limitadorGeneral, limitadorAuth }
