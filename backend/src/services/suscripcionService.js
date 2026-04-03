const { Op } = require('sequelize')

const Suscripcion = require('../models/Suscripcion')
const {
  DEFAULT_INITIAL_PLAN,
  PLANES_PUBLICOS,
  crearSuscripcionEsencial,
  formatDateOnly,
} = require('../config/planes')

const ESTADOS_VIGENTES = ['activa', 'prueba']

const obtenerNombrePlan = (plan) => PLANES_PUBLICOS[plan]?.nombre || plan

const obtenerSuscripcionVigenteRegistrada = async (clinicaId, transaction) =>
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

const asegurarPlanEsencial = async (clinicaId, transaction) => {
  const existente = await Suscripcion.findOne({
    where: {
      clinicaId,
      plan: DEFAULT_INITIAL_PLAN,
      estado: 'activa',
    },
    order: [['createdAt', 'DESC']],
    transaction,
  })

  if (existente) {
    return existente
  }

  return Suscripcion.create(crearSuscripcionEsencial(clinicaId), { transaction })
}

const obtenerSuscripcionActivaClinica = async (clinicaId, { transaction } = {}) => {
  if (!clinicaId) {
    throw new Error('Clinica no asociada a la sesion')
  }

  const suscripcionVigente = await obtenerSuscripcionVigenteRegistrada(clinicaId, transaction)

  if (!suscripcionVigente) {
    const planEsencial = await asegurarPlanEsencial(clinicaId, transaction)
    return {
      suscripcion: planEsencial,
      downgraded: false,
      advertencia: 'No existia una suscripcion vigente y se activo Esencial.',
    }
  }

  const hoy = formatDateOnly()

  if (suscripcionVigente.fechaFin < hoy) {
    await suscripcionVigente.update({ estado: 'vencida' }, { transaction })
    const planEsencial = await asegurarPlanEsencial(clinicaId, transaction)

    return {
      suscripcion: planEsencial,
      downgraded: true,
      advertencia: 'La suscripcion anterior vencio y la clinica continuo en Esencial.',
    }
  }

  return {
    suscripcion: suscripcionVigente,
    downgraded: false,
    advertencia:
      suscripcionVigente.estado === 'prueba'
        ? `La activacion temporal termina el ${suscripcionVigente.fechaFin}`
        : null,
  }
}

const suscripcionTieneFuncionalidad = (suscripcion, funcionalidad) =>
  Array.isArray(suscripcion?.funcionalidades) &&
  suscripcion.funcionalidades.includes(funcionalidad)

const obtenerLimiteNumerico = (suscripcion, campo) => {
  if (!suscripcion) return null

  const valor = suscripcion[campo]
  if (valor === null || valor === undefined) {
    return null
  }

  const numero = Number(valor)
  return Number.isFinite(numero) ? numero : null
}

const validarCupoSuscripcion = async ({
  clinicaId,
  campoLimite,
  modelo,
  where,
  transaction,
}) => {
  const { suscripcion } = await obtenerSuscripcionActivaClinica(clinicaId, { transaction })
  const limite = obtenerLimiteNumerico(suscripcion, campoLimite)

  if (limite === null) {
    return {
      permitido: true,
      limite: null,
      usoActual: null,
      suscripcion,
      nombrePlan: obtenerNombrePlan(suscripcion.plan),
    }
  }

  const usoActual = await modelo.count({ where, transaction })

  return {
    permitido: usoActual < limite,
    limite,
    usoActual,
    suscripcion,
    nombrePlan: obtenerNombrePlan(suscripcion.plan),
  }
}

module.exports = {
  ESTADOS_VIGENTES,
  obtenerNombrePlan,
  obtenerSuscripcionActivaClinica,
  obtenerSuscripcionVigenteRegistrada,
  asegurarPlanEsencial,
  suscripcionTieneFuncionalidad,
  obtenerLimiteNumerico,
  validarCupoSuscripcion,
}
