const express = require('express')
const { body, param, query } = require('express-validator')

const {
  listarCuentasRecaudo,
  crearCuentaRecaudo,
  actualizarCuentaRecaudo,
} = require('../controllers/cuentaRecaudoController')
const { verificarToken, verificarRol } = require('../middlewares/authMiddleware')
const { requerirEscritura } = require('../middlewares/suscripcionMiddleware')
const { validar } = require('../middlewares/validacionMiddleware')

const router = express.Router()

// Las leen quienes cobran (venta y abonos); solo administración las configura.
const rolesLectura = ['admin', 'superadmin', 'facturador', 'recepcionista']
const rolesEscritura = ['admin', 'superadmin']

router.get(
  '/',
  verificarToken,
  verificarRol(...rolesLectura),
  [query('activo').optional().isIn(['true', 'false']), validar],
  listarCuentasRecaudo
)

router.post(
  '/',
  verificarToken,
  verificarRol(...rolesEscritura),
  requerirEscritura,
  [
    body('nombre').trim().notEmpty().withMessage('El nombre es obligatorio').isLength({ max: 60 }),
    validar,
  ],
  crearCuentaRecaudo
)

router.patch(
  '/:id',
  verificarToken,
  verificarRol(...rolesEscritura),
  requerirEscritura,
  [
    param('id').isUUID().withMessage('Cuenta no valida'),
    body('nombre').optional().trim().notEmpty().withMessage('El nombre no puede estar vacio').isLength({ max: 60 }),
    body('activo').optional().isBoolean(),
    validar,
  ],
  actualizarCuentaRecaudo
)

module.exports = router
