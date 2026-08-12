const { Op } = require('sequelize')

const sequelize = require('../config/database')
const {
  PLANES_PUBLICOS,
  DEFAULT_INITIAL_PLAN,
  formatDateOnly,
  construirSuscripcion,
} = require('../config/planes')
const Suscripcion = require('../models/Suscripcion')
const Clinica = require('../models/Clinica')
const {
  obtenerSuscripcionActivaClinica,
  calcularDiasRestantes,
  ESTADOS_VIGENTES,
} = require('../services/suscripcionService')

const asegurarClinicaExiste = async (clinicaId, transaction) => {
  const clinica = await Clinica.findOne({ where: { id: clinicaId }, transaction })

  if (!clinica) {
    return null
  }

  return clinica
}

const crearSuscripcion = async (req, res) => {
  try {
    const {
      clinicaId,
      plan,
      estado = 'activa',
      fechaInicio,
      fechaFin,
      precio,
      metodoPago,
      referenciaPago,
      limiteUsuarios,
      limiteMascotas,
      almacenamientoMB,
      funcionalidades,
    } = req.body

    if (!clinicaId || !plan || !fechaInicio || !fechaFin) {
      return res.status(400).json({
        message: 'clinicaId, plan, fechaInicio y fechaFin son obligatorios',
      })
    }

    if (!PLANES_PUBLICOS[plan]) {
      return res.status(400).json({ message: 'Plan no valido' })
    }

    const resultado = await sequelize.transaction(async (transaction) => {
      const clinica = await asegurarClinicaExiste(clinicaId, transaction)

      if (!clinica) {
        throw new Error('Clinica no encontrada')
      }

      await Suscripcion.update(
        { estado: 'cancelada' },
        {
          where: {
            clinicaId,
            estado: {
              [Op.in]: ESTADOS_VIGENTES,
            },
          },
          transaction,
        }
      )

      const suscripcion = await Suscripcion.create(
        construirSuscripcion({
          clinicaId,
          plan,
          estado,
          fechaInicio,
          fechaFin,
          precio,
          metodoPago,
          referenciaPago,
          limiteUsuarios,
          limiteMascotas,
          almacenamientoMB,
          funcionalidades,
        }),
        { transaction }
      )

      return suscripcion
    })

    res.status(201).json({
      message: 'Suscripcion creada exitosamente',
      suscripcion: resultado,
    })
  } catch (error) {
    if (error.message === 'Clinica no encontrada') {
      return res.status(404).json({ message: error.message })
    }

    res.status(500).json({ message: 'Error en el servidor', error: error.message })
  }
}

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

const cancelarSuscripcion = async (req, res) => {
  try {
    const { id } = req.params

    const resultado = await sequelize.transaction(async (transaction) => {
      // Ruta global de superadmin: cancela suscripciones de cualquier clínica.
      const suscripcion = await Suscripcion.findOne({ where: { id }, transaction, sinTenant: true })

      if (!suscripcion) {
        throw new Error('Suscripcion no encontrada')
      }

      await suscripcion.update({ estado: 'cancelada' }, { transaction })

      return { suscripcion }
    })

    res.json({
      message: 'Suscripcion cancelada exitosamente',
      suscripcion: resultado.suscripcion,
    })
  } catch (error) {
    if (error.message === 'Suscripcion no encontrada') {
      return res.status(404).json({ message: error.message })
    }

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
  crearSuscripcion,
  obtenerSuscripcionActiva,
  obtenerHistorialSuscripciones,
  cancelarSuscripcion,
  obtenerPlanes,
}
