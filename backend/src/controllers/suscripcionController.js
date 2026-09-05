const sequelize = require('../config/database')
const {
  PLANES_PUBLICOS,
  DEFAULT_INITIAL_PLAN,
  formatDateOnly,
} = require('../config/planes')
const Suscripcion = require('../models/Suscripcion')
const {
  obtenerSuscripcionActivaClinica,
  calcularDiasRestantes,
} = require('../services/suscripcionService')

const obtenerSuscripcionActiva = async (req, res) => {
  try {
    const { clinicaId } = req.usuario

    const resultado = await sequelize.transaction(async (transaction) => {
      const { suscripcion, advertencia } = await obtenerSuscripcionActivaClinica(clinicaId, {
        transaction,
      })

      const diasRestantes = calcularDiasRestantes({ suscripcion, hoy: formatDateOnly() })

      return {
        suscripcion,
        diasRestantes,
        advertencia:
          advertencia ||
          (diasRestantes !== null && diasRestantes <= 7 ? 'Tu suscripcion vence pronto' : null),
      }
    })

    res.json(resultado)
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor', error: error.message })
  }
}

const obtenerHistorialSuscripciones = async (req, res) => {
  try {
    const { clinicaId } = req.usuario

    const suscripciones = await Suscripcion.findAll({
      where: { clinicaId },
      order: [['createdAt', 'DESC']],
    })

    res.json({ suscripciones })
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor', error: error.message })
  }
}

const obtenerPlanes = async (req, res) => {
  res.json({
    defaultPlan: DEFAULT_INITIAL_PLAN,
    recommendedPlan: 'profesional',
    planes: PLANES_PUBLICOS,
  })
}

module.exports = {
  obtenerSuscripcionActiva,
  obtenerHistorialSuscripciones,
  obtenerPlanes,
}
