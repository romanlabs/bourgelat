const express = require('express')
const router = express.Router()
const { body, param, query } = require('express-validator')
const { verificarToken, verificarRol } = require('../middlewares/authMiddleware')
const { requerirEscritura } = require('../middlewares/suscripcionMiddleware')
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
  requerirEscritura,
  uploadMascotaPhotoSingle,
  subirFotoMascota
)

router.post(
  '/',
  verificarToken,
  verificarRol('admin', 'superadmin', 'recepcionista', 'auxiliar', 'veterinario'),
  requerirEscritura,
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

const validarConsultaMascotas = [
  query('buscar')
    .optional()
    .trim()
    .isLength({ max: 120 })
    .withMessage('La busqueda no puede exceder 120 caracteres'),
  query('especie')
    .optional()
    .isIn(['perro', 'gato', 'ave', 'conejo', 'reptil', 'otro'])
    .withMessage('Especie no valida'),
  query('pagina')
    .optional()
    .isInt({ min: 1 })
    .withMessage('La pagina debe ser un entero mayor a 0'),
  query('limite')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('El limite debe ser un entero entre 1 y 100'),
  validar,
]

router.get(
  '/',
  verificarToken,
  verificarRol('admin', 'superadmin', 'recepcionista', 'auxiliar', 'veterinario'),
  validarConsultaMascotas,
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
  requerirEscritura,
  [
    param('id').isUUID().withMessage('Mascota no valida'),
    body('nombre').optional().notEmpty().withMessage('El nombre no puede estar vacio').trim(),
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

router.patch(
  '/:id/desactivar',
  verificarToken,
  verificarRol('admin', 'superadmin'),
  requerirEscritura,
  desactivarMascota
)

module.exports = router
