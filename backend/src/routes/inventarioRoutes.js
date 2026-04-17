const express = require('express')
const { body, param, query } = require('express-validator')

const {
  crearProducto,
  obtenerProductos,
  obtenerProducto,
  editarProducto,
  eliminarProducto,
  registrarMovimiento,
  obtenerAlertas,
  obtenerProductoPorBarcode,
  obtenerCatalogoMedicamentos,
  obtenerMovimientos,
} = require('../controllers/inventarioController')
const { verificarToken, verificarRol } = require('../middlewares/authMiddleware')
const { validar } = require('../middlewares/validacionMiddleware')
const { requerirFuncionalidades } = require('../middlewares/suscripcionMiddleware')

const router = express.Router()
const requiereInventario = requerirFuncionalidades('inventario')
const categoriasValidas = [
  'medicamento',
  'vacuna',
  'insumo',
  'alimento',
  'accesorio',
  'antiparasitario',
  'suplemento',
  'otro',
]
const tiposMovimientoValidos = ['entrada', 'salida', 'ajuste']
const motivosMovimientoValidos = [
  'compra',
  'venta',
  'uso_clinico',
  'consumo_interno',
  'vencimiento',
  'devolucion',
  'ajuste',
  'ajuste_inventario',
  'otro',
]

const validarIdProducto = [
  param('id').isUUID().withMessage('Producto no valido'),
  validar,
]

const validarConsultaProductos = [
  query('buscar')
    .optional()
    .trim()
    .isLength({ max: 120 })
    .withMessage('La busqueda no puede exceder 120 caracteres'),
  query('categoria')
    .optional()
    .isIn(categoriasValidas)
    .withMessage('Categoria no valida'),
  query('bajoStock')
    .optional()
    .isIn(['true', 'false'])
    .withMessage('bajoStock debe ser true o false'),
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

const validarCreacionProducto = [
  body('nombre')
    .trim()
    .notEmpty()
    .withMessage('El nombre es obligatorio')
    .isLength({ max: 160 })
    .withMessage('El nombre no puede exceder 160 caracteres'),
  body('descripcion')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 1000 })
    .withMessage('La descripcion no puede exceder 1000 caracteres'),
  body('categoria')
    .notEmpty()
    .withMessage('La categoria es obligatoria')
    .isIn(categoriasValidas)
    .withMessage('Categoria no valida'),
  body('subcategoria')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 120 })
    .withMessage('La subcategoria no puede exceder 120 caracteres'),
  body('unidadMedida')
    .trim()
    .notEmpty()
    .withMessage('La unidad de medida es obligatoria')
    .isLength({ max: 40 })
    .withMessage('La unidad de medida no puede exceder 40 caracteres'),
  body('precioCompra')
    .optional({ values: 'falsy' })
    .isFloat({ min: 0 })
    .withMessage('El precio de compra debe ser mayor o igual a 0'),
  body('precioVenta')
    .optional({ values: 'falsy' })
    .isFloat({ min: 0 })
    .withMessage('El precio de venta debe ser mayor o igual a 0'),
  body('stock')
    .optional({ values: 'falsy' })
    .isInt({ min: 0 })
    .withMessage('El stock inicial debe ser un entero mayor o igual a 0'),
  body('stockMinimo')
    .optional({ values: 'falsy' })
    .isInt({ min: 0 })
    .withMessage('El stock minimo debe ser un entero mayor o igual a 0'),
  body('fechaVencimiento')
    .optional({ values: 'falsy' })
    .isISO8601()
    .withMessage('La fecha de vencimiento no es valida'),
  body('lote')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 80 })
    .withMessage('El lote no puede exceder 80 caracteres'),
  body('laboratorio')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 120 })
    .withMessage('El laboratorio no puede exceder 120 caracteres'),
  body('requiereFormula')
    .optional()
    .isBoolean()
    .withMessage('requiereFormula debe ser booleano'),
  validar,
]

const validarEdicionProducto = [
  param('id').isUUID().withMessage('Producto no valido'),
  body('nombre')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('El nombre no puede estar vacio')
    .isLength({ max: 160 })
    .withMessage('El nombre no puede exceder 160 caracteres'),
  body('descripcion')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 1000 })
    .withMessage('La descripcion no puede exceder 1000 caracteres'),
  body('categoria')
    .optional()
    .isIn(categoriasValidas)
    .withMessage('Categoria no valida'),
  body('subcategoria')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 120 })
    .withMessage('La subcategoria no puede exceder 120 caracteres'),
  body('unidadMedida')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('La unidad de medida no puede estar vacia')
    .isLength({ max: 40 })
    .withMessage('La unidad de medida no puede exceder 40 caracteres'),
  body('precioCompra')
    .optional({ nullable: true })
    .isFloat({ min: 0 })
    .withMessage('El precio de compra debe ser mayor o igual a 0'),
  body('precioVenta')
    .optional({ nullable: true })
    .isFloat({ min: 0 })
    .withMessage('El precio de venta debe ser mayor o igual a 0'),
  body('stockMinimo')
    .optional({ nullable: true })
    .isInt({ min: 0 })
    .withMessage('El stock minimo debe ser un entero mayor o igual a 0'),
  body('fechaVencimiento')
    .optional({ values: 'falsy' })
    .isISO8601()
    .withMessage('La fecha de vencimiento no es valida'),
  body('lote')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 80 })
    .withMessage('El lote no puede exceder 80 caracteres'),
  body('laboratorio')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 120 })
    .withMessage('El laboratorio no puede exceder 120 caracteres'),
  body('requiereFormula')
    .optional()
    .isBoolean()
    .withMessage('requiereFormula debe ser booleano'),
  validar,
]

const validarMovimiento = [
  param('id').isUUID().withMessage('Producto no valido'),
  body('tipo')
    .notEmpty()
    .withMessage('El tipo es obligatorio')
    .isIn(tiposMovimientoValidos)
    .withMessage('Tipo de movimiento no valido'),
  body('cantidad')
    .notEmpty()
    .withMessage('La cantidad es obligatoria')
    .isInt({ min: 1 })
    .withMessage('La cantidad debe ser un entero mayor a 0'),
  body('motivo')
    .notEmpty()
    .withMessage('El motivo es obligatorio')
    .isIn(motivosMovimientoValidos)
    .withMessage('Motivo de movimiento no valido'),
  body('observaciones')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 280 })
    .withMessage('Las observaciones no pueden exceder 280 caracteres'),
  body('precioUnitario')
    .optional({ values: 'falsy' })
    .isFloat({ min: 0 })
    .withMessage('El precio unitario debe ser mayor o igual a 0'),
  validar,
]

const validarConsultaMovimientos = [
  query('productoId')
    .optional()
    .isUUID()
    .withMessage('productoId no valido'),
  query('tipo')
    .optional()
    .isIn(tiposMovimientoValidos)
    .withMessage('Tipo de movimiento no valido'),
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

const validarConsultaCatalogo = [
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
    .isInt({ min: 1, max: 50 })
    .withMessage('El limite debe ser un entero entre 1 y 50'),
  validar,
]

router.post(
  '/',
  verificarToken,
  verificarRol('admin', 'superadmin', 'auxiliar'),
  requiereInventario,
  validarCreacionProducto,
  crearProducto
)

router.get(
  '/',
  verificarToken,
  verificarRol('admin', 'superadmin', 'auxiliar', 'veterinario', 'recepcionista', 'facturador'),
  requiereInventario,
  validarConsultaProductos,
  obtenerProductos
)

router.get(
  '/catalogo-medicamentos',
  verificarToken,
  verificarRol('admin', 'superadmin', 'auxiliar', 'veterinario', 'facturador'),
  requiereInventario,
  validarConsultaCatalogo,
  obtenerCatalogoMedicamentos
)

router.get(
  '/movimientos',
  verificarToken,
  verificarRol('admin', 'superadmin', 'auxiliar', 'veterinario'),
  requiereInventario,
  validarConsultaMovimientos,
  obtenerMovimientos
)

router.get(
  '/alertas',
  verificarToken,
  verificarRol('admin', 'superadmin', 'auxiliar'),
  requiereInventario,
  obtenerAlertas
)

router.get(
  '/barcode/:codigo',
  verificarToken,
  verificarRol('admin', 'superadmin', 'auxiliar', 'recepcionista', 'facturador'),
  requiereInventario,
  [
    param('codigo')
      .trim()
      .notEmpty()
      .withMessage('El codigo de barras es obligatorio')
      .isLength({ max: 120 })
      .withMessage('El codigo de barras no puede exceder 120 caracteres'),
    validar,
  ],
  obtenerProductoPorBarcode
)

router.get(
  '/:id',
  verificarToken,
  verificarRol('admin', 'superadmin', 'auxiliar', 'veterinario'),
  requiereInventario,
  validarIdProducto,
  obtenerProducto
)

router.put(
  '/:id',
  verificarToken,
  verificarRol('admin', 'superadmin', 'auxiliar'),
  requiereInventario,
  validarEdicionProducto,
  editarProducto
)

router.delete(
  '/:id',
  verificarToken,
  verificarRol('admin', 'superadmin', 'auxiliar'),
  requiereInventario,
  validarIdProducto,
  eliminarProducto
)

router.post(
  '/:id/movimiento',
  verificarToken,
  verificarRol('admin', 'superadmin', 'auxiliar', 'veterinario'),
  requiereInventario,
  validarMovimiento,
  registrarMovimiento
)

module.exports = router
