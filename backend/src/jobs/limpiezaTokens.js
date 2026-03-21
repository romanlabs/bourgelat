const { Op } = require('sequelize')
const RefreshToken = require('../models/RefreshToken')
const AuditoriaLog = require('../models/AuditoriaLog')

const limpiarTokensVencidos = async () => {
  try {
    const eliminados = await RefreshToken.destroy({
      where: {
        [Op.or]: [
          { expiracion: { [Op.lt]: new Date() } },
          { revocado: true },
        ],
      },
    })

    if (eliminados > 0) {
      console.log(`[Limpieza] ${eliminados} refresh tokens eliminados`)
    }
  } catch (error) {
    console.error('[Limpieza] Error al limpiar refresh tokens:', error.message)
  }
}

const limpiarLogsAntiguos = async () => {
  try {
    const fechaLimite = new Date()
    fechaLimite.setMonth(fechaLimite.getMonth() - 3) // 3 meses atrás

    const eliminados = await AuditoriaLog.destroy({
      where: {
        createdAt: { [Op.lt]: fechaLimite },
        resultado: 'exitoso',
      },
    })

    if (eliminados > 0) {
      console.log(`[Limpieza] ${eliminados} logs de auditoría antiguos eliminados`)
    }
  } catch (error) {
    console.error('[Limpieza] Error al limpiar logs:', error.message)
  }
}

module.exports = { limpiarTokensVencidos, limpiarLogsAntiguos }