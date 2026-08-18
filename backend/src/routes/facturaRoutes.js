const express = require('express')
const { body } = require('express-validator')

const {
  crearFactura,
  obtenerFacturas,
  obtenerFactura,
  emitirFacturaElectronica,
  descargarFacturaElectronica,
  anularFactura,
  registrarPago,
  registrarAbono,
  listarCuentasPorCobrar,
} = require('../controllers/facturaController')
const { verificarToken, verificarRol } = require('../middlewares/authMiddleware')
const { requerirEscritura, requerirFuncionalidades } = require('../middlewares/suscripcionMiddleware')
const { validar } = require('../middlewares/validacionMiddleware')

const router = express.Router()
const requiereFacturacionElectronica = requerirFuncionalidades('facturacion_electronica')

router.post(
  '/',
  verificarToken,
  verificarRol('admin', 'superadmin', 'recepcionista', 'facturador', 'auxiliar', 'veterinario'),
  requerirEscritura,
  [
    body('propietarioId')
      .optional({ values: 'falsy' })
      .isUUID()
      .withMessage('Propietario no valido'),
    body('items').isArray({ min: 1 }).withMessage('Debe incluir al menos un item'),
    body('items.*.descripcion').notEmpty().withMessage('Descripcion del item requerida'),
    body('items.*.cantidad').isFloat({ min: 0.01 }).withMessage('Cantidad debe ser mayor a 0'),
    body('items.*.precioUnitario')
      .isFloat({ min: 0 })
      .withMessage('Precio debe ser mayor o igual a 0'),
    body('items.*.tipo')
      .optional({ values: 'falsy' })
      .isIn(['producto', 'servicio'])
      .withMessage('Tipo de item no valido'),
    body('historiaClinicaId')
      .optional({ values: 'falsy' })
      .isUUID()
      .withMessage('Historia clinica no valida'),
    body('metodoPago')
      .optional()
      .isIn([
        'efectivo',
        'tarjeta_debito',
        'tarjeta_credito',
        'transferencia',
        'nequi',
        'daviplata',
        'credito',
        'otro',
      ])
      .withMessage('Metodo de pago no valido'),
    validar,
  ],
  crearFactura
)

// Antes de '/:id' para que el path literal no sea capturado como UUID.
router.get(
  '/cuentas-por-cobrar',
  verificarToken,
  verificarRol('admin', 'superadmin', 'facturador', 'recepcionista'),
  listarCuentasPorCobrar
)

router.get(
  '/',
  verificarToken,
  verificarRol('admin', 'superadmin', 'recepcionista', 'facturador', 'auxiliar', 'veterinario'),
  obtenerFacturas
)

router.get(
  '/:id',
  verificarToken,
  verificarRol('admin', 'superadmin', 'recepcionista', 'facturador', 'auxiliar', 'veterinario'),
  obtenerFactura
)

router.post(
  '/:id/emitir-electronica',
  verificarToken,
  verificarRol('admin', 'superadmin', 'facturador'),
  requerirEscritura,
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

router.get(
  '/:id/descargar/:formato',
  verificarToken,
  verificarRol('admin', 'superadmin', 'recepcionista', 'facturador', 'auxiliar', 'veterinario'),
  requiereFacturacionElectronica,
  descargarFacturaElectronica
)

router.patch(
  '/:id/pagar',
  verificarToken,
  verificarRol('admin', 'superadmin', 'facturador', 'recepcionista'),
  requerirEscritura,
  [
    body('metodoPago')
      .optional()
      .isIn(['efectivo', 'tarjeta_debito', 'tarjeta_credito', 'transferencia', 'nequi', 'daviplata', 'otro'])
      .withMessage('Metodo de pago no valido'),
    body('observaciones').optional().trim(),
    validar,
  ],
  registrarPago
)

router.post(
  '/:id/abonos',
  verificarToken,
  verificarRol('admin', 'superadmin', 'facturador', 'recepcionista'),
  requerirEscritura,
  [
    body('monto').isFloat({ min: 0.01 }).withMessage('Monto debe ser mayor a 0'),
    body('metodoPago')
      .optional()
      .isIn(['efectivo', 'tarjeta_debito', 'tarjeta_credito', 'transferencia', 'nequi', 'daviplata', 'otro'])
      .withMessage('Metodo de pago no valido'),
    body('observaciones').optional({ values: 'falsy' }).trim(),
    validar,
  ],
  registrarAbono
)

router.patch(
  '/:id/anular',
  verificarToken,
  verificarRol('admin', 'superadmin'),
  requerirEscritura,
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
