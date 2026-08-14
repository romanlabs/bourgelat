const express = require('express')
const { body, query } = require('express-validator')

const {
  abrirTurno,
  obtenerTurnoActivo,
  listarMovimientosTurno,
  registrarMovimientoCaja,
  cerrarTurno,
  listarHistorialTurnos,
  obtenerDetalleTurno,
  obtenerReporteDescuadres,
} = require('../controllers/cajaController')
const { verificarToken, verificarRol } = require('../middlewares/authMiddleware')
const { requerirEscritura } = require('../middlewares/suscripcionMiddleware')
const { validar } = require('../middlewares/validacionMiddleware')

const router = express.Router()
const rolesCaja = ['admin', 'superadmin', 'recepcionista', 'facturador']

const MOTIVOS_MOVIMIENTO_CAJA = [
  'fondo_adicional',
  'retiro_domicilio',
  'gasto_menor',
  'pago_proveedor',
  'prestamo_caja_chica',
  'otro',
]

const CATEGORIAS_DIFERENCIA = [
  'error_vuelto',
  'gasto_no_registrado',
  'redondeo',
  'pago_no_registrado',
  'causa_desconocida',
  'otro',
]

router.post(
  '/turnos/abrir',
  verificarToken,
  verificarRol(...rolesCaja),
  requerirEscritura,
  [
    body('montoInicial').isFloat({ min: 0 }).withMessage('Monto inicial invalido'),
    validar,
  ],
  abrirTurno
)

router.get(
  '/turnos/activo',
  verificarToken,
  verificarRol(...rolesCaja),
  obtenerTurnoActivo
)

router.get(
  '/turnos/historial',
  verificarToken,
  verificarRol(...rolesCaja),
  [
    query('usuarioId').optional({ values: 'falsy' }).isUUID().withMessage('Usuario no valido'),
    query('fechaInicio').optional({ values: 'falsy' }).isISO8601().withMessage('Fecha inicio no valida'),
    query('fechaFin').optional({ values: 'falsy' }).isISO8601().withMessage('Fecha fin no valida'),
    validar,
  ],
  listarHistorialTurnos
)

router.get(
  '/turnos/reporte-descuadres',
  verificarToken,
  verificarRol('admin', 'superadmin'),
  [
    query('usuarioId').optional({ values: 'falsy' }).isUUID().withMessage('Usuario no valido'),
    query('fechaInicio').optional({ values: 'falsy' }).isISO8601().withMessage('Fecha inicio no valida'),
    query('fechaFin').optional({ values: 'falsy' }).isISO8601().withMessage('Fecha fin no valida'),
    validar,
  ],
  obtenerReporteDescuadres
)

router.post(
  '/turnos/movimientos',
  verificarToken,
  verificarRol(...rolesCaja),
  requerirEscritura,
  [
    body('tipo').isIn(['ingreso', 'egreso']).withMessage('Tipo de movimiento no valido'),
    body('monto').isFloat({ min: 0.01 }).withMessage('Monto debe ser mayor a 0'),
    body('motivo').isIn(MOTIVOS_MOVIMIENTO_CAJA).withMessage('Motivo no valido'),
    body('observaciones').optional({ values: 'falsy' }).trim(),
    validar,
  ],
  registrarMovimientoCaja
)

router.patch(
  '/turnos/cerrar',
  verificarToken,
  verificarRol(...rolesCaja),
  requerirEscritura,
  [
    body('montoFinalContado').isFloat({ min: 0 }).withMessage('Monto final invalido'),
    body('observacionesCierre').optional({ values: 'falsy' }).trim(),
    body('categoriaDiferencia')
      .optional({ values: 'falsy' })
      .isIn(CATEGORIAS_DIFERENCIA)
      .withMessage('Categoria de diferencia no valida'),
    validar,
  ],
  cerrarTurno
)

router.get(
  '/turnos/:turnoId/movimientos',
  verificarToken,
  verificarRol(...rolesCaja),
  listarMovimientosTurno
)

router.get(
  '/turnos/:turnoId',
  verificarToken,
  verificarRol(...rolesCaja),
  obtenerDetalleTurno
)

module.exports = router
