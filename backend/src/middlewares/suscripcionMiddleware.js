const { PLANES_PUBLICOS } = require('../config/planes')
const {
  obtenerSuscripcionActivaClinica,
  suscripcionTieneFuncionalidad,
  esSoloLectura,
} = require('../services/suscripcionService')

// Unica funcionalidad que se compra aparte. El resto lo tienen todos los planes.
const FEATURE_LABELS = {
  facturacion_electronica: 'facturacion electronica',
}

const obtenerNombrePlan = (plan) => PLANES_PUBLICOS[plan]?.nombre || plan

const cargarSuscripcionActiva = async (req, res, next) => {
  try {
    if (req.suscripcion) {
      return next()
    }

    const clinicaId = req.auth?.clinicaId || req.usuario?.clinicaId

    if (!clinicaId) {
      return res.status(403).json({
        message: 'No hay una clinica asociada a la sesion actual',
      })
    }

    const { suscripcion, advertencia, downgraded } = await obtenerSuscripcionActivaClinica(
      clinicaId
    )

    req.suscripcion = suscripcion
    req.suscripcionInfo = {
      advertencia,
      downgraded,
      nombrePlan: obtenerNombrePlan(suscripcion.plan),
    }

    next()
  } catch (error) {
    res.status(500).json({
      message: 'No fue posible validar la suscripcion de la clinica',
      error: error.message,
    })
  }
}

const requerirFuncionalidades = (...funcionalidades) => {
  return async (req, res, next) => {
    try {
      if (!req.suscripcion) {
        const clinicaId = req.auth?.clinicaId || req.usuario?.clinicaId

        if (!clinicaId) {
          return res.status(403).json({
            message: 'No hay una clinica asociada a la sesion actual',
          })
        }

        const resultado = await obtenerSuscripcionActivaClinica(clinicaId)
        req.suscripcion = resultado.suscripcion
        req.suscripcionInfo = {
          advertencia: resultado.advertencia,
          downgraded: resultado.downgraded,
          nombrePlan: obtenerNombrePlan(resultado.suscripcion.plan),
        }
      }

      const faltantes = funcionalidades.filter(
        (funcionalidad) => !suscripcionTieneFuncionalidad(req.suscripcion, funcionalidad)
      )

      if (faltantes.length === 0) {
        return next()
      }

      const nombrePlan = req.suscripcionInfo?.nombrePlan || obtenerNombrePlan(req.suscripcion.plan)
      const descripcion = faltantes
        .map((funcionalidad) => FEATURE_LABELS[funcionalidad] || funcionalidad)
        .join(', ')

      return res.status(403).json({
        message: `Tu plan ${nombrePlan} no incluye ${descripcion}. Cambia de plan para continuar.`,
        code: 'PLAN_FEATURE_REQUIRED',
        plan: req.suscripcion.plan,
        funcionalidadesFaltantes: faltantes,
      })
    } catch (error) {
      res.status(500).json({
        message: 'No fue posible validar las funcionalidades del plan',
        error: error.message,
      })
    }
  }
}

// IMPORTANTE: debe declararse como funcion nombrada y usarse directamente en
// las cadenas de rutas. `escrituraGuard` la identifica por nombre en el texto
// de los archivos de rutas.
const requerirEscritura = async (req, res, next) => {
  try {
    if (!req.suscripcion) {
      const clinicaId = req.auth?.clinicaId || req.usuario?.clinicaId

      if (!clinicaId) {
        return res.status(403).json({
          message: 'No hay una clinica asociada a la sesion actual',
        })
      }

      const resultado = await obtenerSuscripcionActivaClinica(clinicaId)
      req.suscripcion = resultado.suscripcion
      req.suscripcionInfo = {
        advertencia: resultado.advertencia,
        downgraded: resultado.downgraded,
        nombrePlan: obtenerNombrePlan(resultado.suscripcion.plan),
      }
    }

    if (!esSoloLectura(req.suscripcion)) {
      return next()
    }

    return res.status(403).json({
      message:
        'Tu suscripcion vencio. Puedes consultar y exportar toda tu informacion, pero no crear ni editar. Activa tu plan para volver a trabajar.',
      code: 'SUBSCRIPTION_READ_ONLY',
      plan: req.suscripcion.plan,
    })
  } catch (error) {
    res.status(500).json({
      message: 'No fue posible validar el estado de la suscripcion',
      error: error.message,
    })
  }
}

module.exports = {
  cargarSuscripcionActiva,
  requerirFuncionalidades,
  requerirEscritura,
}
