const express = require('express')
const router = express.Router()
const { body } = require('express-validator')
const { verificarToken, verificarRol } = require('../middlewares/authMiddleware')
const { validar } = require('../middlewares/validacionMiddleware')
const {
  crearFactura, obtenerFacturas, obtenerFactura, anularFactura,
} = require('../controllers/facturaController')

router.post('/', verificarToken, verificarRol('admin', 'superadmin', 'recepcionista', 'facturador'), [
  body('propietarioId').isUUID().withMessage('Propietario no válido'),
  body('items').isArray({ min: 1 }).withMessage('Debe incluir al menos un item'),
  body('items.*.descripcion').notEmpty().withMessage('Descripción del item requerida'),
  body('items.*.cantidad').isFloat({ min: 0.01 }).withMessage('Cantidad debe ser mayor a 0'),
  body('items.*.precioUnitario').isFloat({ min: 0 }).withMessage('Precio debe ser mayor o igual a 0'),
  body('metodoPago').optional().isIn([
    'efectivo', 'tarjeta_debito', 'tarjeta_credito',
    'transferencia', 'nequi', 'daviplata', 'otro',
  ]).withMessage('Método de pago no válido'),
  validar,
], crearFactura)

router.get('/', verificarToken, verificarRol('admin', 'superadmin', 'recepcionista', 'facturador'), obtenerFacturas)
router.get('/:id', verificarToken, verificarRol('admin', 'superadmin', 'recepcionista', 'facturador'), obtenerFactura)

router.patch('/:id/anular', verificarToken, verificarRol('admin', 'superadmin'), [
  body('motivoAnulacion').notEmpty().withMessage('El motivo de anulación es obligatorio').trim(),
  validar,
], anularFactura)

module.exports = router