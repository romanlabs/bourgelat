const { Op } = require('sequelize')
const RefreshToken = require('../models/RefreshToken')
const PasswordResetToken = require('../models/PasswordResetToken')
const EmailVerificationToken = require('../models/EmailVerificationToken')
const CodigoVerificacionEmail = require('../models/CodigoVerificacionEmail')
const AuditoriaLog = require('../models/AuditoriaLog')
const { IdempotenciaKey } = require('../middlewares/idempotenciaMiddleware')
const InvitacionUsuario = require('../models/InvitacionUsuario')
const {
  inicioVentanaTope,
  buscarPendientesAbandonadas,
  borrarCuentaPendiente,
  DIAS_PARA_LIMPIAR_PENDIENTES,
} = require('../services/invitacionService')
const { registrarAuditoria } = require('../middlewares/auditoriaMiddleware')
const logger = require('../utils/logger')

// Cuentas invitadas que nadie aceptó en N días y sin invitación vigente: se
// borran para liberar el correo (quien fue invitado sin quererlo debe poder
// registrar su propia clínica con él).
const limpiarInvitacionesAbandonadas = async () => {
  const abandonadas = await buscarPendientesAbandonadas()
  for (const usuario of abandonadas) {
    try {
      const resultado = await borrarCuentaPendiente(usuario)
      await registrarAuditoria({
        accion: 'INVITACION_VENCIDA',
        entidad: 'Usuario',
        entidadId: usuario.id,
        clinicaId: usuario.clinicaId,
        usuarioId: null,
        descripcion: `Invitación a ${usuario.email} sin aceptar en ${DIAS_PARA_LIMPIAR_PENDIENTES} días (cuenta ${resultado})`,
        resultado: 'exitoso',
      })
    } catch (error) {
      logger.error({ contexto: 'limpieza-invitaciones', mensaje: `${usuario.id}: ${error.message}` })
    }
  }
  if (abandonadas.length > 0) {
    logger.info({ contexto: 'limpieza', mensaje: `${abandonadas.length} invitaciones abandonadas procesadas` })
  }
}

const limpiarTokensVencidos = async () => {
  try {
    const eliminados = await RefreshToken.destroy({
      where: {
        [Op.or]: [
          { expiracion: { [Op.lt]: new Date() } },
          { revocado: true },
        ],
      },
      sinTenant: true,
    })

    if (eliminados > 0) {
      logger.info({ contexto: 'limpieza', mensaje: `${eliminados} refresh tokens eliminados` })
    }

    const resetEliminados = await PasswordResetToken.destroy({
      where: {
        [Op.or]: [
          { expiracion: { [Op.lt]: new Date() } },
          { usado: true },
        ],
      },
      sinTenant: true,
    })

    if (resetEliminados > 0) {
      logger.info({ contexto: 'limpieza', mensaje: `${resetEliminados} tokens de reset eliminados` })
    }

    const verificacionEliminados = await EmailVerificationToken.destroy({
      where: {
        [Op.or]: [
          { expiracion: { [Op.lt]: new Date() } },
          { usado: true },
        ],
      },
      sinTenant: true,
    })

    if (verificacionEliminados > 0) {
      logger.info({
        contexto: 'limpieza',
        mensaje: `${verificacionEliminados} tokens de verificacion de email eliminados`,
      })
    }

    // Las invitaciones tambien se conservan 24 h: los topes diarios de envio
    // (invitacionService) cuentan estas filas.
    const invitacionesEliminadas = await InvitacionUsuario.destroy({
      where: {
        [Op.or]: [
          { expiracion: { [Op.lt]: new Date() } },
          { usado: true },
        ],
        createdAt: { [Op.lt]: inicioVentanaTope() },
      },
      sinTenant: true,
    })

    if (invitacionesEliminadas > 0) {
      logger.info({
        contexto: 'limpieza',
        mensaje: `${invitacionesEliminadas} invitaciones de usuario eliminadas`,
      })
    }

    await limpiarInvitacionesAbandonadas()

    // Los codigos se conservan 24 h aunque esten usados o vencidos: el tope
    // de codigos por cuenta (codigoVerificacionService) cuenta estas filas.
    // Solo vencen a los 10 min, asi que pasado ese plazo ya no sirven.
    const codigosEliminados = await CodigoVerificacionEmail.destroy({
      where: {
        createdAt: { [Op.lt]: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
      sinTenant: true,
    })

    if (codigosEliminados > 0) {
      logger.info({
        contexto: 'limpieza',
        mensaje: `${codigosEliminados} codigos de verificacion de email eliminados`,
      })
    }
  } catch (error) {
    logger.error({ contexto: 'limpieza-tokens', mensaje: error.message })
  }
}

const limpiarLogsAntiguos = async () => {
  try {
    const fechaLimite = new Date()
    fechaLimite.setMonth(fechaLimite.getMonth() - 3)

    const eliminados = await AuditoriaLog.destroy({
      where: {
        createdAt: { [Op.lt]: fechaLimite },
        resultado: 'exitoso',
      },
      sinTenant: true,
    })

    if (eliminados > 0) {
      logger.info({ contexto: 'limpieza', mensaje: `${eliminados} logs de auditoría antiguos eliminados` })
    }
  } catch (error) {
    logger.error({ contexto: 'limpieza-logs', mensaje: error.message })
  }
}

const limpiarIdempotencia = async () => {
  try {
    const eliminados = await IdempotenciaKey.destroy({
      where: {
        expiracion: { [Op.lt]: new Date() },
      },
    })
    if (eliminados > 0) {
      logger.info({ contexto: 'limpieza', mensaje: `${eliminados} claves de idempotencia eliminadas` })
    }
  } catch (error) {
    logger.error({ contexto: 'limpieza-idempotencia', mensaje: error.message })
  }
}

module.exports = { limpiarTokensVencidos, limpiarLogsAntiguos, limpiarIdempotencia }
