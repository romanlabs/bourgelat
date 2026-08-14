const express = require('express')
const { body, param, query } = require('express-validator')

const {
  crearInsumo,
  obtenerInsumos,
  obtenerInsumo,
  editarInsumo,
  eliminarInsumo,
  registrarMovimientoClinico,
  obtenerAlertas,
  obtenerMovimientosClinicos,
} = require('../controllers/insumoClinicoController')
const { verificarToken, verificarRol } = require('../middlewares/authMiddleware')
const { validar } = require('../middlewares/validacionMiddleware')
const { requerirEscritura } = require('../middlewares/suscripcionMiddleware')

const router = express.Router()
const categoriasValidas = ['medicamento', 'vacuna', 'insumo', 'antiparasitario', 'suplemento', 'otro']
const tiposMovimientoValidos = ['entrada', 'salida', 'ajuste']
const motivosMovimientoValidos = [
  'inventario_inicial',
  'compra',
  'uso_servicio',
  'ajuste_inventario',
  'vencimiento',
  'devolucion',
  'otro',
]

const validarIdInsumo = [
  param('id').isUUID().withMessage('Insumo no valido'),
  validar,
]

const validarConsultaInsumos = [
  query('buscar').optional().trim().isLength({ max: 120 }).withMessage('La busqueda no puede exceder 120 caracteres'),
  query('categoria').optional().isIn(categoriasValidas).withMessage('Categoria no valida'),
  query('bajoStock').optional().isIn(['true', 'false']).withMessage('bajoStock debe ser true o false'),
  query('pagina').optional().isInt({ min: 1 }).withMessage('La pagina debe ser un entero mayor a 0'),
  query('limite').optional().isInt({ min: 1, max: 100 }).withMessage('El limite debe ser un entero entre 1 y 100'),
  validar,
]

const validarCreacionInsumo = [
  body('nombre').trim().notEmpty().withMessage('El nombre es obligatorio').isLength({ max: 160 }),
  body('descripcion').optional({ values: 'falsy' }).trim().isLength({ max: 1000 }),
  body('categoria').notEmpty().withMessage('La categoria es obligatoria').isIn(categoriasValidas).withMessage('Categoria no valida'),
  body('unidadBase').trim().notEmpty().withMessage('La unidad base es obligatoria').isLength({ max: 40 }),
  body('cantidadPresentacion').notEmpty().withMessage('La cantidad de la presentacion es obligatoria').isFloat({ min: 0.01 }).withMessage('La cantidad de la presentacion debe ser mayor a 0'),
  body('unidadPresentacion').optional({ values: 'falsy' }).trim().isLength({ max: 40 }),
  body('precioPresentacion').notEmpty().withMessage('El precio de la presentacion es obligatorio').isFloat({ min: 0 }).withMessage('El precio de la presentacion debe ser mayor o igual a 0'),
  body('stockMinimo').optional({ values: 'falsy' }).isFloat({ min: 0 }).withMessage('El stock minimo debe ser mayor o igual a 0'),
  body('fechaVencimiento').optional({ values: 'falsy' }).isISO8601().withMessage('La fecha de vencimiento no es valida'),
  body('lote').optional({ values: 'falsy' }).trim().isLength({ max: 80 }),
  body('laboratorio').optional({ values: 'falsy' }).trim().isLength({ max: 120 }),
  validar,
]

const validarEdicionInsumo = [
  param('id').isUUID().withMessage('Insumo no valido'),
  body('nombre').optional().trim().notEmpty().withMessage('El nombre no puede estar vacio').isLength({ max: 160 }),
  body('descripcion').optional({ nullable: true }).trim().isLength({ max: 1000 }),
  body('categoria').optional().isIn(categoriasValidas).withMessage('Categoria no valida'),
  body('unidadBase').optional().trim().notEmpty().withMessage('La unidad base no puede estar vacia').isLength({ max: 40 }),
  body('stockMinimo').optional({ nullable: true }).isFloat({ min: 0 }).withMessage('El stock minimo debe ser mayor o igual a 0'),
  body('fechaVencimiento').optional({ values: 'falsy' }).isISO8601().withMessage('La fecha de vencimiento no es valida'),
  body('lote').optional({ nullable: true }).trim().isLength({ max: 80 }),
  body('laboratorio').optional({ nullable: true }).trim().isLength({ max: 120 }),
  validar,
]

const validarMovimiento = [
  param('id').isUUID().withMessage('Insumo no valido'),
  body('tipo').notEmpty().withMessage('El tipo es obligatorio').isIn(tiposMovimientoValidos).withMessage('Tipo de movimiento no valido'),
  body('cantidad').notEmpty().withMessage('La cantidad es obligatoria').isFloat({ min: 0.01 }).withMessage('La cantidad debe ser mayor a 0'),
  body('motivo').notEmpty().withMessage('El motivo es obligatorio').isIn(motivosMovimientoValidos).withMessage('Motivo de movimiento no valido'),
  body('observaciones').optional({ values: 'falsy' }).trim().isLength({ max: 280 }),
  body('cantidadPresentacion').optional({ values: 'falsy' }).isFloat({ min: 0.01 }).withMessage('La cantidad de la presentacion debe ser mayor a 0'),
  body('unidadPresentacion').optional({ values: 'falsy' }).trim().isLength({ max: 40 }),
  body('precioPresentacion').optional({ values: 'falsy' }).isFloat({ min: 0 }).withMessage('El precio de la presentacion debe ser mayor o igual a 0'),
  validar,
]

const validarConsultaMovimientos = [
  query('insumoClinicoId').optional().isUUID().withMessage('insumoClinicoId no valido'),
  query('tipo').optional().isIn(tiposMovimientoValidos).withMessage('Tipo de movimiento no valido'),
  query('pagina').optional().isInt({ min: 1 }).withMessage('La pagina debe ser un entero mayor a 0'),
  query('limite').optional().isInt({ min: 1, max: 100 }).withMessage('El limite debe ser un entero entre 1 y 100'),
  validar,
]

router.post(
  '/',
  verificarToken,
  verificarRol('admin', 'superadmin', 'auxiliar'),
  requerirEscritura,
  validarCreacionInsumo,
  crearInsumo
)

router.get(
  '/',
  verificarToken,
  verificarRol('admin', 'superadmin', 'auxiliar', 'veterinario', 'recepcionista', 'facturador'),
  validarConsultaInsumos,
  obtenerInsumos
)

router.get(
  '/movimientos',
  verificarToken,
  verificarRol('admin', 'superadmin', 'auxiliar', 'veterinario'),
  validarConsultaMovimientos,
  obtenerMovimientosClinicos
)

router.get(
  '/alertas',
  verificarToken,
  verificarRol('admin', 'superadmin', 'auxiliar'),
  obtenerAlertas
)

router.get(
  '/:id',
  verificarToken,
  verificarRol('admin', 'superadmin', 'auxiliar', 'veterinario'),
  validarIdInsumo,
  obtenerInsumo
)

router.put(
  '/:id',
  verificarToken,
  verificarRol('admin', 'superadmin', 'auxiliar'),
  requerirEscritura,
  validarEdicionInsumo,
  editarInsumo
)

router.delete(
  '/:id',
  verificarToken,
  verificarRol('admin', 'superadmin', 'auxiliar'),
  requerirEscritura,
  validarIdInsumo,
  eliminarInsumo
)

router.post(
  '/:id/movimiento',
  verificarToken,
  verificarRol('admin', 'superadmin', 'auxiliar', 'veterinario'),
  requerirEscritura,
  validarMovimiento,
  registrarMovimientoClinico
)

module.exports = router
