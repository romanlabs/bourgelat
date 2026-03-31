const rateLimit = require('express-rate-limit')
const { appConfig } = require('../config/app')

const limitadorGeneral = rateLimit({
  windowMs: appConfig.rateLimit.windowMs,
  max: appConfig.rateLimit.maxRequests,
  message: { message: 'Demasiadas peticiones, intenta de nuevo en 15 minutos' },
  standardHeaders: true,
  legacyHeaders: false,
})

const limitadorAuth = rateLimit({
  windowMs: appConfig.rateLimit.authWindowMs,
  max: appConfig.rateLimit.authMaxRequests,
  message: { message: 'Demasiados intentos de acceso, intenta de nuevo en 15 minutos' },
  standardHeaders: true,
  legacyHeaders: false,
})

module.exports = { limitadorGeneral, limitadorAuth }
