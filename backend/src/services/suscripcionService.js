const { Op } = require('sequelize')

const Suscripcion = require('../models/Suscripcion')
const {
  PLANES_PUBLICOS,
  crearSuscripcionPrueba,
  formatDateOnly,
} = require('../config/planes')

// 'solo_lectura' es vigente a efectos de resolucion: la suscripcion se sigue
// encontrando para que el frontend sepa en que estado esta la clinica.
const ESTADOS_VIGENTES = ['activa', 'prueba', 'solo_lectura']

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

const asegurarSuscripcionPrueba = async (clinicaId, transaction) =>
  Suscripcion.create(crearSuscripcionPrueba(clinicaId), { transaction })

const esSoloLectura = (suscripcion) => suscripcion?.estado === 'solo_lectura'

// Decision pura de vigencia, separada del acceso a datos para poder probarla
// sin base de datos.
const resolverEstadoSuscripcion = ({ suscripcion, hoy }) => {
  if (!suscripcion) {
    return {
      accion: 'crear',
      advertencia: 'No existia una suscripcion vigente y se activo una prueba de 30 dias.',
    }
  }

  if (esSoloLectura(suscripcion)) {
    return {
      accion: 'vigente',
      advertencia: 'La suscripcion vencio. La clinica puede consultar y exportar, pero no editar.',
    }
  }

  if (suscripcion.fechaFin < hoy) {
    return {
      accion: 'a_solo_lectura',
      advertencia: 'La suscripcion vencio y la clinica quedo en modo solo lectura.',
    }
  }

  return {
    accion: 'vigente',
    advertencia:
      suscripcion.estado === 'prueba'
        ? `La prueba termina el ${suscripcion.fechaFin}`
        : null,
  }
}

const obtenerSuscripcionActivaClinica = async (clinicaId, { transaction } = {}) => {
  if (!clinicaId) {
    throw new Error('Clinica no asociada a la sesion')
  }

  const suscripcion = await obtenerSuscripcionVigenteRegistrada(clinicaId, transaction)
  const { accion, advertencia } = resolverEstadoSuscripcion({
    suscripcion,
    hoy: formatDateOnly(),
  })

  if (accion === 'crear') {
    return {
      suscripcion: await asegurarSuscripcionPrueba(clinicaId, transaction),
      downgraded: false,
      advertencia,
    }
  }

  if (accion === 'a_solo_lectura') {
    // La clinica conserva su plan y sus datos; solo pierde la escritura.
    await suscripcion.update({ estado: 'solo_lectura' }, { transaction })
    return { suscripcion, downgraded: true, advertencia }
  }

  return { suscripcion, downgraded: false, advertencia }
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
  asegurarSuscripcionPrueba,
  resolverEstadoSuscripcion,
  esSoloLectura,
  suscripcionTieneFuncionalidad,
  obtenerLimiteNumerico,
  validarCupoSuscripcion,
}
