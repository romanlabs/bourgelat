const { Op } = require('sequelize')

const sequelize = require('../config/database')
const Suscripcion = require('../models/Suscripcion')
const {
  PLANES_PUBLICOS,
  CORTESIA_END_DATE,
  construirSuscripcion,
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

// Registro para una clinica que ya uso su prueba y no tiene nada vigente:
// conserva el plan de la ultima suscripcion y entra directo en solo lectura.
const crearSuscripcionSoloLectura = (clinicaId, ultima, transaction) =>
  Suscripcion.create(
    construirSuscripcion({
      clinicaId,
      plan: ultima?.plan || 'prueba',
      estado: 'solo_lectura',
      fechaInicio: formatDateOnly(),
      fechaFin: formatDateOnly(),
      precio: 0,
    }),
    { transaction }
  )

// Decision pura de vigencia, separada del acceso a datos para poder probarla
// sin base de datos.
// `tuvoSuscripcion`: la clinica ya tuvo alguna (cancelada, vencida...). La
// prueba gratis es una sola por clinica: sin esto, cancelar regalaba otros 30
// dias en la siguiente peticion.
const resolverEstadoSuscripcion = ({ suscripcion, tuvoSuscripcion = false, hoy }) => {
  if (!suscripcion) {
    return tuvoSuscripcion
      ? {
          accion: 'crear_solo_lectura',
          advertencia: 'La clinica no tiene una suscripcion vigente y ya uso su prueba: queda en solo lectura.',
        }
      : {
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

  if (!suscripcion) {
    return crearSuscripcionInicial(clinicaId, transaction)
  }

  const { accion, advertencia } = resolverEstadoSuscripcion({
    suscripcion,
    hoy: formatDateOnly(),
  })

  if (accion === 'a_solo_lectura') {
    // La clinica conserva su plan y sus datos; solo pierde la escritura.
    await suscripcion.update({ estado: 'solo_lectura' }, { transaction })
    return { suscripcion, downgraded: true, advertencia }
  }

  return { suscripcion, downgraded: false, advertencia }
}

/**
 * La clinica no tiene suscripcion vigente: le crea la prueba si nunca tuvo
 * ninguna, o la deja en solo lectura si ya tuvo. Va bajo un lock por clinica
 * (y se revisa de nuevo dentro) para que dos peticiones simultaneas no creen
 * dos registros. Usa la transaccion del llamador si viene una.
 */
const crearSuscripcionInicial = async (clinicaId, transaccionExterna) => {
  const crear = async (transaction) => {
    await sequelize.query('SELECT pg_advisory_xact_lock(hashtext(:lockKey))', {
      replacements: { lockKey: `suscripcion:${clinicaId}` },
      transaction,
    })

    const yaCreada = await obtenerSuscripcionVigenteRegistrada(clinicaId, transaction)
    if (yaCreada) {
      return { suscripcion: yaCreada, downgraded: false, advertencia: null }
    }

    const ultima = await Suscripcion.findOne({
      where: { clinicaId },
      order: [['createdAt', 'DESC']],
      transaction,
    })
    const { accion, advertencia } = resolverEstadoSuscripcion({
      suscripcion: null,
      tuvoSuscripcion: Boolean(ultima),
      hoy: formatDateOnly(),
    })

    const suscripcion =
      accion === 'crear_solo_lectura'
        ? await crearSuscripcionSoloLectura(clinicaId, ultima, transaction)
        : await asegurarSuscripcionPrueba(clinicaId, transaction)

    return { suscripcion, downgraded: accion === 'crear_solo_lectura', advertencia }
  }

  return transaccionExterna ? crear(transaccionExterna) : sequelize.transaction(crear)
}

// Decision pura sobre cuantos dias le quedan a una suscripcion, para mostrar
// en el endpoint de estado. No aplica cuando la clinica ya quedo en solo
// lectura (no hay cuenta regresiva que mostrar) ni cuando la fecha de fin es
// la fecha centinela de cortesia (suscripcion sin vencimiento real).
const calcularDiasRestantes = ({ suscripcion, hoy }) => {
  if (!suscripcion) return null
  if (esSoloLectura(suscripcion)) return null
  if (suscripcion.fechaFin === CORTESIA_END_DATE) return null

  return Math.max(
    0,
    Math.ceil((new Date(suscripcion.fechaFin) - new Date(hoy)) / (1000 * 60 * 60 * 24))
  )
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

/**
 * Revisa el cupo y ejecuta `accion` bajo un mismo lock por clinica y recurso.
 * Sin esto, dos altas simultaneas cuentan el mismo uso, ambas pasan el tope y
 * la clinica queda con un usuario de mas. `accion(transaction)` solo corre si
 * hay cupo y debe hacer su escritura con esa transaccion.
 */
const ejecutarConCupo = ({ clinicaId, campoLimite, modelo, where }, accion) =>
  sequelize.transaction(async (transaction) => {
    await sequelize.query('SELECT pg_advisory_xact_lock(hashtext(:lockKey))', {
      replacements: { lockKey: `cupo:${campoLimite}:${clinicaId}` },
      transaction,
    })

    const cupo = await validarCupoSuscripcion({
      clinicaId,
      campoLimite,
      modelo,
      where,
      transaction,
    })
    if (!cupo.permitido) return { cupo, resultado: null }

    return { cupo, resultado: await accion(transaction) }
  })

module.exports = {
  ESTADOS_VIGENTES,
  obtenerNombrePlan,
  obtenerSuscripcionActivaClinica,
  obtenerSuscripcionVigenteRegistrada,
  asegurarSuscripcionPrueba,
  resolverEstadoSuscripcion,
  esSoloLectura,
  calcularDiasRestantes,
  suscripcionTieneFuncionalidad,
  obtenerLimiteNumerico,
  validarCupoSuscripcion,
  ejecutarConCupo,
}
