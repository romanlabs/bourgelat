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

  if (payload instanceof Error) {
    return {
      message: 'Error interno del servidor',
    }
  }

  if (Array.isArray(payload) || typeof payload !== 'object') {
    return payload
  }

  const sanitizedPayload = { ...payload }

  delete sanitizedPayload.error
  delete sanitizedPayload.stack

  if (!sanitizedPayload.message) {
    sanitizedPayload.message = 'Error interno del servidor'
  }

  return sanitizedPayload
}

const sanitizarRespuestasErrorInterno = (req, res, next) => {
  if (appConfig.security.exposeInternalErrors) {
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
