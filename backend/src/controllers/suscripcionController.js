const { Op } = require('sequelize')

const sequelize = require('../config/database')
const {
  PLANES_PUBLICOS,
  TRIAL_DAYS,
  formatDateOnly,
  construirSuscripcion,
  crearSuscripcionInicioGratis,
} = require('../config/planes')
const Suscripcion = require('../models/Suscripcion')
const Clinica = require('../models/Clinica')

const ESTADOS_VIGENTES = ['activa', 'prueba']

const asegurarClinicaExiste = async (clinicaId, transaction) => {
  const clinica = await Clinica.findOne({ where: { id: clinicaId }, transaction })

  if (!clinica) {
    return null
  }

  return clinica
}

const obtenerSuscripcionVigente = async (clinicaId, transaction) =>
  Suscripcion.findOne({
    where: {
      clinicaId,
      estado: {
        [Op.in]: ESTADOS_VIGENTES,
      },
    },
    order: [['createdAt', 'DESC']],
    transaction,
  })

const asegurarInicioGratis = async (clinicaId, transaction) => {
  const existente = await Suscripcion.findOne({
    where: {
      clinicaId,
      plan: 'inicio',
      estado: 'activa',
    },
    order: [['createdAt', 'DESC']],
    transaction,
  })

  if (existente) {
    return existente
  }

  return Suscripcion.create(crearSuscripcionInicioGratis(clinicaId), { transaction })
}

const expirarYNormalizarSuscripcion = async (suscripcion, transaction) => {
  if (!suscripcion) {
    return null
  }

  const hoy = formatDateOnly()

  if (suscripcion.fechaFin >= hoy) {
    return {
      suscripcion,
      downgraded: false,
      advertencia:
        suscripcion.estado === 'prueba'
          ? `Tu prueba termina el ${suscripcion.fechaFin}`
          : null,
    }
  }

  await suscripcion.update({ estado: 'vencida' }, { transaction })
  const inicioGratis = await asegurarInicioGratis(suscripcion.clinicaId, transaction)

  return {
    suscripcion: inicioGratis,
    downgraded: true,
    advertencia:
      'La suscripcion anterior vencio y la clinica continuo en Inicio Gratis.',
  }
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
      const suscripcionVigente = await obtenerSuscripcionVigente(clinicaId, transaction)

      if (!suscripcionVigente) {
        const inicioGratis = await asegurarInicioGratis(clinicaId, transaction)
        return {
          suscripcion: inicioGratis,
          diasRestantes: null,
          advertencia: 'No existia una suscripcion vigente y se activo Inicio Gratis.',
        }
      }

      const normalizada = await expirarYNormalizarSuscripcion(
        suscripcionVigente,
        transaction
      )

      const diasRestantes =
        normalizada.suscripcion.plan === 'inicio'
          ? null
          : Math.max(
              0,
              Math.ceil(
                (new Date(normalizada.suscripcion.fechaFin) - new Date()) /
                  (1000 * 60 * 60 * 24)
              )
            )

      return {
        suscripcion: normalizada.suscripcion,
        diasRestantes,
        advertencia:
          normalizada.advertencia ||
          (diasRestantes !== null && diasRestantes <= 7
            ? 'Tu suscripcion vence pronto'
            : null),
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
      const suscripcion = await Suscripcion.findOne({ where: { id }, transaction })

      if (!suscripcion) {
        throw new Error('Suscripcion no encontrada')
      }

      await suscripcion.update({ estado: 'cancelada' }, { transaction })

      let suscripcionReemplazo = null

      if (suscripcion.plan !== 'inicio') {
        suscripcionReemplazo = await asegurarInicioGratis(
          suscripcion.clinicaId,
          transaction
        )
      }

      return { suscripcion, suscripcionReemplazo }
    })

    res.json({
      message: 'Suscripcion cancelada exitosamente',
      suscripcion: resultado.suscripcion,
      reemplazo: resultado.suscripcionReemplazo,
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
    trialDays: TRIAL_DAYS,
    trialPlan: 'profesional',
    fallbackPlan: 'inicio',
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
