const AuditoriaLog = require('../models/AuditoriaLog')

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
      clinicaId: req?.usuario?.id || null,
      usuarioId: req?.usuario?.usuarioId || null,
      resultado,
    })
  } catch (error) {
    // No interrumpir el flujo si falla el log
    console.error('Error al registrar auditoría:', error.message)
  }
}

module.exports = { registrarAuditoria }