const express = require('express')
const { body, param, query } = require('express-validator')

const {
  crearServicio,
  importarServicios,
  obtenerServicios,
  obtenerServicio,
  editarServicio,
  eliminarServicio,
  activarServicio,
} = require('../controllers/servicioClinicoController')
const { verificarToken, verificarRol } = require('../middlewares/authMiddleware')
const { validar } = require('../middlewares/validacionMiddleware')
const { requerirEscritura } = require('../middlewares/suscripcionMiddleware')

const router = express.Router()

const validarIdServicio = [
  param('id').isUUID().withMessage('Servicio no valido'),
  validar,
]

const validarConsultaServicios = [
  query('buscar').optional().trim().isLength({ max: 120 }),
  query('estado').optional().isIn(['activos', 'inactivos']).withMessage('Estado no valido'),
  query('categoria').optional().trim().isLength({ max: 80 }),
  query('pagina').optional().isInt({ min: 1 }),
  query('limite').optional().isInt({ min: 1, max: 100 }),
  validar,
]

// La receta puede ir vacia: hay servicios (certificados, telemedicina, consultas
// cuyos insumos se registran en la historia) que no descuentan inventario.
const validarInsumosReceta = [
  body('insumos').isArray().withMessage('Los insumos de la receta deben ser una lista'),
  body('insumos.*.insumoClinicoId').isUUID().withMessage('insumoClinicoId no valido'),
  body('insumos.*.cantidadConsumida').isFloat({ min: 0.01 }).withMessage('La cantidad consumida debe ser mayor a 0'),
]

const validarCreacionServicio = [
  body('nombre').trim().notEmpty().withMessage('El nombre es obligatorio').isLength({ max: 160 }),
  body('descripcion').optional({ values: 'falsy' }).trim().isLength({ max: 1000 }),
  body('categoria').optional({ values: 'falsy' }).trim().isLength({ max: 80 }),
  body('precioVenta').notEmpty().withMessage('El precio de venta es obligatorio').isFloat({ min: 0 }).withMessage('El precio de venta debe ser mayor o igual a 0'),
  ...validarInsumosReceta,
  validar,
]

const validarEdicionServicio = [
  param('id').isUUID().withMessage('Servicio no valido'),
  body('nombre').optional().trim().notEmpty().withMessage('El nombre no puede estar vacio').isLength({ max: 160 }),
  body('descripcion').optional({ nullable: true }).trim().isLength({ max: 1000 }),
  body('categoria').optional({ nullable: true }).trim().isLength({ max: 80 }),
  body('precioVenta').optional().isFloat({ min: 0 }).withMessage('El precio de venta debe ser mayor o igual a 0'),
  body('insumos').optional().isArray().withMessage('Los insumos de la receta deben ser una lista'),
  body('insumos.*.insumoClinicoId').optional().isUUID().withMessage('insumoClinicoId no valido'),
  body('insumos.*.cantidadConsumida').optional().isFloat({ min: 0.01 }).withMessage('La cantidad consumida debe ser mayor a 0'),
  validar,
]

const validarImportacionServicios = [
  body('servicios')
    .isArray({ min: 1, max: 500 })
    .withMessage('Se debe enviar un arreglo de entre 1 y 500 servicios'),
  body('servicios.*.nombre').trim().notEmpty().withMessage('El nombre es obligatorio').isLength({ max: 160 }),
  body('servicios.*.categoria').optional({ values: 'falsy' }).trim().isLength({ max: 80 }),
  body('servicios.*.descripcion').optional({ values: 'falsy' }).trim().isLength({ max: 1000 }),
  body('servicios.*.precioVenta').isFloat({ min: 0 }).withMessage('El precio de venta debe ser mayor o igual a 0'),
  validar,
]

router.post(
  '/importar',
  verificarToken,
  verificarRol('admin', 'superadmin', 'auxiliar'),
  requerirEscritura,
  validarImportacionServicios,
  importarServicios
)

router.post(
  '/',
  verificarToken,
  verificarRol('admin', 'superadmin', 'auxiliar'),
  requerirEscritura,
  validarCreacionServicio,
  crearServicio
)

router.get(
  '/',
  verificarToken,
  verificarRol('admin', 'superadmin', 'auxiliar', 'veterinario', 'facturador', 'recepcionista'),
  validarConsultaServicios,
  obtenerServicios
)

router.get(
  '/:id',
  verificarToken,
  verificarRol('admin', 'superadmin', 'auxiliar', 'veterinario', 'facturador', 'recepcionista'),
  validarIdServicio,
  obtenerServicio
)

router.put(
  '/:id',
  verificarToken,
  verificarRol('admin', 'superadmin', 'auxiliar'),
  requerirEscritura,
  validarEdicionServicio,
  editarServicio
)

router.patch(
  '/:id/activar',
  verificarToken,
  verificarRol('admin', 'superadmin', 'auxiliar'),
  requerirEscritura,
  validarIdServicio,
  activarServicio
)

router.delete(
  '/:id',
  verificarToken,
  verificarRol('admin', 'superadmin', 'auxiliar'),
  requerirEscritura,
  validarIdServicio,
  eliminarServicio
)

module.exports = router
