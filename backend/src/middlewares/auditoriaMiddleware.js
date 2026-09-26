const AuditoriaLog = require('../models/AuditoriaLog')
const logger = require('../utils/logger')

// `clinicaId`, `usuarioId`, `ip` y `userAgent` explicitos tienen prioridad sobre
// los que salen de `req`. Sirven para acciones que no llegan por HTTP (scripts
// de servidor) o que ocurren sobre una clinica distinta a la del autor, como
// cuando el equipo de Bourgelat responde un ticket de soporte.
const registrarAuditoria = async ({
  accion,
  entidad = null,
  entidadId = null,
  descripcion = null,
  datosAnteriores = null,
  datosNuevos = null,
  req,
  resultado = 'exitoso',
  clinicaId,
  usuarioId,
  ip,
  userAgent,
}) => {
  try {
    await AuditoriaLog.create({
      accion,
      entidad,
      entidadId,
      descripcion,
      datosAnteriores,
      datosNuevos,
      ip: ip !== undefined ? ip : req?.ip || null,
      userAgent: userAgent !== undefined ? userAgent : req?.headers?.['user-agent'] || null,
      clinicaId:
        clinicaId !== undefined ? clinicaId : req?.auth?.clinicaId || req?.usuario?.clinicaId || null,
      usuarioId:
        usuarioId !== undefined ? usuarioId : req?.auth?.usuarioId || req?.usuario?.id || null,
      resultado,
    })
  } catch (error) {
    // No interrumpir el flujo si falla el log
    logger.error({ contexto: 'auditoria', mensaje: error.message })
  }
}

module.exports = { registrarAuditoria }
