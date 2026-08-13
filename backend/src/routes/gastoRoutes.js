'use strict'

const express = require('express')
const { body, query } = require('express-validator')

const { crearGasto, listarGastos, anularGasto } = require('../controllers/gastoController')
const { verificarToken, verificarRol } = require('../middlewares/authMiddleware')
const { requerirEscritura } = require('../middlewares/suscripcionMiddleware')
const { validar } = require('../middlewares/validacionMiddleware')

const router = express.Router()

// Registrar gastos: mismos roles que operan la caja. Ver y anular: solo admin
// (el gasto afecta la rentabilidad reportada al dueño).
const rolesRegistro = ['admin', 'superadmin', 'recepcionista', 'facturador']

const CATEGORIAS_GASTO = [
  'nomina',
  'arriendo',
  'servicios_publicos',
  'insumos',
  'proveedor',
  'mantenimiento',
  'marketing',
  'impuestos',
  'otros',
]

const METODOS_PAGO_GASTO = ['efectivo', 'transferencia', 'tarjeta', 'otro']

router.post(
  '/',
  verificarToken,
  verificarRol(...rolesRegistro),
  requerirEscritura,
  [
    body('categoria').isIn(CATEGORIAS_GASTO).withMessage('Categoria no valida'),
    body('monto').isFloat({ min: 0.01 }).withMessage('Monto debe ser mayor a 0'),
    body('metodoPago').isIn(METODOS_PAGO_GASTO).withMessage('Metodo de pago no valido'),
    body('fecha').optional({ values: 'falsy' }).isISO8601().withMessage('Fecha no valida'),
    body('descripcion').optional({ values: 'falsy' }).trim().isLength({ max: 500 }),
    validar,
  ],
  crearGasto
)

router.get(
  '/',
  verificarToken,
  verificarRol('admin', 'superadmin'),
  [
    query('fechaInicio').optional({ values: 'falsy' }).isISO8601().withMessage('Fecha inicio no valida'),
    query('fechaFin').optional({ values: 'falsy' }).isISO8601().withMessage('Fecha fin no valida'),
    query('categoria').optional({ values: 'falsy' }).isIn(CATEGORIAS_GASTO).withMessage('Categoria no valida'),
    query('metodoPago').optional({ values: 'falsy' }).isIn(METODOS_PAGO_GASTO).withMessage('Metodo de pago no valido'),
    validar,
  ],
  listarGastos
)

router.patch(
  '/:id/anular',
  verificarToken,
  verificarRol('admin', 'superadmin'),
  requerirEscritura,
  [
    body('motivoAnulacion').trim().notEmpty().withMessage('El motivo de anulacion es obligatorio'),
    validar,
  ],
  anularGasto
)

module.exports = router
