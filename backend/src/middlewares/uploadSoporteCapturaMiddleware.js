const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const multer = require('multer')
const sharp = require('sharp')
const {
  ALLOWED_IMAGE_MIME_TYPES,
  SOPORTE_SUBDIR,
  getSoporteUploadsDir,
} = require('../config/uploads')

// Captura de pantalla opcional de un ticket de soporte.
//
// Se recibe en memoria y se escribe a disco solo cuando la peticion ya paso la
// validacion (guardarCapturaSoporte, llamado desde el controlador), para no
// dejar archivos huerfanos de tickets que nunca se crearon.
//
// No descuenta del cupo de almacenamiento del plan: es un dato de soporte, no
// de la clinica, y una clinica sin espacio tambien necesita poder reportarlo.

const MAX_BYTES = 5 * 1024 * 1024
const MAX_DIMENSION = 1600

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_BYTES,
    files: 1,
  },
  fileFilter: (req, file, callback) => {
    if (!ALLOWED_IMAGE_MIME_TYPES.has(file.mimetype)) {
      callback(new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'captura'))
      return
    }

    callback(null, true)
  },
})

const uploadSoporteCapturaSingle = (req, res, next) => {
  upload.single('captura')(req, res, (error) => {
    if (!error) {
      next()
      return
    }

    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        res.status(400).json({
          message: 'La captura supera el tamano maximo permitido de 5 MB.',
        })
        return
      }

      res.status(400).json({
        message: 'Solo se permiten imagenes JPG, PNG o WEBP como captura.',
      })
      return
    }

    res.status(400).json({
      message: error.message || 'No fue posible cargar la captura.',
    })
  })
}

/**
 * Normaliza la captura (orientacion, tamano maximo, webp) y la escribe en
 * uploads/soporte. sharp descarta los metadatos EXIF por defecto.
 */
const guardarCapturaSoporte = async (file) => {
  const filename = `${Date.now()}-${crypto.randomUUID()}.webp`
  const rutaAbsoluta = path.join(getSoporteUploadsDir(), filename)

  await sharp(file.buffer)
    .rotate()
    .resize({
      width: MAX_DIMENSION,
      height: MAX_DIMENSION,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality: 80 })
    .toFile(rutaAbsoluta)

  return {
    rutaAbsoluta,
    rutaRelativa: path.posix.join(SOPORTE_SUBDIR, filename),
  }
}

const eliminarCapturaSoporte = (rutaAbsoluta) => {
  if (rutaAbsoluta) {
    fs.unlink(rutaAbsoluta, () => {})
  }
}

module.exports = {
  uploadSoporteCapturaSingle,
  guardarCapturaSoporte,
  eliminarCapturaSoporte,
}
