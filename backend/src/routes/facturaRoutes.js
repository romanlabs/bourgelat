const express = require('express')
const { body } = require('express-validator')

const {
  crearFactura,
  obtenerFacturas,
  obtenerFactura,
  emitirFacturaElectronica,
  anularFactura,
} = require('../controllers/facturaController')
const { verificarToken, verificarRol } = require('../middlewares/authMiddleware')
const { requerirFuncionalidades } = require('../middlewares/suscripcionMiddleware')
const { validar } = require('../middlewares/validacionMiddleware')

const router = express.Router()
const requiereFacturacionInterna = requerirFuncionalidades('facturacion_interna')
const requiereFacturacionElectronica = requerirFuncionalidades(
  'facturacion_interna',
  'facturacion_electronica'
)

router.post(
  '/',
  verificarToken,
  verificarRol('admin', 'superadmin', 'recepcionista', 'facturador', 'auxiliar', 'veterinario'),
  requiereFacturacionInterna,
  [
    body('propietarioId').isUUID().withMessage('Propietario no valido'),
    body('items').isArray({ min: 1 }).withMessage('Debe incluir al menos un item'),
    body('items.*.descripcion').notEmpty().withMessage('Descripcion del item requerida'),
    body('items.*.cantidad').isFloat({ min: 0.01 }).withMessage('Cantidad debe ser mayor a 0'),
    body('items.*.precioUnitario')
      .isFloat({ min: 0 })
      .withMessage('Precio debe ser mayor o igual a 0'),
    body('metodoPago')
      .optional()
      .isIn([
        'efectivo',
        'tarjeta_debito',
        'tarjeta_credito',
        'transferencia',
        'nequi',
        'daviplata',
        'otro',
      ])
      .withMessage('Metodo de pago no valido'),
    validar,
  ],
  crearFactura
)

router.get(
  '/',
  verificarToken,
  verificarRol('admin', 'superadmin', 'recepcionista', 'facturador', 'auxiliar', 'veterinario'),
  requiereFacturacionInterna,
  obtenerFacturas
)

router.get(
  '/:id',
  verificarToken,
  verificarRol('admin', 'superadmin', 'recepcionista', 'facturador', 'auxiliar', 'veterinario'),
  requiereFacturacionInterna,
  obtenerFactura
)

router.post(
  '/:id/emitir-electronica',
  verificarToken,
  verificarRol('admin', 'superadmin', 'facturador'),
  requiereFacturacionElectronica,
  [
    body('rangoNumeracionId')
      .optional({ values: 'falsy' })
      .isInt({ min: 1 })
      .withMessage('Rango de numeracion no valido'),
    body('documentoCodigo').optional().trim(),
    body('formaPagoCodigo')
      .optional()
      .isIn(['1', '2'])
      .withMessage('Forma de pago no valida'),
    body('metodoPagoCodigo').optional().trim(),
    body('enviarEmail').optional().isBoolean().withMessage('enviarEmail debe ser booleano'),
    body('fechaVencimientoPago')
      .optional()
      .isISO8601()
      .withMessage('Fecha de vencimiento no valida'),
    validar,
  ],
  emitirFacturaElectronica
)

router.patch(
  '/:id/anular',
  verificarToken,
  verificarRol('admin', 'superadmin'),
  requiereFacturacionInterna,
  [
    body('motivoAnulacion')
      .notEmpty()
      .withMessage('El motivo de anulacion es obligatorio')
      .trim(),
    validar,
  ],
  anularFactura
)

module.exports = router
