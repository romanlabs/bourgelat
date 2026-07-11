const { appConfig } = require('../config/app')

const sanitizeErrorPayload = (payload, statusCode, exposeInternalErrors) => {
  if (
    exposeInternalErrors ||
    statusCode < 500 ||
    payload === null ||
    payload === undefined
  ) {
    return payload
  }

  return { message: 'Error interno del servidor' }
}

const sanitizarRespuestasErrorInterno = (req, res, next) => {
  if (appConfig.security.exposeInternalErrors || req.path === '/health') {
    return next()
  }

  const originalJson = res.json.bind(res)

  res.json = (payload) => {
    const sanitizedPayload = sanitizeErrorPayload(
      payload,
      res.statusCode,
      appConfig.security.exposeInternalErrors
    )

    return originalJson(sanitizedPayload)
  }

  return next()
}

module.exports = {
  sanitizeErrorPayload,
  sanitizarRespuestasErrorInterno,
}
