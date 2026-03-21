const rateLimit = require('express-rate-limit')

const limitadorGeneral = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { message: 'Demasiadas peticiones, intenta de nuevo en 15 minutos' },
  standardHeaders: true,
  legacyHeaders: false,
})

const limitadorAuth = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: 'Demasiados intentos de acceso, intenta de nuevo en 15 minutos' },
  standardHeaders: true,
  legacyHeaders: false,
})

module.exports = { limitadorGeneral, limitadorAuth }