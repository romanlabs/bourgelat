// Única puerta a la tabla de notificaciones (campanita, Fase B). Los
// controladores y jobs llaman a `notificar` después de su operación: un fallo
// aquí se registra y no tumba la operación que lo originó.

const { Op } = require('sequelize')
const Notificacion = require('../models/Notificacion')
const AjusteAvisos = require('../models/AjusteAvisos')
const Usuario = require('../models/Usuario')
const CajaTurno = require('../models/CajaTurno')
const Mascota = require('../models/Mascota')
const Propietario = require('../models/Propietario')
const HistoriaClinica = require('../models/HistoriaClinica')
const {
  CATEGORIAS,
  DIAS_RETENCION,
  TIPOS_URGENTES,
  TIPOS_DE_CITA,
  avisoPacienteLlego,
  avisoExamenRegistrado,
  avisoTurnoCerrado,
  avisoCitaAgendada,
  avisoCitaMovida,
  avisoCitaCancelada,
  avisoTurnoSinCerrar,
} = require('./notificacionReglas')
const { enviarEmailAvisoUrgente } = require('./emailService')
const { esTurnoVencido } = require('../utils/turnoCaja')
const logger = require('../utils/logger')

const LIMITE_LISTA = 50
// Cuántos avisos derivados leídos se guardan por usuario (solo los vigentes).
const MAX_LEIDAS_DERIVADAS = 300

// Misma resolución que authController (urlFrontend) para los enlaces de correo.
const urlFrontend = () => (
  process.env.OAUTH_FRONTEND_URL ||
  process.env.FRONTEND_URLS?.split(',')[0] ||
  process.env.FRONTEND_URL ||
  'https://app.bourgelat.co'
).trim().replace(/\/$/, '')

// Lo urgente también va por correo a quien lo pidió. Un correo que falla no
// quita el aviso de la campanita.
const enviarCorreosUrgentes = async (destinatarios, aviso) => {
  for (const usuario of destinatarios) {
    if (!usuario.email) continue
    try {
      await enviarEmailAvisoUrgente({ para: usuario.email, nombre: usuario.nombre, aviso, urlFrontend: urlFrontend() })
    } catch (error) {
      logger.error({ contexto: 'notificaciones', mensaje: `Correo urgente ${aviso.tipo} no enviado: ${error.message}` })
    }
  }
}

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

    const candidatos = (await Usuario.findAll({
      where: { clinicaId, activo: true, retiradoEn: null, [Op.or]: alcance },
      attributes: ['id', 'nombre', 'email'],
    })).filter((usuario) => usuario.id !== excluirUsuarioId)
    if (candidatos.length === 0) return 0

    // Quien apagó la categoría en sus ajustes no la recibe.
    const ajustes = new Map((await AjusteAvisos.findAll({
      where: { clinicaId, usuarioId: candidatos.map((usuario) => usuario.id) },
      attributes: ['usuarioId', 'categoriasApagadas', 'correoUrgente'],
    })).map((fila) => [fila.usuarioId, fila]))
    const destinatarios = candidatos.filter(
      (usuario) => !ajustes.get(usuario.id)?.categoriasApagadas?.includes(aviso.categoria)
    )

    const filas = destinatarios.map((usuario) => ({ ...aviso, clinicaId, usuarioId: usuario.id }))
    if (filas.length > 0) await Notificacion.bulkCreate(filas)

    if (TIPOS_URGENTES.includes(aviso.tipo)) {
      await enviarCorreosUrgentes(destinatarios.filter((usuario) => ajustes.get(usuario.id)?.correoUrgente), aviso)
    }
    return filas.length
  } catch (error) {
    logger.error({ contexto: 'notificaciones', mensaje: `No se pudo crear el aviso ${aviso?.tipo}: ${error.message}`, clinicaId })
    return 0
  }
}

// Sin fila de ajustes vale lo de por defecto: todo encendido, sin correo.
const obtenerAjustes = async ({ clinicaId, usuarioId }) => {
  const fila = await AjusteAvisos.findOne({ where: { clinicaId, usuarioId } })
  return {
    categoriasApagadas: fila?.categoriasApagadas || [],
    correoUrgente: fila?.correoUrgente ?? false,
    leidasDerivadas: Array.isArray(fila?.leidasDerivadas) ? fila.leidasDerivadas : [],
  }
}

// La fila de ajustes se crea la primera vez que el usuario cambia algo.
const actualizarAjustes = async ({ clinicaId, usuarioId, cambios }) => {
  const [fila] = await AjusteAvisos.findOrCreate({
    where: { clinicaId, usuarioId },
    defaults: { clinicaId, usuarioId },
  })
  await fila.update(cambios)
}

const guardarAjustes = async ({ clinicaId, usuarioId, categoriasApagadas, correoUrgente }) => {
  const cambios = {}
  if (Array.isArray(categoriasApagadas)) {
    cambios.categoriasApagadas = [...new Set(categoriasApagadas)].filter((categoria) => CATEGORIAS.includes(categoria))
  }
  if (typeof correoUrgente === 'boolean') cambios.correoUrgente = correoUrgente
  await actualizarAjustes({ clinicaId, usuarioId, cambios })
  // eslint-disable-next-line no-unused-vars
  const { leidasDerivadas, ...ajustes } = await obtenerAjustes({ clinicaId, usuarioId })
  return ajustes
}

// El frontend manda la lista completa de los derivados leídos que siguen
// vigentes: reemplaza la anterior, así lo resuelto se olvida solo.
const guardarLeidasDerivadas = async ({ clinicaId, usuarioId, ids }) => {
  const limpios = [...new Set(ids.map(String))].slice(-MAX_LEIDAS_DERIVADAS)
  await actualizarAjustes({ clinicaId, usuarioId, cambios: { leidasDerivadas: limpios } })
  return limpios.length
}

const listarMias = async ({ clinicaId, usuarioId }) => {
  const [notificaciones, sinLeer, { leidasDerivadas, ...ajustes }] = await Promise.all([
    Notificacion.findAll({
      where: { clinicaId, usuarioId },
      attributes: ['id', 'categoria', 'tipo', 'titulo', 'texto', 'enlace', 'entidadTipo', 'entidadId', 'leidaEn', 'createdAt'],
      order: [['createdAt', 'DESC']],
      limit: LIMITE_LISTA,
    }),
    Notificacion.count({ where: { clinicaId, usuarioId, leidaEn: null } }),
    obtenerAjustes({ clinicaId, usuarioId }),
  ])
  return { notificaciones, sinLeer, ajustes, leidasDerivadas }
}

// `ids` vacío marca todas. Solo toca las del propio usuario.
const marcarLeidas = async ({ clinicaId, usuarioId, ids = null }) => {
  const where = { clinicaId, usuarioId, leidaEn: null }
  if (Array.isArray(ids) && ids.length > 0) where.id = ids
  const [actualizadas] = await Notificacion.update({ leidaEn: new Date() }, { where })
  return actualizadas
}

// Un aviso que ya no sirve (la cita se atiende, la caja se cerró) se marca
// leído para todos sus destinatarios: no queda llenando la campanita.
const resolverAvisos = async ({ clinicaId, entidadId, tipos }) => {
  try {
    if (!clinicaId || !entidadId) return 0
    const [actualizadas] = await Notificacion.update(
      { leidaEn: new Date() },
      { where: { clinicaId, entidadId, tipo: tipos, leidaEn: null } }
    )
    return actualizadas
  } catch (error) {
    logger.error({ contexto: 'notificaciones', mensaje: `No se pudieron resolver avisos: ${error.message}`, clinicaId })
    return 0
  }
}

// Estados en que los avisos de la cita (llegó, próxima, agendada, movida) ya
// no le dicen nada nuevo al veterinario.
const ESTADOS_QUE_RESUELVEN = ['en_atencion', 'completada', 'cancelada', 'no_asistio']

const resolverAvisosDeCita = (cita) =>
  ESTADOS_QUE_RESUELVEN.includes(cita?.estado)
    ? resolverAvisos({ clinicaId: cita.clinicaId, entidadId: cita.id, tipos: TIPOS_DE_CITA })
    : 0

// Al cerrar un turno se resuelve el aviso de «caja sin cerrar».
const resolverTurnoSinCerrar = (turno) =>
  resolverAvisos({ clinicaId: turno.clinicaId, entidadId: turno.id, tipos: ['turno_sin_cerrar'] })

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

// Alguien más agendó, movió o canceló una cita del veterinario.
const AVISOS_AGENDA = {
  agendada: avisoCitaAgendada,
  movida: avisoCitaMovida,
  cancelada: avisoCitaCancelada,
}

const avisarCambioAgenda = async ({ cita, cambio, anterior = null, actor }) => {
  try {
    const armarAviso = AVISOS_AGENDA[cambio]
    if (!armarAviso || !cita?.veterinarioId) return
    // Lo que se avisó antes de la cita (agendada, próxima, llegó) ya no aplica.
    if (cambio !== 'agendada') {
      await resolverAvisos({ clinicaId: cita.clinicaId, entidadId: cita.id, tipos: TIPOS_DE_CITA })
    }
    if (cita.veterinarioId === actor?.id) return
    await notificar({
      clinicaId: cita.clinicaId,
      usuarioIds: [cita.veterinarioId],
      aviso: armarAviso({
        cita,
        anterior,
        mascotaNombre: await nombreDe(Mascota, cita.mascotaId, cita.clinicaId),
        actorNombre: actor?.nombre || null,
      }),
    })
  } catch (error) {
    logger.error({ contexto: 'notificaciones', mensaje: `Aviso de agenda (${cambio}): ${error.message}` })
  }
}

// Job: cada turno abierto de un día anterior avisa una sola vez a los
// administradores y a quien lo abrió. Es urgente: también va por correo.
const avisarTurnosSinCerrar = async ({ ahora = new Date() } = {}) => {
  try {
    const abiertos = await CajaTurno.findAll({
      where: { estado: 'abierto' },
      attributes: ['id', 'clinicaId', 'usuarioId', 'fechaApertura'],
      include: [{ model: Usuario, as: 'usuario', attributes: ['nombre'] }],
      sinTenant: true,
    })
    const vencidos = abiertos.filter((turno) => esTurnoVencido(turno, ahora))
    if (vencidos.length === 0) return 0

    const yaAvisados = new Set((await Notificacion.findAll({
      where: { entidadId: vencidos.map((turno) => turno.id), tipo: 'turno_sin_cerrar' },
      attributes: ['entidadId'],
      sinTenant: true,
    })).map((fila) => fila.entidadId))

    let avisados = 0
    for (const turno of vencidos.filter((item) => !yaAvisados.has(item.id))) {
      // A quien la abrió le habla de «tu caja»; a los administradores, de la suya.
      await notificar({
        clinicaId: turno.clinicaId,
        usuarioIds: [turno.usuarioId],
        aviso: avisoTurnoSinCerrar({ turno, propia: true }),
      })
      await notificar({
        clinicaId: turno.clinicaId,
        roles: ['admin'],
        excluirUsuarioId: turno.usuarioId,
        aviso: avisoTurnoSinCerrar({ turno, cajeroNombre: turno.usuario?.nombre || null }),
      })
      avisados += 1
    }
    return avisados
  } catch (error) {
    logger.error({ contexto: 'notificaciones', mensaje: `Turnos sin cerrar: ${error.message}` })
    return 0
  }
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
  guardarAjustes,
  guardarLeidasDerivadas,
  resolverAvisos,
  resolverAvisosDeCita,
  resolverTurnoSinCerrar,
  avisarCambioAgenda,
  avisarTurnosSinCerrar,
  limpiarNotificacionesAntiguas,
  avisarPacienteLlego,
  avisarExamenRegistrado,
  avisarTurnoCerrado,
}
