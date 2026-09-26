const rateLimit = require('express-rate-limit')
const { ipKeyGenerator } = require('express-rate-limit')
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

// Soporte: por usuario autenticado y no por IP. Toda una clinica suele salir
// por la misma IP, y un limite por IP castigaria a sus companeros. Deben ir
// despues de verificarToken para que exista req.usuario.
const clavePorUsuario = (req) => req.usuario?.id || ipKeyGenerator(req.ip)

const limitadorCreacionTickets = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: clavePorUsuario,
  handler: crearHandlerBloqueo(
    'Abriste muchos tickets en poco tiempo. Espera un rato o escribe en uno de los que ya tienes abiertos.'
  ),
})

const limitadorMensajesSoporte = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: clavePorUsuario,
  handler: crearHandlerBloqueo('Enviaste muchos mensajes en poco tiempo. Intenta de nuevo en unos minutos.'),
})

module.exports = {
  limitadorGeneral,
  limitadorAuth,
  limitadorCreacionTickets,
  limitadorMensajesSoporte,
}
