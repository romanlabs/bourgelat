const sequelize = require('../config/database')
const {
  PLANES_PUBLICOS,
  DEFAULT_INITIAL_PLAN,
  formatDateOnly,
} = require('../config/planes')
const Suscripcion = require('../models/Suscripcion')
const Usuario = require('../models/Usuario')
const Clinica = require('../models/Clinica')
const {
  obtenerSuscripcionActivaClinica,
  calcularDiasRestantes,
  obtenerLimiteNumerico,
} = require('../services/suscripcionService')

const obtenerSuscripcionActiva = async (req, res) => {
  try {
    const { clinicaId } = req.usuario

    const resultado = await sequelize.transaction(async (transaction) => {
      const { suscripcion, advertencia } = await obtenerSuscripcionActivaClinica(clinicaId, {
        transaction,
      })

      const diasRestantes = calcularDiasRestantes({ suscripcion, hoy: formatDateOnly() })

      const [usuariosActivos, clinica] = await Promise.all([
        Usuario.count({ where: { clinicaId, activo: true }, transaction }),
        Clinica.findOne({ where: { id: clinicaId }, attributes: ['almacenamientoUsadoMB'], transaction }),
      ])

      return {
        suscripcion,
        diasRestantes,
        uso: {
          usuarios: { usados: usuariosActivos, limite: obtenerLimiteNumerico(suscripcion, 'limiteUsuarios') },
          almacenamientoMB: {
            usados: Number(clinica?.almacenamientoUsadoMB) || 0,
            limite: obtenerLimiteNumerico(suscripcion, 'almacenamientoMB'),
          },
        },
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
    recommendedPlan: 'activo',
    planes: PLANES_PUBLICOS,
  })
}

module.exports = {
  obtenerSuscripcionActiva,
  obtenerHistorialSuscripciones,
  obtenerPlanes,
}
