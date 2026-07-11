const { Op } = require('sequelize')
const RefreshToken = require('../models/RefreshToken')
const AuditoriaLog = require('../models/AuditoriaLog')
const { IdempotenciaKey } = require('../middlewares/idempotenciaMiddleware')
const logger = require('../utils/logger')

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
