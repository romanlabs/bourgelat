const express = require('express')

const {
  reporteIngresos,
  reporteCitas,
  reporteInventario,
  dashboardGeneral,
  reporteRentabilidad,
} = require('../controllers/reporteController')
const { verificarToken, verificarRol } = require('../middlewares/authMiddleware')

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

router.get(
  '/inventario',
  verificarToken,
  verificarRol('admin', 'superadmin', 'auxiliar'),
  reporteInventario
)

module.exports = router
