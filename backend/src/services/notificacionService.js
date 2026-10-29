// Única puerta a la tabla de notificaciones (campanita, Fase B). Los
// controladores y jobs llaman a `notificar` después de su operación: un fallo
// aquí se registra y no tumba la operación que lo originó.

const { Op } = require('sequelize')
const Notificacion = require('../models/Notificacion')
const Usuario = require('../models/Usuario')
const Mascota = require('../models/Mascota')
const Propietario = require('../models/Propietario')
const HistoriaClinica = require('../models/HistoriaClinica')
const {
  DIAS_RETENCION,
  avisoPacienteLlego,
  avisoExamenRegistrado,
  avisoTurnoCerrado,
} = require('./notificacionReglas')
const logger = require('../utils/logger')

const LIMITE_LISTA = 50

/**
 * Crea el aviso para cada destinatario activo de la clínica. Los destinatarios
 * se dan por id (`usuarioIds`), por rol (`roles`, que también cuenta los roles
 * adicionales) o ambos. Quien hizo la acción no se avisa a sí mismo.
 */
const notificar = async ({ clinicaId, usuarioIds = [], roles = [], excluirUsuarioId = null, aviso }) => {
  try {
    if (!clinicaId || !aviso) return 0
    const ids = usuarioIds.filter(Boolean)
    if (ids.length === 0 && roles.length === 0) return 0

    const alcance = []
    if (ids.length > 0) alcance.push({ id: ids })
    if (roles.length > 0) {
      alcance.push({ rol: roles }, { rolesAdicionales: { [Op.overlap]: roles } })
    }

    const destinatarios = await Usuario.findAll({
      where: { clinicaId, activo: true, retiradoEn: null, [Op.or]: alcance },
      attributes: ['id'],
    })
    const filas = destinatarios
      .filter((usuario) => usuario.id !== excluirUsuarioId)
      .map((usuario) => ({ ...aviso, clinicaId, usuarioId: usuario.id }))

    if (filas.length > 0) await Notificacion.bulkCreate(filas)
    return filas.length
  } catch (error) {
    logger.error({ contexto: 'notificaciones', mensaje: `No se pudo crear el aviso ${aviso?.tipo}: ${error.message}`, clinicaId })
    return 0
  }
}

const listarMias = async ({ clinicaId, usuarioId }) => {
  const [notificaciones, sinLeer] = await Promise.all([
    Notificacion.findAll({
      where: { clinicaId, usuarioId },
      attributes: ['id', 'categoria', 'tipo', 'titulo', 'texto', 'enlace', 'entidadTipo', 'entidadId', 'leidaEn', 'createdAt'],
      order: [['createdAt', 'DESC']],
      limit: LIMITE_LISTA,
    }),
    Notificacion.count({ where: { clinicaId, usuarioId, leidaEn: null } }),
  ])
  return { notificaciones, sinLeer }
}

// `ids` vacío marca todas. Solo toca las del propio usuario.
const marcarLeidas = async ({ clinicaId, usuarioId, ids = null }) => {
  const where = { clinicaId, usuarioId, leidaEn: null }
  if (Array.isArray(ids) && ids.length > 0) where.id = ids
  const [actualizadas] = await Notificacion.update({ leidaEn: new Date() }, { where })
  return actualizadas
}

// ── Eventos que avisan ────────────────────────────────────────────────────
// Cada uno arma su aviso con los nombres que necesita y nunca lanza: se
// llaman después de responder la operación principal.

const nombreDe = async (modelo, id, clinicaId) => {
  if (!id) return null
  const fila = await modelo.findOne({ where: { id, clinicaId }, attributes: ['nombre'] })
  return fila?.nombre || null
}

// Paciente en sala: al veterinario de la cita (si no es quien marcó la llegada).
const avisarPacienteLlego = async ({ cita, actorId }) => {
  try {
    if (!cita?.veterinarioId || cita.veterinarioId === actorId) return
    const [mascotaNombre, propietarioNombre] = await Promise.all([
      nombreDe(Mascota, cita.mascotaId, cita.clinicaId),
      nombreDe(Propietario, cita.propietarioId, cita.clinicaId),
    ])
    await notificar({
      clinicaId: cita.clinicaId,
      usuarioIds: [cita.veterinarioId],
      aviso: avisoPacienteLlego({ cita, mascotaNombre, propietarioNombre }),
    })
  } catch (error) {
    logger.error({ contexto: 'notificaciones', mensaje: `Aviso de llegada: ${error.message}` })
  }
}

// Resultados de examen: al veterinario de la última historia del paciente.
const avisarExamenRegistrado = async ({ examen, actor }) => {
  try {
    const { clinicaId, mascotaId } = examen
    const ultimaHistoria = await HistoriaClinica.findOne({
      where: { clinicaId, mascotaId },
      attributes: ['veterinarioId'],
      order: [['createdAt', 'DESC']],
    })
    if (!ultimaHistoria?.veterinarioId || ultimaHistoria.veterinarioId === actor?.id) return
    await notificar({
      clinicaId,
      usuarioIds: [ultimaHistoria.veterinarioId],
      aviso: avisoExamenRegistrado({
        examen,
        mascotaId,
        mascotaNombre: await nombreDe(Mascota, mascotaId, clinicaId),
        registradoPorNombre: actor?.nombre || null,
      }),
    })
  } catch (error) {
    logger.error({ contexto: 'notificaciones', mensaje: `Aviso de examen: ${error.message}` })
  }
}

// Cierre de turno: a los administradores, menos quien cerró.
const avisarTurnoCerrado = async ({ turno, actor }) => {
  await notificar({
    clinicaId: turno.clinicaId,
    roles: ['admin'],
    excluirUsuarioId: actor?.id,
    aviso: avisoTurnoCerrado({ turno, cajeroNombre: actor?.nombre || null }),
  })
}

const limpiarNotificacionesAntiguas = async () => {
  try {
    const limite = new Date()
    limite.setDate(limite.getDate() - DIAS_RETENCION)
    const eliminadas = await Notificacion.destroy({
      where: { createdAt: { [Op.lt]: limite } },
      sinTenant: true,
    })
    if (eliminadas > 0) {
      logger.info({ contexto: 'limpieza', mensaje: `${eliminadas} notificaciones antiguas eliminadas` })
    }
  } catch (error) {
    logger.error({ contexto: 'limpieza-notificaciones', mensaje: error.message })
  }
}

module.exports = {
  notificar,
  listarMias,
  marcarLeidas,
  limpiarNotificacionesAntiguas,
  avisarPacienteLlego,
  avisarExamenRegistrado,
  avisarTurnoCerrado,
}
