const multer = require('multer')
const sharp = require('sharp')
const path = require('path')
const crypto = require('crypto')
const { ALLOWED_IMAGE_MIME_TYPES, getClinicasUploadsDir } = require('../config/uploads')
const {
  verificarCupoAlmacenamiento,
  registrarUsoAlmacenamiento,
} = require('../services/almacenamientoService')

// Suficiente para el encabezado de la factura (ahi ocupa ~30mm) y para la
// vista previa de configuracion, sin cargar el PDF con una imagen enorme.
const MAX_DIMENSION = 600

// Lo que sharp reporta tras mirar el contenido, no lo que dice el cliente.
const FORMATOS_DE_IMAGEN_PERMITIDOS = new Set(['jpeg', 'png', 'webp'])

const upload = multer({
  // En memoria y no en disco: asi lo que se escribe son los bytes que produce
  // sharp, nunca los que mando el cliente.
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 4 * 1024 * 1024,
    files: 1,
  },
  fileFilter: (req, file, callback) => {
    if (!ALLOWED_IMAGE_MIME_TYPES.has(file.mimetype)) {
      callback(new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'logo'))
      return
    }

    callback(null, true)
  },
})

const uploadClinicaLogoSingle = (req, res, next) => {
  upload.single('logo')(req, res, async (error) => {
    if (error) {
      if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
          res.status(400).json({
            message: 'El logo supera el tamano maximo permitido de 4 MB.',
          })
          return
        }

        res.status(400).json({
          message: 'Solo se permiten imagenes JPG, PNG o WEBP para el logo de la clinica.',
        })
        return
      }

      res.status(400).json({
        message: error.message || 'No fue posible cargar el logo de la clinica.',
      })
      return
    }

    if (!req.file) {
      next()
      return
    }

    try {
      const clinicaId = req.auth?.clinicaId || req.usuario?.clinicaId
      const cupo = await verificarCupoAlmacenamiento(clinicaId, req.file.buffer.length)

      if (!cupo.permitido) {
        res.status(413).json({
          message: `Tu plan incluye ${cupo.limiteMB} MB de almacenamiento y ya estan ocupados. Borra archivos que no uses para subir mas.`,
          code: 'STORAGE_LIMIT_REACHED',
          limiteMB: cupo.limiteMB,
          usadoMB: cupo.usadoMB,
        })
        return
      }

      // El content-type que declara el cliente no prueba nada, se puede mentir:
      // el formato real se decide leyendo el contenido. Un SVG se rasterizaria
      // sin su script, pero ni siquiera lo pasamos por el decodificador para no
      // exponer a librsvg a XML de terceros.
      const { format } = await sharp(req.file.buffer).metadata()

      if (!FORMATOS_DE_IMAGEN_PERMITIDOS.has(format)) {
        res.status(400).json({
          message: 'Solo se permiten imagenes JPG, PNG o WEBP para el logo de la clinica.',
        })
        return
      }

      const filename = `${Date.now()}-${crypto.randomUUID()}.png`

      // Reencodificar es la verificacion definitiva: lo que queda en disco son
      // bytes generados por sharp, sin scripts ni metadatos del original. PNG y
      // no WebP para no perder la transparencia que suelen traer los logos.
      const { size } = await sharp(req.file.buffer)
        .resize({
          width: MAX_DIMENSION,
          height: MAX_DIMENSION,
          fit: 'inside',
          withoutEnlargement: true,
        })
        .png()
        .toFile(path.join(getClinicasUploadsDir(), filename))

      await registrarUsoAlmacenamiento(clinicaId, size)

      req.file.filename = filename
      next()
    } catch (processingError) {
      res.status(400).json({
        message: 'No fue posible procesar la imagen del logo.',
      })
    }
  })
}

module.exports = {
  uploadClinicaLogoSingle,
}
