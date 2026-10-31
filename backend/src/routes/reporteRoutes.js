const express = require('express')
const { query } = require('express-validator')

const {
  reporteIngresos,
  reporteCitas,
  reporteAgenda,
  reporteInventario,
  dashboardGeneral,
  reporteRentabilidad,
  reporteFinanzasPeriodo,
  reporteMediosPago,
} = require('../controllers/reporteController')
const { verificarToken, verificarRol } = require('../middlewares/authMiddleware')
const { validar } = require('../middlewares/validacionMiddleware')
const { requerirFuncionalidades, cargarSuscripcionActiva } = require('../middlewares/suscripcionMiddleware')
const { suscripcionTieneFuncionalidad } = require('../services/suscripcionService')
const { alcanceAnalisis } = require('../utils/finanzasPeriodo')

const requiereReportesCompletos = requerirFuncionalidades('reportes_completos')

const router = express.Router()

router.get('/dashboard', verificarToken, verificarRol('admin', 'superadmin'), dashboardGeneral)

router.get(
  '/ingresos',
  verificarToken,
  verificarRol('admin', 'superadmin', 'facturador'),
  reporteIngresos
)

// Rentabilidad: solo el dueño/admin ve la ganancia del negocio.
router.get(
  '/rentabilidad',
  verificarToken,
  verificarRol('admin', 'superadmin'),
  requiereReportesCompletos,
  reporteRentabilidad
)

// El resumen de un mes lo ve todo el que entra a Finanzas (sin gastos ni
// ganancia). Los periodos largos y la rentabilidad son del admin con plan Clínica.
const definirAlcanceAnalisis = (req, res, next) => {
  const { rol, rolesAdicionales = [] } = req.auth || req.usuario
  const alcance = alcanceAnalisis({
    roles: [rol, ...rolesAdicionales],
    tieneReportesCompletos: suscripcionTieneFuncionalidad(req.suscripcion, 'reportes_completos'),
    fechaInicio: req.query.fechaInicio,
    fechaFin: req.query.fechaFin,
  })
  if (!alcance.permitido) {
    return res.status(403).json({ message: alcance.message, code: 'PLAN_FEATURE_REQUIRED' })
  }
  req.analisisCompleto = alcance.completo
  next()
}

router.get(
  '/finanzas-periodo',
  verificarToken,
  verificarRol('admin', 'superadmin', 'facturador'),
  [
    query('fechaInicio').isDate().withMessage('fechaInicio debe ser una fecha válida (YYYY-MM-DD)'),
    query('fechaFin').isDate().withMessage('fechaFin debe ser una fecha válida (YYYY-MM-DD)'),
    validar,
  ],
  cargarSuscripcionActiva,
  definirAlcanceAnalisis,
  reporteFinanzasPeriodo
)

// Cobrado por medio de pago: solo administración (incluye lo que salió por
// cada medio). Mismo alcance por plan que el análisis del periodo.
router.get(
  '/medios-pago',
  verificarToken,
  verificarRol('admin', 'superadmin'),
  [
    query('fechaInicio').isDate().withMessage('fechaInicio debe ser una fecha válida (YYYY-MM-DD)'),
    query('fechaFin').isDate().withMessage('fechaFin debe ser una fecha válida (YYYY-MM-DD)'),
    validar,
  ],
  cargarSuscripcionActiva,
  definirAlcanceAnalisis,
  reporteMediosPago
)

router.get(
  '/citas',
  verificarToken,
  verificarRol('admin', 'superadmin', 'veterinario'),
  reporteCitas
)

// Analítica de agenda: agregados del periodo para el tab de analítica.
router.get(
  '/agenda',
  verificarToken,
  verificarRol('admin', 'superadmin', 'veterinario'),
  requiereReportesCompletos,
  [
    query('fechaInicio').isDate().withMessage('fechaInicio debe ser una fecha válida (YYYY-MM-DD)'),
    query('fechaFin').isDate().withMessage('fechaFin debe ser una fecha válida (YYYY-MM-DD)'),
    validar,
  ],
  reporteAgenda
)

router.get(
  '/inventario',
  verificarToken,
  verificarRol('admin', 'superadmin', 'auxiliar'),
  reporteInventario
)

module.exports = router
