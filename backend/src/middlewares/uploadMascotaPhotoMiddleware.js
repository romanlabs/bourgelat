const multer = require('multer')
const {
  ALLOWED_IMAGE_MIME_TYPES,
  getMascotasUploadsDir,
  generateUploadFilename,
} = require('../config/uploads')

const storage = multer.diskStorage({
  destination: (req, file, callback) => {
    callback(null, getMascotasUploadsDir())
  },
  filename: (req, file, callback) => {
    callback(null, generateUploadFilename(file.originalname, file.mimetype))
  },
})

const uploadMascotaPhoto = multer({
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

const uploadMascotaPhotoSingle = (req, res, next) => {
  uploadMascotaPhoto.single('foto')(req, res, (error) => {
    if (!error) {
      next()
      return
    }

    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        res.status(400).json({
          message: 'La foto supera el tamano maximo permitido de 4 MB.',
        })
        return
      }

      res.status(400).json({
        message: 'Solo se permiten imagenes JPG, PNG o WEBP para la foto del paciente.',
      })
      return
    }

    res.status(400).json({
      message: error.message || 'No fue posible cargar la foto del paciente.',
    })
  })
}

module.exports = {
  uploadMascotaPhotoSingle,
}
