const { registrarErrorInterno } = require('../services/alertaErroresService')
const { rutaSinQuery } = require('../utils/rutaLog')

const rutaDe = (req) => (req.route ? `${req.baseUrl}${req.route.path}` : rutaSinQuery(req))

// Va DESPUÉS de sanitizarRespuestasErrorInterno: los controladores responden 500
// con el motivo en `error` y el sanitizador lo borra antes de enviarlo; aquí es
// el último sitio donde todavía se puede registrar.
const capturarErroresInternos = (req, res, next) => {
  if (req.path === '/health') return next()

  const responder = res.json.bind(res)
  res.json = (payload) => {
    if (res.statusCode >= 500 && !res.locals.errorDeCliente) {
      registrarErrorInterno({
        metodo: req.method,
        ruta: rutaDe(req),
        mensaje: res.locals.errorInterno?.message || payload?.error || payload?.message || `HTTP ${res.statusCode}`,
        clinicaId: req.usuario?.clinicaId,
      })
    }
    return responder(payload)
  }
  return next()
}

module.exports = { capturarErroresInternos }
