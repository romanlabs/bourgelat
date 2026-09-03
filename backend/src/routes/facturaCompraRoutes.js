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

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const esEnteroPositivo = (valor) => Number.isInteger(Number(valor)) && Number(valor) >= 1
const esDecimalNoNegativo = (valor) =>
  valor !== '' && valor !== null && Number.isFinite(Number(valor)) && Number(valor) >= 0

// Cada ítem apunta a un producto de venta o a un insumo clínico según su
// destino. Se valida el arreglo completo en un custom en vez de encadenar
// condiciones por índice sobre `items.*`, que no puede leer el destino del
// mismo ítem; el mensaje sigue señalando cuál falló.
const validarItemsCompra = (items) => {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('Debe incluir al menos un ítem')
  }

  items.forEach((item, idx) => {
    const posicion = `Ítem ${idx + 1}`
    const destino = item?.destinoInventario ?? 'ventas'

    if (!['ventas', 'clinico'].includes(destino)) {
      throw new Error(`${posicion}: el destino de inventario debe ser "ventas" o "clinico"`)
    }

    if (destino === 'clinico') {
      if (!UUID_RE.test(String(item?.insumoClinicoId || ''))) {
        throw new Error(`${posicion}: debe tener un insumoClinicoId válido`)
      }
    } else if (!UUID_RE.test(String(item?.productoId || ''))) {
      throw new Error(`${posicion}: debe tener un productoId válido`)
    }

    if (!esEnteroPositivo(item?.cantidad)) {
      throw new Error(`${posicion}: la cantidad debe ser un entero mayor a 0`)
    }

    if (!esDecimalNoNegativo(item?.precioUnitario)) {
      throw new Error(`${posicion}: el precio unitario debe ser mayor o igual a 0`)
    }
  })

  return true
}

const validarItem = [
  body('items').isArray({ min: 1 }).withMessage('Debe incluir al menos un ítem'),
  body('items').custom(validarItemsCompra),
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
  body('items').optional().custom(validarItemsCompra),
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
