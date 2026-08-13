const express = require('express')
const { body, param, query } = require('express-validator')

const {
  listarConsultorios,
  crearConsultorio,
  actualizarConsultorio,
} = require('../controllers/consultorioController')
const { verificarToken, verificarRol } = require('../middlewares/authMiddleware')
const { validar } = require('../middlewares/validacionMiddleware')

const router = express.Router()

const rolesLectura = ['admin', 'superadmin', 'recepcionista', 'veterinario', 'auxiliar']
const rolesEscritura = ['admin', 'superadmin']

router.get(
  '/',
  verificarToken,
  verificarRol(...rolesLectura),
  [query('activo').optional().isIn(['true', 'false']), validar],
  listarConsultorios
)

router.post(
  '/',
  verificarToken,
  verificarRol(...rolesEscritura),
  [
    body('nombre').trim().notEmpty().withMessage('El nombre es obligatorio').isLength({ max: 120 }),
    body('descripcion').optional({ values: 'falsy' }).trim().isLength({ max: 300 }),
    validar,
  ],
  crearConsultorio
)

router.patch(
  '/:id',
  verificarToken,
  verificarRol(...rolesEscritura),
  [
    param('id').isUUID().withMessage('Consultorio no valido'),
    body('nombre').optional().trim().notEmpty().withMessage('El nombre no puede estar vacio').isLength({ max: 120 }),
    body('descripcion').optional({ nullable: true }).trim().isLength({ max: 300 }),
    body('activo').optional().isBoolean(),
    validar,
  ],
  actualizarConsultorio
)

module.exports = router
