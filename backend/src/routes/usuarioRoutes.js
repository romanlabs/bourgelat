const express = require('express')
const router = express.Router()
const { body } = require('express-validator')
const { verificarToken, verificarRol } = require('../middlewares/authMiddleware')
const { validar } = require('../middlewares/validacionMiddleware')
const {
  crearUsuario, obtenerUsuarios, obtenerUsuario,
  editarUsuario, toggleUsuario,
} = require('../controllers/usuarioController')

router.post('/', verificarToken, verificarRol('admin', 'superadmin'), [
  body('nombre').notEmpty().withMessage('El nombre es obligatorio').trim(),
  body('email').isEmail().withMessage('Email inválido').normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Mínimo 8 caracteres'),
  body('rol').isIn(['admin', 'veterinario', 'recepcionista', 'auxiliar', 'facturador'])
    .withMessage('Rol no válido'),
  validar,
], crearUsuario)

router.get('/', verificarToken, verificarRol('admin', 'superadmin'), obtenerUsuarios)
router.get('/:id', verificarToken, verificarRol('admin', 'superadmin'), obtenerUsuario)

router.put('/:id', verificarToken, verificarRol('admin', 'superadmin'), [
  body('nombre').optional().notEmpty().withMessage('El nombre no puede estar vacío').trim(),
  body('rol').optional().isIn(['admin', 'veterinario', 'recepcionista', 'auxiliar', 'facturador'])
    .withMessage('Rol no válido'),
  validar,
], editarUsuario)

router.patch('/:id/toggle', verificarToken, verificarRol('admin', 'superadmin'), toggleUsuario)

module.exports = router