const multer = require('multer')
const {
  ALLOWED_IMAGE_MIME_TYPES,
  getUsuariosUploadsDir,
  generateUploadFilename,
} = require('../config/uploads')
const { aplicarCupoDeArchivoEnDisco } = require('./cupoArchivoDiscoHelper')

const storage = multer.diskStorage({
  destination: (req, file, callback) => {
    callback(null, getUsuariosUploadsDir())
  },
  filename: (req, file, callback) => {
    callback(null, generateUploadFilename(file.originalname, file.mimetype))
  },
})

const uploadUsuarioFoto = multer({
  storage,
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

const uploadUsuarioFotoSingle = (req, res, next) => {
  uploadUsuarioFoto.single('foto')(req, res, async (error) => {
    if (error) {
      if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
          res.status(400).json({
            message: 'La foto supera el tamano maximo permitido de 4 MB.',
          })
          return
        }

        res.status(400).json({
          message: 'Solo se permiten imagenes JPG, PNG o WEBP para la foto de perfil.',
        })
        return
      }

      res.status(400).json({
        message: error.message || 'No fue posible cargar la foto de perfil.',
      })
      return
    }

    if (!req.file) {
      next()
      return
    }

    try {
      const puedeContinuar = await aplicarCupoDeArchivoEnDisco(req, res)
      if (!puedeContinuar) {
        return
      }

      next()
    } catch (cupoError) {
      res.status(500).json({
        message: 'No fue posible validar el espacio disponible.',
      })
    }
  })
}

module.exports = {
  uploadUsuarioFotoSingle,
}
