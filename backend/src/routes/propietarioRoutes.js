const express = require('express')
const router = express.Router()
const { body } = require('express-validator')
const { verificarToken, verificarRol } = require('../middlewares/authMiddleware')
const { validar } = require('../middlewares/validacionMiddleware')
const {
  crearPropietario, obtenerPropietarios,
  obtenerPropietario, editarPropietario,
} = require('../controllers/propietarioController')

router.post('/', verificarToken, verificarRol('admin', 'superadmin', 'recepcionista', 'auxiliar'), [
  body('nombre').notEmpty().withMessage('El nombre es obligatorio').trim(),
  body('numeroDocumento').notEmpty().withMessage('El número de documento es obligatorio').trim(),
  body('telefono').notEmpty().withMessage('El teléfono es obligatorio').trim(),
  body('email').optional().isEmail().withMessage('Email inválido').normalizeEmail(),
  body('tipoDocumento').optional().isIn(['CC', 'CE', 'NIT', 'PP']).withMessage('Tipo de documento no válido'),
  validar,
], crearPropietario)

router.get('/', verificarToken, verificarRol('admin', 'superadmin', 'recepcionista', 'auxiliar', 'veterinario'), obtenerPropietarios)
router.get('/:id', verificarToken, verificarRol('admin', 'superadmin', 'recepcionista', 'auxiliar', 'veterinario'), obtenerPropietario)

router.put('/:id', verificarToken, verificarRol('admin', 'superadmin', 'recepcionista', 'auxiliar'), [
  body('email').optional().isEmail().withMessage('Email inválido').normalizeEmail(),
  body('telefono').optional().notEmpty().withMessage('El teléfono no puede estar vacío').trim(),
  validar,
], editarPropietario)

module.exports = router