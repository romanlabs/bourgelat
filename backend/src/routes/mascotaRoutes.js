const express = require('express')
const router = express.Router()
const { body } = require('express-validator')
const { verificarToken, verificarRol } = require('../middlewares/authMiddleware')
const { validar } = require('../middlewares/validacionMiddleware')
const { uploadMascotaPhotoSingle } = require('../middlewares/uploadMascotaPhotoMiddleware')
const {
  crearMascota,
  subirFotoMascota,
  obtenerMascotas,
  obtenerMascota,
  editarMascota,
  desactivarMascota,
} = require('../controllers/mascotaController')

const fotoPerfilValidator = body('fotoPerfil')
  .optional({ nullable: true, checkFalsy: true })
  .trim()
  .isURL({
    protocols: ['http', 'https'],
    require_protocol: true,
    require_tld: false,
  })
  .withMessage('La foto debe ser una URL valida')

router.post(
  '/subir-foto',
  verificarToken,
  verificarRol('admin', 'superadmin', 'recepcionista', 'auxiliar', 'veterinario'),
  uploadMascotaPhotoSingle,
  subirFotoMascota
)

router.post(
  '/',
  verificarToken,
  verificarRol('admin', 'superadmin', 'recepcionista', 'auxiliar', 'veterinario'),
  [
    body('nombre').notEmpty().withMessage('El nombre es obligatorio').trim(),
    body('especie')
      .isIn(['perro', 'gato', 'ave', 'conejo', 'reptil', 'otro'])
      .withMessage('Especie no valida'),
    body('propietarioId').isUUID().withMessage('Propietario no valido'),
    body('sexo')
      .optional()
      .isIn(['macho', 'hembra', 'desconocido'])
      .withMessage('Sexo no valido'),
    body('peso').optional().isFloat({ min: 0 }).withMessage('El peso debe ser un numero positivo'),
    fotoPerfilValidator,
    validar,
  ],
  crearMascota
)

router.get(
  '/',
  verificarToken,
  verificarRol('admin', 'superadmin', 'recepcionista', 'auxiliar', 'veterinario'),
  obtenerMascotas
)
router.get(
  '/:id',
  verificarToken,
  verificarRol('admin', 'superadmin', 'recepcionista', 'auxiliar', 'veterinario'),
  obtenerMascota
)

router.put(
  '/:id',
  verificarToken,
  verificarRol('admin', 'superadmin', 'recepcionista', 'auxiliar', 'veterinario'),
  [
    body('peso').optional().isFloat({ min: 0 }).withMessage('El peso debe ser un numero positivo'),
    body('sexo')
      .optional()
      .isIn(['macho', 'hembra', 'desconocido'])
      .withMessage('Sexo no valido'),
    fotoPerfilValidator,
    validar,
  ],
  editarMascota
)

router.patch('/:id/desactivar', verificarToken, verificarRol('admin', 'superadmin'), desactivarMascota)

module.exports = router
