const AuditoriaLog = require('../models/AuditoriaLog')
const logger = require('../utils/logger')

const registrarAuditoria = async ({
  accion,
  entidad = null,
  entidadId = null,
  descripcion = null,
  datosAnteriores = null,
  datosNuevos = null,
  req,
  resultado = 'exitoso',
}) => {
  try {
    await AuditoriaLog.create({
      accion,
      entidad,
      entidadId,
      descripcion,
      datosAnteriores,
      datosNuevos,
      ip: req?.ip || null,
      userAgent: req?.headers?.['user-agent'] || null,
      clinicaId: req?.auth?.clinicaId || req?.usuario?.clinicaId || null,
      usuarioId: req?.auth?.usuarioId || req?.usuario?.id || null,
      resultado,
    })
  } catch (error) {
    // No interrumpir el flujo si falla el log
    logger.error({ contexto: 'auditoria', mensaje: error.message })
  }
}

module.exports = { registrarAuditoria }
