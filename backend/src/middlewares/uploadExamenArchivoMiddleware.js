const multer = require('multer')
const {
  ALLOWED_EXAMEN_MIME_TYPES,
  getExamenesUploadsDir,
  generateUploadFilename,
} = require('../config/uploads')

const storage = multer.diskStorage({
  destination: (req, file, callback) => {
    callback(null, getExamenesUploadsDir())
  },
  filename: (req, file, callback) => {
    callback(null, generateUploadFilename(file.originalname, file.mimetype))
  },
})

const uploadExamenArchivo = multer({
  storage,
  limits: {
    fileSize: 8 * 1024 * 1024,
    files: 1,
  },
  fileFilter: (req, file, callback) => {
    if (!ALLOWED_EXAMEN_MIME_TYPES.has(file.mimetype)) {
      callback(new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'archivo'))
      return
    }

    callback(null, true)
  },
})

const uploadExamenArchivoSingle = (req, res, next) => {
  uploadExamenArchivo.single('archivo')(req, res, (error) => {
    if (!error) {
      next()
      return
    }

    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        res.status(400).json({
          message: 'El archivo supera el tamano maximo permitido de 8 MB.',
        })
        return
      }

      res.status(400).json({
        message: 'Solo se permiten archivos PDF, JPG, PNG o WEBP para el examen.',
      })
      return
    }

    res.status(400).json({
      message: error.message || 'No fue posible cargar el archivo del examen.',
    })
  })
}

module.exports = {
  uploadExamenArchivoSingle,
}
