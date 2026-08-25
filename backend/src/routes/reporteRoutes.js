const express = require('express')
const { query } = require('express-validator')

const {
  reporteIngresos,
  reporteCitas,
  reporteAgenda,
  reporteInventario,
  dashboardGeneral,
  reporteRentabilidad,
} = require('../controllers/reporteController')
const { verificarToken, verificarRol } = require('../middlewares/authMiddleware')
const { validar } = require('../middlewares/validacionMiddleware')

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
  reporteRentabilidad
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
