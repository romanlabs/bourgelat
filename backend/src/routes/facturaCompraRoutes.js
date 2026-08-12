const express = require('express')
const { body, param, query } = require('express-validator')

const {
  obtenerFacturasCompra,
  obtenerFacturaCompra,
  crearFacturaCompra,
  editarFacturaCompra,
  confirmarFacturaCompra,
  anularFacturaCompra,
  obtenerAlertasCompra,
  marcarComoPagada,
} = require('../controllers/facturaCompraController')
const { verificarToken, verificarRol } = require('../middlewares/authMiddleware')
const { validar } = require('../middlewares/validacionMiddleware')
const { requerirEscritura } = require('../middlewares/suscripcionMiddleware')

const router = express.Router()

const validarItem = [
  body('items').isArray({ min: 1 }).withMessage('Debe incluir al menos un ítem'),
  body('items.*.productoId').isUUID().withMessage('Cada ítem debe tener un productoId válido'),
  body('items.*.cantidad').isInt({ min: 1 }).withMessage('La cantidad de cada ítem debe ser mayor a 0'),
  body('items.*.precioUnitario')
    .isFloat({ min: 0 })
    .withMessage('El precio unitario de cada ítem debe ser mayor o igual a 0'),
]

const validarCreacion = [
  body('proveedor')
    .trim()
    .notEmpty()
    .withMessage('El proveedor es obligatorio')
    .isLength({ max: 200 })
    .withMessage('El proveedor no puede exceder 200 caracteres'),
  body('fecha').isISO8601().withMessage('La fecha no es válida'),
  body('numero')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 80 })
    .withMessage('El número no puede exceder 80 caracteres'),
  body('observaciones')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Las observaciones no pueden exceder 1000 caracteres'),
  body('fechaPagoFinal')
    .optional({ values: 'falsy' })
    .isISO8601()
    .withMessage('La fecha de pago final no es válida'),
  ...validarItem,
  validar,
]

const validarEdicion = [
  param('id').isUUID().withMessage('ID de factura no válido'),
  body('proveedor')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('El proveedor no puede estar vacío')
    .isLength({ max: 200 })
    .withMessage('El proveedor no puede exceder 200 caracteres'),
  body('fecha').optional().isISO8601().withMessage('La fecha no es válida'),
  body('numero')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 80 })
    .withMessage('El número no puede exceder 80 caracteres'),
  body('observaciones')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Las observaciones no pueden exceder 1000 caracteres'),
  body('fechaPagoFinal')
    .optional({ nullable: true })
    .isISO8601()
    .withMessage('La fecha de pago final no es válida'),
  body('items').optional().isArray({ min: 1 }).withMessage('Debe incluir al menos un ítem'),
  body('items.*.productoId')
    .if(body('items').exists())
    .isUUID()
    .withMessage('Cada ítem debe tener un productoId válido'),
  body('items.*.cantidad')
    .if(body('items').exists())
    .isInt({ min: 1 })
    .withMessage('La cantidad de cada ítem debe ser mayor a 0'),
  body('items.*.precioUnitario')
    .if(body('items').exists())
    .isFloat({ min: 0 })
    .withMessage('El precio unitario de cada ítem debe ser mayor o igual a 0'),
  validar,
]

const validarConsulta = [
  query('estado')
    .optional()
    .isIn(['borrador', 'confirmada', 'anulada'])
    .withMessage('Estado no válido'),
  query('proveedor')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('El filtro de proveedor no puede exceder 200 caracteres'),
  query('pagina').optional().isInt({ min: 1 }).withMessage('La página debe ser un entero mayor a 0'),
  query('limite')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('El límite debe ser un entero entre 1 y 100'),
  validar,
]

const rolesGestion = ['admin', 'superadmin', 'auxiliar']

router.get(
  '/',
  verificarToken,
  verificarRol(...rolesGestion),
  validarConsulta,
  obtenerFacturasCompra
)

router.get(
  '/alertas',
  verificarToken,
  verificarRol(...rolesGestion),
  obtenerAlertasCompra
)

router.get(
  '/:id',
  verificarToken,
  verificarRol(...rolesGestion),
  [param('id').isUUID().withMessage('ID no válido'), validar],
  obtenerFacturaCompra
)

router.post(
  '/',
  verificarToken,
  verificarRol(...rolesGestion),
  requerirEscritura,
  validarCreacion,
  crearFacturaCompra
)

router.put(
  '/:id',
  verificarToken,
  verificarRol(...rolesGestion),
  requerirEscritura,
  validarEdicion,
  editarFacturaCompra
)

router.post(
  '/:id/confirmar',
  verificarToken,
  verificarRol(...rolesGestion),
  requerirEscritura,
  [param('id').isUUID().withMessage('ID no válido'), validar],
  confirmarFacturaCompra
)

router.post(
  '/:id/anular',
  verificarToken,
  verificarRol(...rolesGestion),
  requerirEscritura,
  [param('id').isUUID().withMessage('ID no válido'), validar],
  anularFacturaCompra
)

router.post(
  '/:id/pagar',
  verificarToken,
  verificarRol(...rolesGestion),
  requerirEscritura,
  [
    param('id').isUUID().withMessage('ID no válido'),
    body('fechaPago').optional({ values: 'falsy' }).isISO8601().withMessage('La fecha de pago no es válida'),
    validar,
  ],
  marcarComoPagada
)

module.exports = router
