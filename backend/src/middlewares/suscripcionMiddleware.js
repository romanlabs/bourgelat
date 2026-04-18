const { PLANES_PUBLICOS } = require('../config/planes')
const {
  obtenerSuscripcionActivaClinica,
  suscripcionTieneFuncionalidad,
} = require('../services/suscripcionService')

const FEATURE_LABELS = {
  inventario: 'el modulo de inventario',
  facturacion_interna: 'caja y facturacion',
  facturacion_electronica: 'facturacion electronica',
  reportes_operativos: 'los reportes operativos',
  reportes_completos: 'los reportes completos',
  exportables: 'las exportaciones',
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

module.exports = {
  cargarSuscripcionActiva,
  requerirFuncionalidades,
}
