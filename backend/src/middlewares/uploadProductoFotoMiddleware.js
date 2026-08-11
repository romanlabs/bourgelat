const multer = require('multer')
const sharp = require('sharp')
const path = require('path')
const crypto = require('crypto')
const { ALLOWED_IMAGE_MIME_TYPES, getProductosUploadsDir } = require('../config/uploads')

const MAX_DIMENSION = 300

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 4 * 1024 * 1024,
    files: 1,
  },
  fileFilter: (req, file, callback) => {
    if (!ALLOWED_IMAGE_MIME_TYPES.has(file.mimetype)) {
      callback(new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'foto'))
      return
    }

    callback(null, true)
  },
})

const uploadProductoFotoSingle = (req, res, next) => {
  upload.single('foto')(req, res, async (error) => {
    if (error) {
      if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
          res.status(400).json({
            message: 'La foto supera el tamano maximo permitido de 4 MB.',
          })
          return
        }

        res.status(400).json({
          message: 'Solo se permiten imagenes JPG, PNG o WEBP para la foto del producto.',
        })
        return
      }

      res.status(400).json({
        message: error.message || 'No fue posible cargar la foto del producto.',
      })
      return
    }

    if (!req.file) {
      next()
      return
    }

    try {
      const filename = `${Date.now()}-${crypto.randomUUID()}.webp`

      await sharp(req.file.buffer)
        .resize({
          width: MAX_DIMENSION,
          height: MAX_DIMENSION,
          fit: 'inside',
          withoutEnlargement: true,
        })
        .webp({ quality: 75 })
        .toFile(path.join(getProductosUploadsDir(), filename))

      req.file.filename = filename
      next()
    } catch (processingError) {
      res.status(400).json({
        message: 'No fue posible procesar la imagen del producto.',
      })
    }
  })
}

module.exports = {
  uploadProductoFotoSingle,
}
