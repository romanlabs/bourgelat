const fs = require('fs')
const {
  verificarCupoAlmacenamiento,
  registrarUsoAlmacenamiento,
} = require('../services/almacenamientoService')

// Comun a los middlewares de subida que usan multer.diskStorage: cuando este
// codigo corre, el archivo ya esta escrito en disco. Verifica el cupo del
// plan y, si no alcanza, borra el archivo huerfano y responde 413 antes de
// que el llamador continue. Devuelve true si la subida puede seguir (y ya
// contabilizo el uso); false si ya respondio y el llamador debe detenerse.
const aplicarCupoDeArchivoEnDisco = async (req, res) => {
  const clinicaId = req.auth?.clinicaId || req.usuario?.clinicaId
  const cupo = await verificarCupoAlmacenamiento(clinicaId, req.file.size)

  if (!cupo.permitido) {
    fs.unlink(req.file.path, () => {})
    res.status(413).json({
      message: `Tu plan incluye ${cupo.limiteMB} MB de almacenamiento y ya estan ocupados. Borra archivos que no uses para subir mas.`,
      code: 'STORAGE_LIMIT_REACHED',
      limiteMB: cupo.limiteMB,
      usadoMB: cupo.usadoMB,
    })
    return false
  }

  await registrarUsoAlmacenamiento(clinicaId, req.file.size)
  return true
}

module.exports = {
  aplicarCupoDeArchivoEnDisco,
}
