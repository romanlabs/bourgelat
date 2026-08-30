const express = require('express')
const router = express.Router()
const { body, query } = require('express-validator')
const { verificarToken, verificarRol } = require('../middlewares/authMiddleware')
const { requerirEscritura } = require('../middlewares/suscripcionMiddleware')
const { validar } = require('../middlewares/validacionMiddleware')
const {
  crearPropietario, obtenerPropietarios,
  obtenerPropietario, editarPropietario,
} = require('../controllers/propietarioController')

router.post('/', verificarToken, verificarRol('admin', 'superadmin', 'recepcionista', 'auxiliar'), requerirEscritura, [
  body('nombre').notEmpty().withMessage('El nombre es obligatorio').trim(),
  body('numeroDocumento').notEmpty().withMessage('El número de documento es obligatorio').trim(),
  body('telefono').notEmpty().withMessage('El teléfono es obligatorio').trim(),
  body('email').optional().isEmail().withMessage('Email inválido').normalizeEmail(),
  body('tipoDocumento').optional().isIn(['CC', 'CE', 'NIT', 'PP']).withMessage('Tipo de documento no válido'),
  validar,
], crearPropietario)

const validarConsultaPropietarios = [
  query('buscar')
    .optional()
    .trim()
    .isLength({ max: 120 })
    .withMessage('La busqueda no puede exceder 120 caracteres'),
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

router.get('/', verificarToken, verificarRol('admin', 'superadmin', 'recepcionista', 'auxiliar', 'veterinario', 'facturador'), validarConsultaPropietarios, obtenerPropietarios)
router.get('/:id', verificarToken, verificarRol('admin', 'superadmin', 'recepcionista', 'auxiliar', 'veterinario', 'facturador'), obtenerPropietario)

router.put('/:id', verificarToken, verificarRol('admin', 'superadmin', 'recepcionista', 'auxiliar'), requerirEscritura, [
  body('email').optional().isEmail().withMessage('Email inválido').normalizeEmail(),
  body('telefono').optional().notEmpty().withMessage('El teléfono no puede estar vacío').trim(),
  validar,
], editarPropietario)

module.exports = router
